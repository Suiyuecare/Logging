import test from "node:test";
import assert from "node:assert/strict";

import {
  bestDataScope,
  canAccessModule,
  createPlatformAuth,
  hasPermission,
  normalizePlatformContext
} from "../src/index.js";

test("normalizes a portal context from permissions and roles", () => {
  const context = normalizePlatformContext({
    user_id: "user-1",
    email: "admin@suiyuecare.com",
    roles: ["group_admin", "group_admin"],
    permissions: ["hr.employee.view", "system.permissions.manage"],
    data_scope: [{ scope_type: "group", company_id: "suiyue" }]
  });

  assert.equal(context.display_name, "admin@suiyuecare.com");
  assert.deepEqual(context.roles, ["group_admin"]);
  assert.equal(hasPermission(context, "hr.employee.view"), true);
  assert.equal(canAccessModule(context, "hr"), true);
  assert.equal(canAccessModule(context, "accounting"), false);
});

test("chooses the broadest available data scope", () => {
  const context = normalizePlatformContext({
    data_scope: [
      { scope_type: "department", department_id: "hr" },
      { scope_type: "group", company_id: "suiyue" },
      { scope_type: "self" }
    ]
  });

  assert.deepEqual(bestDataScope(context), {
    scope_type: "group",
    company_id: "suiyue",
    institution_id: null,
    region_id: null,
    department_id: null,
    business_unit_id: null,
    class_id: null,
    case_id: null
  });
});

test("loads a user context through the Supabase RPC contract", async () => {
  const calls = [];
  const platformAuth = createPlatformAuth({
    supabase: {
      rpc(name, params) {
        calls.push({ name, params });
        return {
          data: {
            user_id: "user-1",
            email: "ops@suiyuecare.com",
            account_status: "active",
            roles: ["hr_manager"],
            permissions: ["hr.employee.manage"],
            data_scope: [{ scope_type: "company", company_id: "suiyue" }]
          },
          error: null
        };
      }
    }
  });

  const context = await platformAuth.getUserContext("user-1");

  assert.deepEqual(calls, [
    {
      name: "get_platform_user_context",
      params: { target_user_id: "user-1" }
    }
  ]);
  assert.equal(context.enabled_modules[0].code, "hr");
});

test("rejects inactive accounts", async () => {
  const platformAuth = createPlatformAuth({
    supabase: {
      rpc() {
        return {
          data: {
            user_id: "user-2",
            account_status: "disabled"
          },
          error: null
        };
      }
    }
  });

  await assert.rejects(() => platformAuth.getUserContext("user-2"), /Account is not active/);
});

test("rejects users without a platform profile", async () => {
  const platformAuth = createPlatformAuth({
    supabase: {
      rpc() {
        return {
          data: null,
          error: null
        };
      }
    }
  });

  await assert.rejects(() => platformAuth.getUserContext("missing-user"), /No platform profile/);
});
