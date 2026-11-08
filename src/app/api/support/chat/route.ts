import { randomUUID } from "node:crypto";
import { publicOrigin, readBody, sameOrigin, verifyCaptcha } from "@/lib/api";
import { RequestError } from "@/lib/consent";
import { askOnyx, onyxConfig } from "@/lib/onyx";
import {
  DAY,
  ownedConversation,
  parseChat,
  type Conversation,
  SUPPORT_CONSENT_VERSION,
} from "@/lib/support";
import { getSupportStore } from "@/lib/support-store";
import {
  supportIdentity,
  supportResponse,
  supportError,
  throttleSupport,
} from "@/lib/support-api";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const input = parseChat(await readBody(request, 16384));
    onyxConfig();
    const identity = supportIdentity(request);
    const store = getSupportStore();
    await throttleSupport(store, request, identity.owner, "chat");
    let id = input.conversationId;
    if (!id) {
      await verifyCaptcha(
        input.captchaToken,
        new URL(publicOrigin(request)).hostname,
        "support-chat",
      );
      id = randomUUID();
      await store.write(
        `conversations/${id}`,
        {
          owner: identity.owner,
          onyxSession: null,
          messages: [],
          expiresAt: Date.now() + DAY,
          consent: {
            version: SUPPORT_CONSENT_VERSION,
            givenAt: new Date().toISOString(),
          },
        } satisfies Conversation,
        { onlyIfNew: true },
      );
    }
    const record = await ownedConversation(store, id, identity.owner);
    if (record.data.messages.length >= 40)
      throw new RequestError(
        429,
        "This chat has reached its limit. Please send an inquiry or start a new conversation.",
      );
    if ((record.data.busyUntil || 0) > Date.now())
      throw new RequestError(
        409,
        "The assistant is still answering. Please wait a moment.",
      );
    const locked = await store.write(
      `conversations/${id}`,
      { ...record.data, busyUntil: Date.now() + 65000 },
      { onlyIfMatch: record.etag },
    );
    if (!locked.modified || !locked.etag)
      throw new RequestError(409, "Please wait for the current answer.");
    try {
      const result = await askOnyx(input.message, record.data.onyxSession);
      const saved = await store.write(
        `conversations/${id}`,
        {
          ...record.data,
          onyxSession: result.sessionId,
          messages: [
            ...record.data.messages,
            { role: "user", content: input.message },
            { role: "assistant", content: result.answer },
          ],
          busyUntil: 0,
        },
        { onlyIfMatch: locked.etag },
      );
      if (!saved.modified)
        throw new RequestError(
          409,
          "The conversation changed. Please start a new chat.",
        );
      return supportResponse(
        { answer: result.answer, sources: result.sources, conversationId: id },
        request,
        identity,
      );
    } catch (error) {
      await store
        .write(
          `conversations/${id}`,
          { ...record.data, busyUntil: 0 },
          { onlyIfMatch: locked.etag },
        )
        .catch(() => undefined);
      throw error;
    }
  } catch (error) {
    return supportError(error);
  }
}
