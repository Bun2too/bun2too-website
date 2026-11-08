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
const root = fileURLToPath(new URL("../", import.meta.url));
const version = "8.30.1";
// Official GitHub release asset digests. No unverified executable is run.
const platforms = {
  "linux-x64": [
    "linux_x64",
    "551f6fc83ea457d62a0d98237cbad105af8d557003051f41f3e7ca7b3f2470eb",
  ],
  "darwin-arm64": [
    "darwin_arm64",
    "b40ab0ae55c505963e365f271a8d3846efbc170aa17f2607f13df610a9aeb6a5",
  ],
};
const platform = platforms[`${process.platform}-${process.arch}`];
if (!platform)
  throw new Error(
    "This scanner supports Linux x64 and macOS arm64; use the GitHub check or an independently verified Gitleaks install on other platforms.",
  );
const directory = mkdtempSync(resolve(tmpdir(), "public-repo-scan-"));
try {
  const response = await fetch(
    `https://github.com/gitleaks/gitleaks/releases/download/v${version}/gitleaks_${version}_${platform[0]}.tar.gz`,
    { signal: AbortSignal.timeout(60000) },
  );
  if (!response.ok)
    throw new Error("Could not download the pinned official Gitleaks release");
  const archive = Buffer.from(await response.arrayBuffer());
  if (createHash("sha256").update(archive).digest("hex") !== platform[1])
    throw new Error("Gitleaks checksum did not match; no executable was run");
  const tar = resolve(directory, "scanner.tar.gz");
  writeFileSync(tar, archive, { mode: 0o600 });
  execFileSync("tar", ["-xzf", tar, "-C", directory, "gitleaks"]);
  const binary = resolve(directory, "gitleaks");
  const snapshot = resolve(directory, "candidate");
  mkdirSync(snapshot);
  const files = execFileSync(
    "git",
    ["ls-files", "--cached", "--others", "--exclude-standard", "-z"],
    { cwd: root },
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
    const report = resolve(directory, `${kind}.json`);
    const result = spawnSync(
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
    if (result.status === 1) {
      const findings = JSON.parse(readFileSync(report, "utf8"));
      for (const finding of findings)
        console.error(
          `${kind}: ${finding.File.replace(snapshot + "/", "")}:${finding.StartLine}: ${finding.RuleID} [redacted]`,
        );
      process.exitCode = 1;
    } else if (result.status !== 0)
      throw new Error(
        `Gitleaks ${kind} scan failed; raw output withheld to avoid exposing values`,
      );
    else console.log(`Gitleaks ${version}: ${kind} scan passed.`);
  }
} catch {
  console.error(
    "Pinned Gitleaks audit could not complete. Check network access, supported platform, and the official release; do not treat an incomplete scan as a pass.",
  );
  process.exitCode = 1;
} finally {
  rmSync(directory, { recursive: true, force: true });
}
