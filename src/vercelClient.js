export const DEFAULT_VERCEL_PROJECT_ID = "prj_Z88QIaAS7g64nSYPmKl8y0xVU9Fz";
export const DEFAULT_VERCEL_GITHUB_REPOSITORY = "Suiyuecare/Logging";
export const VERCEL_API_BASE_URL = "https://api.vercel.com";

function requireValue(value, label) {
  if (value === undefined || value === null || value === "") {
    throw new Error(`Missing required Vercel config: ${label}`);
  }
  return value;
}

function appendQuery(url, query = {}) {
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }
  return url;
}

async function parseVercelResponse(response) {
  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const message = payload?.error?.message || payload?.message || `Vercel API request failed: ${response.status}`;
    const error = new Error(message);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
}

export function createVercelClient({
  token = process.env.VERCEL_API_TOKEN,
  projectId = process.env.VERCEL_PROJECT_ID || DEFAULT_VERCEL_PROJECT_ID,
  teamId = process.env.VERCEL_TEAM_ID,
  fetchImpl = globalThis.fetch
} = {}) {
  requireValue(token, "VERCEL_API_TOKEN");
  requireValue(projectId, "VERCEL_PROJECT_ID");
  if (!fetchImpl) throw new Error("createVercelClient requires fetch.");

  async function request(path, { method = "GET", query = {}, body } = {}) {
    const url = appendQuery(new URL(path, VERCEL_API_BASE_URL), {
      ...query,
      teamId
    });

    const response = await fetchImpl(url, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: body === undefined ? undefined : JSON.stringify(body)
    });

    return parseVercelResponse(response);
  }

  return {
    projectId,
    teamId: teamId || null,

    request,

    getProject() {
      return request(`/v9/projects/${encodeURIComponent(projectId)}`);
    },

    updateProject(config) {
      return request(`/v9/projects/${encodeURIComponent(projectId)}`, {
        method: "PATCH",
        body: config
      });
    },

    connectGitHubRepository({
      repository = process.env.GITHUB_REPOSITORY || DEFAULT_VERCEL_GITHUB_REPOSITORY,
      productionBranch = "main"
    } = {}) {
      return this.updateProject({
        gitRepository: {
          type: "github",
          repo: repository
        },
        productionBranch
      });
    },

    listDeployments({ limit = 20, state, target } = {}) {
      return request("/v6/deployments", {
        query: {
          projectId,
          limit,
          state,
          target
        }
      });
    },

    listEnvironmentVariables({ gitBranch } = {}) {
      return request(`/v10/projects/${encodeURIComponent(projectId)}/env`, {
        query: {
          gitBranch
        }
      });
    },

    createEnvironmentVariables(variables) {
      if (!Array.isArray(variables) || variables.length === 0) {
        throw new Error("createEnvironmentVariables requires at least one variable.");
      }

      return request(`/v10/projects/${encodeURIComponent(projectId)}/env`, {
        method: "POST",
        body: variables
      });
    }
  };
}
