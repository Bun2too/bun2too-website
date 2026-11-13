import { defineConfig, devices } from "@playwright/test";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import {
  COOKIE_CONSENT_NAME,
  createCookieConsent,
} from "./src/lib/cookie-consent";
const consent = createCookieConsent(false);
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://localhost:3100",
    trace: "retain-on-failure",
    // Existing flows run as a returning necessary-only visitor. Cookie tests start fresh.
    storageState: {
      cookies: [
        {
          name: COOKIE_CONSENT_NAME,
          value: encodeURIComponent(JSON.stringify(consent)),
          domain: "localhost",
          path: "/",
          expires: consent.expiresAt / 1000,
          httpOnly: false,
          secure: false,
          sameSite: "Lax",
        },
      ],
      origins: [],
    },
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    {
      name: "mobile",
      use: { ...devices["iPhone 13"], defaultBrowserType: "chromium" },
    },
  ],
  webServer: {
    env: {
      INSIGHTS_API_ORIGIN: "https://editorial.example.invalid",
      CONTENTFUL_ENABLED: "true",
      CONTENTFUL_SPACE_ID: "fixture-space",
      CONTENTFUL_DELIVERY_TOKEN: "fixture-delivery-token",
      CONTENTFUL_ENVIRONMENT: "qa",
      NODE_OPTIONS: [
        process.env.NODE_OPTIONS,
        `--import=${pathToFileURL(resolve("tests/fixtures/insights-fetch.mjs")).href}`,
      ]
        .filter(Boolean)
        .join(" "),
    },
    command: "npx next start --port 3100 --hostname 127.0.0.1",
    url: "http://localhost:3100",
    reuseExistingServer: false,
    timeout: 60000,
  },
});
