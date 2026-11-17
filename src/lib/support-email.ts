import nodemailer, {
  type SendMailOptions,
  type SMTPTransportOptions,
} from "nodemailer";
import { RequestError } from "./consent";
import type { SupportStore } from "./support";

export type InquiryNotification = "accepted" | "unconfirmed";
export type MailConfig = {
  host: string;
  port: number;
  from: string;
  to: string;
  auth: { user: string; pass: string };
};
const mailbox = (value: string) =>
  /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(value);

// SMTP authentication is independent of Auth0's email provider and host roles.
export function inquiryEmailConfig(env = process.env): MailConfig | null {
  const host = (
    env.SUPPORT_SES_SMTP_HOST || env.SUPPORT_SENDER_SMTP_HOST
  )?.trim();
  const port = Number(
    env.SUPPORT_SES_SMTP_PORT || env.SUPPORT_SENDER_SMTP_PORT,
  );
  const from = env.SUPPORT_INQUIRY_FROM_EMAIL?.trim();
  const to = env.SUPPORT_INQUIRY_TO_EMAIL?.trim();
  const user = (
    env.SUPPORT_SES_SMTP_USERNAME || env.SUPPORT_SENDER_SMTP_USERNAME
  )?.trim();
  const pass =
    env.SUPPORT_SES_SMTP_PASSWORD || env.SUPPORT_SENDER_SMTP_PASSWORD;
  if (
    !host ||
    !/^[a-zA-Z0-9.-]+$/.test(host) ||
    ![25, 465, 587, 2465, 2587].includes(port) ||
    !from ||
    !mailbox(from) ||
    !to ||
    !mailbox(to) ||
    !user ||
    !pass
  )
    return null;
  return {
    host,
    port,
    from,
    to,
    auth: { user, pass },
  };
}

type SavedInquiry = {
  reference: string;
  name: string;
  email: string;
  topic: string;
  message: string;
  consent: { version: string; givenAt: string };
  notification?: {
    status: "sending" | InquiryNotification;
    attemptedAt: string;
  };
  acknowledgment?: {
    status: "sending" | InquiryNotification;
    attemptedAt: string;
  };
};
type SendMail = (
  input: SendMailOptions,
  config: MailConfig,
  signal: AbortSignal,
) => Promise<void>;

export function inquirySmtpOptions(config: MailConfig): SMTPTransportOptions {
  return {
    host: config.host,
    port: config.port,
    auth: config.auth,
    secure: [465, 2465].includes(config.port),
    requireTLS: true,
    tls: { minVersion: "TLSv1.2", rejectUnauthorized: true },
    connectionTimeout: 4000,
    greetingTimeout: 4000,
    socketTimeout: 6000,
    dnsTimeout: 2000,
    disableFileAccess: true,
    disableUrlAccess: true,
    logger: false,
    debug: false,
  };
}

const sendSes: SendMail = async (input, config, signal) => {
  const transport = nodemailer.createTransport(inquirySmtpOptions(config));
  try {
    const response = await transport.sendMail({ ...input, signal });
    if (
      !response.accepted.some(
        (address) =>
          String(address).toLowerCase() === String(input.to).toLowerCase(),
      )
    )
      throw new Error("SMTP acceptance unconfirmed");
  } finally {
    transport.close();
  }
};

// A persisted conditional claim prevents duplicate sends on concurrent requests
// and browser retries. SES has no idempotency key: an interrupted send remains
// unconfirmed and requires operator review instead of blind automatic resending.
export async function notifyInquiry(
  store: SupportStore,
  owner: string,
  requestId: string,
  config: MailConfig,
  signal: AbortSignal,
  send: SendMail = sendSes,
  channel: "notification" | "acknowledgment" = "notification",
): Promise<InquiryNotification> {
  const key = `inquiries/${owner}/${requestId}`;
  try {
    const record = await store.read<SavedInquiry>(key);
    if (!record) throw new RequestError(503, "Saved inquiry is unavailable.");
    if (record.data[channel])
      return record.data[channel].status === "accepted"
        ? "accepted"
        : "unconfirmed";
    const data = record.data;
    const notification = {
      status: "sending" as const,
      attemptedAt: new Date().toISOString(),
    };
    signal.throwIfAborted();
    const claim = await store.write(
      key,
      { ...data, [channel]: notification },
      { onlyIfMatch: record.etag },
    );
    if (!claim.modified || !claim.etag) return "unconfirmed";
    let status: InquiryNotification = "unconfirmed";
    try {
      signal.throwIfAborted();
      await send(
        channel === "notification"
          ? {
              from: config.from,
              to: config.to,
              replyTo: data.email,
              subject: `Bun2Too website inquiry ${data.reference}`,
              text: [
                `Reference: ${data.reference}`,
                `Name: ${data.name}`,
                `Contact email: ${data.email}`,
                `Topic: ${data.topic}`,
                "",
                data.message,
                "",
                `Consent: respond-to-inquiry (${data.consent.version})`,
                `Consented at: ${data.consent.givenAt}`,
              ].join("\n"),
            }
          : {
              from: config.from,
              to: data.email,
              replyTo: config.from,
              subject: `Your Bun2Too inquiry ${data.reference}`,
              text: [
                "We have saved your inquiry for the Bun2Too team.",
                `Reference: ${data.reference}`,
                "Keep this reference when contacting us about your inquiry.",
                "This acknowledgment confirms that the website saved your inquiry; it does not promise a response time.",
                "You have not been subscribed to marketing.",
                "Do not email passwords, payment details or other sensitive information.",
              ].join("\n\n"),
              headers: {
                "Auto-Submitted": "auto-replied",
                "X-Auto-Response-Suppress": "All",
              },
            },
        config,
        signal,
      );
      status = "accepted";
    } catch (error) {
      const info =
        error && typeof error === "object"
          ? (error as { code?: string; responseCode?: number })
          : {};
      console.error("Inquiry email acceptance unconfirmed", {
        channel,
        stage: "smtp",
        code: [
          "EAUTH",
          "EENVELOPE",
          "EMESSAGE",
          "ETIMEDOUT",
          "ESOCKET",
          "EABORT",
          "ECONFIG",
        ].includes(info.code || "")
          ? info.code
          : "unknown",
        smtpStatus:
          typeof info.responseCode === "number" ? info.responseCode : undefined,
      });
    }
    try {
      await store.write(
        key,
        { ...data, [channel]: { ...notification, status } },
        { onlyIfMatch: claim.etag },
      );
    } catch {
      console.error("Inquiry email status could not be recorded", {
        channel,
        stage: "storage",
      });
    }
    return status;
  } catch {
    console.error("Inquiry email acceptance unconfirmed", {
      channel,
      stage: "storage",
    });
    return "unconfirmed";
  }
}

export async function acknowledgeInquiry(
  store: SupportStore,
  owner: string,
  requestId: string,
  config: MailConfig,
  signal: AbortSignal,
  send?: SendMail,
) {
  return notifyInquiry(
    store,
    owner,
    requestId,
    config,
    signal,
    send,
    "acknowledgment",
  );
}
