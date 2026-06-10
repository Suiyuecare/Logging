import test from "node:test";
import assert from "node:assert/strict";

import {
  createSupabaseConfig,
  createSupabaseRestClient,
  DEFAULT_SUPABASE_PUBLISHABLE_KEY,
  DEFAULT_SUPABASE_URL
} from "../src/index.js";

function jsonResponse(payload, init = {}) {
  return new Response(JSON.stringify(payload), {
    status: init.status || 200,
    headers: {
      "content-type": "application/json"
    }
  });
}

test("creates Supabase config with the provided publishable key", () => {
  const config = createSupabaseConfig({
    url: "https://project.supabase.co/",
    publishableKey: DEFAULT_SUPABASE_PUBLISHABLE_KEY
  });

  assert.equal(config.url, "https://project.supabase.co");
  assert.equal(config.publishableKey, DEFAULT_SUPABASE_PUBLISHABLE_KEY);
  assert.equal(config.serviceRoleKey, null);
});

test("uses the Suiyuecare Supabase URL by default", () => {
  const config = createSupabaseConfig();

  assert.equal(config.url, DEFAULT_SUPABASE_URL);
  assert.equal(config.publishableKey, DEFAULT_SUPABASE_PUBLISHABLE_KEY);
});

test("requires a Supabase URL", () => {
  assert.throws(() => createSupabaseConfig({ url: "", publishableKey: "test" }), /SUPABASE_URL/);
});

test("calls platform context RPC through Supabase REST", async () => {
  const calls = [];
  const supabase = createSupabaseRestClient({
    url: "https://project.supabase.co",
    publishableKey: "sb_publishable_test",
    fetchImpl(url, init) {
      calls.push({ url, init });
      return jsonResponse({ user_id: "user-1", permissions: ["hr.employee.view"] });
    }
  });

  const context = await supabase.getPlatformUserContext("user-1");

  assert.equal(context.user_id, "user-1");
  assert.equal(calls[0].url.toString(), "https://project.supabase.co/rest/v1/rpc/get_platform_user_context");
  assert.equal(calls[0].init.method, "POST");
  assert.equal(calls[0].init.headers.apikey, "sb_publishable_test");
  assert.equal(calls[0].init.headers.Authorization, "Bearer sb_publishable_test");
  assert.deepEqual(JSON.parse(calls[0].init.body), { target_user_id: "user-1" });
});

test("uses service role key for trusted audit log writes", async () => {
  const calls = [];
  const supabase = createSupabaseRestClient({
    url: "https://project.supabase.co",
    publishableKey: "sb_publishable_test",
    serviceRoleKey: "service-role-test",
    fetchImpl(url, init) {
      calls.push({ url, init });
      return jsonResponse([{ id: "log-1", created_at: "2026-06-10T00:00:00Z" }]);
    }
  });

  await supabase.logAuditEvent({
    event_type: "login",
    action: "login",
    module_code: "portal"
  });

  assert.equal(calls[0].url.toString(), "https://project.supabase.co/rest/v1/audit_logs?select=id%2Ccreated_at");
  assert.equal(calls[0].init.headers.apikey, "service-role-test");
  assert.equal(calls[0].init.headers.Authorization, "Bearer service-role-test");
  assert.equal(calls[0].init.headers.Prefer, "return=representation");
});

test("requires service role key before audit log REST writes", async () => {
  const supabase = createSupabaseRestClient({
    url: "https://project.supabase.co",
    publishableKey: "sb_publishable_test",
    fetchImpl() {
      return jsonResponse({});
    }
  });

  await assert.rejects(
    () => supabase.logAuditEvent({ event_type: "login", action: "login", module_code: "portal" }),
    /SUPABASE_SERVICE_ROLE_KEY/
  );
});
