import { createGitHubClient, createVercelClient } from "../src/index.js";

const github = createGitHubClient();
const vercel = createVercelClient();

const repository = await github.getRepository();
const project = await vercel.connectGitHubRepository({
  repository: repository.full_name,
  productionBranch: repository.default_branch || "main"
});

console.log(JSON.stringify({
  github_repository: repository.full_name,
  github_default_branch: repository.default_branch,
  vercel_project_id: project.id || vercel.projectId,
  vercel_project_name: project.name || null,
  git_repository: project.gitRepository || null
}, null, 2));
