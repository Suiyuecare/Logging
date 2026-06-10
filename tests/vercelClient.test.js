import test from "node:test";
import assert from "node:assert/strict";

import { createVercelClient, DEFAULT_VERCEL_PROJECT_ID } from "../src/index.js";

function jsonResponse(payload, init = {}) {
  return new Response(JSON.stringify(payload), {
    status: init.status || 200,
    headers: {
      "content-type": "application/json"
    }
  });
}

test("creates a Vercel client with the Suiyuecare project id by default", async () => {
  const calls = [];
  const client = createVercelClient({
    token: "test-token",
    fetchImpl(url, init) {
      calls.push({ url, init });
      return jsonResponse({ id: DEFAULT_VERCEL_PROJECT_ID, name: "suiyue-portal" });
    }
  });

  const project = await client.getProject();

  assert.equal(client.projectId, DEFAULT_VERCEL_PROJECT_ID);
  assert.equal(project.id, DEFAULT_VERCEL_PROJECT_ID);
  assert.equal(calls[0].url.toString(), `https://api.vercel.com/v9/projects/${DEFAULT_VERCEL_PROJECT_ID}`);
  assert.equal(calls[0].init.headers.Authorization, "Bearer test-token");
});

test("lists deployments with team id and project id query params", async () => {
  const calls = [];
  const client = createVercelClient({
    token: "test-token",
    teamId: "team_123",
    fetchImpl(url, init) {
      calls.push({ url, init });
      return jsonResponse({ deployments: [] });
    }
  });

  await client.listDeployments({ limit: 5, target: "production" });

  const url = calls[0].url;
  assert.equal(url.pathname, "/v6/deployments");
  assert.equal(url.searchParams.get("projectId"), DEFAULT_VERCEL_PROJECT_ID);
  assert.equal(url.searchParams.get("limit"), "5");
  assert.equal(url.searchParams.get("target"), "production");
  assert.equal(url.searchParams.get("teamId"), "team_123");
});

test("creates environment variables through the project env endpoint", async () => {
  const calls = [];
  const client = createVercelClient({
    token: "test-token",
    fetchImpl(url, init) {
      calls.push({ url, init });
      return jsonResponse({ created: 1 });
    }
  });

  await client.createEnvironmentVariables([
    {
      key: "SUPABASE_URL",
      value: "https://example.supabase.co",
      target: ["production", "preview"],
      type: "encrypted"
    }
  ]);

  assert.equal(calls[0].url.pathname, `/v10/projects/${DEFAULT_VERCEL_PROJECT_ID}/env`);
  assert.equal(calls[0].init.method, "POST");
  assert.deepEqual(JSON.parse(calls[0].init.body), [
    {
      key: "SUPABASE_URL",
      value: "https://example.supabase.co",
      target: ["production", "preview"],
      type: "encrypted"
    }
  ]);
});

test("connects a Vercel project to the default GitHub repository", async () => {
  const calls = [];
  const client = createVercelClient({
    token: "test-token",
    fetchImpl(url, init) {
      calls.push({ url, init });
      return jsonResponse({
        id: DEFAULT_VERCEL_PROJECT_ID,
        gitRepository: {
          type: "github",
          repo: "Suiyuecare/Logging"
        }
      });
    }
  });

  const project = await client.connectGitHubRepository();

  assert.equal(project.gitRepository.repo, "Suiyuecare/Logging");
  assert.equal(calls[0].url.pathname, `/v9/projects/${DEFAULT_VERCEL_PROJECT_ID}`);
  assert.equal(calls[0].init.method, "PATCH");
  assert.deepEqual(JSON.parse(calls[0].init.body), {
    gitRepository: {
      type: "github",
      repo: "Suiyuecare/Logging"
    },
    productionBranch: "main"
  });
});

test("surfaces Vercel API errors with status and payload", async () => {
  const client = createVercelClient({
    token: "test-token",
    fetchImpl() {
      return jsonResponse({ error: { message: "Not Found" } }, { status: 404 });
    }
  });

  await assert.rejects(
    () => client.getProject(),
    (error) => {
      assert.equal(error.message, "Not Found");
      assert.equal(error.status, 404);
      assert.deepEqual(error.payload, { error: { message: "Not Found" } });
      return true;
    }
  );
});
