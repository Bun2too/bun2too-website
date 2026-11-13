import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import {
  CmsGraph,
  isCmsPath,
  localCms,
  richTextPlain,
  seedDelivery,
} from "../src/lib/cms-content";
import { safeCmsHref } from "../src/lib/cms-links";
import { validateSeed, contentTypes } from "../scripts/contentful-model.mjs";
import {
  privateRuntimeKeys,
  publicBuildKeys,
  verifyContentfulConnection,
} from "../scripts/deploy-config.mjs";

test("CMS seed resolves the existing page graph and all publication dependencies", () => {
  const seed = JSON.parse(
    readFileSync(
      new URL("../src/content/website-seed.json", import.meta.url),
      "utf8",
    ),
  );
  assert.doesNotThrow(() => validateSeed(seed));
  assert.equal(
    new Set(contentTypes.map((type) => type.id)).size,
    contentTypes.length,
  );
  for (const page of localCms.pages()) {
    assert.equal(
      page.blocks.filter((block) => ["hero", "intro"].includes(block.kind))
        .length,
      1,
    );
    assert.ok(page.seoTitle);
    assert.ok(page.blocks.every((block) => block.id));
  }
  const services = localCms
    .pages()
    .find((page) => page.path === "/services")!
    .blocks.flatMap((block) => block.items);
  assert.equal(
    new Set(services.map((card) => card.slug)).size,
    services.length,
  );
  assert.ok(services.slice(0, 2).every((card) => card.featured));
});
test("CMS block order, copy and SEO come from delivery data rather than template literals", () => {
  const data = seedDelivery();
  const home = data.items.find((entry) => entry.sys.id === "b2t-page-home")!;
  home.fields = {
    ...home.fields,
    seoTitle: "An edited published title",
    blocks: [...(home.fields.blocks as unknown[])].reverse(),
  };
  const hero = data.items.find(
    (entry) => entry.sys.id === "b2t-block-home-hero",
  )!;
  hero.fields = { ...hero.fields, eyebrow: "Edited editorial copy" };
  const page = new CmsGraph(data).page(home.sys.id)!;
  assert.equal(page.seoTitle, "An edited published title");
  assert.equal(page.blocks.at(-1)?.eyebrow, "Edited editorial copy");
  assert.equal(page.blocks[0].kind, "cta");
});
test("unpublished block/card references cannot silently remove visible page content", () => {
  const data = seedDelivery();
  data.items = data.items.filter((entry) => entry.sys.id !== "b2t-service-cdp");
  assert.throws(
    () => new CmsGraph(data).page("b2t-page-services"),
    /Unpublished or invalid/,
  );
  assert.ok(localCms.page("b2t-page-services"));
});
test("new CMS public pages are allowed while application/private routes remain reserved", () => {
  for (const path of ["/", "/services", "/about", "/solutions/ai"])
    assert.equal(isCmsPath(path), true);
  for (const path of [
    "/api/admin",
    "/account",
    "/account/private",
    "/auth/callback",
    "/insights/private",
    "//example.com",
    "/../account",
    "/invalid?query",
  ])
    assert.equal(isCmsPath(path), false);
});
test("editorial links reject executable URLs, credentials and protocol-relative destinations", () => {
  for (const value of [
    "javascript:alert(1)",
    "data:text/html,hi",
    "//private.example.invalid",
    "/\\example.com",
    "https://fixture-user:" + "fixture-secret@example.invalid",
  ])
    assert.equal(safeCmsHref(value), "");
  assert.equal(safeCmsHref("/services#cdp"), "/services#cdp");
  assert.equal(
    safeCmsHref("https://example.com/document"),
    "https://example.com/document",
  );
});
test("cyclic supporting blocks are bounded and untrusted Rich Text stays declarative", () => {
  const data = seedDelivery();
  const hero = data.items.find(
    (entry) => entry.sys.id === "b2t-block-home-hero",
  )!;
  hero.fields = {
    ...hero.fields,
    secondary: { sys: { type: "Link", linkType: "Entry", id: hero.sys.id } },
    body: {
      nodeType: "document",
      content: [
        {
          nodeType: "paragraph",
          content: [
            {
              nodeType: "text",
              value: "<script>not executable</script>",
              marks: [],
            },
          ],
        },
        { nodeType: "script", content: [] },
      ],
    },
  };
  const block = new CmsGraph(data).block(hero.sys.id)!;
  assert.equal(block.secondary, undefined);
  assert.equal(richTextPlain(block.body), "<script>not executable</script>");
  assert.equal(
    block.body.content.some((node) => node.nodeType === "script"),
    false,
  );
});
test("private Contentful management/preview credentials cannot enter runtime sync or public config", () => {
  assert.equal(privateRuntimeKeys.includes("CONTENTFUL_DELIVERY_TOKEN"), true);
  assert.equal(
    privateRuntimeKeys.includes("CONTENTFUL_MANAGEMENT_TOKEN"),
    false,
  );
  assert.equal(privateRuntimeKeys.includes("CONTENTFUL_PREVIEW_TOKEN"), false);
  assert.equal(
    publicBuildKeys.some((key) => key.startsWith("CONTENTFUL")),
    false,
  );
});

test("CMS release preflight rejects incomplete publication without printing private response data", async () => {
  const env = {
    CONTENTFUL_ENABLED: "true",
    CONTENTFUL_SPACE_ID: "fixture-space",
    CONTENTFUL_DELIVERY_TOKEN: "fixture-delivery-token",
    CONTENTFUL_ENVIRONMENT: "qa",
  };
  const delivery = seedDelivery();
  const count = await verifyContentfulConnection(env, async (input) => {
    const type = new URL(String(input)).searchParams.get("content_type");
    return Response.json({
      items: delivery.items.filter(
        (entry) => entry.sys.contentType?.sys.id === type,
      ),
    });
  });
  assert.equal(count, localCms.pages().length);
  await assert.rejects(
    verifyContentfulConnection(env, async () => Response.json({ items: [] })),
    /missing required published/,
  );
  await assert.rejects(
    verifyContentfulConnection(
      env,
      async () => new Response("private-provider-detail", { status: 401 }),
    ),
    (error) =>
      error instanceof Error &&
      /HTTP 401/.test(error.message) &&
      !/private-provider-detail|fixture-delivery-token/.test(error.message),
  );
});
