import { moduleFromPermission, PLATFORM_MODULES } from "./modules.js";

const DATA_SCOPE_ORDER = Object.freeze([
  "self",
  "assigned",
  "class",
  "department",
  "business_unit",
  "region",
  "institution",
  "company",
  "group",
  "custom"
]);

function uniqueStrings(values) {
  return [...new Set((values || []).filter((value) => typeof value === "string" && value.length > 0))];
}

function normalizeDataScopes(scopes = []) {
  return scopes
    .filter((scope) => scope && typeof scope.scope_type === "string")
    .map((scope) => ({
      scope_type: scope.scope_type,
      company_id: scope.company_id || null,
      institution_id: scope.institution_id || null,
      region_id: scope.region_id || null,
      department_id: scope.department_id || null,
      business_unit_id: scope.business_unit_id || null,
      class_id: scope.class_id || null,
      case_id: scope.case_id || null
    }));
}

export function normalizePlatformContext(input = {}) {
  const permissions = uniqueStrings(input.permissions);
  const enabledModuleCodes = new Set([
    ...(input.enabled_modules || []),
    ...permissions.map(moduleFromPermission).filter(Boolean)
  ]);

  const moduleCatalog = input.module_catalog || PLATFORM_MODULES;
  const enabledModules = moduleCatalog
    .filter((module) => enabledModuleCodes.has(module.code))
    .map((module) => ({
      code: module.code,
      name: module.name,
      description: module.description || null
    }));

  return {
    user_id: input.user_id || null,
    email: input.email || null,
    display_name: input.display_name || input.email || null,
    company_id: input.company_id || null,
    account_status: input.account_status || "active",
    roles: uniqueStrings(input.roles),
    position: input.position || null,
    permissions,
    data_scope: normalizeDataScopes(input.data_scope),
    enabled_modules: enabledModules
  };
}

export function hasPermission(context, permission) {
  return normalizePlatformContext(context).permissions.includes(permission);
}

export function hasAnyPermission(context, permissions = []) {
  const granted = new Set(normalizePlatformContext(context).permissions);
  return permissions.some((permission) => granted.has(permission));
}

export function canAccessModule(context, moduleCode) {
  return normalizePlatformContext(context).enabled_modules.some((module) => module.code === moduleCode);
}

export function bestDataScope(context) {
  const normalized = normalizePlatformContext(context);
  return normalized.data_scope
    .slice()
    .sort((left, right) => {
      const leftIndex = DATA_SCOPE_ORDER.indexOf(left.scope_type);
      const rightIndex = DATA_SCOPE_ORDER.indexOf(right.scope_type);
      return (rightIndex === -1 ? -1 : rightIndex) - (leftIndex === -1 ? -1 : leftIndex);
    })[0] || null;
}

export function assertActiveAccount(context) {
  const normalized = normalizePlatformContext(context);
  if (!normalized.user_id) {
    throw new Error("No platform profile found for user.");
  }
  if (normalized.account_status !== "active") {
    throw new Error("Account is not active.");
  }
  return normalized;
}

export function createPlatformAuth({ supabase, moduleCatalog = PLATFORM_MODULES } = {}) {
  if (!supabase) throw new Error("createPlatformAuth requires a Supabase client.");

  return {
    async getUserContext(userId) {
      if (!userId) throw new Error("getUserContext requires userId.");

      const { data, error } = await supabase.rpc("get_platform_user_context", {
        target_user_id: userId
      });

      if (error) throw error;
      return assertActiveAccount(normalizePlatformContext({ ...(data || {}), module_catalog: moduleCatalog }));
    },

    async getSessionContext(accessToken) {
      if (!accessToken) throw new Error("getSessionContext requires accessToken.");

      const { data: authData, error: authError } = await supabase.auth.getUser(accessToken);
      if (authError) throw authError;
      if (!authData?.user?.id) throw new Error("No authenticated user found.");

      return this.getUserContext(authData.user.id);
    },

    requirePermission(context, permission) {
      const normalized = assertActiveAccount(context);
      if (!hasPermission(normalized, permission)) {
        throw new Error(`Missing required permission: ${permission}`);
      }
      return normalized;
    }
  };
}
