export const GTM_CONTAINER_ID = process.env.NEXT_PUBLIC_GTM_CONTAINER_ID || "";
export const GA4_MEASUREMENT_ID =
  process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID || "";

export function googleConsent(analytics: boolean, marketing: boolean) {
  return {
    analytics_storage: analytics ? "granted" : "denied",
    ad_storage: analytics && marketing ? "granted" : "denied",
    ad_user_data: analytics && marketing ? "granted" : "denied",
    ad_personalization: analytics && marketing ? "granted" : "denied",
    functionality_storage: "denied",
    personalization_storage: "denied",
    security_storage: "granted",
  } as const;
}
export function canMeasurePage(url: URL) {
  // Auth callbacks, account state, embeds, API requests, and query/hash values
  // must not be sent to Google. These pages never initialize the container.
  return (
    !url.search &&
    !url.hash &&
    !/^\/(?:account|api|insights\/signup)(?:\/|$)/.test(url.pathname)
  );
}
export function trackingCookie(
  name: string,
  analytics: boolean,
  marketing: boolean,
) {
  return (
    (!analytics && /^_(?:ga(?:_|$)|gid$|gat(?:_|$))/.test(name)) ||
    (!marketing && /^_(?:gcl|gac)(?:_|$)/.test(name))
  );
}
export function clearGoogleCookies(analytics: boolean, marketing: boolean) {
  let names: string[];
  try {
    names = document.cookie
      .split(";")
      .map((cookie) => cookie.trim().split("=")[0]);
  } catch {
    return;
  }
  const parts = location.hostname.split(".");
  const domains = [
    "",
    ...parts.flatMap((_, index) =>
      index < parts.length - 1
        ? [parts.slice(index).join("."), `.${parts.slice(index).join(".")}`]
        : [],
    ),
  ];
  for (const name of names.filter((name) =>
    trackingCookie(name, analytics, marketing),
  )) {
    for (const domain of domains) {
      try {
        document.cookie = `${name}=; Max-Age=0; Path=/; SameSite=Lax${domain ? `; Domain=${domain}` : ""}${location.protocol === "https:" ? "; Secure" : ""}`;
      } catch {
        /* Provider-domain / HttpOnly cookies cannot be removed here. */
      }
    }
  }
}
