import { readFile, appendFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { evaluate, modelJudge, writeReport } from "./core.mjs";
import { supportAdapter } from "./support/adapter.mjs";

let adapter;
try {
  const suite = process.argv[2];
  if (!["component", "trajectory", "all"].includes(suite))
    throw new Error("Choose component, trajectory or all");
  const inventory = JSON.parse(
    await readFile(new URL("./support/cases.json", import.meta.url), "utf8"),
  );
  const judge = modelJudge();
  adapter = await supportAdapter();
  const sourceSha =
    process.env.GITHUB_SHA ||
    execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  const reports = [];
  for (const current of suite === "all"
    ? ["component", "trajectory"]
    : [suite]) {
    const examples = [...inventory.cases];
    if (current === "trajectory")
      for (const [id, values] of [
        ["no-consent", { noConsent: true }],
        ["cross-origin", { invalidOrigin: true }],
        ["missing-session", { missingSession: true }],
      ])
        examples.push({
          id,
          question: "What services does Bun2Too offer?",
          reference: "Reject before calling any model.",
          ...values,
        });
    reports.push(
      await evaluate({
        suite: current,
        cases: examples,
        runCase: adapter.runCase,
        judge,
        requiredComponents: inventory.components,
        sourceSha,
        datasetVersion: inventory.version,
      }),
    );
  }
  const report =
    reports.length === 1
      ? reports[0]
      : {
          ...reports[0],
          suite: "all",
          passed: reports.every((item) => item.passed),
          minimumScore: Math.min(...reports.map((item) => item.minimumScore)),
          missingComponents: reports.flatMap((item) => item.missingComponents),
          cases: reports.flatMap((item) =>
            item.cases.map((example) => ({
              ...example,
              id: item.suite + "/" + example.id,
            })),
          ),
        };
  const file = "artifacts/agent-evals/report.json";
  const digest = await writeReport(report, file);
  if (process.env.GITHUB_OUTPUT)
    await appendFile(process.env.GITHUB_OUTPUT, `report_sha256=${digest}\n`);
  if (process.env.GITHUB_STEP_SUMMARY)
    await appendFile(
      process.env.GITHUB_STEP_SUMMARY,
      await readFile(file.replace(".json", ".md"), "utf8"),
    );
  console.log(
    `Agent ${suite} evaluation: ${report.passed ? "PASS" : "FAIL"}; minimum score ${report.minimumScore}. See ${file}.`,
  );
  if (!report.passed) process.exitCode = 1;
} catch (error) {
  const safeError = /^(Configure|Choose)/.test(error.message || "")
    ? error.message
    : "Evaluation setup or execution failed; inspect the isolated harness configuration";
  await writeReport(
    {
      schemaVersion: 1,
      sourceSha: process.env.GITHUB_SHA || "local",
      datasetVersion: "setup-failed",
      suite: process.argv[2],
      threshold: 0.5,
      passed: false,
      minimumScore: 0,
      missingComponents: ["evaluation-setup"],
      cases: [{ id: "setup", passed: false, score: 0, error: safeError }],
    },
    "artifacts/agent-evals/report.json",
  );
  console.error(safeError);
  process.exitCode = 1;
} finally {
  await adapter?.close();
}
