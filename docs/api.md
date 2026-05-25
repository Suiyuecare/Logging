# Logging API

## POST `/api/audit-logs`

由後端或 Edge Function 呼叫。不要從公開前端直接寫入。

### Request

```json
{
  "event_type": "permission_change",
  "action": "manage",
  "module_code": "system_permissions",
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

只允許具備 `system_permissions.view` 或 `system_permissions.manage` 的帳號使用。

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

