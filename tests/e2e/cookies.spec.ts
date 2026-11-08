import { expect, test } from "@playwright/test";
import {
  COOKIE_CONSENT_NAME,
  READING_STORAGE_KEY,
} from "../../src/lib/cookie-consent";
test.use({ storageState: { cookies: [], origins: [] } });
test.beforeEach(async ({ page }) => {
  await page.route("https://www.googletagmanager.com/**", (route) =>
    route.fulfill({
      contentType: "application/javascript",
      body: "/* isolated GTM fixture */",
    }),
  );
});

test("cookie banner and preferences fit the viewport", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  await expect(page.locator(".cookie-banner")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("cookie-banner.png") });
  await page.getByRole("button", { name: "Customize" }).click();
  const dialog = page.getByRole("dialog", { name: "Your cookie choices." });
  await expect(dialog).toBeVisible();
  await dialog
    .getByRole("button", { name: "Save choices" })
    .scrollIntoViewIfNeeded();
  await expect(
    dialog.getByRole("button", { name: "Save choices" }),
  ).toBeInViewport();
  await page.screenshot({ path: testInfo.outputPath("cookie-settings.png") });
});

test("blocked consent cookies report that a choice could not be remembered", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(document, "cookie", {
      configurable: true,
      get: () => "",
      set: () => {},
    });
  });
  await page.goto("/cookies");
  await page.getByRole("button", { name: "Necessary only" }).click();
  await expect(page.getByRole("status")).toContainText("could not remember");
  await expect(page.locator(".cookie-banner")).toHaveCount(0);
  await page.reload();
  await expect(page.locator(".cookie-banner")).toBeVisible();
});

test("first visit denies optional storage; closing settings does not accept; necessary-only persists", async ({
  page,
  context,
}) => {
  await page.goto("/cookies");
  const banner = page.getByRole("region", {
    name: "A little clarity on cookies.",
  });
  await expect(banner).toBeVisible();
  expect(
    (await context.cookies()).find(
      (cookie) => cookie.name === COOKIE_CONSENT_NAME,
    ),
  ).toBeUndefined();
  await banner.getByRole("button", { name: "Customize" }).click();
  const settings = page.getByRole("dialog", { name: "Your cookie choices." });
  await expect(
    settings.getByRole("checkbox", { name: "Preferences", exact: true }),
  ).not.toBeChecked();
  await expect(
    settings.getByRole("checkbox", { name: "Marketing", exact: true }),
  ).not.toBeChecked();
  await expect(
    settings.getByRole("checkbox", { name: "Analytics", exact: true }),
  ).not.toBeChecked();
  await expect(
    settings.getByRole("checkbox", { name: "Necessary cookies, always on" }),
  ).toBeChecked();
  await page.keyboard.press("Escape");
  await expect(settings).not.toBeVisible();
  await expect(banner).toBeVisible();
  await banner.getByRole("button", { name: "Necessary only" }).click();
  await page.reload();
  await expect(banner).toHaveCount(0);
  const saved = (await context.cookies()).find(
    (cookie) => cookie.name === COOKIE_CONSENT_NAME,
  )!;
  expect(JSON.parse(decodeURIComponent(saved.value))).toMatchObject({
    necessary: true,
    preferences: false,
    marketing: false,
  });
  expect(saved.sameSite).toBe("Lax");
  await page
    .locator(".footer-bottom")
    .getByRole("button", { name: "Cookie settings" })
    .click();
  await expect(settings).toBeVisible();
  await expect(
    settings.getByRole("checkbox", { name: "Preferences", exact: true }),
  ).not.toBeChecked();
});

test("optional preferences survive reload and withdrawing removes only reading-list storage", async ({
  page,
}) => {
  await page.goto("/cookies");
  await page.getByRole("button", { name: "Accept optional" }).click();
  await page.evaluate((key) => {
    localStorage.setItem(key, '["example-article"]');
    localStorage.setItem("unrelated-app-data", "retain");
    sessionStorage.setItem("login-test-state", "retain");
  }, READING_STORAGE_KEY);
  await page.reload();
  await expect(page.locator(".cookie-banner")).toHaveCount(0);
  expect(
    await page.evaluate(
      (key) => localStorage.getItem(key),
      READING_STORAGE_KEY,
    ),
  ).toBe('["example-article"]');
  await page
    .locator(".footer-bottom")
    .getByRole("button", { name: "Cookie settings" })
    .click();
  const settings = page.getByRole("dialog");
  await expect(
    settings.getByRole("checkbox", { name: "Preferences", exact: true }),
  ).toBeChecked();
  await settings
    .getByRole("checkbox", { name: "Preferences", exact: true })
    .uncheck();
  await settings.getByRole("button", { name: "Save choices" }).click();
  expect(
    await page.evaluate(
      (key) => localStorage.getItem(key),
      READING_STORAGE_KEY,
    ),
  ).toBeNull();
  expect(
    await page.evaluate(() => localStorage.getItem("unrelated-app-data")),
  ).toBe("retain");
  expect(
    await page.evaluate(() => sessionStorage.getItem("login-test-state")),
  ).toBe("retain");
  await page.reload();
  await expect(page.locator(".cookie-banner")).toHaveCount(0);
});

test("invalid consent asks again and clears legacy optional reading state", async ({
  page,
  context,
}) => {
  await context.addCookies([
    {
      name: COOKIE_CONSENT_NAME,
      value: "%malformed",
      url: "http://localhost:3100",
    },
  ]);
  await page.addInitScript(
    (key) => localStorage.setItem(key, '["legacy"]'),
    READING_STORAGE_KEY,
  );
  await page.goto("/cookies");
  await expect(page.locator(".cookie-banner")).toBeVisible();
  expect(
    await page.evaluate(
      (key) => localStorage.getItem(key),
      READING_STORAGE_KEY,
    ),
  ).toBeNull();
});

test("blocked optional storage does not break cookie controls or public terms", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(() => {
    Storage.prototype.getItem = () => {
      throw new Error("Storage blocked");
    };
    Storage.prototype.setItem = () => {
      throw new Error("Storage blocked");
    };
    Storage.prototype.removeItem = () => {
      throw new Error("Storage blocked");
    };
  });
  await page.goto("/terms");
  await expect(
    page.getByRole("heading", { name: "Terms & conditions." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Necessary only" }).click();
  await expect(page.locator(".cookie-banner")).toHaveCount(0);
  expect(errors).toEqual([]);
});
