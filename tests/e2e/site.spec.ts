import { expect, test } from "@playwright/test";
const routes = [
  "/",
  "/services",
  "/process",
  "/usecases",
  "/cta",
  "/hero",
  "/articles",
  "/contact",
  "/account",
  "/privacy",
  "/cookies",
  "/terms",
];
for (const route of routes)
  test(`renders ${route} without runtime errors or horizontal overflow`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (/hydrat|server rendered HTML|didn't match/i.test(message.text()))
        errors.push(message.text());
    });
    const response = await page.goto(route);
    expect(response?.status()).toBe(200);
    await expect(page.locator("main h1")).toBeVisible();
    await expect(
      page.getByRole("navigation", { name: "Main navigation" }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    expect(errors).toEqual([]);
  });
test("navigation reaches the process and links to the real article hub", async ({
  page,
  isMobile,
}) => {
  await page.goto("/");
  if (isMobile) await page.getByRole("button", { name: "Open menu" }).click();
  await page
    .getByRole("navigation")
    .getByRole("link", { name: "Our process", exact: true })
    .click();
  await expect(page).toHaveURL("/process");
  await expect(
    page.getByText("Journey map & agreed outcomes", { exact: false }),
  ).toBeVisible();
  if (isMobile) await page.getByRole("button", { name: "Open menu" }).click();
  await expect(
    page.getByRole("navigation").getByRole("link", { name: "Insights" }),
  ).toHaveAttribute("href", "/insights");
});
test("newsletter requires consent and shows service failures without faking success", async ({
  page,
}) => {
  await page.route("**/api/subscriptions", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({
        error:
          "Email preferences are not available yet. Please try again later.",
      }),
    }),
  );
  await page.goto("/");
  const form = page.locator(".newsletter-form");
  await form.getByLabel("Your email address").fill("customer@example.com");
  await form.getByRole("button", { name: "Subscribe" }).click();
  await expect(form.getByRole("alert")).toHaveCount(0);
  await form
    .getByLabel("I agree to receive email updates", { exact: false })
    .check();
  await form.getByRole("button", { name: "Subscribe" }).click();
  await expect(form.getByRole("alert")).toContainText("not available yet");
});
test("newsletter sends explicit topics and consent and gives a confirmation next step", async ({
  page,
}) => {
  await page.route("**/api/subscriptions", async (route) => {
    const body = route.request().postDataJSON();
    expect(body.email).toBe("customer@example.com");
    expect(body.consent).toBe(true);
    expect(body.topics).toEqual(["customer-technology", "fintech"]);
    await route.fulfill({
      status: 202,
      contentType: "application/json",
      body: '{"accepted":true}',
    });
  });
  await page.goto("/");
  const form = page.locator(".newsletter-form");
  await form.getByLabel("Your email address").fill("customer@example.com");
  await form.getByLabel("Fintech experiments", { exact: true }).check();
  await form
    .getByLabel("I agree to receive email updates", { exact: false })
    .check();
  await form.getByRole("button", { name: "Subscribe" }).click();
  await expect(form.getByRole("status")).toContainText(
    "Sign in with this email",
  );
  await expect(
    form.getByRole("link", { name: "Confirm in your account" }),
  ).toHaveAttribute("href", "/account");
});

for (const action of ["Log in", "Create an account", "Continue with email"])
  test(`Auth0 SDK starts ${action} with PKCE and the root callback`, async ({
    page,
  }) => {
    let authorizeUrl = "";
    await page.route(
      "https://website-test.example.auth0.com/authorize**",
      async (route) => {
        authorizeUrl = route.request().url();
        await route.fulfill({
          contentType: "text/html",
          body: "<html><body>Auth0 redirect captured for test</body></html>",
        });
      },
    );
    await page.goto("/account");
    await page
      .locator(".account-card")
      .getByRole("button", { name: `${action} ↗`, exact: true })
      .click();
    await expect.poll(() => authorizeUrl).not.toBe("");
    const url = new URL(authorizeUrl);
    expect(url.searchParams.get("client_id")).toBe("test-spa-client-id");
    expect(url.searchParams.get("redirect_uri")).toBe("http://localhost:3100/");
    expect(url.searchParams.get("response_type")).toBe("code");
    expect(url.searchParams.get("code_challenge_method")).toBe("S256");
    expect(url.searchParams.get("code_challenge")).toBeTruthy();
    expect(url.searchParams.get("state")).toBeTruthy();
    if (action === "Create an account")
      expect(url.searchParams.get("screen_hint")).toBe("signup");
    if (action === "Continue with email")
      expect(url.searchParams.get("connection")).toBe("email");
  });

test("home page artwork loads and visual previews can be reviewed", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  const heroImage = page.locator(".hero img").first();
  await expect(heroImage).toBeVisible();
  expect(
    await page
      .locator(".hero img")
      .first()
      .evaluate(
        (img: HTMLImageElement) => img.complete && img.naturalWidth > 0,
      ),
  ).toBe(true);
  await page.screenshot({
    path: testInfo.outputPath("homepage.png"),
    fullPage: true,
  });
});

test("production APIs validate public-host requests and require account authorization", async ({
  request,
}) => {
  const base = "http://127.0.0.1:3100";
  const invalid = await request.post(`${base}/api/subscriptions`, {
    headers: { Origin: base },
    data: { email: "invalid", consent: true, topics: ["customer-technology"] },
  });
  expect(invalid.status()).toBe(400);
  const crossOrigin = await request.post(`${base}/api/subscriptions`, {
    headers: { Origin: "https://attacker.example" },
    data: {},
  });
  expect(crossOrigin.status()).toBe(403);
  const preferences = await request.get(`${base}/api/preferences`);
  expect(preferences.status()).toBe(401);
  expect(preferences.headers()["cache-control"]).toBe("no-store");
});
