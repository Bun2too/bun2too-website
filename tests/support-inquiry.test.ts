import assert from "node:assert/strict";
import { test } from "node:test";
import { randomUUID } from "node:crypto";
import nodemailer from "nodemailer";
import { POST } from "../src/app/api/support/inquiries/route";
import { SUPPORT_COOKIE, visitor } from "../src/lib/support";

for (const failure of ["none", "all", "acknowledgment"])
  test(`inquiry API preserves each email status with ${failure} SMTP failures`, async (context) => {
    const env = {
      NODE_ENV: "test",
      TURNSTILE_SECRET_KEY: "",
      SUPPORT_SESSION_SECRET:
        "fixture-inquiry-signing-key-at-least-32-characters",
      SUPPORT_SES_SMTP_HOST: "smtp.example.invalid",
      SUPPORT_SES_SMTP_PORT: "587",
      SUPPORT_SES_SMTP_USERNAME: "fixture-smtp-user",
      SUPPORT_SES_SMTP_PASSWORD: "fixture-smtp-password",
      SUPPORT_INQUIRY_FROM_EMAIL: "sender@example.com",
      SUPPORT_INQUIRY_TO_EMAIL: "manager@example.com",
      NETLIFY_BLOBS_CONTEXT: Buffer.from(
        JSON.stringify({
          siteID: "fixture-site",
          token: "fixture-token",
          edgeURL: "https://storage.example.invalid",
          uncachedEdgeURL: "https://storage.example.invalid",
        }),
      ).toString("base64"),
    };
    const previous = Object.fromEntries(
      Object.keys(env).map((key) => [key, process.env[key]]),
    );
    Object.assign(process.env, env);
    const records = new Map<string, { data: unknown; etag: string }>();
    const oldFetch = globalThis.fetch;
    let sequence = 0;
    let sends = 0;
    context.mock.method(console, "error", () => {});
    context.mock.method(nodemailer, "createTransport", () => ({
      sendMail: async (message: { to: string }) => {
        sends++;
        assert.ok(
          [...records.values()].some((record) =>
            ["notification", "acknowledgment"].some(
              (channel) =>
                (record.data as Record<string, { status: string }>)[channel]
                  ?.status === "sending",
            ),
          ),
        );
        if (
          failure === "all" ||
          (failure === "acknowledgment" && message.to === "visitor@example.com")
        )
          throw new Error("fixture-private-provider-error");
        return { accepted: [message.to] };
      },
      close: () => {},
    }));
    globalThis.fetch = async (input, init) => {
      const url = new URL(String(input));
      assert.equal(url.hostname, "storage.example.invalid");
      const key = url.pathname;
      const old = records.get(key);
      if (init?.method?.toLowerCase() === "get")
        return old
          ? Response.json(old.data, { headers: { etag: old.etag } })
          : new Response(null, { status: 404 });
      const headers = new Headers(init?.headers);
      if (
        (headers.get("if-none-match") === "*" && old) ||
        (headers.has("if-match") && headers.get("if-match") !== old?.etag)
      )
        return new Response(null, { status: 412 });
      const etag = `fixture-${++sequence}`;
      records.set(key, { data: JSON.parse(String(init?.body)), etag });
      return new Response(null, { headers: { etag } });
    };
    try {
      const identity = visitor(
        new Request("http://localhost:3000"),
        env.SUPPORT_SESSION_SECRET,
      );
      const data = {
        name: "Fixture visitor",
        email: "visitor@example.com",
        topic: "project",
        message: "Help us with our customer technology project.",
        consent: true,
        requestId: randomUUID(),
      };
      const request = () =>
        new Request("http://localhost:3000/api/support/inquiries", {
          method: "POST",
          headers: {
            Origin: "http://localhost:3000",
            "Content-Type": "application/json",
            Cookie: `${SUPPORT_COOKIE}=${identity.value}`,
          },
          body: JSON.stringify(data),
        });
      const response = await POST(request());
      assert.equal(response.status, failure === "none" ? 201 : 202);
      const body = await response.json();
      assert.match(body.reference, /^B2T-/);
      assert.equal(
        body.notification,
        failure === "all" ? "unconfirmed" : "accepted",
      );
      assert.equal(
        body.acknowledgment,
        failure === "none" ? "accepted" : "unconfirmed",
      );
      assert.doesNotMatch(
        JSON.stringify(body),
        /smtp|manager@example|fixture-private-provider-error/,
      );
      const repeat = await POST(request());
      assert.deepEqual(await repeat.json(), body);
      assert.equal(sends, 2);
    } finally {
      globalThis.fetch = oldFetch;
      for (const [key, value] of Object.entries(previous)) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      }
    }
  });
