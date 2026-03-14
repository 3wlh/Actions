import * as core from "@actions/core";

interface Release {
  id: string;
  tag_name: string;
  name: string;
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

async function listTags(
  apiUrl: string,
  repo: string,
  token: string
): Promise<string[]> {
  const url = `${apiUrl}/${repo}/-/git/tags`;
  const { status, data } = await request(url, { token });

  if (status !== 200) {
    throw new Error(`Failed to list tags: ${JSON.stringify(data)}`);
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
  core.debug(`Deleting release: ${url}`);
  
  const { status, data } = await request(url, { method: "DELETE", token });

  core.debug(`Delete response status: ${status}, data: ${JSON.stringify(data)}`);

  if (status !== 200 && status !== 204) {
    throw new Error(`Failed to delete release (${status}): ${JSON.stringify(data)}`);
  }
}

async function deleteTag(
  apiUrl: string,
  repo: string,
  token: string,
  tagName: string
): Promise<void> {
  const url = `${apiUrl}/${repo}/-/git/tags/${encodeURIComponent(tagName)}`;
  core.debug(`Deleting tag: ${url}`);
  
  const { status, data } = await request(url, { method: "DELETE", token });

  core.debug(`Delete tag response status: ${status}`);

  if (status !== 200 && status !== 204) {
    throw new Error(`Failed to delete tag (${status}): ${JSON.stringify(data)}`);
  }
}

async function run(): Promise<void> {
  try {
    const token = core.getInput("token", { required: true });
    const apiUrl = core.getInput("api_url") || "https://api.cnb.cool";
    const repo = core.getInput("repo") || process.env.GITHUB_REPOSITORY || "";
    const tagName = core.getInput("tag_name");
    const deleteReleaseFlag = core.getInput("delete_release") !== "false";

    if (!repo) {
      throw new Error("repo is required");
    }

    if (!tagName) {
      throw new Error("tag_name is required");
    }

    const deletedReleases: string[] = [];
    const deletedTags: string[] = [];

    const hasWildcard = tagName.includes("*");

    if (hasWildcard) {
      const regexPattern = new RegExp("^" + tagName.replace(/\*/g, ".*") + "$");
      core.info(`Matching tags with pattern: ${regexPattern}`);

      const tags = await listTags(apiUrl, repo, token);
      const matchedTags = tags.filter((t) => regexPattern.test(t));

      if (matchedTags.length === 0) {
        core.warning(`No tags matched pattern: ${tagName}`);
      } else {
        core.info(`Found ${matchedTags.length} matching tags`);
        for (const tag of matchedTags) {
          if (deleteReleaseFlag) {
            const release = await getReleaseByTag(apiUrl, repo, token, tag);
            if (release) {
              core.info(`Deleting release: ${tag} (ID: ${release.id})`);
              await deleteRelease(apiUrl, repo, token, release.id);
              deletedReleases.push(tag);
              core.info(`Deleted release: ${tag}`);
            }
          }
          
          try {
            await deleteTag(apiUrl, repo, token, tag);
            deletedTags.push(tag);
            core.info(`Deleted tag: ${tag}`);
          } catch (error) {
            core.warning(`Failed to delete tag ${tag}: ${error}`);
          }
        }
      }
    } else {
      if (deleteReleaseFlag) {
        const release = await getReleaseByTag(apiUrl, repo, token, tagName);

        if (!release) {
          core.warning(`Release not found: ${tagName}`);
        } else {
          await deleteRelease(apiUrl, repo, token, release.id);
          deletedReleases.push(tagName);
          core.info(`Deleted release: ${tagName}`);
        }
      }
      
      try {
        await deleteTag(apiUrl, repo, token, tagName);
        deletedTags.push(tagName);
        core.info(`Deleted tag: ${tagName}`);
      } catch (error) {
        core.warning(`Failed to delete tag ${tagName}: ${error}`);
      }
    }

    core.setOutput("deleted_releases", JSON.stringify(deletedReleases));
    core.setOutput("deleted_tags", JSON.stringify(deletedTags));

    if (deletedReleases.length > 0) {
      core.info(`Deleted ${deletedReleases.length} release(s)`);
    }
    if (deletedTags.length > 0) {
      core.info(`Deleted ${deletedTags.length} tag(s)`);
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
