import assert from "node:assert/strict";
import { test } from "node:test";
import { parseSignup, parseTopics, RequestError } from "../src/lib/consent";
import {
  provisionSubscriber,
  updatePreference,
  type Profile,
  type SubscriberStore,
} from "../src/lib/subscriptions";
const now = "2026-11-07T18:00:00.000Z";
function fakeStore(profiles: Profile[] = []) {
  const creates: Parameters<SubscriberStore["create"]>[0][] = [];
  const updates: { id: string; metadata: Record<string, unknown> }[] = [];
  const store: SubscriberStore = {
    findByEmail: async () => profiles,
    create: async (value) => {
      creates.push(value);
    },
    get: async (id) => {
      const user = profiles.find((p) => p.user_id === id);
      if (!user) throw new Error("Not found");
      return user;
    },
    update: async (id, metadata) => {
      updates.push({ id, metadata });
    },
  };
  return { store, creates, updates };
}
test("signup normalizes email and accepts only supported topics and explicit consent", () => {
  assert.deepEqual(
    parseSignup({
      email: " Customer@Example.com ",
      consent: true,
      topics: ["customer-technology"],
    }),
    {
      email: "customer@example.com",
      topics: ["customer-technology"],
      captchaToken: "",
    },
  );
  for (const data of [
    { email: "a@b.com", topics: ["fintech"] },
    { email: "invalid", consent: true, topics: ["fintech"] },
    { email: "a@b.com", consent: true, topics: [] },
    { email: "a@b.com", consent: true, topics: ["admin"] },
  ])
    assert.throws(() => parseSignup(data), RequestError);
  assert.throws(() => parseTopics("fintech"), RequestError);
  assert.equal(parseSignup({ website: "bot.example" }), null);
});
test("new subscriber is passwordless, unverified, and pending with consent provenance", async () => {
  const { store, creates } = fakeStore();
  await provisionSubscriber(
    store,
    "email",
    "a@example.com",
    ["customer-technology"],
    now,
  );
  assert.equal(creates.length, 1);
  assert.equal(creates[0].connection, "email");
  assert.equal(creates[0].email_verified, false);
  assert.equal("password" in creates[0], false);
  const data = creates[0].app_metadata.bun2too as {
    newsletter: {
      status: string;
      requested_at: string;
      consent_version: string;
    };
  };
  assert.equal(data.newsletter.status, "pending_verification");
  assert.equal(data.newsletter.requested_at, now);
  assert.equal(data.newsletter.consent_version, "2026-11-07");
});
test("anonymous duplicate signup never changes an existing profile or reactivates consent", async () => {
  const { store, creates, updates } = fakeStore([
    {
      user_id: "email|existing",
      identities: [{ connection: "email" }],
      app_metadata: { bun2too: { newsletter: { status: "unsubscribed" } } },
    },
  ]);
  await provisionSubscriber(store, "email", "a@example.com", ["fintech"], now);
  assert.equal(creates.length, 0);
  assert.equal(updates.length, 0);
});
test("a separate social identity does not prevent credentialless email signup or get linked", async () => {
  const { store, creates, updates } = fakeStore([
    {
      user_id: "google-oauth2|123",
      identities: [{ connection: "google-oauth2" }],
    },
  ]);
  await provisionSubscriber(store, "email", "a@example.com", ["fintech"], now);
  assert.equal(creates.length, 1);
  assert.equal(updates.length, 0);
});
test("concurrent duplicate creation is idempotent but provider errors propagate", async () => {
  const { store } = fakeStore();
  store.create = async () => {
    throw { statusCode: 409 };
  };
  await provisionSubscriber(store, "email", "a@example.com", ["fintech"]);
  store.create = async () => {
    throw { statusCode: 429 };
  };
  await assert.rejects(
    provisionSubscriber(store, "email", "a@example.com", ["fintech"]),
  );
});
test("subscription activation requires a provider-verified email", async () => {
  const { store, updates } = fakeStore([
    { user_id: "email|unverified", email_verified: false },
  ]);
  await assert.rejects(
    updatePreference(store, "email|unverified", true, ["fintech"], now),
    (error) => error instanceof RequestError && error.status === 403,
  );
  assert.equal(updates.length, 0);
});
test("authenticated preference update preserves unrelated metadata and records confirmation", async () => {
  const { store, updates } = fakeStore([
    {
      user_id: "email|verified",
      email_verified: true,
      app_metadata: {
        plan: "existing",
        bun2too: { customer: "123", newsletter: { requested_at: "earlier" } },
      },
    },
  ]);
  const result = await updatePreference(
    store,
    "email|verified",
    true,
    ["fintech"],
    now,
  );
  assert.equal(result.status, "subscribed");
  assert.equal(result.confirmed_at, now);
  assert.equal(result.requested_at, "earlier");
  assert.equal(updates[0].id, "email|verified");
  assert.equal(updates[0].metadata.plan, "existing");
  assert.equal(
    (updates[0].metadata.bun2too as { customer: string }).customer,
    "123",
  );
});
test("withdrawal works even for an unverified account and records the timestamp", async () => {
  const { store, updates } = fakeStore([
    { user_id: "email|123", email_verified: false },
  ]);
  const result = await updatePreference(store, "email|123", false, [], now);
  assert.equal(result.status, "unsubscribed");
  assert.equal(result.withdrawn_at, now);
  assert.equal(updates.length, 1);
});
