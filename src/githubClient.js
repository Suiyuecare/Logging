export const DEFAULT_GITHUB_REPOSITORY = "Suiyuecare/Logging";
export const GITHUB_API_BASE_URL = "https://api.github.com";

function requireValue(value, label) {
  if (value === undefined || value === null || value === "") {
    throw new Error(`Missing required GitHub config: ${label}`);
  }
  return value;
}

function parseRepository(repository) {
  const [owner, repo] = String(repository || "").split("/");
  if (!owner || !repo) {
    throw new Error("GitHub repository must use owner/repo format.");
  }
  return { owner, repo, fullName: `${owner}/${repo}` };
}

async function parseGitHubResponse(response) {
  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const message = payload?.message || `GitHub API request failed: ${response.status}`;
    const error = new Error(message);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
}

export function createGitHubClient({
  token = process.env.GITHUB_TOKEN,
  repository = process.env.GITHUB_REPOSITORY || DEFAULT_GITHUB_REPOSITORY,
  fetchImpl = globalThis.fetch
} = {}) {
  const parsedRepository = parseRepository(repository);
  if (!fetchImpl) throw new Error("createGitHubClient requires fetch.");

  async function request(path, { method = "GET", body } = {}) {
    const headers = {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28"
    };

    if (token) headers.Authorization = `Bearer ${token}`;
    if (body !== undefined) headers["Content-Type"] = "application/json";

    const response = await fetchImpl(new URL(path, GITHUB_API_BASE_URL), {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body)
    });

    return parseGitHubResponse(response);
  }

  return {
    repository: parsedRepository.fullName,
    owner: parsedRepository.owner,
    repo: parsedRepository.repo,

    request,

    getRepository() {
      return request(`/repos/${encodeURIComponent(parsedRepository.owner)}/${encodeURIComponent(parsedRepository.repo)}`);
    }
  };
}
