# Audit Event Dictionary

| event_type | 用途 | 必填重點 |
| --- | --- | --- |
| login | 登入成功/失敗 | actor email, result, ip_address, user_agent |
| logout | 登出 | actor_user_id, result |
| export | 匯出資料 | module_code, resource_type, filter snapshot |
| print | 列印資料 | module_code, resource_type, resource_id |
| delete | 刪除或停用 | before_snapshot, reason |
| submit | 送審 | workflow/status before-after |
| approve | 審核通過 | workflow/status before-after |
| reject | 退回 | workflow/status before-after, reason |
| assign | 指派 | before_snapshot, after_snapshot |
| permission_change | 權限異動 | target_user_id, before_snapshot, after_snapshot |
| sensitive_access | 個資/薪資/敏感資料存取 | sensitive_type, approval/grant id |
| external_account_status_change | 外部帳號啟用/停用/到期 | target_user_id, expired_at, reason |

## Result

```text
success
failed
denied
```

## Severity

```text
info       一般紀錄
warning    有風險但已處理
critical   權限、刪除、敏感資料、外部帳號異動
```

## 必須留 before/after 的事件

- `delete`
- `assign`
- `permission_change`
- `external_account_status_change`
- `approve`
- `reject`

