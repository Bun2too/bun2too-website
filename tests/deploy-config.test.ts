import { test } from "node:test";
import assert from "node:assert/strict";
import {
  privateRuntimeKeys,
  publicBuildKeys,
  requiredKeys,
  syncNetlifyEnvironment,
  validateDeployment,
  verifyAuth0Connection,
  inspectNetlifySite,
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
    INSIGHTS_API_ORIGIN: "https://editorial.example.invalid",
    SUPPORT_SESSION_SECRET: "fixture-value-with-at-least-thirty-two-characters",
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

test("site mismatch logs the API/status and public comparison, and stops before any writes", async () => {
  const env = {
    ...configuration(),
    NETLIFY_SITE_ID: "fixture-private-site-id",
    NETLIFY_AUTH_TOKEN: "fixture-private-token",
  };
  const logs: string[] = [];
  const methods: string[] = [];
  await assert.rejects(
    syncNetlifyEnvironment(
      env,
      async (url: string, options: { method?: string }) => {
        methods.push(options.method || "GET");
        assert.equal(
          new URL(url).pathname,
          `/api/v1/sites/${env.NETLIFY_SITE_ID}`,
        );
        return Response.json({
          id: env.NETLIFY_SITE_ID,
          account_id: "fixture-private-account-id",
          name: "fixture-other-project",
          ssl_url: "https://other.example.com/",
          custom_domain: "other.example.com",
          domain_aliases: ["www.other.example.com"],
          password: "fixture-password-withheld",
          notification_email: "private@example.invalid",
          admin_url: "https://private.example.invalid/admin",
          build_settings: { env: { SOME_SECRET: "fixture-env-withheld" } },
        });
      },
      (line: string) => logs.push(line),
    ),
    /does not match/,
  );
  const output = logs.join("\n");
  assert.match(
    output,
    /GET https:\/\/api.netlify.com\/api\/v1\/sites\/\{NETLIFY_SITE_ID\}/,
  );
  assert.match(output, /HTTP 200/);
  assert.match(
    output,
    /Expected NEXT_PUBLIC_SITE_URL hostname: "website.example.com"/,
  );
  assert.match(output, /Returned custom_domain hostname: "other.example.com"/);
  assert.match(output, /www.other.example.com/);
  assert.match(output, /Hostname comparison: MISMATCH/);
  assert.doesNotMatch(
    output,
    /fixture-private|fixture-password|fixture-env|private@example|private.example/,
  );
  assert.deepEqual(methods, ["GET"]);
});

test("custom domains, aliases and the project's default hostname match with a trailing slash", async () => {
  for (const hostname of [
    "custom.example.com",
    "www.custom.example.com",
    "fixture-project.netlify.app",
  ]) {
    const methods: string[] = [];
    await inspectNetlifySite(
      {
        NETLIFY_AUTH_TOKEN: "fixture-token",
        NETLIFY_SITE_ID: "fixture-site",
        NEXT_PUBLIC_SITE_URL: `https://${hostname}/`,
      },
      async (_url: string, options: { method?: string }) => {
        methods.push(options.method || "GET");
        return Response.json({
          name: "fixture-project",
          ssl_url: "https://custom.example.com",
          custom_domain: "custom.example.com",
          domain_aliases: ["www.custom.example.com"],
        });
      },
    );
    assert.deepEqual(methods, ["GET"]);
  }
});

test("read-only inspection needs no Auth0 credentials and reports safe HTTP failures", async () => {
  const logs: string[] = [];
  await assert.rejects(
    inspectNetlifySite(
      {
        NETLIFY_AUTH_TOKEN: "fixture-token",
        NETLIFY_SITE_ID: "fixture-site",
        NEXT_PUBLIC_SITE_URL: "https://website.example.com",
      },
      async () =>
        new Response("fixture-private-provider-details", { status: 404 }),
      (line: string) => logs.push(line),
    ),
    (error: Error) => {
      assert.match(
        error.message,
        /HTTP 404.*NETLIFY_AUTH_TOKEN.*NETLIFY_SITE_ID/,
      );
      assert.doesNotMatch(error.message, /fixture-private-provider-details/);
      return true;
    },
  );
  assert.match(logs.join("\n"), /HTTP 404/);
  assert.doesNotMatch(logs.join("\n"), /fixture-private-provider-details/);
});

test("malformed/pasted URLs and hostile metadata do not leak raw fields or bypass the site guard", async () => {
  const env = {
    NETLIFY_AUTH_TOKEN: "fixture-token",
    NETLIFY_SITE_ID: "fixture-site",
    NEXT_PUBLIC_SITE_URL: "https://website.example.com",
  };
  await assert.rejects(
    inspectNetlifySite(
      { ...env, NEXT_PUBLIC_SITE_URL: "'https://website.example.com/'," },
      () => assert.fail("must not fetch"),
    ),
    /plain HTTPS origin/,
  );
  const logs: string[] = [];
  await assert.rejects(
    inspectNetlifySite(
      env,
      async () =>
        Response.json({
          name: "invalid\nname",
          custom_domain: "fixture-user:fixture-password@website.example.com",
          domain_aliases: "website.example.com",
          url: "https://other.example.com/private?token=fixture-token",
        }),
      (line: string) => logs.push(line),
    ),
    /does not match/,
  );
  assert.doesNotMatch(
    logs.join("\n"),
    /fixture-user|fixture-password|invalid\\nname|token=|fixture-token/,
  );
});
test("audience drift and pasted whitespace fail with setting names, never values", () => {
  const env = configuration();
  for (const changes of [
    { AUTH0_AUDIENCE: `${env.NEXT_PUBLIC_AUTH0_AUDIENCE}/` },
    { AUTH0_AUDIENCE: "private-wrong-identifier" },
    { NEXT_PUBLIC_AUTH0_CLIENT_ID: " private-client " },
  ])
    assert.throws(
      () => validateDeployment({ ...env, ...changes }),
      (error: Error) => {
        assert.match(
          error.message,
          /AUTH0_AUDIENCE|NEXT_PUBLIC_AUTH0_CLIENT_ID/,
        );
        assert.doesNotMatch(
          error.message,
          /private-wrong-identifier|private-client/,
        );
        return true;
      },
    );
});
test("Auth0 preflight verifies the M2M grant and scopes without profile writes", async () => {
  const calls: string[] = [];
  await verifyAuth0Connection(
    configuration(),
    async (url: string, options: { body: string }) => {
      calls.push(new URL(url).pathname);
      assert.equal(JSON.parse(options.body).grant_type, "client_credentials");
      return Response.json({
        access_token: "fixture-token",
        scope: "read:users create:users update:users_app_metadata",
      });
    },
  );
  assert.deepEqual(calls, ["/oauth/token"]);
  // OAuth permits omission when the server grants exactly the requested scope.
  await assert.doesNotReject(
    verifyAuth0Connection(configuration(), async () =>
      Response.json({ access_token: "fixture-token" }),
    ),
  );
  for (const response of [
    new Response("private provider failure", { status: 401 }),
    Response.json({
      access_token: "fixture-denied-token",
      scope: "read:users",
    }),
  ])
    await assert.rejects(
      verifyAuth0Connection(configuration(), async () => response),
      (error: Error) => {
        assert.match(error.message, /Auth0 Management connection/);
        assert.doesNotMatch(
          error.message,
          /private provider failure|fixture-denied-token/,
        );
        return true;
      },
    );
});
test("optional AI must be explicitly enabled with complete public-support configuration", () => {
  assert.doesNotThrow(() => validateDeployment(configuration()));
  assert.throws(
    () =>
      validateDeployment({
        ...configuration(),
        OPENWEBUI_PUBLIC_SUPPORT_ENABLED: "true",
      }),
    /Missing OPENWEBUI_BASE_URL/,
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
