import { getSupportStore } from "@/lib/support-store";
import { publicSupportConfig } from "@/lib/openwebui";
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
    let inquiries = false;
    try {
      getSupportStore();
      inquiries = verificationReady;
    } catch {
      /* Not configured on this host. */
    }
    return supportResponse(
      { inquiries, chat: inquiries && Boolean(publicSupportConfig()) },
      request,
      identity,
    );
  } catch (error) {
    return supportError(error);
  }
}
