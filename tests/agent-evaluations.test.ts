import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  evaluate,
  validScores,
  redact,
  modelJudge,
  judgeConfiguration,
  judgePayload,
  parseJudgeGrade,
} from "../evals/core.mjs";
import { verifyHumanReview } from "../evals/human-review.mjs";

const scores = (value: number) => ({
  relevance: value,
  faithfulness: value,
  task_completion: value,
});
const execution = {
  calls: [
    { component: "answer", input: "Public fixture", output: "Candidate" },
  ],
  checks: [{ name: "guard", passed: true }],
  trace: [],
};
const options = {
  suite: "component",
  cases: [{ id: "fixture", reference: "Ground truth" }],
  requiredComponents: ["answer"],
  sourceSha: "fixture-commit",
  datasetVersion: "fixture-v1",
  runCase: async () => execution,
};

test("judge normalizes OpenAI base URLs and sends compatible chat parameters", () => {
  const env = {
    AI_EVAL_JUDGE_URL: "https://api.openai.com/v1",
    AI_EVAL_JUDGE_API_KEY: "fixture-judge-key",
    AI_EVAL_JUDGE_MODEL: "fixture-judge-model",
  };
  for (const suffix of ["", "/", "/chat/completions"]) {
    const config = judgeConfiguration({
      ...env,
      AI_EVAL_JUDGE_URL: env.AI_EVAL_JUDGE_URL + suffix,
    });
    assert.equal(config.url.href, "https://api.openai.com/v1/chat/completions");
    const body = judgePayload(execution.calls[0], "Facts", config);
    assert.equal(body.max_completion_tokens, 1000);
    assert.equal(body.store, false);
    assert.ok(!("temperature" in body));
    assert.ok(!("max_tokens" in body));
  }
  const custom = judgeConfiguration({
    ...env,
    AI_EVAL_JUDGE_URL: "https://judge.example.invalid/custom/completions",
  });
  assert.equal(custom.url.pathname, "/custom/completions");
  assert.equal(
    judgePayload(execution.calls[0], "Facts", custom).max_tokens,
    1000,
  );
  for (const values of [
    { AI_EVAL_JUDGE_API_KEY: ["Bearer", "fixture-key"].join(" ") },
    { AI_EVAL_JUDGE_MODEL: " fixture-model" },
    { AI_EVAL_JUDGE_URL: "https://api.openai.com/v1/responses" },
  ])
    assert.throws(() => judgeConfiguration({ ...env, ...values }));
});

test("judge accepts nested or flat numeric scores but never defaults/coerces a missing score", () => {
  const body = (value) => ({
    choices: [{ message: { content: JSON.stringify(value) } }],
  });
  for (const value of [
    { scores: scores(0.5), rationale: "Assessment" },
    { ...scores(0.5), rationale: "Assessment" },
  ])
    assert.deepEqual(parseJudgeGrade(body(value)).scores, scores(0.5));
  for (const value of [
    { relevance: 1, faithfulness: 1 },
    { ...scores(1), task_completion: "1" },
    { ...scores(1), faithfulness: 10 },
    { scores: null, ...scores(1) },
  ])
    assert.throws(() => parseJudgeGrade(body(value)));
  assert.throws(
    () =>
      parseJudgeGrade({ choices: [{ message: { content: "invalid JSON" } }] }),
    /Judge returned invalid JSON/,
  );
});

test("judge HTTP failures identify the credential category without disclosing provider response", async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async () =>
      Response.json(
        { error: "fixture-private-provider-body" },
        { status: 401 },
      );
    const judge = modelJudge({
      AI_EVAL_JUDGE_URL: "https://judge.example.invalid/completions",
      AI_EVAL_JUDGE_API_KEY: "fixture-judge-key",
      AI_EVAL_JUDGE_MODEL: "fixture-model",
    });
    await assert.rejects(
      () => judge(execution.calls[0], "Facts"),
      (error) =>
        /Judge HTTP 401.*AI_EVAL_JUDGE_API_KEY/.test(error.message) &&
        !error.message.includes("fixture-private-provider-body"),
    );
  } finally {
    globalThis.fetch = original;
  }
});

test("quality gates accept 0.5, reject any lower dimension, and cannot average failures away", async () => {
  assert.equal(
    (
      await evaluate({
        ...options,
        judge: async () => ({ scores: scores(0.5) }),
      })
    ).passed,
    true,
  );
  const report = await evaluate({
    ...options,
    judge: async () => ({ scores: { ...scores(1), faithfulness: 0.49 } }),
  });
  assert.equal(report.passed, false);
  assert.equal(report.minimumScore, 0.49);
  const mixed = await evaluate({
    ...options,
    cases: [...options.cases, { id: "second", reference: "Facts" }],
    judge: async (_call: unknown, reference: string) => ({
      scores: scores(reference === "Facts" ? 0.1 : 1),
    }),
  });
  assert.equal(mixed.minimumScore, 0.1);
  assert.equal(mixed.passed, false);
});

test("missing coverage, malformed grades, provider errors and unsafe trajectories fail closed", async () => {
  for (const bad of [
    null,
    {},
    scores(NaN),
    scores(-1),
    scores(1.1),
    { relevance: "1", faithfulness: 1, task_completion: 1 },
  ])
    assert.throws(() => validScores(bad));
  for (const overrides of [
    { requiredComponents: ["answer", "forgotten-role"] },
    { judge: async () => ({ scores: {} }) },
    {
      judge: async () => {
        throw new Error("private provider error");
      },
    },
    {
      runCase: async () => ({
        ...execution,
        checks: [{ name: "consent", passed: false }],
      }),
    },
    {
      runCase: async () => ({
        ...execution,
        calls: [{ component: "unregistered" }],
      }),
    },
  ]) {
    const report = await evaluate({
      ...options,
      judge: async () => ({ scores: scores(1) }),
      ...overrides,
    });
    assert.equal(report.passed, false);
    assert.ok(!JSON.stringify(report).includes("private provider error"));
  }
  assert.throws(() => modelJudge({}), /Configure/);
  assert.throws(
    () =>
      modelJudge({
        AI_EVAL_JUDGE_URL: "http://judge.example.invalid",
        AI_EVAL_JUDGE_MODEL: "fixture",
        AI_EVAL_JUDGE_API_KEY: "fixture",
      }),
    /HTTPS/,
  );
  assert.deepEqual(
    redact(
      { output: "fixture-credential-value" },
      { AI_EVAL_JUDGE_API_KEY: "fixture-credential-value" },
    ),
    { output: "[redacted]" },
  );
});

test("QA judges the full trajectory independently of passing individual calls", async () => {
  const report = await evaluate({
    ...options,
    suite: "trajectory",
    judge: async (call) => ({
      scores: scores(call.component === "workflow.trajectory" ? 0.49 : 1),
    }),
  });
  assert.equal(report.passed, false);
  assert.equal(report.cases[0].calls[0].score, 1);
  assert.equal(report.cases[0].trajectoryGrade.scores.task_completion, 0.49);
});

test("human review requires actual GitHub approval, exact commit/report, and a complete passing scorecard", async () => {
  const report = await evaluate({
    ...options,
    judge: async () => ({ scores: scores(0.8) }),
  });
  const bytes = Buffer.from(JSON.stringify(report));
  const digest = createHash("sha256").update(bytes).digest("hex");
  const comment = {
    decision: "approved",
    report_sha256: digest,
    scores: { relevance: 0.8, faithfulness: 0.8, trajectory: 0.8 },
    notes:
      "Reviewed all visible outputs and consent denial traces against the fixture reference.",
  };
  const review = {
    state: "approved",
    user: { login: "fixture-reviewer", type: "User" },
    environments: [{ name: "agent-production-review" }],
    comment: JSON.stringify(comment),
  };
  const input = {
    reportBytes: bytes,
    expectedDigest: digest,
    sourceSha: "fixture-commit",
    approvals: [review],
    scorecardRequired: true,
  };
  assert.equal((await verifyHumanReview(input)).reviewer, "fixture-reviewer");
  for (const overrides of [
    { approvals: [] },
    { sourceSha: "different-commit" },
    { expectedDigest: "different-hash" },
    { approvals: [{ ...review, state: "rejected" }] },
    { approvals: [{ ...review, environments: [{ name: "prod" }] }] },
    ...[0.49, -1, 1.1, "1", null].map((value) => ({
      approvals: [
        {
          ...review,
          comment: JSON.stringify({
            ...comment,
            scores: { ...comment.scores, trajectory: value },
          }),
        },
      ],
    })),
    {
      approvals: [
        {
          ...review,
          comment: JSON.stringify({
            ...comment,
            notes: "Replace these scores with your assessment.",
          }),
        },
      ],
    },
  ])
    await assert.rejects(() => verifyHumanReview({ ...input, ...overrides }));
});
