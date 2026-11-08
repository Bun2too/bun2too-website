import { expect, test } from "@playwright/test";

for (const path of [
  "/services",
  "/process",
  "/usecases",
  "/insights",
  "/contact",
  "/support",
  "/account",
  "/cookies",
  "/terms",
  "/privacy",
]) {
  test(`artwork loads and hydration stays clean on ${path}`, async ({
    page,
  }, testInfo) => {
    const hydration: string[] = [];
    page.on("console", (message) => {
      if (/hydrat|server rendered HTML|didn't match/i.test(message.text()))
        hydration.push(message.text());
    });
    await page.goto(path);
    const image = page.locator(".page-artwork img").first();
    await image.scrollIntoViewIfNeeded();
    await expect
      .poll(() =>
        image.evaluate(
          (element: HTMLImageElement) =>
            element.complete && element.naturalWidth > 0,
        ),
      )
      .toBe(true);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    expect(hydration).toEqual([]);
    await page.screenshot({ path: testInfo.outputPath("page-artwork.png") });
  });
}

test("mail-link rewriting extensions cannot mutate the server-rendered email action", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (/hydrat|server rendered HTML|didn't match/i.test(message.text()))
      errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(() => {
    // Reproduce the exact Gmail extension mutation supplied in the report.
    const rewrite = () =>
      document
        .querySelectorAll<HTMLAnchorElement>('a[href^="mailto:"]')
        .forEach((link) => {
          link.href = `https://mail.google.com/mail/?view=cm&fs=1&tf=1&to=${link.href.slice(7)}`;
          link.target = "_blank";
        });
    new MutationObserver(rewrite).observe(document, {
      childList: true,
      subtree: true,
    });
  });
  const response = await page.goto("/contact");
  expect(await response!.text()).toContain("Email Bun2Too");
  await expect(
    page.getByRole("button", { name: "Email Bun2Too" }),
  ).toBeVisible();
  await expect(
    page.locator(
      'a[href^="mailto:"], a[href^="https://mail.google.com/mail/"]',
    ),
  ).toHaveCount(0);
  for (const path of ["/terms", "/privacy", "/cookies"]) {
    await page.goto(path);
    await expect(
      page.getByRole("button", { name: "info@bun2too.com", exact: true }),
    ).toBeVisible();
  }
  expect(errors).toEqual([]);
});
