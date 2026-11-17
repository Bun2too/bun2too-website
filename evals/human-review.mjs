import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { validScores, THRESHOLD } from "./core.mjs";

export function humanScorecardRequired(env = process.env) {
  const value = env.AI_EVAL_HUMAN_SCORECARD_REQUIRED || "false";
  if (!["true", "false"].includes(value))
    throw new Error("AI_EVAL_HUMAN_SCORECARD_REQUIRED must be true or false");
  return value === "true";
}

export async function verifyHumanReview({
  reportBytes,
  expectedDigest,
  sourceSha,
  approvals,
  environment = "agent-production-review",
  scorecardRequired = false,
}) {
  if (typeof scorecardRequired !== "boolean")
    throw new Error("Human scorecard policy must be a boolean");
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
  let approvalOnly,
    scorecardIssue,
    sawApproval = false;
  const result = (review, scores, notes, scorecardProvided) => ({
    sourceSha,
    report_sha256: digest,
    reviewer: review.user.login,
    decision: "approved",
    scorecardRequired,
    scorecardProvided,
    scores,
    notes: notes.slice(0, 2000),
  });
  for (const review of approvals) {
    if (
      review.state !== "approved" ||
      !review.environments?.some((item) => item.name === environment) ||
      !review.user?.login ||
      review.user.type !== "User"
    )
      continue;
    sawApproval = true;
    const text =
      typeof review.comment === "string" ? review.comment.trim() : "";
    const jsonText =
      text.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i)?.[1]?.trim() || text;
    let comment;
    try {
      comment = JSON.parse(jsonText);
    } catch {
      if (jsonText.startsWith("{")) {
        scorecardIssue = "The supplied human scorecard is invalid JSON";
        continue;
      }
    }
    const provided =
      comment &&
      typeof comment === "object" &&
      !Array.isArray(comment) &&
      ["report_sha256", "decision", "scores"].some((key) =>
        Object.hasOwn(comment, key),
      );
    if (!provided) {
      if (!scorecardRequired && !approvalOnly)
        approvalOnly = result(
          review,
          null,
          typeof comment?.notes === "string" ? comment.notes : text,
          false,
        );
      continue;
    }
    const notes = comment.notes ?? "";
    if (
      comment.report_sha256 !== digest ||
      comment.decision !== "approved" ||
      typeof notes !== "string" ||
      (scorecardRequired && notes.trim().length < 20) ||
      notes.includes("Replace these scores")
    ) {
      scorecardIssue =
        "The supplied human scorecard must match this report, approve it, and contain valid review notes (at least 20 characters when required)";
      continue;
    }
    let scores;
    try {
      scores = validScores(comment.scores, [
        "relevance",
        "faithfulness",
        "trajectory",
      ]);
    } catch {
      scorecardIssue =
        "The supplied human scorecard must contain every required finite numeric score in [0, 1]";
      continue;
    }
    if (Object.values(scores).some((score) => score < THRESHOLD)) {
      scorecardIssue =
        "A supplied human evaluation score is below 0.5; revise and retest before approving";
      continue;
    }
    return result(review, scores, notes, true);
  }
  if (scorecardIssue) throw new Error(scorecardIssue);
  if (approvalOnly) return approvalOnly;
  if (sawApproval && scorecardRequired)
    throw new Error(
      "A scorecard is required (AI_EVAL_HUMAN_SCORECARD_REQUIRED=true). Paste the completed report.md JSON template in GitHub Actions > Review deployments > comment, with review notes of at least 20 characters",
    );
  throw new Error(
    "A human must approve agent-production-review in GitHub Actions > Review deployments. An unprotected or bypassed job is not approval; scorecards and notes are optional unless AI_EVAL_HUMAN_SCORECARD_REQUIRED=true",
  );
}

async function main() {
  try {
    const scorecardRequired = humanScorecardRequired();
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
      scorecardRequired,
    });
    await writeFile(
      process.argv[3] || "human-evaluation.json",
      JSON.stringify(review, null, 2) + "\n",
    );
    console.log(
      `Human approval verified for this exact commit and report. Scorecard ${review.scorecardProvided ? "recorded" : "not provided (optional)"}.`,
    );
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

if (process.argv[1]?.endsWith("human-review.mjs")) void main();
