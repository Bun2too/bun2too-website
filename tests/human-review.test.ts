import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  humanScorecardRequired,
  verifyHumanReview,
} from "../evals/human-review.mjs";

function fixture(comment = "") {
  const reportBytes = Buffer.from(
    JSON.stringify({
      sourceSha: "fixture-commit",
      passed: true,
      threshold: 0.5,
      missingComponents: [],
      cases: [{ passed: true, score: 0.8 }],
    }),
  );
  const expectedDigest = createHash("sha256").update(reportBytes).digest("hex");
  const review = {
    state: "approved",
    user: { login: "fixture-human", type: "User" },
    environments: [{ name: "agent-production-review" }],
    comment,
  };
  return {
    reportBytes,
    expectedDigest,
    sourceSha: "fixture-commit",
    approvals: [review],
  };
}

test("scorecard policy defaults to optional, supports true/false, and rejects typos", () => {
  assert.equal(humanScorecardRequired({}), false);
  assert.equal(
    humanScorecardRequired({ AI_EVAL_HUMAN_SCORECARD_REQUIRED: "false" }),
    false,
  );
  assert.equal(
    humanScorecardRequired({ AI_EVAL_HUMAN_SCORECARD_REQUIRED: "true" }),
    true,
  );
  for (const value of ["yes", "TRUE", " false "])
    assert.throws(() =>
      humanScorecardRequired({ AI_EVAL_HUMAN_SCORECARD_REQUIRED: value }),
    );
});

test("optional mode accepts a real approval with absent/blank/free-text notes without inventing scores", async () => {
  for (const comment of [
    undefined,
    "",
    "Looks good",
    "Reviewed the agent outputs and guard tests.",
  ]) {
    const input = fixture();
    input.approvals[0].comment = comment;
    const result = await verifyHumanReview(input);
    assert.equal(result.reviewer, "fixture-human");
    assert.equal(result.scorecardProvided, false);
    assert.equal(result.scorecardRequired, false);
    assert.equal(result.scores, null);
    assert.equal(result.notes, comment || "");
    await assert.rejects(
      () => verifyHumanReview({ ...input, scorecardRequired: true }),
      /scorecard is required/,
    );
  }
});

test("optional scorecards retain thresholds; notes become mandatory only in required mode", async () => {
  const input = fixture();
  const card = {
    report_sha256: input.expectedDigest,
    decision: "approved",
    scores: { relevance: 0.8, faithfulness: 0.8, trajectory: 0.8 },
  };
  input.approvals[0].comment = JSON.stringify(card);
  assert.equal((await verifyHumanReview(input)).scorecardProvided, true);
  await assert.rejects(
    () => verifyHumanReview({ ...input, scorecardRequired: true }),
    /review notes/,
  );
  input.approvals[0].comment =
    "```json\n" +
    JSON.stringify({
      ...card,
      notes: "Reviewed the visible outputs and all required guard checks.",
    }) +
    "\n```";
  assert.equal(
    (await verifyHumanReview({ ...input, scorecardRequired: true }))
      .scorecardProvided,
    true,
  );
  for (const change of [
    { scores: { ...card.scores, trajectory: 0.49 } },
    { scores: { relevance: 1 } },
    { report_sha256: "wrong-report" },
    { decision: "rejected" },
  ]) {
    input.approvals[0].comment = JSON.stringify({ ...card, ...change });
    await assert.rejects(() => verifyHumanReview(input));
  }
  input.approvals[0].comment = "{ malformed scorecard";
  await assert.rejects(() => verifyHumanReview(input), /invalid JSON/);
});

test("optional mode still requires an approved human, correct environment, commit, and passing report", async () => {
  const input = fixture();
  for (const overrides of [
    { approvals: [] },
    { sourceSha: "other-commit" },
    { expectedDigest: "other-report" },
    { approvals: [{ ...input.approvals[0], state: "rejected" }] },
    { approvals: [{ ...input.approvals[0], state: "bypassed" }] },
    {
      approvals: [
        { ...input.approvals[0], user: { login: "fixture-bot", type: "Bot" } },
      ],
    },
    {
      approvals: [{ ...input.approvals[0], environments: [{ name: "prod" }] }],
    },
  ])
    await assert.rejects(() => verifyHumanReview({ ...input, ...overrides }));
});
