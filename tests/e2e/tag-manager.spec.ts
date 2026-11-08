import { expect, test } from "@playwright/test";
import {
  COOKIE_CONSENT_NAME,
  createCookieConsent,
} from "../../src/lib/cookie-consent";
test.use({ storageState: { cookies: [], origins: [] } });
const scriptUrl = "https://www.googletagmanager.com/gtm.js?id=GTM-TEST123";
const fixture = `
  document.cookie = '_ga=fixture; Path=/';
  const commands = window.dataLayer.map(item => Array.from(item || []));
  const consent = commands.filter(item => item[0] === 'consent' && item[1] === 'update').at(-1)?.[2];
  if (consent?.ad_storage === 'granted') document.cookie = '_gcl_au=fixture; Path=/';
`;
test.beforeEach(async ({ page }) => {
  await page.route("https://www.googletagmanager.com/**", (route) =>
    route.fulfill({ contentType: "application/javascript", body: fixture }),
  );
});

test("analytics denial also removes advertising storage when marketing permission alone remains", async ({
  page,
  context,
}) => {
  const consent = createCookieConsent({ analytics: false, marketing: true });
  await context.addCookies([
    {
      name: COOKIE_CONSENT_NAME,
      value: encodeURIComponent(JSON.stringify(consent)),
      url: "http://localhost:3100",
    },
    { name: "_ga", value: "old", url: "http://localhost:3100" },
    { name: "_gcl_au", value: "old", url: "http://localhost:3100" },
  ]);
  await page.goto("/cookies");
  await expect
    .poll(
      async () =>
        (await context.cookies()).filter((cookie) =>
          /^_(ga|gcl)/.test(cookie.name),
        ).length,
    )
    .toBe(0);
  await expect(page.locator("script#bun2too-gtm")).toHaveCount(0);
});

test("Google stays unloaded for necessary-only and preference-only choices", async ({
  page,
}) => {
  const requests: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("googletagmanager.com"))
      requests.push(request.url());
  });
  await page.goto("/cookies");
  await page.getByRole("button", { name: "Customize" }).click();
  const dialog = page.getByRole("dialog");
  await dialog
    .getByRole("checkbox", { name: "Preferences", exact: true })
    .check();
  await dialog.getByRole("button", { name: "Save choices" }).click();
  await page.reload();
  await expect(page.locator(".cookie-banner")).toHaveCount(0);
  expect(requests).toEqual([]);
  expect(await page.locator("script#bun2too-gtm").count()).toBe(0);
  expect(await page.evaluate(() => "dataLayer" in window)).toBe(false);
});

test("analytics can be granted without ads; withdrawal unloads tags and clears matching cookies", async ({
  page,
  context,
}) => {
  const requests: string[] = [];
  page.on("request", (request) => {
    if (request.url() === scriptUrl) requests.push(request.url());
  });
  await page.goto("/cookies");
  await page.getByRole("button", { name: "Customize" }).click();
  const dialog = page.getByRole("dialog");
  await dialog
    .getByRole("checkbox", { name: "Analytics", exact: true })
    .check();
  await dialog.getByRole("button", { name: "Save choices" }).click();
  await expect.poll(() => requests.length).toBe(1);
  const commands = await page.evaluate(() =>
    (window as unknown as { dataLayer: unknown[] }).dataLayer.map((item) =>
      Array.from(item as ArrayLike<unknown>),
    ),
  );
  expect(
    commands.find(
      (item) => item[0] === "consent" && item[1] === "default",
    )?.[2],
  ).toMatchObject({ analytics_storage: "denied", ad_storage: "denied" });
  expect(
    commands.find((item) => item[0] === "consent" && item[1] === "update")?.[2],
  ).toMatchObject({
    analytics_storage: "granted",
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
  });
  await expect
    .poll(async () =>
      (await context.cookies()).some((cookie) => cookie.name === "_ga"),
    )
    .toBe(true);
  await page
    .locator(".footer-bottom")
    .getByRole("button", { name: "Cookie settings" })
    .click();
  await dialog
    .getByRole("checkbox", { name: "Marketing", exact: true })
    .check();
  await dialog.getByRole("button", { name: "Save choices" }).click();
  await expect
    .poll(async () =>
      page.evaluate(() => {
        const commands = (
          window as unknown as { dataLayer: unknown[] }
        ).dataLayer.map((item) => Array.from(item as ArrayLike<unknown>));
        return (
          commands
            .filter((item) => item[0] === "consent" && item[1] === "update")
            .at(-1)?.[2] as { ad_storage: string }
        )?.ad_storage;
      }),
    )
    .toBe("granted");
  expect(requests).toHaveLength(1);
  await page.evaluate(() => {
    document.cookie = "_gcl_au=fixture; Path=/";
    document.cookie = "bun2too_support=preserve; Path=/";
  });
  await page
    .locator(".footer-bottom")
    .getByRole("button", { name: "Cookie settings" })
    .click();
  await dialog.getByRole("button", { name: "Necessary only" }).click();
  await page.waitForLoadState("domcontentloaded");
  await expect
    .poll(
      async () =>
        (await context.cookies()).filter((cookie) =>
          /^_(ga|gcl)/.test(cookie.name),
        ).length,
    )
    .toBe(0);
  await expect(page.locator("script#bun2too-gtm")).toHaveCount(0);
  await expect(page.locator(".cookie-banner")).toHaveCount(0);
  expect(
    (await context.cookies()).some(
      (cookie) => cookie.name === "bun2too_support",
    ),
  ).toBe(true);
  expect(requests).toHaveLength(1);
});

test("stored analytics permission does not load Google on account, callback, or embedded pages", async ({
  page,
  context,
}) => {
  const consent = createCookieConsent({ analytics: true, marketing: true });
  await context.addCookies([
    {
      name: COOKIE_CONSENT_NAME,
      value: encodeURIComponent(JSON.stringify(consent)),
      url: "http://localhost:3100",
    },
  ]);
  const requests: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("googletagmanager.com"))
      requests.push(request.url());
  });
  for (const path of [
    "/account",
    "/contact?email=private",
    "/insights/signup",
  ]) {
    await page.goto(path);
    await expect(page.locator("main")).toBeVisible();
    await expect(page.locator(".cookie-banner")).toHaveCount(0);
    await expect(page.locator("script#bun2too-gtm")).toHaveCount(0);
  }
  expect(requests).toEqual([]);
});
