import { test, expect } from "@playwright/test";
test("public article content renders on the server and opens within the main site", async ({
  page,
  request,
}) => {
  const response = await request.get("/insights");
  const html = await response.text();
  expect(html).toContain('data-insights-state="ready"');
  expect(html).toContain("From AI prototype to useful customer workflows");
  expect(html).not.toContain("Taking a short pause");
  await page.goto("/insights");
  await expect(page.locator(".insight-card")).toHaveCount(1);
  await page
    .locator(".insight-card")
    .getByRole("link", { name: /^Read / })
    .click();
  await expect(page).toHaveURL(/\/insights\/fixture-ai-delivery$/);
  await expect(page.locator(".insight-prose").first()).toContainText(
    "Reliable AI delivery starts",
  );
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    "https://bun2too.com/insights/fixture-ai-delivery",
  );
  const missing = await request.get("/insights/fixture-missing");
  expect(missing.status()).toBe(404);
  const feed = await request.get("/insights/feed.xml");
  expect(feed.status()).toBe(200);
  expect(await feed.text()).toContain("<rss");
});
test("insights reuses the consent form and exposes feeds without overflow", async ({
  page,
}) => {
  await page.goto("/insights");
  await expect(page.locator("main h1")).toContainText("Human thinking.");
  await expect(
    page.getByRole("link", { name: "RSS", exact: true }),
  ).toHaveAttribute("href", "/insights/feed.xml");
  await expect(
    page.getByRole("link", { name: "Atom", exact: true }),
  ).toHaveAttribute("href", "/insights/feed.atom");
  await expect(
    page
      .locator(".newsletter-form")
      .getByLabel("AI & automation", { exact: true }),
  ).toBeChecked();
  await expect(
    page
      .locator(".newsletter-form")
      .getByLabel("I agree to receive email updates", { exact: false }),
  ).not.toBeChecked();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("embedded signup permits only the selected framing origins", async ({
  page,
}) => {
  const response = await page.goto("/insights/signup");
  expect(response?.headers()["content-security-policy"]).toContain(
    "https://editorial.example.invalid",
  );
  await expect(page.locator(".newsletter-form")).toBeVisible();
  await expect(page.locator(".site-header")).toBeHidden();
});
