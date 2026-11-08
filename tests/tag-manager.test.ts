import { test } from "node:test";
import assert from "node:assert/strict";
import {
  canMeasurePage,
  googleConsent,
  trackingCookie,
} from "../src/lib/tag-manager";

test("analytics and advertising consent remain independent and denied before a choice", () => {
  const none = googleConsent(false, false);
  assert.equal(none.analytics_storage, "denied");
  assert.equal(none.ad_storage, "denied");
  const analytics = googleConsent(true, false);
  assert.equal(analytics.analytics_storage, "granted");
  for (const key of [
    "ad_storage",
    "ad_user_data",
    "ad_personalization",
  ] as const)
    assert.equal(analytics[key], "denied");
  assert.equal(googleConsent(false, true).ad_storage, "denied");
  assert.equal(googleConsent(true, true).ad_personalization, "granted");
});
test("private pages, embeds, callback parameters, and fragment URLs cannot initialize tracking", () => {
  for (const path of [
    "/account",
    "/account/details",
    "/api/subscriptions",
    "/insights/signup",
    "/?code=secret&state=secret",
    "/contact?email=private",
    "/#secret",
  ]) {
    assert.equal(
      canMeasurePage(new URL(path, "https://bun2too.com")),
      false,
      path,
    );
  }
  for (const path of ["/", "/services", "/insights/public-article", "/support"])
    assert.equal(canMeasurePage(new URL(path, "https://bun2too.com")), true);
});
test("withdrawal targets Google cookies without erasing app state", () => {
  for (const name of [
    "_ga",
    "_ga_EXAMPLE",
    "_gid",
    "_gat",
    "_gat_gtag_G_EXAMPLE",
  ]) {
    assert.equal(trackingCookie(name, false, false), true);
    assert.equal(trackingCookie(name, true, false), false);
  }
  assert.equal(trackingCookie("_gcl_au", true, false), true);
  assert.equal(trackingCookie("_gac_example", true, false), true);
  for (const name of [
    "bun2too_cookie_consent",
    "bun2too_support",
    "auth0.client.is.authenticated",
    "unrelated",
    "_garden",
  ])
    assert.equal(trackingCookie(name, false, false), false);
});
