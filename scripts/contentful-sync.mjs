import { readFile, writeFile } from "node:fs/promises";
import { resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { contentTypes, validateSeed } from "./contentful-model.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const seed = JSON.parse(
  await readFile(resolve(root, "src/content/website-seed.json"), "utf8"),
);
const summary = validateSeed(seed);
const apply = process.argv.includes("--apply");
const envArg = process.argv.find((value) =>
  value.startsWith("--environments="),
);
const environments = (
  envArg?.slice("--environments=".length) ||
  process.env.CONTENTFUL_ENVIRONMENT ||
  "qa"
).split(",");

function configuration() {
  const { CONTENTFUL_SPACE_ID: space, CONTENTFUL_MANAGEMENT_TOKEN: token } =
    process.env;
  if (
    !space ||
    !token ||
    !/^[A-Za-z0-9_-]+$/.test(space) ||
    environments.some((env) => !["qa", "master"].includes(env))
  )
    throw new Error(
      "Set CONTENTFUL_SPACE_ID and CONTENTFUL_MANAGEMENT_TOKEN privately; select qa and/or master.",
    );
  return { space, token };
}
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function request(
  config,
  path,
  { method = "GET", body, headers = {}, upload = false, optional = false } = {},
) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const response = await fetch(
      `${upload ? "https://upload.contentful.com" : "https://api.contentful.com"}/spaces/${config.space}${path}`,
      {
        method,
        redirect: "error",
        signal: AbortSignal.timeout(20000),
        headers: {
          Authorization: `Bearer ${config.token}`,
          "Content-Type": upload
            ? "application/octet-stream"
            : "application/vnd.contentful.management.v1+json",
          ...headers,
        },
        ...(body === undefined
          ? {}
          : { body: upload ? body : JSON.stringify(body) }),
      },
    );
    if (optional && response.status === 404) return null;
    if (response.status === 429 && attempt < 3) {
      await response.body?.cancel();
      await wait(1200);
      continue;
    }
    if (!response.ok) {
      const problem = await response.json().catch(() => ({}));
      const issues = (problem.details?.errors || [])
        .map((error) => ({ name: error.name, path: error.path }))
        .filter((error) => /^[a-zA-Z0-9_-]+$/.test(error.name || ""));
      throw new Error(
        `Contentful ${method} ${path.replace(/\?.*/, "")} failed (HTTP ${response.status}); validation paths: ${JSON.stringify(issues)}. Provider body and credentials withheld.`,
      );
    }
    if (response.status === 204) return null;
    return response.json();
  }
  throw new Error(
    "Contentful rate limit did not recover; no automatic content overwrite attempted.",
  );
}
const localize = (fields, locale) =>
  Object.fromEntries(
    Object.entries(fields)
      .filter(
        ([, value]) => value !== undefined && value !== null && value !== "",
      )
      .map(([key, value]) => [key, { [locale]: value }]),
  );
const canonical = (value) =>
  JSON.stringify(value, (_, item) =>
    item && typeof item === "object" && !Array.isArray(item)
      ? Object.fromEntries(
          Object.entries(item).sort(([a], [b]) => a.localeCompare(b)),
        )
      : item,
  );
const comparableFields = (fields) =>
  Object.fromEntries(
    Object.entries(fields).filter(([, translations]) =>
      Object.values(translations).some(
        (value) =>
          value !== null &&
          value !== "" &&
          !(Array.isArray(value) && value.length === 0),
      ),
    ),
  );
async function migrate(config, environment) {
  const prefix = `/environments/${environment}`;
  await request(config, prefix);
  const locales = await request(config, `${prefix}/locales`);
  const locale = locales.items.find((item) => item.default)?.code;
  if (!locale) throw new Error("Contentful environment has no default locale.");
  const inventory = await request(config, `${prefix}/content_types?limit=1000`);
  console.log(
    `Contentful ${environment}: access verified; ${inventory.total} existing content types. ${apply ? "Applying missing owned content only." : "Read-only check; use --apply to create/publish."}`,
  );
  if (!apply) return { environment, ...summary, applied: false };
  const counts = {
    contentTypesCreated: 0,
    contentTypesUpdated: 0,
    assetsCreated: 0,
    entriesCreated: 0,
    published: 0,
    skipped: 0,
  };
  const newTypes = [];
  for (const model of contentTypes) {
    const path = `${prefix}/content_types/${model.id}`;
    const existing = await request(config, path, { optional: true });
    const { id, ...body } = model;
    if (existing) {
      if (process.argv.includes("--update-models")) {
        if (
          existing.fields.some(
            (field) =>
              !model.fields.some((expected) => expected.id === field.id),
          )
        )
          throw new Error(
            "Contentful model contains additional editorial fields; refusing to remove them.",
          );
        newTypes.push(
          await request(config, path, {
            method: "PUT",
            headers: { "X-Contentful-Version": String(existing.sys.version) },
            body,
          }),
        );
        counts.contentTypesUpdated++;
      } else counts.skipped++;
      continue;
    }
    newTypes.push(await request(config, path, { method: "PUT", body }));
    counts.contentTypesCreated++;
  }
  for (const model of newTypes) {
    await request(config, `${prefix}/content_types/${model.sys.id}/published`, {
      method: "PUT",
      headers: { "X-Contentful-Version": String(model.sys.version) },
    });
  }
  console.log(
    `Contentful ${environment}: ${counts.contentTypesCreated} models created, ${counts.contentTypesUpdated} updated, and activated.`,
  );
  for (const asset of seed.assets) {
    const path = `${prefix}/assets/${asset.id}`;
    const existing = await request(config, path, { optional: true });
    if (existing) {
      counts.skipped++;
      continue;
    }
    const file = resolve(root, "public", asset.localPath.replace(/^\//, ""));
    if (!file.startsWith(resolve(root, "public") + sep))
      throw new Error("Asset file escaped public directory.");
    const upload = await request(config, "/uploads", {
      method: "POST",
      body: await readFile(file),
      upload: true,
    });
    let created = await request(config, path, {
      method: "PUT",
      body: {
        fields: localize(
          {
            title: asset.title,
            description: asset.description,
            file: {
              contentType: asset.contentType,
              fileName: asset.fileName,
              uploadFrom: {
                sys: { type: "Link", linkType: "Upload", id: upload.sys.id },
              },
            },
          },
          locale,
        ),
      },
    });
    await request(config, `${path}/files/${locale}/process`, {
      method: "PUT",
      headers: { "X-Contentful-Version": String(created.sys.version) },
    });
    for (let attempt = 0; attempt < 15; attempt++) {
      created = await request(config, path);
      if (created.fields.file?.[locale]?.url) break;
      await wait(1000);
    }
    if (!created.fields.file?.[locale]?.url)
      throw new Error(
        "Contentful asset processing did not complete. Rerun after checking the asset; existing records are preserved.",
      );
    await request(config, `${path}/published`, {
      method: "PUT",
      headers: { "X-Contentful-Version": String(created.sys.version) },
    });
    counts.assetsCreated++;
    counts.published++;
  }
  console.log(
    `Contentful ${environment}: ${counts.assetsCreated} artwork assets published.`,
  );
  const newEntries = [];
  for (const entry of seed.entries) {
    const path = `${prefix}/entries/${entry.id}`;
    const existing = await request(config, path, { optional: true });
    if (existing) {
      counts.skipped++;
      if (
        !existing.sys.publishedVersion &&
        canonical(comparableFields(existing.fields)) ===
          canonical(comparableFields(localize(entry.fields, locale)))
      )
        newEntries.push(existing);
      continue;
    }
    newEntries.push(
      await request(config, path, {
        method: "PUT",
        headers: { "X-Contentful-Content-Type": entry.type },
        body: { fields: localize(entry.fields, locale) },
      }),
    );
    counts.entriesCreated++;
  }
  const priority = [
    "b2tAction",
    "b2tArtwork",
    "b2tCard",
    "b2tFaq",
    "b2tBlock",
    "b2tPage",
    "b2tSite",
  ];
  // The seed orders supporting blocks before referring blocks, then pages/site.
  newEntries.sort(
    (a, b) =>
      priority.indexOf(a.sys.contentType.sys.id) -
      priority.indexOf(b.sys.contentType.sys.id),
  );
  for (const entry of newEntries) {
    await request(config, `${prefix}/entries/${entry.sys.id}/published`, {
      method: "PUT",
      headers: { "X-Contentful-Version": String(entry.sys.version) },
    });
    counts.published++;
  }
  console.log(
    `Contentful ${environment}: ${counts.published - counts.assetsCreated} entries published (${counts.entriesCreated} newly created). Existing content was preserved.`,
  );
  return { environment, ...counts, applied: true };
}

try {
  if (process.argv.includes("--plan")) {
    console.log(
      JSON.stringify(
        {
          ...summary,
          models: contentTypes.map(({ id, name }) => ({ id, name })),
        },
        null,
        2,
      ),
    );
  } else {
    const config = configuration();
    const results = [];
    for (const environment of environments)
      results.push(await migrate(config, environment));
    const outputArg = process.argv.find((value) =>
      value.startsWith("--report="),
    );
    if (outputArg)
      await writeFile(
        resolve(outputArg.slice("--report=".length)),
        JSON.stringify(results, null, 2) + "\n",
      );
    console.log(JSON.stringify(results));
  }
} catch (error) {
  // Known messages contain only operation/status; fetch causes can contain URLs.
  console.error(
    error instanceof Error &&
      /^(Contentful|Set CONTENTFUL|Asset file|Unknown|Missing|Duplicate|Unresolved)/.test(
        error.message,
      )
      ? error.message
      : "Contentful migration failed (network/timeout or invalid response). Credentials and provider output withheld.",
  );
  process.exitCode = 1;
}
