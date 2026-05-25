import { createClient } from "@supabase/supabase-js";
import { createAuditLogger } from "../src/auditLogger.js";

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const logger = createAuditLogger({
  supabase,
  defaultContext: {
    metadata: {
      service: "portal-api"
    }
  }
});

await logger.logEvent({
  event_type: "permission_change",
  action: "manage",
  module_code: "system_permissions",
  resource_type: "user_role",
  resource_id: "role_assignment_id",
  result: "success",
  reason: "授權人資課長管理人資系統",
  actor: {
    user_id: "00000000-0000-0000-0000-000000000000",
    email: "admin@suiyuecare.com",
    roles: ["admin_director"]
  },
  target: {
    user_id: "11111111-1111-1111-1111-111111111111",
    email: "suiyue.hr@suiyuecare.com"
  },
  before_snapshot: {
    roles: ["hr_viewer"]
  },
  after_snapshot: {
    roles: ["hr_lead"]
  },
  metadata: {
    request_id: "req_example",
    ip_address: "203.0.113.1",
    user_agent: "Mozilla/5.0"
  }
});

