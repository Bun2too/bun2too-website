import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { object, RequestError } from "./consent";
export const SUPPORT_CONSENT_VERSION = "2026-11-07";
export const SUPPORT_COOKIE = "bun2too_support";
export const DAY = 86400000;
export type SupportMessage = { role: "user" | "assistant"; content: string };
export type SupportSource = { title: string; url: string; number: number };
export type Conversation = {
  owner: string;
  onyxSession: string | null;
  messages: SupportMessage[];
  expiresAt: number;
  busyUntil?: number;
  consent: { version: string; givenAt: string };
};
export interface SupportStore {
  read<T>(key: string): Promise<{ data: T; etag: string } | null>;
  write(
    key: string,
    value: unknown,
    condition?: { onlyIfNew?: true; onlyIfMatch?: string },
  ): Promise<{ modified: boolean; etag?: string }>;
  remove(key: string): Promise<void>;
}
export const uuid = (value: unknown): value is string =>
  typeof value === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
export function supportSecret() {
  const secret = process.env.SUPPORT_SESSION_SECRET;
  if (!secret || secret.length < 32)
    throw new RequestError(
      503,
      "Support is being connected. Please use the contact page for now.",
    );
  return secret;
}
export function digest(value: string, secret: string) {
  return createHmac("sha256", secret).update(value).digest("hex");
}
export function visitor(request: Request, secret: string, now = Date.now()) {
  const cookie = request.headers
    .get("cookie")
    ?.split(";")
    .map((s) => s.trim())
    .find((s) => s.startsWith(`${SUPPORT_COOKIE}=`))
    ?.slice(SUPPORT_COOKIE.length + 1);
  let id = "";
  let expires = now + DAY;
  if (cookie) {
    const [payload, signature, extra] = cookie.split(".");
    if (payload && signature && !extra && /^[a-f0-9]{64}$/.test(signature)) {
      const expected = digest(payload, secret);
      if (timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
        try {
          const data = object(
            JSON.parse(Buffer.from(payload, "base64url").toString()),
          );
          if (
            uuid(data.id) &&
            typeof data.exp === "number" &&
            data.exp > now &&
            data.exp <= now + DAY
          ) {
            id = data.id;
            expires = data.exp;
          }
        } catch {
          /* Replace malformed or expired cookies. */
        }
      }
    }
  }
  const fresh = !id;
  id ||= randomUUID();
  const payload = Buffer.from(JSON.stringify({ id, exp: expires })).toString(
    "base64url",
  );
  return {
    owner: digest(`owner:${id}`, secret),
    value: `${payload}.${digest(payload, secret)}`,
    fresh,
  };
}
export function parseChat(input: unknown) {
  const data = object(input);
  if (data.consent !== true)
    throw new RequestError(
      400,
      "Please agree to support message processing before starting.",
    );
  if (
    typeof data.message !== "string" ||
    !data.message.trim() ||
    data.message.trim().length > 2000
  )
    throw new RequestError(
      400,
      "Enter a message between 1 and 2,000 characters.",
    );
  if (
    data.conversationId !== undefined &&
    data.conversationId !== null &&
    !uuid(data.conversationId)
  )
    throw new RequestError(400, "Start a new conversation.");
  return {
    message: data.message.trim(),
    conversationId:
      typeof data.conversationId === "string" ? data.conversationId : null,
    captchaToken:
      typeof data.captchaToken === "string" ? data.captchaToken : "",
  };
}
export function parseInquiry(input: unknown) {
  const data = object(input);
  if (data.website) return null;
  if (data.consent !== true)
    throw new RequestError(
      400,
      "Please agree that we can use these details to respond to your inquiry.",
    );
  if (
    typeof data.name !== "string" ||
    !data.name.trim() ||
    data.name.length > 100
  )
    throw new RequestError(400, "Enter your name (up to 100 characters).");
  if (
    typeof data.email !== "string" ||
    data.email.length > 254 ||
    !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(data.email.trim())
  )
    throw new RequestError(400, "Enter a valid contact email.");
  if (
    typeof data.message !== "string" ||
    data.message.trim().length < 10 ||
    data.message.length > 2000
  )
    throw new RequestError(
      400,
      "Describe your inquiry in 10 to 2,000 characters.",
    );
  if (
    !["project", "account", "subscription", "application", "other"].includes(
      String(data.topic),
    )
  )
    throw new RequestError(400, "Choose an inquiry topic.");
  if (!uuid(data.requestId))
    throw new RequestError(400, "Refresh the form and try again.");
  if (data.includeTranscript === true && !uuid(data.conversationId))
    throw new RequestError(400, "There is no active chat to attach.");
  return {
    name: data.name.trim(),
    email: data.email.trim().toLowerCase(),
    message: data.message.trim(),
    topic: String(data.topic),
    requestId: data.requestId,
    consent: true,
    includeTranscript: data.includeTranscript === true,
    conversationId: uuid(data.conversationId) ? data.conversationId : null,
    captchaToken:
      typeof data.captchaToken === "string" ? data.captchaToken : "",
  };
}
export async function consumeLimit(
  store: SupportStore,
  identity: string,
  maximum: number,
  windowMs: number,
  now = Date.now(),
) {
  const key = `limits/${identity}/${Math.floor(now / windowMs)}`;
  for (let attempt = 0; attempt < 4; attempt++) {
    const previous = await store.read<{ count: number }>(key);
    if (previous && previous.data.count >= maximum)
      throw new RequestError(
        429,
        "Too many requests. Please try again a little later.",
      );
    const result = await store.write(
      key,
      { count: (previous?.data.count || 0) + 1, expiresAt: now + windowMs * 2 },
      previous ? { onlyIfMatch: previous.etag } : { onlyIfNew: true },
    );
    if (result.modified) return;
  }
  throw new RequestError(429, "Support is busy. Please try again shortly.");
}
export async function ownedConversation(
  store: SupportStore,
  id: string,
  owner: string,
  now = Date.now(),
) {
  const record = await store.read<Conversation>(`conversations/${id}`);
  if (!record || record.data.owner !== owner || record.data.expiresAt <= now)
    throw new RequestError(
      404,
      "This conversation has expired. Please start a new chat.",
    );
  return record;
}
export async function saveInquiry(
  store: SupportStore,
  owner: string,
  inquiry: NonNullable<ReturnType<typeof parseInquiry>>,
  now = Date.now(),
) {
  const key = `inquiries/${owner}/${inquiry.requestId}`;
  const existing = await store.read<{ reference: string }>(key);
  if (existing) return existing.data.reference;
  const transcript =
    inquiry.includeTranscript && inquiry.conversationId
      ? (await ownedConversation(store, inquiry.conversationId, owner, now))
          .data.messages
      : [];
  const reference = `B2T-${inquiry.requestId.slice(0, 8).toUpperCase()}`;
  const result = await store.write(
    key,
    {
      reference,
      name: inquiry.name,
      email: inquiry.email,
      topic: inquiry.topic,
      message: inquiry.message,
      transcript,
      consent: {
        purpose: "respond-to-inquiry",
        version: SUPPORT_CONSENT_VERSION,
        givenAt: new Date(now).toISOString(),
        includeTranscript: inquiry.includeTranscript,
      },
      createdAt: new Date(now).toISOString(),
      expiresAt: now + 90 * DAY,
      status: "new",
    },
    { onlyIfNew: true },
  );
  if (!result.modified) {
    const duplicate = await store.read<{ reference: string }>(key);
    if (!duplicate)
      throw new RequestError(
        503,
        "Your inquiry could not be saved. Please try again.",
      );
    return duplicate.data.reference;
  }
  return reference;
}
