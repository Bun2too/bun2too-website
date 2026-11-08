import { onyxConfig } from "@/lib/onyx";
import { getSupportStore } from "@/lib/support-store";
import {
  supportIdentity,
  supportResponse,
  supportError,
} from "@/lib/support-api";
export const runtime = "nodejs";
export async function GET(request: Request) {
  try {
    const identity = supportIdentity(request);
    const verificationReady =
      process.env.NODE_ENV !== "production" ||
      Boolean(
        process.env.TURNSTILE_SECRET_KEY &&
        process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
      );
    let chat = false;
    let inquiries = false;
    try {
      getSupportStore();
      inquiries = verificationReady;
    } catch {
      /* Not configured on this host. */
    }
    try {
      onyxConfig();
      chat = inquiries;
    } catch {
      /* Inquiries remain available without Onyx. */
    }
    return supportResponse({ chat, inquiries }, request, identity);
  } catch (error) {
    return supportError(error);
  }
}
