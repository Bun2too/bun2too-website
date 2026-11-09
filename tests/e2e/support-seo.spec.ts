import { expect, test } from "@playwright/test";
async function openSupport(page: import("@playwright/test").Page) {
  await page.route("**/api/support/session", (route) =>
    route.fulfill({ json: { inquiries: true } }),
  );
  await page.goto("/");
  await page
    .getByRole("button", { name: "Contact Bun2Too", exact: false })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Contact Bun2Too" }),
  ).toBeVisible();
}
test("support is inquiry-only and never requests AI answers", async ({
  page,
  request,
}, testInfo) => {
  const chats: string[] = [];
  page.on("request", (request) => {
    if (request.url().endsWith("/api/support/chat")) chats.push(request.url());
  });
  await openSupport(page);
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByLabel("Your name")).toBeVisible();
  await expect(dialog.getByRole("tab")).toHaveCount(0);
  await expect(dialog.getByLabel("Your question")).toHaveCount(0);
  await page.screenshot({ path: testInfo.outputPath("private-inquiry.png") });
  await dialog.getByRole("button", { name: "Close support" }).click();
  await expect(dialog).not.toBeVisible();
  expect(chats).toEqual([]);
  const retired = await request.post("/api/support/chat", {
    data: { message: "Question", consent: true },
  });
  expect([404, 405]).toContain(retired.status());
});
test("private inquiry confirms saved reference without chat data", async ({
  page,
}) => {
  await page.route("**/api/support/inquiries", async (route) => {
    const data = route.request().postDataJSON();
    expect(data.email).toBe("customer@example.com");
    expect(data.consent).toBe(true);
    expect(data.includeTranscript).toBeUndefined();
    expect(data.conversationId).toBeUndefined();
    expect(data.requestId).toMatch(/^[0-9a-f-]{36}$/);
    await route.fulfill({ status: 201, json: { reference: "B2T-12345678" } });
  });
  await openSupport(page);
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Your name").fill("A customer");
  await dialog.getByLabel("Contact email").fill("customer@example.com");
  await dialog
    .getByLabel("How can we help?")
    .fill("We need help connecting customer data and consent.");
  await dialog
    .getByLabel("I agree that Bun2Too may store", { exact: false })
    .check();
  await dialog.getByRole("button", { name: "Send private inquiry" }).click();
  await expect(dialog.getByRole("status")).toContainText("B2T-12345678");
  await expect(dialog.getByRole("status")).toContainText(
    "not been subscribed to marketing",
  );
});
test("support failures retain the inquiry and never display a false receipt", async ({
  page,
}) => {
  await page.route("**/api/support/inquiries", (route) =>
    route.fulfill({
      status: 503,
      json: { error: "Private inquiry storage is temporarily unavailable." },
    }),
  );
  await openSupport(page);
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Your name").fill("A customer");
  await dialog.getByLabel("Contact email").fill("customer@example.com");
  await dialog
    .getByLabel("How can we help?")
    .fill("Please help with my application question.");
  await dialog
    .getByLabel("I agree that Bun2Too may store", { exact: false })
    .check();
  await dialog.getByRole("button", { name: "Send private inquiry" }).click();
  await expect(dialog.getByRole("alert")).toContainText(
    "temporarily unavailable",
  );
  await expect(dialog.getByLabel("How can we help?")).toHaveValue(
    "Please help with my application question.",
  );
  await expect(dialog.getByText("Your inquiry is saved.")).toHaveCount(0);
});
test("support works from the contact page and is excluded from embedded signup", async ({
  page,
}) => {
  await page.route("**/api/support/session", (route) =>
    route.fulfill({ json: { inquiries: true } }),
  );
  await page.goto("/contact");
  await page.getByRole("button", { name: "Send a private inquiry" }).click();
  await expect(
    page.getByRole("dialog", { name: "Contact Bun2Too" }),
  ).toBeVisible();
  await expect(page.getByLabel("Your name")).toBeVisible();
  await page.keyboard.press("Escape");
  await page.goto("/insights/signup");
  await expect(page.locator(".support-launcher")).toHaveCount(0);
});
test("search crawlers receive canonical metadata, JSON-LD, discovery files, and private exclusions", async ({
  page,
  request,
}) => {
  await page.goto("/services");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    "https://bun2too.com/services",
  );
  await expect(page.locator('meta[property="og:url"]')).toHaveAttribute(
    "content",
    "https://bun2too.com/services",
  );
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute(
    "content",
    "summary_large_image",
  );
  const schemas = await page
    .locator('script[type="application/ld+json"]')
    .allTextContents();
  const graphs = schemas
    .map((text) => JSON.parse(text))
    .flatMap((data) => data["@graph"] || [data]);
  expect(graphs.some((item) => item["@type"] === "Organization")).toBe(true);
  expect(
    graphs.some(
      (item) => item["@type"] === "Service" || item["@type"] === "ItemList",
    ),
  ).toBe(true);
  const robots = await request.get("/robots.txt");
  expect(await robots.text()).toContain("OAI-SearchBot");
  expect(await robots.text()).toContain("Disallow: /api/");
  const sitemap = await request.get("/sitemap.xml");
  const xml = await sitemap.text();
  expect(xml).toContain("https://bun2too.com/support");
  expect(xml).not.toContain("/account");
  expect(xml).not.toContain("/hero");
  const overview = await request.get("/llms.txt");
  expect(await overview.text()).toContain("Customer technology");
  const privateApi = await request.get("/api/support/session");
  expect(privateApi.headers()["x-robots-tag"]).toContain("noindex");
  expect(privateApi.headers()["cache-control"]).toBe("no-store");
  const shareImage = await request.get("/og");
  expect(shareImage.ok()).toBe(true);
  expect(shareImage.headers()["content-type"]).toContain("image/png");
  await page.goto("/support");
  await expect(page.locator("main h1")).toBeVisible();
  const supportSchemas = await page
    .locator('script[type="application/ld+json"]')
    .allTextContents();
  const faq = supportSchemas
    .map((text) => JSON.parse(text))
    .find((data) => data["@type"] === "FAQPage");
  expect(faq?.mainEntity.length).toBeGreaterThan(0);
});
