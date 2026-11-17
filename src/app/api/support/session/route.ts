import { getSupportStore } from "@/lib/support-store";
import { publicSupportConfig } from "@/lib/openwebui";
import { inquiryEmailConfig } from "@/lib/support-email";
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
    let storageReady = false;
    try {
      getSupportStore();
      storageReady = true;
    } catch {
      /* Not configured on this host. */
    }
    const emailReady = Boolean(inquiryEmailConfig());
    const inquiries = storageReady && verificationReady && emailReady;
    return supportResponse(
      {
        inquiries,
        chat:
          storageReady && verificationReady && Boolean(publicSupportConfig()),
        inquiryUnavailableReasons: [
          ...(!storageReady ? ["storage"] : []),
          ...(!verificationReady ? ["verification"] : []),
          ...(!emailReady ? ["email"] : []),
        ],
      },
      request,
      identity,
    );
  } catch (error) {
    return supportError(error);
  }
}
