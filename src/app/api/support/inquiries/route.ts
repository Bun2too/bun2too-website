import { publicOrigin, readBody, sameOrigin, verifyCaptcha } from "@/lib/api";
import { parseInquiry, saveInquiry } from "@/lib/support";
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
    const inquiry = parseInquiry(await readBody(request, 16384));
    if (!inquiry)
      return supportResponse({ received: true }, undefined, undefined, 202);
    const identity = supportIdentity(request);
    const store = getSupportStore();
    await throttleSupport(store, request, identity.owner);
    await verifyCaptcha(
      inquiry.captchaToken,
      new URL(publicOrigin(request)).hostname,
      "support-inquiry",
    );
    const reference = await saveInquiry(store, identity.owner, inquiry);
    return supportResponse({ reference }, request, identity, 201);
  } catch (error) {
    return supportError(error);
  }
}
