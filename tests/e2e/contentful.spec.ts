import { test, expect } from "@playwright/test";
test("published CMS FAQ is server-rendered and agrees with FAQ schema and discovery", async ({
  page,
  request,
}) => {
  const response = await page.goto("/support");
  expect(await response!.text()).toContain("Published Contentful fixture.");
  await expect(page.locator(".support-faqs")).toContainText(
    "Published Contentful fixture.",
  );
  const schema = await page
    .locator('script[type="application/ld+json"]')
    .evaluateAll((elements) =>
      elements.map((element) => JSON.parse(element.textContent || "{}")),
    );
  const faq = schema.find((value) => value["@type"] === "FAQPage");
  expect(faq.mainEntity[0].acceptedAnswer.text).toContain(
    "Published Contentful fixture.",
  );
  expect(await (await request.get("/llms.txt")).text()).toContain(
    "Published Contentful fixture.",
  );
});
test("new CMS pages resolve their published block order, metadata and sitemap URL", async ({
  page,
  request,
}) => {
  const response = await page.goto("/cms-fixture");
  expect(response?.status()).toBe(200);
  await expect(page).toHaveTitle(/Contentful fixture page/);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    "https://bun2too.com/cms-fixture",
  );
  await expect(page.locator("#main-content > section").first()).toHaveClass(
    /approach-teaser/,
  );
  expect(await (await request.get("/sitemap.xml")).text()).toContain(
    "https://bun2too.com/cms-fixture",
  );
});
