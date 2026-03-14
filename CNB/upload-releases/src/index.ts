import * as core from "@actions/core";
import * as fs from "fs";
import * as path from "path";

interface ReleaseParams {
  tag_name: string;
  name?: string;
  body?: string;
  draft?: boolean;
  prerelease?: boolean;
  target_commitish?: string;
  make_latest?: string;
}

interface UploadURLResponse {
  upload_url: string;
  verify_url: string;
  expires_in_sec: number;
}

interface ReleaseResponse {
  id: string;
  tag_name: string;
  name: string;
  body: string;
  html_url?: string;
}

async function request(
  url: string,
  options: {
    method?: string;
    token: string;
    body?: string | Buffer;
    contentType?: string;
  }
): Promise<{ status: number; data: any }> {
  const { method = "GET", token, body, contentType } = options;

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.cnb.api+json",
  };

  if (contentType) {
    headers["Content-Type"] = contentType;
  }

  const response = await fetch(url, {
    method,
    headers,
    body,
  });

  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }

  return { status: response.status, data };
}

async function createOrUpdateRelease(
  apiUrl: string,
  repo: string,
  token: string,
  params: ReleaseParams
): Promise<ReleaseResponse> {
  const url = `${apiUrl}/${repo}/-/releases`;

  const { status, data } = await request(url, {
    method: "POST",
    token,
    body: JSON.stringify(params),
    contentType: "application/json",
  });

  if (status === 201) {
    core.info("Release created");
    return data;
  }

  if (status === 409) {
    core.warning("Release already exists, fetching and updating...");

    const getUrl = `${apiUrl}/${repo}/-/releases/tags/${params.tag_name}`;
    const { status: getStatus, data: existingRelease } = await request(getUrl, { token });

    if (getStatus !== 200) {
      throw new Error(`Failed to get existing release: ${JSON.stringify(existingRelease)}`);
    }

    const patchUrl = `${apiUrl}/${repo}/-/releases/${existingRelease.id}`;
    const patchBody: Record<string, any> = { name: params.name };

    if (params.body) {
      patchBody.body = params.body;
    }
    if (params.make_latest) {
      patchBody.make_latest = params.make_latest;
    }

    const { status: patchStatus, data: updatedRelease } = await request(patchUrl, {
      method: "PATCH",
      token,
      body: JSON.stringify(patchBody),
      contentType: "application/json",
    });

    if (patchStatus !== 200) {
      throw new Error(`Failed to update release: ${JSON.stringify(updatedRelease)}`);
    }

    core.info("Release updated");
    core.debug(`Updated release data: ${JSON.stringify(updatedRelease)}`);
    
    if (updatedRelease && updatedRelease.id) {
      core.info(`Updated release ID: ${updatedRelease.id}`);
      return updatedRelease;
    }
    
    core.info(`Using existing release ID: ${existingRelease.id}`);
    return existingRelease;
  }

  throw new Error(`Failed to create release (${status}): ${JSON.stringify(data)}`);
}

async function uploadAsset(
  apiUrl: string,
  repo: string,
  token: string,
  releaseId: string,
  filePath: string
): Promise<any> {
  const fileName = path.basename(filePath);
  const fileStats = fs.statSync(filePath);
  const fileSize = fileStats.size;

  core.info(`Uploading asset: ${fileName} (${fileSize} bytes)`);

  const url = `${apiUrl}/${repo}/-/releases/${releaseId}/asset-upload-url`;
  core.debug(`Requesting upload URL: ${url}`);

  const { status: urlStatus, data: urlData } = await request(url, {
    method: "POST",
    token,
    body: JSON.stringify({
      asset_name: fileName,
      size: fileSize,
      overwrite: true,
    }),
    contentType: "application/json",
  });

  core.debug(`Upload URL response status: ${urlStatus}, data: ${JSON.stringify(urlData)}`);

  if (urlStatus !== 201) {
    throw new Error(`Failed to get upload URL (${urlStatus}): ${JSON.stringify(urlData)}`);
  }

  const { upload_url, verify_url } = urlData as UploadURLResponse;

  const fileContent = fs.readFileSync(filePath);
  const { status: uploadStatus } = await request(upload_url, {
    method: "PUT",
    token,
    body: fileContent,
    contentType: "application/octet-stream",
  });

  if (uploadStatus !== 200 && uploadStatus !== 201) {
    throw new Error(`Failed to upload file: ${uploadStatus}`);
  }

  const { status: verifyStatus, data: verifyData } = await request(verify_url, {
    method: "POST",
    token,
  });

  if (verifyStatus !== 200 && verifyStatus !== 201) {
    throw new Error(`Failed to verify upload: ${JSON.stringify(verifyData)}`);
  }

  core.info(`Uploaded: ${fileName}`);
  return verifyData;
}

async function globFiles(pattern: string): Promise<string[]> {
  const { glob } = await import("glob");
  const files = await glob(pattern, { nodir: true, absolute: true });
  return files;
}

async function run(): Promise<void> {
  try {
    const token = core.getInput("token", { required: true });
    const apiUrl = core.getInput("api_url") || "https://api.cnb.cool";
    const repo = core.getInput("repo") || process.env.GITHUB_REPOSITORY || "";
    const tagName = core.getInput("tag_name") || process.env.GITHUB_REF_NAME || "";
    const releaseName = core.getInput("name") || tagName;
    const body = core.getInput("body");
    const bodyPath = core.getInput("body_path");
    const draft = core.getInput("draft") === "true";
    const prerelease = core.getInput("prerelease") === "true";
    const targetCommitish = core.getInput("target_commitish") || "main";
    const makeLatest = core.getInput("make_latest");
    const filesInput = core.getInput("files");
    const failOnUnmatched = core.getInput("fail_on_unmatched_files") === "true";

    if (!repo) {
      throw new Error("repo is required");
    }
    if (!tagName) {
      throw new Error("tag_name is required");
    }

    let releaseBody = body;
    if (bodyPath && fs.existsSync(bodyPath)) {
      releaseBody = fs.readFileSync(bodyPath, "utf-8");
    }

    const params: ReleaseParams = {
      tag_name: tagName,
      name: releaseName,
      body: releaseBody,
      draft,
      prerelease,
      target_commitish: targetCommitish,
    };

    if (makeLatest) {
      params.make_latest = makeLatest;
    }

    core.info(`Creating release ${tagName} for ${repo}`);

    const release = await createOrUpdateRelease(apiUrl, repo, token, params);

    core.info(`Release ID: ${release.id}`);
    core.setOutput("url", release.html_url || "");
    core.setOutput("id", release.id);
    core.setOutput("upload_url", `${apiUrl}/${repo}/-/releases/${release.id}/assets`);

    const assets: any[] = [];

    if (filesInput) {
      const patterns = filesInput.split("\n").filter((p) => p.trim());

      for (const pattern of patterns) {
        const files = await globFiles(pattern);

        if (files.length === 0 && failOnUnmatched) {
          throw new Error(`No files matched pattern: ${pattern}`);
        }

        for (const file of files) {
          try {
            const asset = await uploadAsset(apiUrl, repo, token, release.id, file);
            assets.push(asset);
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            core.warning(`Failed to upload ${path.basename(file)}: ${message}`);
          }
        }
      }
    }

    core.setOutput("assets", JSON.stringify(assets));
  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(error.message);
    } else {
      core.setFailed("Unknown error occurred");
    }
  }
}

run();
