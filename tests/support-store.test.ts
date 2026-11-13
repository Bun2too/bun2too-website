import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { BlobsServer } from "@netlify/blobs/server";
import { getSupportStore } from "../src/lib/support-store";
import { consumeLimit, parseInquiry, saveInquiry } from "../src/lib/support";
import { acknowledgeInquiry, notifyInquiry } from "../src/lib/support-email";
import { RequestError } from "../src/lib/consent";

test("real local Blobs reads support conditional limits and one email per notification channel", async () => {
  const directory = await mkdtemp(join(tmpdir(), "b2t-blobs-fixture-"));
  const server = new BlobsServer({ directory, token: "fixture-token" });
  const oldEnv = Object.fromEntries(
    ["NETLIFY_BLOBS_CONTEXT", "NETLIFY_DEV", "NODE_ENV"].map((key) => [
      key,
      process.env[key],
    ]),
  );
  const oldFetch = globalThis.fetch;
  try {
    const { port } = await server.start();
    const url = `http://localhost:${port}`;
    Object.assign(process.env, {
      NETLIFY_DEV: "true",
      NODE_ENV: "test",
      NETLIFY_BLOBS_CONTEXT: Buffer.from(
        JSON.stringify({
          siteID: "fixture-site",
          token: "fixture-token",
          edgeURL: url,
          uncachedEdgeURL: url,
        }),
      ).toString("base64"),
    });
    const store = getSupportStore();
    await consumeLimit(store, "fixture-rate", 2, 60000);
    await consumeLimit(store, "fixture-rate", 2, 60000);
    await assert.rejects(
      consumeLimit(store, "fixture-rate", 2, 60000),
      (error) => error instanceof RequestError && error.status === 429,
    );
    const input = parseInquiry({
      name: "Fixture",
      email: "visitor@example.com",
      topic: "project",
      message: "A synthetic inquiry for storage integration.",
      consent: true,
      requestId: randomUUID(),
    })!;
    await saveInquiry(store, "fixture-owner", input);
    const config = {
      host: "smtp.example.invalid",
      port: 587,
      from: "sender@example.com",
      to: "manager@example.com",
      auth: { user: "fixture-user", pass: "fixture-password" },
    };
    const recipients: string[] = [];
    const send = async (message: { to?: unknown }) => {
      recipients.push(String(message.to));
    };
    const signal = new AbortController().signal;
    for (let attempt = 0; attempt < 2; attempt++) {
      assert.equal(
        await notifyInquiry(
          store,
          "fixture-owner",
          input.requestId,
          config,
          signal,
          send,
        ),
        "accepted",
      );
      assert.equal(
        await acknowledgeInquiry(
          store,
          "fixture-owner",
          input.requestId,
          config,
          signal,
          send,
        ),
        "accepted",
      );
    }
    assert.deepEqual(recipients, [config.to, input.email]);
    const key = `inquiries/fixture-owner/${input.requestId}`;
    const record = await store.read<{
      notification: { status: string };
      acknowledgment: { status: string };
    }>(key);
    assert.equal(record?.data.notification.status, "accepted");
    assert.equal(record?.data.acknowledgment.status, "accepted");
    process.env.NODE_ENV = "production";
    await assert.rejects(store.read(key), /could not confirm this record/);
    process.env.NODE_ENV = "test";

    // A write between the version lookup and read must force a fresh snapshot.
    await store.write("fixture-counter", { value: 1 });
    let reads = 0;
    globalThis.fetch = async (input, init) => {
      if (
        String(input).endsWith("/fixture-counter") &&
        init?.method?.toLowerCase() === "get" &&
        ++reads === 2
      )
        await store.write("fixture-counter", { value: 2 });
      return oldFetch(input, init);
    };
    const current = await getSupportStore().read<{ value: number }>(
      "fixture-counter",
    );
    assert.equal(current?.data.value, 2);
    assert.ok(reads >= 3);
    assert.equal(
      (
        await store.write(
          "fixture-counter",
          { value: 3 },
          { onlyIfMatch: current!.etag },
        )
      ).modified,
      true,
    );
  } finally {
    globalThis.fetch = oldFetch;
    for (const [key, value] of Object.entries(oldEnv)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    await server.stop();
    await rm(directory, { recursive: true, force: true });
  }
});
