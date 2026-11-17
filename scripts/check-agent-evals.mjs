import { mkdir, writeFile, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { answerQuestion, publicSupportConfig } from "../src/lib/openwebui.ts";
import {
  judgeConfiguration,
  judgePayload,
  modelJudge,
} from "../evals/core.mjs";

// Deliberately separate from artifacts/agent-evals/, which CI uploads.
// These local curl configs contain credentials and must never be uploaded.
const directory = "artifacts/agent-eval-requests";
const live = process.argv.includes("--live");
const originalFetch = globalThis.fetch;
let stage = "configuration";
try {
  const env = { ...process.env, OPENWEBUI_PUBLIC_SUPPORT_ENABLED: "true" };
  const candidateConfig = publicSupportConfig(env);
  if (!candidateConfig)
    throw new Error(
      "Configure the OPENWEBUI connection settings before checking evaluations",
    );
  const judgeConfig = judgeConfiguration(env);
  const inventory = JSON.parse(
    await readFile(
      new URL("../evals/support/cases.json", import.meta.url),
      "utf8",
    ),
  );
  const example = inventory.cases[0];
  let candidateRequest;
  await answerQuestion(
    example.question,
    async (url, options) => {
      candidateRequest = {
        url,
        headers: options.headers,
        body: JSON.parse(options.body),
      };
      return Response.json({
        choices: [
          {
            message: {
              content:
                "Bun2Too offers AI engineering and customer technology integration.",
            },
          },
        ],
      });
    },
    env,
  );
  await mkdir(directory, { recursive: true, mode: 0o700 });
  async function save(name, request) {
    const jsonFile = resolve(directory, name + ".json");
    await writeFile(jsonFile, JSON.stringify(request.body, null, 2) + "\n", {
      mode: 0o600,
    });
    const config = [
      "# LOCAL CREDENTIALS: never commit, upload or paste this file.",
      'request = "POST"',
      "url = " + JSON.stringify(String(request.url)),
      ...Object.entries(request.headers).map(
        ([key, value]) => "header = " + JSON.stringify(key + ": " + value),
      ),
      "data-binary = " + JSON.stringify("@" + jsonFile),
      "max-time = 50",
      "silent",
      "show-error",
      "fail-with-body",
      "",
    ].join("\n");
    await writeFile(resolve(directory, name + ".curl"), config, {
      mode: 0o600,
    });
  }
  await save("candidate", candidateRequest);
  const call = {
    component: "support.answer",
    input: example.question,
    output:
      "Bun2Too offers AI engineering and customer technology integration.",
  };
  const makeJudgeRequest = (candidate) => ({
    url: judgeConfig.url.href,
    headers: {
      Authorization: `Bearer ${judgeConfig.key}`,
      "Content-Type": "application/json",
    },
    body: judgePayload(candidate, example.reference, judgeConfig),
  });
  await save("judge-component", makeJudgeRequest(call));
  await save(
    "judge-trajectory",
    makeJudgeRequest({
      component: "workflow.trajectory",
      input: example.question,
      output: {
        calls: [{ component: call.component, output: call.output }],
        trace: [
          "validation",
          "session",
          "rate-limit-storage",
          "captcha",
          "ai-provider",
          "response",
        ].map((stage) => ({ stage, outcome: "completed" })),
        checks: [{ name: "example-only", passed: true }],
      },
    }),
  );
  console.log(
    `Exported candidate, judge-component and judge-trajectory JSON/curl files to ${directory}/ (local secrets; not a CI upload directory).`,
  );
  console.log(
    "The trajectory export is an illustrative payload, not execution evidence. Use eval:trajectory for measured traces.",
  );
  if (live) {
    const track = async (input, options) => {
      const response = await originalFetch(input, options);
      console.log(
        `${stage}: HTTP ${response.status} (endpoint, key and response body withheld)`,
      );
      return response;
    };
    stage = "candidate";
    const answer = await answerQuestion(example.question, track, env);
    call.output = answer.answer;
    await save("judge-component", makeJudgeRequest(call));
    stage = "judge";
    globalThis.fetch = track;
    const grade = await modelJudge(env)(call, example.reference);
    console.log("Judge returned all required finite numeric scores in [0, 1].");
    console.log(JSON.stringify({ scores: grade.scores }));
    console.log(
      "Connectivity/schema check passed. This is not a complete evaluation or release approval.",
    );
  } else
    console.log(
      "No network request sent. Add --live to test one candidate call and one judge call.",
    );
} catch (error) {
  const safe =
    /^(Configure|Judge HTTP|Judge returned|Judge URL|Judge response|Evaluator must)/.test(
      error.message || "",
    )
      ? error.message
      : "Connection, authentication, timeout or response check failed; provider details withheld";
  console.error(`Evaluation ${stage} check failed: ${safe}`);
  process.exitCode = 1;
} finally {
  globalThis.fetch = originalFetch;
}
