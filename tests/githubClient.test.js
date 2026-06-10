import test from "node:test";
import assert from "node:assert/strict";

import { createGitHubClient, DEFAULT_GITHUB_REPOSITORY } from "../src/index.js";

function jsonResponse(payload, init = {}) {
  return new Response(JSON.stringify(payload), {
    status: init.status || 200,
    headers: {
      "content-type": "application/json"
    }
  });
}

test("loads default GitHub repository metadata", async () => {
  const calls = [];
  const github = createGitHubClient({
    fetchImpl(url, init) {
      calls.push({ url, init });
      return jsonResponse({
        full_name: DEFAULT_GITHUB_REPOSITORY,
        default_branch: "main"
      });
    }
  });

  const repository = await github.getRepository();

  assert.equal(github.repository, DEFAULT_GITHUB_REPOSITORY);
  assert.equal(repository.full_name, DEFAULT_GITHUB_REPOSITORY);
  assert.equal(calls[0].url.pathname, "/repos/Suiyuecare/Logging");
  assert.equal(calls[0].init.headers.Authorization, undefined);
});

test("uses a GitHub token when one is provided", async () => {
  const calls = [];
  const github = createGitHubClient({
    token: "ghp_test",
    fetchImpl(url, init) {
      calls.push({ url, init });
      return jsonResponse({ full_name: DEFAULT_GITHUB_REPOSITORY });
    }
  });

  await github.getRepository();

  assert.equal(calls[0].init.headers.Authorization, "Bearer ghp_test");
});

test("rejects repositories without owner/repo format", () => {
  assert.throws(() => createGitHubClient({ repository: "Logging" }), /owner\/repo/);
});
