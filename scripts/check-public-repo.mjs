import { execFileSync } from "node:child_process";
import { readFileSync, lstatSync, readdirSync } from "node:fs";
import { parseEnv } from "node:util";
import { basename, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { privateRuntimeKeys } from "./deploy-config.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const git = (args) =>
  execFileSync("git", args, { cwd: root, maxBuffer: 128 * 1024 * 1024 });
const rules = [
  ["private-key", /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/g],
  [
    "github-token",
    /\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,})\b/g,
  ],
  ["cloud-key", /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g],
  ["contentful-personal-token", /\bCFPAT-[A-Za-z0-9_-]{20,}\b/g],
  [
    "provider-key",
    /\b(?:sk-(?:proj-|ant-)?[A-Za-z0-9_-]{24,}|xox[baprs]-[A-Za-z0-9-]{20,}|SG\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,})\b/g,
  ],
  [
    "bearer-jwt",
    /\beyJ[A-Za-z0-9_-]{12,}\.eyJ[A-Za-z0-9_-]{12,}\.[A-Za-z0-9_-]{16,}/g,
  ],
  ["credential-url", /https?:\/\/[^\s/"'<>:@]+:[^\s/"'<>@]+@/g],
  ["personal-path", /(?:\/Users\/|\/home\/)[a-zA-Z0-9_.-]+\//g],
  [
    "internal-address",
    /https?:\/\/(?:10(?:\.\d{1,3}){3}|192\.168(?:\.\d{1,3}){2}|172\.(?:1[6-9]|2\d|3[01])(?:\.\d{1,3}){2})(?=[:/\s"']|$)/g,
  ],
  ["deployment-host", /\b(?:ai|crewai|internal|admin)\.bun2too\.com\b/g],
];
const placeholders =
  /^(?:test|fixture|example|your|replace|change|mock|dummy|not-a-real|sample|<|\$\{|process\.env|secrets\.|vars\.)/i;
export function scanContent(source, known = []) {
  const findings = [];
  const add = (type, index) =>
    findings.push({ type, line: source.slice(0, index).split("\n").length });
  for (const [type, pattern] of rules) {
    pattern.lastIndex = 0;
    for (const match of source.matchAll(pattern)) add(type, match.index);
  }
  for (const match of source.matchAll(/\b[\w-]+(?:\.[\w-]+)*\.auth0\.com\b/g)) {
    if (
      !/^(?:manage|docs|support|developer|community|www)\.auth0\.com$/.test(
        match[0],
      ) &&
      !/(?:example|your-|fixture|test)/i.test(match[0])
    )
      add("tenant-fingerprint", match.index);
  }
  for (const match of source.matchAll(
    /\b(?:GTM-[A-Z0-9]{5,}|G-[A-Z0-9]{6,})\b/g,
  )) {
    if (!/(?:TEST|EXAMPLE|YOUR|FIXTURE)/.test(match[0]))
      add("measurement-fingerprint", match.index);
  }
  const assignments =
    /\b(?:[A-Z][A-Z0-9_]*(?:SECRET|TOKEN|PASSWORD|API_KEY)|client_secret|api_key|access_token)\b\s*[=:]\s*["']([^"'\r\n]{8,})["']/g;
  for (const match of source.matchAll(assignments)) {
    if (!placeholders.test(match[1]) && !/[{}]|=>/.test(match[1]))
      add("literal-credential", match.index);
  }
  for (const [name, value] of known) {
    if (value.length < 8) continue;
    let offset = source.indexOf(value);
    while (offset !== -1) {
      add(`local-config:${name}`, offset);
      offset = source.indexOf(value, offset + value.length);
    }
  }
  return findings;
}
export function forbiddenPath(path) {
  const parts = path.split("/");
  const name = basename(path);
  return (
    (name.startsWith(".env") && name !== ".env.example") ||
    parts.some(
      (part) =>
        [
          ".netlify",
          ".aws",
          ".ssh",
          ".vercel",
          ".codex",
          ".idea",
          "node_modules",
          "test-results",
          "playwright-report",
          "artifacts",
        ].includes(part) || /^\.next(?:-|$)/.test(part),
    ) ||
    /\.(?:pem|key|p12|pfx|jks|tfstate)(?:\.|$)/i.test(name) ||
    /^(?:credentials|id_rsa|id_ed25519|\.npmrc|\.netrc)$/i.test(name)
  );
}

export function checkPublicRepo() {
  const known = [];
  const confidential = new Set([
    ...privateRuntimeKeys.filter(
      (key) =>
        ![
          "AUTH0_AUDIENCE",
          "AUTH0_EMAIL_CONNECTION",
          "INSIGHTS_EMBED_ORIGINS",
        ].includes(key),
    ),
    "NETLIFY_AUTH_TOKEN",
    "NETLIFY_SITE_ID",
    "CONTENTFUL_MANAGEMENT_TOKEN",
    "CONTENTFUL_PREVIEW_TOKEN",
    "AI_EVAL_JUDGE_URL",
    "AI_EVAL_JUDGE_API_KEY",
    "AI_EVAL_JUDGE_MODEL",
    "NEXT_PUBLIC_AUTH0_DOMAIN",
    "NEXT_PUBLIC_AUTH0_CLIENT_ID",
    "NEXT_PUBLIC_GTM_CONTAINER_ID",
    "NEXT_PUBLIC_GA4_MEASUREMENT_ID",
  ]);
  for (const name of readdirSync(root).filter(
    (name) => name.startsWith(".env") && name !== ".env.example",
  )) {
    try {
      const values = parseEnv(readFileSync(resolve(root, name), "utf8"));
      for (const [key, value] of Object.entries(values))
        if (confidential.has(key)) known.push([key, value]);
    } catch {
      /* Ignored local configuration is optional and never printed. */
    }
  }
  for (const key of confidential)
    if (process.env[key]) known.push([key, process.env[key]]);
  const files = [
    ...new Set(
      git(["ls-files", "--cached", "--others", "--exclude-standard", "-z"])
        .toString()
        .split("\0")
        .filter(Boolean),
    ),
  ];
  const failures = [];
  let working = 0,
    indexed = 0,
    historical = 0;
  function inspect(label, path, buffer) {
    if (forbiddenPath(path)) failures.push(`${label}:${path}: forbidden file`);
    for (const finding of scanContent(buffer.toString("utf8"), known))
      failures.push(
        `${label}:${path}:${finding.line}: ${finding.type} [redacted]`,
      );
  }
  for (const path of files) {
    try {
      const stat = lstatSync(resolve(root, path));
      if (stat.isSymbolicLink()) {
        failures.push(
          `working:${path}: symlink requires manual publication review`,
        );
        continue;
      }
      if (!stat.isFile()) continue;
      inspect("working", path, readFileSync(resolve(root, path)));
      working++;
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }
  const index = git(["ls-files", "--stage", "-z"])
    .toString()
    .split("\0")
    .filter(Boolean);
  const seen = new Set();
  for (const entry of index) {
    const match = entry.match(/^\d+ ([a-f0-9]+) \d\t(.+)$/s);
    if (!match) continue;
    inspect("index", match[2], git(["cat-file", "blob", match[1]]));
    indexed++;
    seen.add(match[1]);
  }
  // Only publishable history; local editor capture/tree refs are not branch history.
  const refs = git([
    "for-each-ref",
    "--format=%(refname)",
    "refs/heads",
    "refs/tags",
    "refs/remotes",
  ])
    .toString()
    .trim()
    .split("\n")
    .filter(Boolean);
  const objects = git(["rev-list", "--objects", "HEAD", ...refs])
    .toString()
    .trim()
    .split("\n")
    .filter(Boolean);
  for (const object of objects) {
    const [sha, ...path] = object.split(" ");
    if (!path.length || seen.has(sha)) continue;
    if (git(["cat-file", "-t", sha]).toString().trim() !== "blob") continue;
    inspect("history", path.join(" "), git(["cat-file", "blob", sha]));
    historical++;
    seen.add(sha);
  }
  if (failures.length)
    throw new Error(
      `Publication checks failed. Matches are redacted; inspect files locally:\n${[...new Set(failures)].join("\n")}`,
    );
  console.log(
    `Publication checks passed: ${working} working files, ${indexed} index entries, ${historical} additional historical blobs. Local secret values were not printed.`,
  );
  console.log(
    "This guard uses patterns and known local values; it cannot guarantee the absence of every possible secret or undisclosed business detail.",
  );
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    checkPublicRepo();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
