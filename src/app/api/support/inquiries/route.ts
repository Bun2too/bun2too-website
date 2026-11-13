import { publicOrigin, readBody, sameOrigin, verifyCaptcha } from "@/lib/api";
import { parseInquiry, saveInquiry } from "@/lib/support";
import { getSupportStore } from "@/lib/support-store";
import {
  inquiryEmailConfig,
  notifyInquiry,
  acknowledgeInquiry,
  type InquiryNotification,
} from "@/lib/support-email";
import { supportDeadline } from "@/lib/support-deadline";
import { RequestError } from "@/lib/consent";
import {
  supportIdentity,
  supportResponse,
  supportError,
  throttleSupport,
} from "@/lib/support-api";
export const runtime = "nodejs";
export async function POST(request: Request) {
  let reference: string | undefined;
  let identity: ReturnType<typeof supportIdentity> | undefined;
  let notification: InquiryNotification = "unconfirmed";
  let acknowledgment: InquiryNotification = "unconfirmed";
  const timeoutMessage =
    "We couldn’t confirm your inquiry. Please try again or email our team.";
  try {
    return await supportDeadline(
      async (signal) => {
        sameOrigin(request);
        const inquiry = parseInquiry(await readBody(request, 16384));
        if (!inquiry)
          return supportResponse({ received: true }, undefined, undefined, 202);
        identity = supportIdentity(request);
        const email = inquiryEmailConfig();
        if (!email) {
          console.error("Inquiry email configuration unavailable");
          throw new RequestError(
            503,
            "Private inquiries are currently unavailable. Please email our team.",
          );
        }
        const owner = identity.owner;
        await supportDeadline(
          (storageSignal) =>
            throttleSupport(getSupportStore(storageSignal), request, owner),
          4000,
          signal,
          timeoutMessage,
        );
        await supportDeadline(
          (captchaSignal) =>
            verifyCaptcha(
              inquiry.captchaToken,
              new URL(publicOrigin(request)).hostname,
              "support-inquiry",
              captchaSignal,
            ),
          8000,
          signal,
          timeoutMessage,
        );
        reference = await supportDeadline(
          (storageSignal) =>
            saveInquiry(getSupportStore(storageSignal), owner, inquiry),
          4000,
          signal,
          timeoutMessage,
        );
        await supportDeadline(
          async (emailSignal) => {
            const store = getSupportStore(emailSignal);
            notification = await notifyInquiry(
              store,
              owner,
              inquiry.requestId,
              email,
              emailSignal,
            );
            acknowledgment = await acknowledgeInquiry(
              store,
              owner,
              inquiry.requestId,
              email,
              emailSignal,
            );
          },
          12000,
          signal,
          timeoutMessage,
        );
        return supportResponse(
          { reference, notification, acknowledgment },
          request,
          identity,
          notification === "accepted" && acknowledgment === "accepted"
            ? 201
            : 202,
        );
      },
      24000,
      request.signal,
      timeoutMessage,
    );
  } catch (error) {
    if (reference)
      return supportResponse(
        { reference, notification, acknowledgment },
        request,
        identity,
        202,
      );
    return supportError(error);
  }
}
