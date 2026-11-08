export const CONSENT_VERSION = "2026-11-07";
export const TOPICS = [
  { value: "customer-technology", label: "Customer technology" },
  { value: "ai-automation", label: "AI & automation" },
  { value: "fintech", label: "Fintech experiments" },
] as const;
export type Topic = (typeof TOPICS)[number]["value"];
export type NewsletterPreference = {
  status: "pending_verification" | "subscribed" | "unsubscribed";
  topics: Topic[];
  consent_version: string;
  requested_at?: string;
  confirmed_at?: string;
  withdrawn_at?: string;
  updated_at: string;
  source: string;
};
export class RequestError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export function object(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
export function parseTopics(value: unknown, required = true): Topic[] {
  if (
    !Array.isArray(value) ||
    value.length > TOPICS.length ||
    value.some((t) => !TOPICS.some((topic) => topic.value === t))
  )
    throw new RequestError(400, "Choose valid topics.");
  const topics = [...new Set(value)] as Topic[];
  if (required && topics.length === 0)
    throw new RequestError(400, "Choose at least one topic.");
  return topics;
}
export function parseSignup(value: unknown) {
  const data = object(value);
  if (typeof data.website === "string" && data.website) return null;
  if (data.consent !== true)
    throw new RequestError(400, "Please agree to receive email updates.");
  if (typeof data.email !== "string")
    throw new RequestError(400, "Enter a valid email address.");
  const email = data.email.trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email))
    throw new RequestError(400, "Enter a valid email address.");
  return {
    email,
    topics: parseTopics(data.topics),
    captchaToken:
      typeof data.captchaToken === "string" ? data.captchaToken : "",
  };
}
