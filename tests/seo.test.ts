import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import StructuredData from "../src/components/StructuredData";
import { isIndexableSite, pageMetadata } from "../src/lib/seo";
test("only the primary production site is eligible for indexing", () => {
  assert.equal(isIndexableSite("https://bun2too.com", "prod"), true);
  assert.equal(isIndexableSite("http://bun2too.com", "prod"), false);
  assert.equal(
    isIndexableSite("https://bun2too.com", "prod", "deploy-preview"),
    false,
  );
  assert.equal(
    isIndexableSite("https://bun2too.com", "prod", "branch-deploy"),
    false,
  );
  for (const environment of ["dev", "qa", "preview"])
    assert.equal(isIndexableSite("https://bun2too.com", environment), false);
  for (const origin of [
    "http://localhost:3000",
    "https://dev.bun2too.com",
    "https://deploy-preview-123.netlify.app",
  ])
    assert.equal(isIndexableSite(origin, "prod"), false);
});
test("service metadata has a canonical URL, descriptive title, and share image", () => {
  const data = pageMetadata("/services");
  assert.equal(data.alternates?.canonical, "https://bun2too.com/services");
  assert.match(String(data.title), /AI engineering, infrastructure/);
  assert.equal(data.twitter?.card, "summary_large_image");
});
test("structured content cannot terminate its JSON-LD script element", () => {
  const html = renderToStaticMarkup(
    createElement(StructuredData, {
      data: {
        headline: "</script><script>alert(1)</script>",
        description: "Customer context",
      },
    }),
  );
  assert.equal((html.match(/<script/g) || []).length, 1);
  assert.equal((html.match(/<\/script>/g) || []).length, 1);
  assert.ok(html.includes("\\u003c/script>"));
});
