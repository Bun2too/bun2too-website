import { test } from "node:test";
import assert from "node:assert/strict";
import {
  COOKIE_CONSENT_NAME,
  COOKIE_CONSENT_SECONDS,
  cookieConsentFromHeader,
  createCookieConsent,
  parseCookieConsent,
  readInsightIds,
} from "../src/lib/cookie-consent";
const now = Date.now();
const encode = (value: unknown) => encodeURIComponent(JSON.stringify(value));

test("optional storage is denied for absent, stale, expired, or malformed consent", () => {
  const valid = createCookieConsent(true, now);
  for (const value of [
    undefined,
    "",
    "%",
    "null",
    "[]",
    "{}",
    "x".repeat(1001),
    encode({ ...valid, version: "old" }),
    encode({ ...valid, necessary: false }),
    encode({ ...valid, preferences: "yes" }),
    encode({ ...valid, marketing: "yes" }),
    encode({ ...valid, analytics: "yes" }),
    encode({ ...valid, version: "2026-11-08" }),
    encode(createCookieConsent(true, now - COOKIE_CONSENT_SECONDS * 1000)),
    encode(createCookieConsent(true, now + 120000)),
    encode({ ...valid, expiresAt: now + 999999999999 }),
  ]) {
    assert.equal(parseCookieConsent(value, now), null);
  }
});
test("choices round-trip and preference-only permission never implicitly grants tracking", () => {
  for (const allowed of [true, false]) {
    const record = createCookieConsent(allowed, now);
    assert.deepEqual(
      cookieConsentFromHeader(
        `unrelated=value; ${COOKIE_CONSENT_NAME}=${encode(record)}`,
        now,
      ),
      record,
    );
    assert.equal(record.marketing, false);
    assert.equal(
      record.expiresAt - record.updatedAt,
      COOKIE_CONSENT_SECONDS * 1000,
    );
  }
  const granular = createCookieConsent(
    { preferences: false, analytics: true, marketing: false },
    now,
  );
  assert.deepEqual(parseCookieConsent(encode(granular), now), granular);
  const all = createCookieConsent(
    { preferences: true, analytics: true, marketing: true },
    now,
  );
  assert.deepEqual(parseCookieConsent(encode(all), now), all);
  assert.equal(
    cookieConsentFromHeader(
      `other_${COOKIE_CONSENT_NAME}=${encode(createCookieConsent(true, now))}`,
      now,
    ),
    null,
  );
});
test("reading-list storage is not accessed before opt-in and tolerates corrupt or blocked storage", () => {
  let reads = 0;
  const storage = {
    getItem: () => {
      reads++;
      return '["one",null,9,"two"]';
    },
  };
  assert.deepEqual(readInsightIds(false, storage), []);
  assert.equal(reads, 0);
  assert.deepEqual(readInsightIds(true, storage), ["one", "two"]);
  assert.equal(reads, 1);
  assert.deepEqual(
    readInsightIds(true, {
      getItem: () => {
        throw new Error("Blocked");
      },
    }),
    [],
  );
  assert.deepEqual(
    readInsightIds(true, { getItem: () => '{"unexpected":true}' }),
    [],
  );
});
