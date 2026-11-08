import { test } from "node:test";
import assert from "node:assert/strict";
import {
  privateRuntimeKeys,
  publicBuildKeys,
  requiredKeys,
  syncNetlifyEnvironment,
  validateDeployment,
} from "../scripts/deploy-config.mjs";
function configuration() {
  return {
    ...Object.fromEntries(requiredKeys.map((key) => [key, "fixture-value"])),
    NEXT_PUBLIC_SITE_URL: "https://website.example.com",
    SITE_ENVIRONMENT: "dev",
    NEXT_PUBLIC_AUTH0_DOMAIN: "tenant.example.auth0.com",
    AUTH0_DOMAIN: "tenant.example.auth0.com",
    AUTH0_AUDIENCE: "https://api.example.invalid",
    NEXT_PUBLIC_AUTH0_AUDIENCE: "https://api.example.invalid",
    NEXT_PUBLIC_GTM_CONTAINER_ID: "GTM-TEST123",
    NEXT_PUBLIC_GA4_MEASUREMENT_ID: "G-TEST123456",
    ONYX_API_BASE_URL: "https://support.example.invalid/api",
    INSIGHTS_API_ORIGIN: "https://editorial.example.invalid",
    SUPPORT_SESSION_SECRET: "fixture-value-with-at-least-thirty-two-characters",
    ONYX_PUBLIC_AGENT_ID: "12",
    ONYX_SEARCH_TOOL_ID: "4",
  };
}
test("deployment validation rejects incomplete and mismatched configuration without echoing values", () => {
  assert.throws(() => validateDeployment({}), /Missing NETLIFY_AUTH_TOKEN/);
  const env = configuration();
  assert.doesNotThrow(() => validateDeployment(env));
  const value = "private-mismatched-value";
  assert.throws(
    () => validateDeployment({ ...env, AUTH0_DOMAIN: value }),
    (error) => error instanceof Error && !error.message.includes(value),
  );
  assert.throws(
    () =>
      validateDeployment({
        ...env,
        INSIGHTS_API_ORIGIN: "http://example.invalid",
      }),
    /Invalid HTTPS URL/,
  );
});
test("runtime sync selects the intended site and never forwards deployment credentials", async () => {
  const calls: { url: string; body: Record<string, unknown> | undefined }[] =
    [];
  const env = configuration();
  let first = true;
  const fetcher = async (
    url: string,
    options: { method?: string; body?: string },
  ) => {
    calls.push({
      url,
      body: options.body ? JSON.parse(options.body) : undefined,
    });
    if (first) {
      first = false;
      return Response.json({
        account_id: "fixture-account",
        ssl_url: env.NEXT_PUBLIC_SITE_URL,
      });
    }
    return new Response(null, { status: options.method === "PUT" ? 404 : 201 });
  };
  const count = await syncNetlifyEnvironment(env, fetcher);
  assert.equal(count, privateRuntimeKeys.length + publicBuildKeys.length);
  const payloads = calls.flatMap((call) =>
    call.body ? (Array.isArray(call.body) ? call.body : [call.body]) : [],
  );
  assert.equal(
    payloads.some((payload) =>
      ["NETLIFY_AUTH_TOKEN", "NETLIFY_SITE_ID"].includes(payload.key),
    ),
    false,
  );
  for (const payload of payloads)
    assert.equal(payload.values[0].context, "production");
  assert.ok(
    calls
      .slice(1)
      .every((call) => new URL(call.url).searchParams.has("site_id")),
  );
  const rejectedCalls: string[] = [];
  await assert.rejects(
    syncNetlifyEnvironment(env, async (url: string) => {
      rejectedCalls.push(url);
      return Response.json({
        account_id: "fixture-account",
        ssl_url: "https://different.example.com",
      });
    }),
    /does not match/,
  );
  assert.equal(rejectedCalls.length, 1);
});
