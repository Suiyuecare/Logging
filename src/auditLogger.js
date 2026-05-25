export const AUDIT_EVENT_TYPES = Object.freeze([
  "login",
  "logout",
  "export",
  "print",
  "delete",
  "submit",
  "approve",
  "reject",
  "assign",
  "permission_change",
  "sensitive_access",
  "external_account_status_change"
]);

export const AUDIT_ACTIONS = Object.freeze([
  "view",
  "create",
  "edit",
  "delete",
  "submit",
  "approve",
  "reject",
  "assign",
  "export",
  "print",
  "manage",
  "login",
  "logout"
]);

const CRITICAL_EVENTS = new Set([
  "delete",
  "permission_change",
  "sensitive_access",
  "external_account_status_change"
]);

function requireValue(value, label) {
  if (value === undefined || value === null || value === "") {
    throw new Error(`Missing required audit log field: ${label}`);
  }
  return value;
}

function eventSeverity(eventType, result) {
  if (result === "denied" || CRITICAL_EVENTS.has(eventType)) return "critical";
  if (result === "failed") return "warning";
  return "info";
}

function normalizeAuditPayload(input, defaults = {}) {
  const eventType = requireValue(input.event_type, "event_type");
  const result = input.result || "success";
  const actor = input.actor || {};
  const target = input.target || {};
  const metadata = { ...(defaults.metadata || {}), ...(input.metadata || {}) };

  return {
    event_type: eventType,
    severity: input.severity || eventSeverity(eventType, result),
    result,
    action: requireValue(input.action, "action"),
    module_code: requireValue(input.module_code, "module_code"),
    resource_type: input.resource_type || null,
    resource_id: input.resource_id || null,
    data_scope: input.data_scope || null,
    actor_user_id: actor.user_id || defaults.actor_user_id || null,
    actor_email: actor.email || defaults.actor_email || null,
    actor_roles: actor.roles || defaults.actor_roles || [],
    actor_company_id: actor.company_id || defaults.actor_company_id || null,
    actor_institution_id: actor.institution_id || defaults.actor_institution_id || null,
    actor_region_id: actor.region_id || defaults.actor_region_id || null,
    actor_department_id: actor.department_id || defaults.actor_department_id || null,
    actor_business_unit_id: actor.business_unit_id || defaults.actor_business_unit_id || null,
    actor_class_id: actor.class_id || defaults.actor_class_id || null,
    target_user_id: target.user_id || null,
    target_email: target.email || null,
    target_company_id: target.company_id || null,
    target_institution_id: target.institution_id || null,
    target_region_id: target.region_id || null,
    target_department_id: target.department_id || null,
    target_business_unit_id: target.business_unit_id || null,
    target_class_id: target.class_id || null,
    reason: input.reason || null,
    request_id: metadata.request_id || defaults.request_id || null,
    ip_address: metadata.ip_address || defaults.ip_address || null,
    user_agent: metadata.user_agent || defaults.user_agent || null,
    before_snapshot: input.before_snapshot || {},
    after_snapshot: input.after_snapshot || {},
    metadata
  };
}

export function createAuditLogger({ supabase, defaultContext = {} }) {
  if (!supabase) throw new Error("createAuditLogger requires a Supabase service client.");

  return {
    async logEvent(input) {
      const payload = normalizeAuditPayload(input, defaultContext);
      const { data, error } = await supabase
        .from("audit_logs")
        .insert(payload)
        .select("id, created_at")
        .single();

      if (error) throw error;
      return data;
    }
  };
}

