export const DEFAULT_SUPABASE_URL = "https://tiorfiqiowylbnartegx.supabase.co";
export const DEFAULT_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_F5JLcuiExa85r4b3caJWYw_NjKOpnSY";

function requireValue(value, label) {
  if (value === undefined || value === null || value === "") {
    throw new Error(`Missing required Supabase config: ${label}`);
  }
  return value;
}

function normalizeSupabaseUrl(url) {
  return requireValue(url, "SUPABASE_URL").replace(/\/+$/, "");
}

function appendQuery(url, query = {}) {
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }
  return url;
}

async function parseSupabaseResponse(response) {
  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const message = payload?.message || payload?.msg || payload?.error_description || `Supabase API request failed: ${response.status}`;
    const error = new Error(message);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
}

export function createSupabaseConfig({
  url = process.env.SUPABASE_URL || DEFAULT_SUPABASE_URL,
  publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY || DEFAULT_SUPABASE_PUBLISHABLE_KEY,
  serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
} = {}) {
  return {
    url: normalizeSupabaseUrl(url),
    publishableKey: requireValue(publishableKey, "SUPABASE_PUBLISHABLE_KEY"),
    serviceRoleKey: serviceRoleKey || null
  };
}

export function createSupabaseRestClient({
  url = process.env.SUPABASE_URL || DEFAULT_SUPABASE_URL,
  publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY || DEFAULT_SUPABASE_PUBLISHABLE_KEY,
  serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY,
  fetchImpl = globalThis.fetch
} = {}) {
  const config = createSupabaseConfig({ url, publishableKey, serviceRoleKey });
  if (!fetchImpl) throw new Error("createSupabaseRestClient requires fetch.");

  function resolveKey(useServiceRole) {
    if (!useServiceRole) return config.publishableKey;
    return requireValue(config.serviceRoleKey, "SUPABASE_SERVICE_ROLE_KEY");
  }

  async function request(path, { method = "GET", query = {}, body, headers = {}, useServiceRole = false } = {}) {
    const key = resolveKey(useServiceRole);
    const endpoint = appendQuery(new URL(path, `${config.url}/`), query);

    const response = await fetchImpl(endpoint, {
      method,
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        ...headers
      },
      body: body === undefined ? undefined : JSON.stringify(body)
    });

    return parseSupabaseResponse(response);
  }

  return {
    url: config.url,
    publishableKey: config.publishableKey,
    hasServiceRoleKey: Boolean(config.serviceRoleKey),

    request,

    rpc(functionName, args = {}, options = {}) {
      return request(`/rest/v1/rpc/${encodeURIComponent(functionName)}`, {
        method: "POST",
        body: args,
        ...options
      });
    },

    select(table, { query = {}, useServiceRole = false } = {}) {
      return request(`/rest/v1/${encodeURIComponent(table)}`, {
        query,
        useServiceRole
      });
    },

    insert(table, rows, { select = "*", useServiceRole = false } = {}) {
      return request(`/rest/v1/${encodeURIComponent(table)}`, {
        method: "POST",
        query: {
          select
        },
        headers: {
          Prefer: "return=representation"
        },
        body: rows,
        useServiceRole
      });
    },

    getPlatformUserContext(userId) {
      return this.rpc("get_platform_user_context", {
        target_user_id: requireValue(userId, "userId")
      });
    },

    logAuditEvent(payload) {
      return this.insert("audit_logs", payload, {
        select: "id,created_at",
        useServiceRole: true
      });
    }
  };
}
