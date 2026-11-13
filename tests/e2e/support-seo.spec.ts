import { expect, test } from "@playwright/test";
async function openSupport(page: import("@playwright/test").Page) {
  await page.route("**/api/support/session", (route) =>
    route.fulfill({ json: { inquiries: true, chat: false } }),
  );
  await page.goto("/");
  await page
    .getByRole("button", { name: "Contact Bun2Too", exact: false })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Contact Bun2Too" }),
  ).toBeVisible();
}

for (const path of ["/", "/contact"])
  test(`header connect opens the inquiry dialog directly from ${path}`, async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, "Small screens use the persistent support launcher.");
    let sessions = 0;
    const posts: string[] = [];
    page.on("request", (request) => {
      if (
        request.method() === "POST" &&
        request.url().includes("/api/support/")
      )
        posts.push(request.url());
    });
    await page.route("**/api/support/session", (route) => {
      sessions++;
      return route.fulfill({ json: { inquiries: false, chat: false } });
    });
    await page.goto(path);
    const connect = page
      .getByRole("navigation", { name: "Main navigation" })
      .getByRole("button", { name: "Let’s connect" });
    await expect(connect).toHaveAttribute("aria-haspopup", "dialog");
    await connect.click();
    const dialog = page.getByRole("dialog", { name: "Contact Bun2Too" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByLabel("How can we help?")).toBeVisible();
    await expect(
      dialog.getByRole("button", { name: "Check availability again" }),
    ).toBeVisible();
    await expect(page).toHaveURL(path);
    expect(sessions).toBe(1);
    expect(posts).toEqual([]);
    await page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible();
    await expect(connect).toBeFocused();
  });

for (const recovery of ["retry", "reopen"])
  test(`session gateway failure recovers on ${recovery} without losing an inquiry draft`, async ({
    page,
  }) => {
    let sessions = 0;
    const writes: string[] = [];
    page.on("request", (request) => {
      if (
        request.method() === "POST" &&
        request.url().includes("/api/support/")
      )
        writes.push(request.url());
    });
    await page.route("**/api/support/session", (route) => {
      sessions++;
      return sessions === 1
        ? route.fulfill({
            status: 503,
            contentType: "text/html",
            body: "<html>Unavailable</html>",
          })
        : route.fulfill({ json: { inquiries: true, chat: false } });
    });
    await page.goto("/contact");
    await page.getByRole("button", { name: "Send a private inquiry" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("alert")).toContainText(
      "couldn’t check support availability",
    );
    await expect(
      dialog.getByText("Private inquiries are currently unavailable.", {
        exact: false,
      }),
    ).toBeVisible();
    await expect(dialog.locator(".support-notice .email-action")).toBeVisible();
    await expect(
      dialog.getByRole("button", { name: "Send private inquiry" }),
    ).toBeDisabled();
    await dialog
      .getByLabel("How can we help?")
      .fill("Please preserve my inquiry draft during recovery.");
    if (recovery === "retry")
      await dialog
        .getByRole("button", { name: "Check availability again" })
        .click();
    else {
      await dialog.getByRole("button", { name: "Close support" }).click();
      await page
        .getByRole("button", { name: "Send a private inquiry" })
        .click();
    }
    await expect(
      dialog.getByRole("button", { name: "Send private inquiry" }),
    ).toBeEnabled();
    await expect(dialog.getByLabel("How can we help?")).toHaveValue(
      "Please preserve my inquiry draft during recovery.",
    );
    await expect(dialog.getByRole("alert")).toHaveCount(0);
    expect(sessions).toBe(2);
    expect(writes).toEqual([]);
  });

test("an unavailable 200 session gives explicit feedback when rechecked and sends no form", async ({
  page,
}) => {
  let checks = 0;
  let writes = 0;
  page.on("request", (request) => {
    if (request.method() === "POST" && request.url().includes("/api/support/"))
      writes++;
  });
  await page.route("**/api/support/session", (route) => {
    checks++;
    return route.fulfill({
      json: {
        inquiries: false,
        chat: false,
        inquiryUnavailableReasons: ["storage", "email"],
      },
    });
  });
  await page.goto("/contact");
  await page.getByRole("button", { name: "Send a private inquiry" }).click();
  const dialog = page.getByRole("dialog");
  await expect(
    dialog.getByRole("button", { name: "Send private inquiry" }),
  ).toBeDisabled();
  await expect(
    dialog.getByRole("button", { name: "Email our team directly" }),
  ).toBeVisible();
  await dialog
    .getByRole("button", { name: "Check availability again" })
    .click();
  await expect(dialog.getByRole("status")).toContainText(
    "Availability checked: private inquiries are still unavailable",
  );
  expect(checks).toBe(2);
  expect(writes).toBe(0);
  await expect(page).toHaveURL("/contact");
});

test("unconfigured AI never sends questions and inquiry controls remain usable", async ({
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
  const invalid = await request.post("/api/support/chat", {
    headers: { Origin: "http://localhost:3100" },
    data: { message: "Question", consent: true },
  });
  expect(invalid.status()).toBe(400);
});
test("configured AI requires a separate opt-in and never submits an inquiry", async ({
  page,
}) => {
  await page.route("**/api/support/session", (route) =>
    route.fulfill({ json: { inquiries: true, chat: true } }),
  );
  let questions = 0;
  await page.route("**/api/support/chat", async (route) => {
    const data = route.request().postDataJSON();
    expect(data.consent).toBe(true);
    expect(data.model).toBeUndefined();
    questions++;
    await route.fulfill({
      json: {
        answer: "Bun2Too helps with AI engineering and customer technology.",
      },
    });
  });
  await page.route("**/api/support/inquiries", () => {
    throw new Error("AI must not submit an inquiry");
  });
  await page.goto("/");
  await page.locator(".support-launcher").click();
  await page.getByText("Ask the Bun2Too AI assistant", { exact: true }).click();
  await page
    .getByLabel("Your public support question")
    .fill("What services can Bun2Too help with?");
  await expect(
    page.getByRole("button", { name: "Ask AI", exact: true }),
  ).toBeDisabled();
  expect(questions).toBe(0);
  await page
    .getByLabel("I agree to send this question", { exact: false })
    .check();
  await page.getByRole("button", { name: "Ask AI", exact: true }).click();
  await expect(page.locator(".support-answer")).toContainText("AI engineering");
  await page.getByRole("button", { name: "Close support" }).click();
  await page.locator(".support-launcher").click();
  await expect(page.getByLabel("Your public support question")).toHaveValue(
    "What services can Bun2Too help with?",
  );
  await expect(page.locator(".support-answer")).toContainText("AI engineering");
  expect(questions).toBe(1);
});

for (const failure of ["gateway", "network"])
  test(`AI ${failure} failure shows recovery without retrying or losing the question`, async ({
    page,
  }) => {
    await page.route("**/api/support/session", (route) =>
      route.fulfill({ json: { inquiries: true, chat: true } }),
    );
    let questions = 0;
    await page.route("**/api/support/chat", async (route) => {
      questions++;
      if (failure === "network") await route.abort("timedout");
      else
        await route.fulfill({
          status: 504,
          contentType: "text/html",
          body: "<html>Gateway time-out</html>",
        });
    });
    await page.goto("/");
    await page.locator(".support-launcher").click();
    await page
      .getByText("Ask the Bun2Too AI assistant", { exact: true })
      .click();
    const question = page.getByLabel("Your public support question");
    await question.fill("What services does Bun2Too offer?");
    await page
      .getByLabel("I agree to send this question", { exact: false })
      .check();
    await page.getByRole("button", { name: "Ask AI", exact: true }).click();
    await expect(
      page.locator(".support-chat").getByRole("alert"),
    ).toContainText("AI answers are temporarily unavailable");
    await expect(question).toHaveValue("What services does Bun2Too offer?");
    await expect(
      page.getByRole("button", { name: "Ask AI", exact: true }),
    ).toBeEnabled();
    await expect(page.locator(".support-answer")).toHaveCount(0);
    expect(questions).toBe(1);
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
    await route.fulfill({
      status: 201,
      json: {
        reference: "B2T-12345678",
        notification: "accepted",
        acknowledgment: "accepted",
      },
    });
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
for (const channel of ["notification", "acknowledgment", "both"])
  test(`a saved inquiry reports ${channel} email failure independently`, async ({
    page,
  }) => {
    await page.route("**/api/support/inquiries", (route) =>
      route.fulfill({
        status: 202,
        json: {
          reference: "B2T-12345678",
          notification:
            channel === "acknowledgment" ? "accepted" : "unconfirmed",
          acknowledgment:
            channel === "notification" ? "accepted" : "unconfirmed",
        },
      }),
    );
    await openSupport(page);
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Your name").fill("A customer");
    await dialog.getByLabel("Contact email").fill("customer@example.com");
    await dialog
      .getByLabel("How can we help?")
      .fill("Please help with a new customer technology project.");
    await dialog
      .getByLabel("I agree that Bun2Too may store", { exact: false })
      .check();
    await dialog.getByRole("button", { name: "Send private inquiry" }).click();
    await expect(dialog.getByRole("status")).toContainText("B2T-12345678");
    if (channel !== "acknowledgment")
      await expect(
        dialog
          .getByRole("alert")
          .filter({ hasText: "couldn’t confirm the email notification" }),
      ).toBeVisible();
    if (channel !== "notification")
      await expect(
        dialog
          .getByRole("alert")
          .filter({ hasText: "couldn’t confirm your acknowledgment email" }),
      ).toBeVisible();
    await expect(
      dialog.getByText("A confirmation email has also been accepted", {
        exact: false,
      }),
    ).toHaveCount(channel === "notification" ? 1 : 0);
  });
test("support works from the contact page and is excluded from embedded signup", async ({
  page,
}) => {
  await page.route("**/api/support/session", (route) =>
    route.fulfill({ json: { inquiries: true, chat: false } }),
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
