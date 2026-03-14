import * as core from "@actions/core";

interface Release {
  id: string;
  tag_name: string;
  name: string;
  assets?: { id: string; name: string }[];
}

async function request(
  url: string,
  options: {
    method?: string;
    token: string;
    body?: string;
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

async function listReleases(
  apiUrl: string,
  repo: string,
  token: string
): Promise<Release[]> {
  const url = `${apiUrl}/${repo}/-/releases`;
  const { status, data } = await request(url, { token });

  if (status !== 200) {
    throw new Error(`Failed to list releases: ${JSON.stringify(data)}`);
  }

  return data;
}

async function getReleaseByTag(
  apiUrl: string,
  repo: string,
  token: string,
  tagName: string
): Promise<Release | null> {
  const url = `${apiUrl}/${repo}/-/releases/tags/${tagName}`;
  const { status, data } = await request(url, { token });

  if (status === 404) {
    return null;
  }

  if (status !== 200) {
    throw new Error(`Failed to get release: ${JSON.stringify(data)}`);
  }

  return data;
}

async function deleteRelease(
  apiUrl: string,
  repo: string,
  token: string,
  releaseId: string
): Promise<void> {
  const url = `${apiUrl}/${repo}/-/releases/${releaseId}`;
  const { status, data } = await request(url, { method: "DELETE", token });

  if (status !== 200) {
    throw new Error(`Failed to delete release: ${JSON.stringify(data)}`);
  }
}

async function deleteAsset(
  apiUrl: string,
  repo: string,
  token: string,
  releaseId: string,
  assetId: string
): Promise<void> {
  const url = `${apiUrl}/${repo}/-/releases/${releaseId}/assets/${assetId}`;
  const { status, data } = await request(url, { method: "DELETE", token });

  if (status !== 200) {
    throw new Error(`Failed to delete asset: ${JSON.stringify(data)}`);
  }
}

async function run(): Promise<void> {
  try {
    const token = core.getInput("token", { required: true });
    const apiUrl = core.getInput("api_url") || "https://api.cnb.cool";
    const repository = core.getInput("repository") || process.env.GITHUB_REPOSITORY || "";
    const tagName = core.getInput("tag_name");
    const releaseId = core.getInput("release_id");
    const deleteAll = core.getInput("delete_all") === "true";
    const keepLatest = parseInt(core.getInput("keep_latest") || "0", 10);
    const assetNames = core.getInput("asset_names");

    if (!repository) {
      throw new Error("repository is required");
    }

    const deletedReleases: string[] = [];
    const deletedAssets: string[] = [];

    if (assetNames && (tagName || releaseId)) {
      const release = tagName
        ? await getReleaseByTag(apiUrl, repository, token, tagName)
        : null;

      const targetReleaseId = release?.id || releaseId;

      if (!targetReleaseId) {
        throw new Error("Release not found");
      }

      const names = assetNames.split("\n").filter((n) => n.trim());
      const currentRelease = release || (await listReleases(apiUrl, repository, token)).find((r) => r.id === releaseId);

      if (currentRelease?.assets) {
        for (const asset of currentRelease.assets) {
          if (names.some((n) => asset.name === n.trim() || new RegExp(n.trim()).test(asset.name))) {
            await deleteAsset(apiUrl, repository, token, targetReleaseId, asset.id);
            deletedAssets.push(asset.name);
            core.info(`Deleted asset: ${asset.name}`);
          }
        }
      }
    } else if (deleteAll) {
      const releases = await listReleases(apiUrl, repository, token);

      let releasesToDelete = releases;
      if (keepLatest > 0) {
        releasesToDelete = releases.slice(keepLatest);
      }

      for (const release of releasesToDelete) {
        await deleteRelease(apiUrl, repository, token, release.id);
        deletedReleases.push(release.tag_name);
        core.info(`Deleted release: ${release.tag_name}`);
      }
    } else if (tagName) {
      const hasWildcard = tagName.includes("*");

      if (hasWildcard) {
        const regexPattern = new RegExp("^" + tagName.replace(/\*/g, ".*") + "$");
        core.info(`Matching releases with pattern: ${regexPattern}`);

        const releases = await listReleases(apiUrl, repository, token);
        const matchedReleases = releases.filter((r) => regexPattern.test(r.tag_name));

        if (matchedReleases.length === 0) {
          core.warning(`No releases matched pattern: ${tagName}`);
        } else {
          for (const release of matchedReleases) {
            await deleteRelease(apiUrl, repository, token, release.id);
            deletedReleases.push(release.tag_name);
            core.info(`Deleted release: ${release.tag_name}`);
          }
        }
      } else {
        const release = await getReleaseByTag(apiUrl, repository, token, tagName);

        if (!release) {
          core.warning(`Release not found: ${tagName}`);
        } else {
          await deleteRelease(apiUrl, repository, token, release.id);
          deletedReleases.push(tagName);
          core.info(`Deleted release: ${tagName}`);
        }
      }
    } else if (releaseId) {
      await deleteRelease(apiUrl, repository, token, releaseId);
      deletedReleases.push(releaseId);
      core.info(`Deleted release: ${releaseId}`);
    } else {
      throw new Error("Either tag_name, release_id, delete_all, or asset_names must be provided");
    }

    core.setOutput("deleted_releases", JSON.stringify(deletedReleases));
    core.setOutput("deleted_assets", JSON.stringify(deletedAssets));

    if (deletedReleases.length > 0) {
      core.info(`Deleted ${deletedReleases.length} release(s)`);
    }
    if (deletedAssets.length > 0) {
      core.info(`Deleted ${deletedAssets.length} asset(s)`);
    }
  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(error.message);
    } else {
      core.setFailed("Unknown error occurred");
    }
  }
}

run();
