import { publicOrigin, readBody, sameOrigin, verifyCaptcha } from "./api";
import {
  answerQuestion,
  parseQuestion,
  publicSupportConfig,
} from "./openwebui";
import { getSupportStore } from "./support-store";
import { consumeLimit, digest, supportSecret } from "./support";
import { supportError, supportIdentity, supportResponse } from "./support-api";
import { RequestError } from "./consent";
import { supportDeadline } from "./support-deadline";
export type SupportChatEvent = {
  stage: string;
  outcome: "started" | "completed" | "failed";
  status?: number;
  elapsedMs: number;
};
export async function handleSupportChat(
  request: Request,
  observe?: (event: SupportChatEvent) => void,
) {
  const started = Date.now();
  let stage = "validation";
  const emit = (
    value: string,
    outcome: SupportChatEvent["outcome"],
    status?: number,
  ) =>
    observe?.({
      stage: value,
      outcome,
      ...(status ? { status } : {}),
      elapsedMs: Date.now() - started,
    });
  emit(stage, "started");
  const startStage = (value: string) => {
    stage = value;
    emit(stage, "started");
    console.info("Public support chat stage", {
      stage,
      elapsedMs: Date.now() - started,
    });
  };
  try {
    return await supportDeadline(
      async (signal) => {
        sameOrigin(request);
        const input = parseQuestion(await readBody(request, 8192));
        if (!publicSupportConfig())
          throw new RequestError(
            503,
            "AI answers are not connected yet. You can send the team a private inquiry.",
          );
        emit("validation", "completed");
        stage = "session";
        emit(stage, "started");
        const identity = supportIdentity(request);
        if (identity.fresh)
          throw new RequestError(
            401,
            "Reopen support to start a verified browser session.",
          );
        emit("session", "completed");
        startStage("rate-limit-storage");
        await supportDeadline(
          async (storageSignal) => {
            const store = getSupportStore(storageSignal);
            await consumeLimit(store, `chat-${identity.owner}`, 10, 3600000);
            const ip = request.headers.get("x-nf-client-connection-ip");
            if (ip)
              await consumeLimit(
                store,
                `chat-network-${digest(ip, supportSecret())}`,
                30,
                3600000,
              );
          },
          4000,
          signal,
        );
        emit("rate-limit-storage", "completed");
        startStage("captcha");
        await supportDeadline(
          (captchaSignal) =>
            verifyCaptcha(
              input.captchaToken,
              new URL(publicOrigin(request)).hostname,
              "support-chat",
              captchaSignal,
            ),
          8000,
          signal,
        );
        emit("captcha", "completed");
        startStage("ai-provider");
        const answer = await answerQuestion(
          input.question,
          fetch,
          process.env,
          signal,
        );
        emit("ai-provider", "completed");
        emit("response", "completed", 200);
        return supportResponse(answer, request, identity);
      },
      25000,
      request.signal,
    );
  } catch (error) {
    console.error("Public support chat failed", {
      stage,
      elapsedMs: Date.now() - started,
      status: error instanceof RequestError ? error.status : 503,
    });
    const response = supportError(error);
    emit(stage, "failed", response.status);
    emit("response", "completed", response.status);
    return response;
  }
}
