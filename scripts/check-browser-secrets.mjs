import { readdirSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { privateRuntimeKeys } from "./deploy-config.mjs";
const keys = [
  ...privateRuntimeKeys.filter(
    (key) =>
      ![
        "AUTH0_DOMAIN",
        "AUTH0_AUDIENCE",
        "AUTH0_EMAIL_CONNECTION",
        "INSIGHTS_EMBED_ORIGINS",
      ].includes(key),
  ),
  "NETLIFY_AUTH_TOKEN",
  "NETLIFY_SITE_ID",
];
const values = keys
  .filter((key) => process.env[key]?.length >= 8)
  .map((key) => [key, process.env[key]]);
const base = resolve(process.env.NEXT_BUILD_DIR || ".next", "static");
let checked = 0;
const failures = [];
function inspect(path) {
  for (const name of readdirSync(path)) {
    const file = resolve(path, name);
    if (statSync(file).isDirectory()) inspect(file);
    else if (/\.(?:js|json|map)$/.test(name)) {
      const source = readFileSync(file, "utf8");
      checked++;
      for (const [key, value] of values)
        if (source.includes(value)) failures.push(`${name}: ${key} [redacted]`);
    }
  }
}
inspect(base);
if (failures.length)
  throw new Error(
    `Private configuration matched browser assets:\n${failures.join("\n")}`,
  );
console.log(
  `Checked ${checked} browser assets against ${values.length} active private configuration values. Public SPA/tag IDs are intentionally browser-visible.`,
);
