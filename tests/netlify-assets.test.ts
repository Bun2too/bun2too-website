import { test } from "node:test";
import assert from "node:assert/strict";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { pathToFileURL } from "node:url";
import { verifyNetlifyAssets } from "../scripts/check-netlify-assets.mjs";

test("pinned adapter publishes public files/chunks during its lifecycle and restores raw output afterward", async () => {
  const { copyStaticAssets, publishStaticDir, unpublishStaticDir } =
    await import(
      pathToFileURL(
        resolve(
          "node_modules/@netlify/plugin-nextjs/dist/build/content/static.js",
        ),
      ).href
    );
  const root = mkdtempSync(join(tmpdir(), "netlify-assets-test-"));
  const previous = process.cwd();
  const published = join(root, ".next");
  function write(path: string, contents: string) {
    const target = join(root, path);
    mkdirSync(join(target, ".."), { recursive: true });
    writeFileSync(target, contents);
  }
  const context = {
    publishDir: published,
    staticDir: join(root, ".netlify/static"),
    tempPublishDir: join(root, ".netlify/.next"),
    resolveFromSiteDir: (path: string) => join(root, path),
    getRoutesManifest: async () => ({ basePath: "" }),
    failBuild: (message: string) => {
      throw new Error(message);
    },
  };
  try {
    write(
      "public/images/customer-architecture.svg",
      "<svg>fixture artwork</svg>",
    );
    write("public/bun2too/logo.png", "fixture logo bytes");
    write(".next/static/chunks/fixture.js", "console.log('fixture');");
    write(".next/BUILD_ID", "fixture-build");
    process.chdir(root); // The vendor swap creates a relative directory too.
    await copyStaticAssets(context);
    assert.throws(
      () => verifyNetlifyAssets(root, published),
      /Refusing raw Next.js output/,
    );
    await publishStaticDir(context);
    assert.deepEqual(verifyNetlifyAssets(root, published), {
      publicFiles: 2,
      browserFiles: 1,
    });
    assert.equal(
      readFileSync(join(published, "images/customer-architecture.svg"), "utf8"),
      "<svg>fixture artwork</svg>",
    );
    await unpublishStaticDir(context);
    assert.ok(existsSync(join(published, "BUILD_ID")));
    assert.equal(
      existsSync(join(published, "images/customer-architecture.svg")),
      false,
    );
    assert.ok(
      existsSync(join(context.staticDir, "images/customer-architecture.svg")),
    );
    assert.throws(
      () => verifyNetlifyAssets(root, published),
      /Refusing raw Next.js output/,
    );
  } finally {
    process.chdir(previous);
    rmSync(root, { recursive: true, force: true });
  }
});

test("artifact validation blocks missing artwork and stale browser chunks before upload", () => {
  const root = mkdtempSync(join(tmpdir(), "netlify-assets-missing-"));
  const published = join(root, "cdn");
  function write(path: string, contents: string) {
    const target = join(root, path);
    mkdirSync(join(target, ".."), { recursive: true });
    writeFileSync(target, contents);
  }
  try {
    write("public/images/customer-architecture.svg", "<svg/>");
    write(".netlify/.next/static/chunks/app.js", "current build");
    mkdirSync(published);
    assert.throws(
      () => verifyNetlifyAssets(root, published),
      /missing or has stale public\/images/,
    );
    write("cdn/images/customer-architecture.svg", "<svg/>");
    write("cdn/_next/static/chunks/app.js", "previous build");
    assert.throws(
      () => verifyNetlifyAssets(root, published),
      /missing or has stale _next\/static/,
    );
    write("cdn/_next/static/chunks/app.js", "current build");
    assert.deepEqual(verifyNetlifyAssets(root, published), {
      publicFiles: 1,
      browserFiles: 1,
    });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
