import { createHash } from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
import {
  copyFileSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { setTimeout as delay } from "node:timers/promises";
const root = fileURLToPath(new URL("../", import.meta.url));
const version = "8.30.1";
// Official GitHub release asset digests. No unverified executable is run.
const platforms = {
  "linux-x64": [
    "linux_x64",
    "551f6fc83ea457d62a0d98237cbad105af8d557003051f41f3e7ca7b3f2470eb",
    378332058,
  ],
  "darwin-arm64": [
    "darwin_arm64",
    "b40ab0ae55c505963e365f271a8d3846efbc170aa17f2607f13df610a9aeb6a5",
    378332059,
  ],
};
// Only messages constructed here are printable. Never echo network/subprocess errors.
class AuditError extends Error {}

function systemCode(error) {
  const allowed = [
    "ENOENT",
    "EACCES",
    "ENOBUFS",
    "ENOSPC",
    "ETIMEDOUT",
    "ECONNRESET",
    "ECONNREFUSED",
    "ENOTFOUND",
    "EAI_AGAIN",
    "UND_ERR_CONNECT_TIMEOUT",
  ];
  const code = error?.cause?.code ?? error?.code;
  if (allowed.includes(code)) return code;
  if (Number.isInteger(error?.status))
    return `command exited with status ${error.status}`;
  return error?.name === "TimeoutError" || error?.name === "AbortError"
    ? "request timed out"
    : "details withheld";
}

export function auditFailure(error, stage) {
  const reason =
    error instanceof AuditError ? error.message : systemCode(error);
  return `Pinned Gitleaks audit could not complete during ${stage}: ${reason}. An incomplete scan is a failure.`;
}

export async function downloadArchive(
  platformKey,
  { fetcher = fetch, wait = delay, warn = console.warn } = {},
) {
  const platform = platforms[platformKey];
  if (!platform)
    throw new AuditError("supported platforms are Linux x64 and macOS arm64");
  const url = `https://github.com/gitleaks/gitleaks/releases/download/v${version}/gitleaks_${version}_${platform[0]}.tar.gz`;
  for (let attempt = 1; attempt <= 3; attempt++) {
    let archive;
    let failure;
    try {
      // The asset API avoids a failing/cached release redirect. Both paths use
      // the same pinned checksum; no API token or deployment secret is needed.
      const response = await fetcher(
        attempt === 1
          ? url
          : `https://api.github.com/repos/gitleaks/gitleaks/releases/assets/${platform[2]}`,
        {
          headers: { Accept: "application/octet-stream" },
          signal: AbortSignal.timeout(60000),
        },
      );
      if (!response.ok) {
        await response.body?.cancel();
        const message = `official release download returned HTTP ${response.status}`;
        if (
          response.status !== 408 &&
          response.status !== 429 &&
          response.status < 500
        )
          throw new AuditError(message);
        failure = message;
      } else archive = Buffer.from(await response.arrayBuffer());
    } catch (error) {
      if (error instanceof AuditError) throw error;
      failure = `official release download failed (${systemCode(error)})`;
    }
    if (archive) {
      if (createHash("sha256").update(archive).digest("hex") !== platform[1])
        throw new AuditError(
          "release archive SHA-256 mismatch; no executable was run",
        );
      return archive;
    }
    if (attempt === 3) throw new AuditError(`${failure} after 3 attempts`);
    warn(`Gitleaks download attempt ${attempt}/3: ${failure}; retrying.`);
    await wait(attempt * 1000);
  }
}

export function scan(
  binary,
  args,
  kind,
  report,
  snapshot,
  { spawn = spawnSync, log = console } = {},
) {
  const result = spawn(
    binary,
    [
      ...args,
      "--no-banner",
      "--redact=100",
      "--report-format=json",
      `--report-path=${report}`,
    ],
    { encoding: "utf8" },
  );
  if (result.error)
    throw new AuditError(
      `scanner could not start (${systemCode(result.error)})`,
    );
  if (result.status === 0) {
    log.log(`Gitleaks ${version}: ${kind} scan passed.`);
    return true;
  }
  if (result.status !== 1)
    throw new AuditError(
      `scanner exited with status ${Number.isInteger(result.status) ? result.status : "unavailable"}; raw output withheld`,
    );
  let findings;
  try {
    findings = JSON.parse(readFileSync(report, "utf8"));
    if (
      !Array.isArray(findings) ||
      !findings.length ||
      findings.some(
        (finding) =>
          typeof finding.File !== "string" ||
          !Number.isInteger(finding.StartLine) ||
          typeof finding.RuleID !== "string",
      )
    )
      throw new Error();
  } catch {
    throw new AuditError(
      "scanner returned findings status without a valid redacted JSON report; raw output withheld",
    );
  }
  for (const finding of findings)
    log.error(
      `${kind}: ${JSON.stringify(finding.File.replace(snapshot + "/", ""))}:${finding.StartLine}: ${JSON.stringify(finding.RuleID)} [redacted]`,
    );
  return false;
}

export async function main() {
  let directory;
  let stage = "temporary workspace setup";
  try {
    directory = mkdtempSync(resolve(tmpdir(), "public-repo-scan-"));
    stage = "release download and verification";
    console.log(
      `Gitleaks ${version}: preparing ${process.platform}-${process.arch} (SHA-256 pinned).`,
    );
    const archive = await downloadArchive(
      `${process.platform}-${process.arch}`,
    );
    const tar = resolve(directory, "scanner.tar.gz");
    writeFileSync(tar, archive, { mode: 0o600 });
    stage = "verified archive extraction";
    execFileSync("tar", ["-xzf", tar, "-C", directory, "gitleaks"], {
      stdio: "pipe",
    });
    const binary = resolve(directory, "gitleaks");
    stage = "candidate snapshot preparation";
    const snapshot = resolve(directory, "candidate");
    mkdirSync(snapshot);
    const files = execFileSync(
      "git",
      ["ls-files", "--cached", "--others", "--exclude-standard", "-z"],
      { cwd: root, stdio: "pipe" },
    )
      .toString()
      .split("\0")
      .filter(Boolean);
    for (const file of new Set(files)) {
      const path = resolve(root, file);
      try {
        if (!lstatSync(path).isFile()) continue;
        const target = resolve(snapshot, file);
        mkdirSync(dirname(target), { recursive: true });
        copyFileSync(path, target);
      } catch (error) {
        if (error.code !== "ENOENT") throw error;
      }
    }
    for (const [kind, args] of [
      ["candidate", ["dir", snapshot]],
      ["history", ["git", root, "--log-opts=--all"]],
    ]) {
      stage = `${kind} scan`;
      const report = resolve(directory, `${kind}.json`);
      if (!scan(binary, args, kind, report, snapshot)) process.exitCode = 1;
    }
  } catch (error) {
    console.error(auditFailure(error, stage));
    process.exitCode = 1;
  } finally {
    if (directory) rmSync(directory, { recursive: true, force: true });
  }
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  void main();
