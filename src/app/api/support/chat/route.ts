import { publicOrigin, readBody, sameOrigin, verifyCaptcha } from "@/lib/api";
import {
  answerQuestion,
  parseQuestion,
  publicSupportConfig,
} from "@/lib/openwebui";
import { getSupportStore } from "@/lib/support-store";
import { consumeLimit, digest, supportSecret } from "@/lib/support";
import {
  supportError,
  supportIdentity,
  supportResponse,
} from "@/lib/support-api";
import { RequestError } from "@/lib/consent";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const input = parseQuestion(await readBody(request, 8192));
    if (!publicSupportConfig())
      throw new RequestError(
        503,
        "AI answers are not connected yet. You can send the team a private inquiry.",
      );
    const identity = supportIdentity(request);
    if (identity.fresh)
      throw new RequestError(
        401,
        "Reopen support to start a verified browser session.",
      );
    const store = getSupportStore();
    await consumeLimit(store, `chat-${identity.owner}`, 10, 3600000);
    const ip = request.headers.get("x-nf-client-connection-ip");
    if (ip)
      await consumeLimit(
        store,
        `chat-network-${digest(ip, supportSecret())}`,
        30,
        3600000,
      );
    await verifyCaptcha(
      input.captchaToken,
      new URL(publicOrigin(request)).hostname,
      "support-chat",
    );
    return supportResponse(
      await answerQuestion(input.question),
      request,
      identity,
    );
  } catch (error) {
    return supportError(error);
  }
}
