import assert from "node:assert/strict";
import { test } from "node:test";
import {
  sameOrigin,
  publicOrigin,
  readBody,
  verifyCaptcha,
} from "../src/lib/api";
import { authenticate } from "../src/lib/auth0-server";
import { RequestError } from "../src/lib/consent";
import { POST } from "../src/app/api/subscriptions/route";
const request = (body: string, origin = "https://bun2too.com") =>
  new Request("https://bun2too.com/api/subscriptions", {
    method: "POST",
    headers: { origin, "Content-Type": "application/json" },
    body,
  });
test("same-origin checks reject absent and external origins", () => {
  assert.throws(
    () => sameOrigin(request("{}", "https://example.com")),
    RequestError,
  );
  assert.throws(
    () => sameOrigin(new Request("https://bun2too.com/api/subscriptions")),
    RequestError,
  );
  assert.doesNotThrow(() => sameOrigin(request("{}")));
});
test("public origin handles the Next.js internal hostname and HTTPS proxy", () => {
  const request = new Request("http://localhost:3000/api/subscriptions", {
    headers: {
      host: "bun2too.com",
      "x-forwarded-proto": "https",
      origin: "https://bun2too.com",
    },
  });
  assert.equal(publicOrigin(request), "https://bun2too.com");
  assert.doesNotThrow(() => sameOrigin(request));
  request.headers.set("origin", "https://attacker.example");
  request.headers.set("x-forwarded-host", "attacker.example");
  assert.throws(() => sameOrigin(request), RequestError);
});
test("signup verification fails closed and checks the token hostname and action", async () => {
  const previous = {
    secret: process.env.TURNSTILE_SECRET_KEY,
    mode: process.env.NODE_ENV,
    fetch: globalThis.fetch,
  };
  try {
    Object.assign(process.env, { NODE_ENV: "production" });
    delete process.env.TURNSTILE_SECRET_KEY;
    await assert.rejects(
      verifyCaptcha("", "bun2too.com"),
      (error) => error instanceof RequestError && error.status === 503,
    );
    process.env.TURNSTILE_SECRET_KEY = "test-only-secret";
    await assert.rejects(verifyCaptcha("", "bun2too.com"), RequestError);
    let result = {
      success: true,
      hostname: "bun2too.com",
      action: "subscribe",
    };
    globalThis.fetch = async () => Response.json(result);
    await verifyCaptcha("test-token", "bun2too.com");
    result = { ...result, hostname: "attacker.example" };
    await assert.rejects(
      verifyCaptcha("test-token", "bun2too.com"),
      RequestError,
    );
    result = { ...result, hostname: "bun2too.com", action: "other-action" };
    await assert.rejects(
      verifyCaptcha("test-token", "bun2too.com"),
      RequestError,
    );
  } finally {
    globalThis.fetch = previous.fetch;
    if (previous.secret === undefined) delete process.env.TURNSTILE_SECRET_KEY;
    else process.env.TURNSTILE_SECRET_KEY = previous.secret;
    if (previous.mode === undefined) delete process.env.NODE_ENV;
    else Object.assign(process.env, { NODE_ENV: previous.mode });
  }
});
test("body parser rejects malformed, unsupported, and oversized input", async () => {
  await assert.rejects(
    readBody(request("not json")),
    (error) => error instanceof RequestError && error.status === 400,
  );
  await assert.rejects(
    readBody(request(JSON.stringify({ payload: "a".repeat(5000) }))),
    (error) => error instanceof RequestError && error.status === 413,
  );
  await assert.rejects(
    readBody(
      new Request("https://bun2too.com", { method: "POST", body: "{}" }),
    ),
    (error) => error instanceof RequestError && error.status === 415,
  );
});
test("subscription endpoint validates before contacting Auth0 and never caches responses", async () => {
  const response = await POST(
    request(
      JSON.stringify({ email: "bad", consent: true, topics: ["fintech"] }),
    ),
  );
  assert.equal(response.status, 400);
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  const crossOrigin = await POST(request("{}", "https://example.com"));
  assert.equal(crossOrigin.status, 403);
});
test("private endpoint rejects a missing bearer token", async () => {
  await assert.rejects(
    authenticate(new Request("https://bun2too.com")),
    (error) => error instanceof RequestError && error.status === 401,
  );
});

test("access tokens enforce signature, issuer, audience, expiry, client, and scope", async () => {
  const { generateKeyPair, exportJWK, SignJWT } = await import("jose");
  const { privateKey, publicKey } = await generateKeyPair("RS256");
  const jwk = await exportJWK(publicKey);
  jwk.kid = "test-key";
  jwk.alg = "RS256";
  const oldFetch = globalThis.fetch;
  const oldDomain = process.env.AUTH0_DOMAIN;
  const oldAudience = process.env.AUTH0_AUDIENCE;
  const oldClient = process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID;
  process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID = "test-spa-client-id";
  process.env.AUTH0_DOMAIN = "tokens.example.auth0.com";
  process.env.AUTH0_AUDIENCE = "https://bun2too.com/api";
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ keys: [jwk] }), {
      headers: { "content-type": "application/json" },
    });
  async function token(
    overrides: Record<string, unknown> = {},
    key = privateKey,
  ) {
    return new SignJWT({
      sub: "email|123",
      azp: "test-spa-client-id",
      scope: "openid manage:subscriptions",
      ...overrides,
    })
      .setProtectedHeader({ alg: "RS256", kid: "test-key" })
      .setIssuer(
        typeof overrides.iss === "string"
          ? overrides.iss
          : "https://tokens.example.auth0.com/",
      )
      .setAudience(
        typeof overrides.aud === "string"
          ? overrides.aud
          : "https://bun2too.com/api",
      )
      .setExpirationTime(overrides.exp === 0 ? 0 : "5m")
      .sign(key);
  }
  const authorized = (value: string) =>
    authenticate(
      new Request("https://bun2too.com/api/preferences", {
        headers: { authorization: `Bearer ${value}` },
      }),
    );
  try {
    assert.equal(await authorized(await token()), "email|123");
    for (const claims of [
      { iss: "https://attacker.example/" },
      { aud: "spa-client-id" },
      { azp: "another-client" },
      { exp: 0 },
      { sub: "machine@clients" },
    ])
      await assert.rejects(
        authorized(await token(claims)),
        (error) => error instanceof RequestError && error.status === 401,
      );
    await assert.rejects(
      authorized(await token({ scope: "openid" })),
      (error) => error instanceof RequestError && error.status === 403,
    );
    const other = await generateKeyPair("RS256");
    await assert.rejects(
      authorized(await token({}, other.privateKey)),
      (error) => error instanceof RequestError && error.status === 401,
    );
  } finally {
    if (oldClient === undefined) delete process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID;
    else process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID = oldClient;
    globalThis.fetch = oldFetch;
    if (oldDomain === undefined) delete process.env.AUTH0_DOMAIN;
    else process.env.AUTH0_DOMAIN = oldDomain;
    if (oldAudience === undefined) delete process.env.AUTH0_AUDIENCE;
    else process.env.AUTH0_AUDIENCE = oldAudience;
  }
});
