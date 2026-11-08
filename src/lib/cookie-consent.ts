// Browser-safe policy. Add a category only alongside its consent-gated loader.
export const COOKIE_CONSENT_NAME = "bun2too_cookie_consent";
export const COOKIE_CONSENT_VERSION = "2026-11-08.2";
export const COOKIE_CONSENT_SECONDS = 180 * 24 * 60 * 60;
export const READING_STORAGE_KEY = "bun2too-read-insights";
export type CookieChoices = {
  preferences: boolean;
  analytics: boolean;
  marketing: boolean;
};
export type CookieConsent = {
  version: string;
  necessary: true;
  preferences: boolean;
  analytics: boolean;
  marketing: boolean;
  updatedAt: number;
  expiresAt: number;
};
export function createCookieConsent(
  choices: boolean | Partial<CookieChoices>,
  now = Date.now(),
): CookieConsent {
  return {
    version: COOKIE_CONSENT_VERSION,
    necessary: true,
    preferences:
      typeof choices === "boolean" ? choices : choices.preferences === true,
    analytics:
      typeof choices === "boolean" ? false : choices.analytics === true,
    marketing:
      typeof choices === "boolean" ? false : choices.marketing === true,
    updatedAt: now,
    expiresAt: now + COOKIE_CONSENT_SECONDS * 1000,
  };
}
export function parseCookieConsent(
  value: string | undefined,
  now = Date.now(),
): CookieConsent | null {
  if (!value || value.length > 1000) return null;
  try {
    const record = JSON.parse(decodeURIComponent(value));
    if (
      record.version !== COOKIE_CONSENT_VERSION ||
      record.necessary !== true ||
      typeof record.preferences !== "boolean" ||
      typeof record.analytics !== "boolean" ||
      typeof record.marketing !== "boolean" ||
      !Number.isFinite(record.updatedAt) ||
      !Number.isFinite(record.expiresAt) ||
      record.updatedAt > now + 60000 ||
      record.expiresAt <= now ||
      record.expiresAt !== record.updatedAt + COOKIE_CONSENT_SECONDS * 1000
    )
      return null;
    return createCookieConsent(record, record.updatedAt);
  } catch {
    return null;
  }
}
export function cookieConsentFromHeader(cookies: string, now = Date.now()) {
  const value = cookies
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${COOKIE_CONSENT_NAME}=`))
    ?.slice(COOKIE_CONSENT_NAME.length + 1);
  return parseCookieConsent(value, now);
}
export function readInsightIds(
  allowed: boolean,
  storage: Pick<Storage, "getItem">,
): string[] {
  if (!allowed) return [];
  try {
    const ids: unknown = JSON.parse(
      storage.getItem(READING_STORAGE_KEY) || "[]",
    );
    return Array.isArray(ids)
      ? ids.filter((id): id is string => typeof id === "string")
      : [];
  } catch {
    return [];
  }
}
