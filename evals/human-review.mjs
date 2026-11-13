import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { validScores, THRESHOLD } from "./core.mjs";

export async function verifyHumanReview({
  reportBytes,
  expectedDigest,
  sourceSha,
  approvals,
  environment = "agent-production-review",
}) {
  const digest = createHash("sha256").update(reportBytes).digest("hex");
  const report = JSON.parse(reportBytes.toString());
  if (
    digest !== expectedDigest ||
    report.sourceSha !== sourceSha ||
    report.passed !== true ||
    report.threshold !== THRESHOLD ||
    !report.cases?.length ||
    report.missingComponents?.length ||
    report.cases.some(
      (item) =>
        item.passed !== true ||
        typeof item.score !== "number" ||
        !Number.isFinite(item.score) ||
        item.score < THRESHOLD ||
        item.score > 1,
    )
  )
    throw new Error(
      "Human review report does not match the passing evaluation for this commit",
    );
  for (const review of approvals) {
    if (
      review.state !== "approved" ||
      !review.environments?.some((item) => item.name === environment) ||
      !review.user?.login ||
      review.user.type !== "User"
    )
      continue;
    let comment;
    try {
      comment = JSON.parse(review.comment);
    } catch {
      continue;
    }
    if (
      comment.report_sha256 !== digest ||
      comment.decision !== "approved" ||
      typeof comment.notes !== "string" ||
      comment.notes.trim().length < 20 ||
      comment.notes.includes("Replace these scores")
    )
      continue;
    let scores;
    try {
      scores = validScores(comment.scores, [
        "relevance",
        "faithfulness",
        "trajectory",
      ]);
    } catch {
      continue;
    }
    if (Object.values(scores).some((score) => score < THRESHOLD)) continue;
    return {
      sourceSha,
      report_sha256: digest,
      reviewer: review.user.login,
      decision: "approved",
      scores,
      notes: comment.notes.slice(0, 2000),
    };
  }
  throw new Error(
    "A human must approve agent-production-review with the report hash, completed scorecard and review notes. Configure required reviewers on that GitHub environment; an unprotected or bypassed job is not approval.",
  );
}

async function main() {
  try {
    const response = await fetch(
      `https://api.github.com/repos/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}/approvals`,
      {
        headers: {
          Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
          Accept: "application/vnd.github+json",
        },
        signal: AbortSignal.timeout(10000),
      },
    );
    if (!response.ok)
      throw new Error(
        `Cannot read GitHub deployment reviews (HTTP ${response.status}); Actions read permission is required`,
      );
    const review = await verifyHumanReview({
      reportBytes: await readFile(process.argv[2]),
      expectedDigest: process.env.AI_EVAL_REPORT_SHA256,
      sourceSha: process.env.GITHUB_SHA,
      approvals: await response.json(),
    });
    await writeFile(
      process.argv[3] || "human-evaluation.json",
      JSON.stringify(review, null, 2) + "\n",
    );
    console.log("Human evaluation approved for this exact commit and report.");
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

if (process.argv[1]?.endsWith("human-review.mjs")) void main();
