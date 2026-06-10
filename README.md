# Suiyuecare Platform Foundation

Shared server-side package for the Suiyuecare multi-module platform. It includes:

- Audit logging schema and helper.
- Platform module and permission catalog.
- Supabase REST API helper with the Suiyuecare publishable key.
- Supabase RPC contract for building a login portal user context.
- GitHub repository helper for `Suiyuecare/Logging`.
- Vercel REST API helper for the portal project.
- HR + permission-center MVP schema for the shared platform foundation.

## Core model

The login portal remains the single entry point. After Supabase Auth signs a user in, the portal asks the platform foundation for the user's context:

```js
import { createPlatformAuth } from "@suiyuecare/logging";

const platformAuth = createPlatformAuth({ supabase });
const context = await platformAuth.getUserContext(user.id);
```

The context shape is:

```js
{
  user_id,
  email,
  display_name,
  company_id,
  account_status,
  roles,
  position,
  permissions,
  data_scope,
  enabled_modules
}
```

Every module should use this context to hide unavailable UI and must still enforce permissions in API/RLS checks.

## Permission format

Permissions use `module.resource.action`, for example:

- `hr.employee.view`
- `hr.employee.manage`
- `accounting.invoice.approve`
- `care.homecase.assign`
- `system.permissions.manage`

## Supabase setup

Apply `supabase/schema.sql` to create:

- `audit_logs`
- platform companies, profiles, positions, roles, permissions, and modules
- role/user assignments and data scopes
- HR employee master data
- `get_platform_user_context(target_user_id uuid)` RPC

The audit log table intentionally has no public insert policy. Write audit events from trusted server-side code only.

## Supabase API

The package includes a REST API client that defaults to the provided Supabase project URL and publishable key:

```text
https://ffnnqbcqmnunskjdtkly.supabase.co
sb_publishable_F5JLcuiExa85r4b3caJWYw_NjKOpnSY
```

Required environment variables:

- `SUPABASE_URL` defaults to the URL above
- `SUPABASE_PUBLISHABLE_KEY` defaults to the key above
- `SUPABASE_SERVICE_ROLE_KEY` only for trusted server-side writes, such as `audit_logs`

```js
import { createSupabaseRestClient } from "@suiyuecare/logging";

const supabaseRest = createSupabaseRestClient();

const context = await supabaseRest.getPlatformUserContext(user.id);
const modules = await supabaseRest.select("platform_modules", {
  query: {
    enabled: "eq.true",
    order: "sort_order.asc"
  }
});
```

The publishable key is suitable for browser/client reads protected by RLS. The service role key must stay server-side only.

## Vercel API

The package includes small GitHub and Vercel REST API clients preconfigured for:

- GitHub repository: `Suiyuecare/Logging`
- Vercel project: `prj_Z88QIaAS7g64nSYPmKl8y0xVU9Fz`

Required environment variables:

- `VERCEL_API_TOKEN`
- `VERCEL_PROJECT_ID` defaults to `prj_Z88QIaAS7g64nSYPmKl8y0xVU9Fz`
- `VERCEL_TEAM_ID` when the project belongs to a Vercel team
- `GITHUB_REPOSITORY` defaults to `Suiyuecare/Logging`
- `GITHUB_TOKEN` only when the repository is private or GitHub rate limits are a concern

```js
import { createGitHubClient, createVercelClient } from "@suiyuecare/logging";

const github = createGitHubClient();
const vercel = createVercelClient();

const repository = await github.getRepository();
const project = await vercel.getProject();
const deployments = await vercel.listDeployments({ target: "production" });
```

Do not commit `VERCEL_API_TOKEN`. Store it in Vercel environment variables, server runtime secrets, or local `.env.local`.

To connect the GitHub repository to the Vercel project:

```sh
VERCEL_API_TOKEN=... npm run connect:vercel-github
```

The script verifies the GitHub repository, reads its default branch, then updates the Vercel project with:

```js
{
  gitRepository: {
    type: "github",
    repo: "Suiyuecare/Logging"
  },
  productionBranch: "main"
}
```
