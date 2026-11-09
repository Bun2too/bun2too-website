import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export function verifyBrowserConfig(directory, env) {
  const buffers = [];
  function visit(path) {
    for (const entry of readdirSync(path, { withFileTypes: true })) {
      const file = resolve(path, entry.name);
      if (entry.isDirectory()) visit(file);
      else if (entry.isFile() && file.endsWith(".js"))
        buffers.push(readFileSync(file, "utf8"));
    }
  }
  visit(resolve(directory, "static"));
  for (const key of [
    "NEXT_PUBLIC_AUTH0_DOMAIN",
    "NEXT_PUBLIC_AUTH0_CLIENT_ID",
    "NEXT_PUBLIC_AUTH0_AUDIENCE",
    "NEXT_PUBLIC_TURNSTILE_SITE_KEY",
    "NEXT_PUBLIC_GTM_CONTAINER_ID",
    "NEXT_PUBLIC_GA4_MEASUREMENT_ID",
  ]) {
    const value = env[key];
    if (
      !value ||
      !buffers.some((text) => text.includes(JSON.stringify(value).slice(1, -1)))
    )
      throw new Error(
        `Release browser configuration is missing or stale for ${key}. Check the selected GitHub environment Variable and rebuild; runtime changes cannot repair a previously built browser bundle. Values withheld.`,
      );
  }
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    verifyBrowserConfig(process.env.NEXT_BUILD_DIR || ".next", process.env);
    console.log(
      "Release browser Auth0, verification, and tracking configuration is present. No values printed.",
    );
  } catch (error) {
    console.error(
      error.code
        ? "Release browser artifact could not be read; build with the adapter first"
        : error.message,
    );
    process.exitCode = 1;
  }
}
