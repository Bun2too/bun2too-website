import { defineConfig, devices } from "@playwright/test";
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
    command: "npx next start --port 3100 --hostname 127.0.0.1",
    url: "http://localhost:3100",
    reuseExistingServer: false,
    timeout: 60000,
  },
});
