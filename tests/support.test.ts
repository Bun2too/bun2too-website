import assert from "node:assert/strict";
import { test } from "node:test";
import { randomUUID } from "node:crypto";
import {
  consumeLimit,
  DAY,
  parseInquiry,
  saveInquiry,
  SUPPORT_COOKIE,
  visitor,
  type SupportStore,
} from "../src/lib/support";
import { RequestError } from "../src/lib/consent";
function memory() {
  const entries = new Map<string, { data: unknown; etag: string }>();
  let sequence = 0;
  const store: SupportStore = {
    read: async <T>(key: string) =>
      (entries.get(key) as { data: T; etag: string }) || null,
    write: async (key, data, condition) => {
      const old = entries.get(key);
      if (
        (condition?.onlyIfNew && old) ||
        (condition?.onlyIfMatch && condition.onlyIfMatch !== old?.etag)
      )
        return { modified: false };
      const etag = `etag-${++sequence}`;
      entries.set(key, { data: structuredClone(data), etag });
      return { modified: true, etag };
    },
    remove: async (key) => {
      entries.delete(key);
    },
  };
  return { store, entries };
}
test("support cookies are signed, expire, and cannot be forged into another visitor", () => {
  const secret = "test-only-session-secret-32-characters-minimum";
  const now = 10000000;
  const first = visitor(new Request("https://bun2too.com"), secret, now);
  const follow = visitor(
    new Request("https://bun2too.com", {
      headers: { cookie: `${SUPPORT_COOKIE}=${first.value}` },
    }),
    secret,
    now + 1,
  );
  assert.equal(follow.owner, first.owner);
  assert.equal(follow.fresh, false);
  const forged = visitor(
    new Request("https://bun2too.com", {
      headers: { cookie: `${SUPPORT_COOKIE}=${first.value.slice(0, -1)}x` },
    }),
    secret,
    now + 1,
  );
  assert.notEqual(forged.owner, first.owner);
  assert.equal(forged.fresh, true);
  const expired = visitor(
    new Request("https://bun2too.com", {
      headers: { cookie: `${SUPPORT_COOKIE}=${first.value}` },
    }),
    secret,
    now + DAY + 1,
  );
  assert.notEqual(expired.owner, first.owner);
});
test("inquiries require consent, bounded fields, and valid request identifiers", () => {
  const valid = {
    name: "Customer",
    email: "person@example.com",
    topic: "project",
    message: "Please help with a project.",
    consent: true,
    requestId: randomUUID(),
  };
  assert.throws(() => parseInquiry({ ...valid, consent: false }), RequestError);
  assert.throws(
    () => parseInquiry({ ...valid, message: "x".repeat(2001) }),
    RequestError,
  );
  assert.throws(
    () => parseInquiry({ ...valid, requestId: "../../private" }),
    RequestError,
  );
  assert.equal(parseInquiry({ ...valid, website: "spam" }), null);
});
test("distributed limits use conditional writes and reject requests over the budget", async () => {
  const { store } = memory();
  await consumeLimit(store, "visitor", 2, 60000, 1000);
  await consumeLimit(store, "visitor", 2, 60000, 1000);
  await assert.rejects(
    consumeLimit(store, "visitor", 2, 60000, 1000),
    (error) => error instanceof RequestError && error.status === 429,
  );
  await consumeLimit(store, "visitor", 2, 60000, 61000);
});
test("private inquiries persist consent, ignore client attachments, and are idempotent", async () => {
  const { store, entries } = memory();
  const now = Date.parse("2026-11-07T12:00:00Z");
  const input = parseInquiry({
    name: "Customer",
    email: "Person@Example.com",
    topic: "project",
    message: "Help us connect our customer data.",
    consent: true,
    requestId: randomUUID(),
    transcript: ["client-injected content"],
    includeTranscript: true,
    conversationId: randomUUID(),
  })!;
  const first = await saveInquiry(store, "owner", input, now);
  const second = await saveInquiry(store, "owner", input, now);
  assert.equal(first, second);
  assert.equal(entries.size, 1);
  const record = [...entries.values()][0].data as Record<string, unknown>;
  assert.equal(record.email, "person@example.com");
  assert.equal("transcript" in record, false);
  assert.equal("conversationId" in record, false);
  assert.equal(record.expiresAt, now + 90 * DAY);
  assert.equal("marketing" in record, false);
  assert.equal(
    (record.consent as { purpose: string }).purpose,
    "respond-to-inquiry",
  );
});
test("visitor ownership isolates inquiry retries", async () => {
  const { store, entries } = memory();
  const input = parseInquiry({
    name: "Customer",
    email: "person@example.com",
    topic: "project",
    message: "Please help with a project.",
    consent: true,
    requestId: randomUUID(),
  })!;
  await saveInquiry(store, "first-visitor", input);
  await saveInquiry(store, "second-visitor", {
    ...input,
    message: "Another visitor’s inquiry.",
  });
  assert.equal(entries.size, 2);
  assert.notDeepEqual(
    entries.get(`inquiries/first-visitor/${input.requestId}`)?.data,
    entries.get(`inquiries/second-visitor/${input.requestId}`)?.data,
  );
});
