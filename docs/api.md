# Platform API

## Platform context RPC

All modules should load the current user's login portal context from Supabase before rendering module navigation or protected data.

```js
import { createPlatformAuth } from "@suiyuecare/logging";

const platformAuth = createPlatformAuth({ supabase });
const context = await platformAuth.getUserContext(user.id);
```

The helper calls:

```sql
select public.get_platform_user_context('auth-user-id');
```

Expected response:

```json
{
  "user_id": "auth-user-id",
  "email": "admin@suiyuecare.com",
  "display_name": "歲悅 管理者",
  "company_id": "company-id",
  "account_status": "active",
  "roles": ["group_admin"],
  "position": {
    "id": "position-id",
    "code": "admin_director",
    "name": "行政部長"
  },
  "permissions": ["system.permissions.manage", "hr.employee.manage"],
  "data_scope": [
    {
      "scope_type": "group",
      "company_id": "company-id"
    }
  ],
  "enabled_modules": ["system", "hr"]
}
```

Inactive accounts must be rejected by the caller before showing any module.

## Supabase REST API

The platform package exposes a Supabase REST API client. It defaults to URL `https://ffnnqbcqmnunskjdtkly.supabase.co` and publishable key `sb_publishable_F5JLcuiExa85r4b3caJWYw_NjKOpnSY`.

```js
import { createSupabaseRestClient } from "@suiyuecare/logging";

const supabaseRest = createSupabaseRestClient({
  url: process.env.SUPABASE_URL,
  publishableKey: process.env.SUPABASE_PUBLISHABLE_KEY,
  serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY
});

const context = await supabaseRest.getPlatformUserContext(user.id);
const modules = await supabaseRest.select("platform_modules", {
  query: {
    enabled: "eq.true",
    order: "sort_order.asc"
  }
});
```

Supported methods:

- `rpc(functionName, args)` calls `POST /rest/v1/rpc/{functionName}`
- `getPlatformUserContext(userId)` calls `POST /rest/v1/rpc/get_platform_user_context`
- `select(table, { query })` calls `GET /rest/v1/{table}`
- `insert(table, rows)` calls `POST /rest/v1/{table}`
- `logAuditEvent(payload)` writes to `audit_logs` with `SUPABASE_SERVICE_ROLE_KEY`

Never expose `SUPABASE_SERVICE_ROLE_KEY` in a browser bundle.

## Vercel project API

The platform package exposes GitHub and Vercel REST API clients for repository `Suiyuecare/Logging` and project `prj_Z88QIaAS7g64nSYPmKl8y0xVU9Fz`.

```js
import { createGitHubClient, createVercelClient } from "@suiyuecare/logging";

const github = createGitHubClient({
  token: process.env.GITHUB_TOKEN,
  repository: process.env.GITHUB_REPOSITORY
});
const vercel = createVercelClient({
  token: process.env.VERCEL_API_TOKEN,
  teamId: process.env.VERCEL_TEAM_ID
});

const repository = await github.getRepository();
const project = await vercel.getProject();
const deployments = await vercel.listDeployments({ limit: 10, target: "production" });
const env = await vercel.listEnvironmentVariables();
```

Supported methods:

- `getProject()` calls `GET /v9/projects/{projectId}`
- `listDeployments()` calls `GET /v6/deployments?projectId={projectId}`
- `listEnvironmentVariables()` calls `GET /v10/projects/{projectId}/env`
- `createEnvironmentVariables()` calls `POST /v10/projects/{projectId}/env`
- `connectGitHubRepository()` calls `PATCH /v9/projects/{projectId}` with `gitRepository.type = "github"` and `gitRepository.repo = "Suiyuecare/Logging"`

Use `VERCEL_TEAM_ID` for team-owned resources.

CLI usage:

```sh
VERCEL_API_TOKEN=... npm run connect:vercel-github
```

## Logging API

## POST `/api/audit-logs`

由後端或 Edge Function 呼叫。不要從公開前端直接寫入。

### Request

```json
{
  "event_type": "permission_change",
  "action": "manage",
  "module_code": "system",
  "resource_type": "user_role",
  "resource_id": "user-role-id",
  "result": "success",
  "reason": "行政部長授權人資課長",
  "actor": {
    "user_id": "auth-user-id",
    "email": "admin@suiyuecare.com",
    "roles": ["admin_director"],
    "company_id": "company-id",
    "region_id": "taipei"
  },
  "target": {
    "user_id": "target-user-id",
    "email": "suiyue.hr@suiyuecare.com"
  },
  "before_snapshot": {
    "roles": ["hr_viewer"]
  },
  "after_snapshot": {
    "roles": ["hr_lead"]
  },
  "metadata": {
    "request_id": "req_123",
    "ip_address": "203.0.113.1",
    "user_agent": "Mozilla/5.0"
  }
}
```

### Response

```json
{
  "id": "audit-log-id",
  "created_at": "2026-05-25T12:00:00.000Z"
}
```

## GET `/api/audit-logs`

只允許具備 `system.permissions.view` 或 `system.permissions.manage` 的帳號使用。

### Query

```text
event_type
module_code
actor_user_id
target_user_id
resource_type
resource_id
result
date_from
date_to
company_id
region_id
institution_id
department_id
business_unit_id
limit
cursor
```

## POST `/api/audit-logs/export`

匯出 audit log 本身也必須再寫入一筆 `export` 事件。
