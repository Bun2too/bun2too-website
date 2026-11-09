// Names and handling rules only. Actual values belong in GitHub environments.
export class DeploymentConfigError extends Error {}
export const publicBuildKeys = [
  "NEXT_PUBLIC_SITE_URL",
  "NEXT_PUBLIC_AUTH0_DOMAIN",
  "NEXT_PUBLIC_AUTH0_CLIENT_ID",
  "NEXT_PUBLIC_AUTH0_AUDIENCE",
  "NEXT_PUBLIC_AUTH0_EMAIL_CONNECTION",
  "NEXT_PUBLIC_TURNSTILE_SITE_KEY",
  "NEXT_PUBLIC_CONTACT_EMAIL",
  "NEXT_PUBLIC_GTM_CONTAINER_ID",
  "NEXT_PUBLIC_GA4_MEASUREMENT_ID",
  "SITE_ENVIRONMENT",
  "GOOGLE_SITE_VERIFICATION",
  "BING_SITE_VERIFICATION",
];
export const privateRuntimeKeys = [
  "AUTH0_DOMAIN",
  "AUTH0_AUDIENCE",
  "AUTH0_MANAGEMENT_CLIENT_ID",
  "AUTH0_MANAGEMENT_CLIENT_SECRET",
  "AUTH0_EMAIL_CONNECTION",
  "TURNSTILE_SECRET_KEY",
  "SUPPORT_SESSION_SECRET",
  "INSIGHTS_API_ORIGIN",
  "INSIGHTS_EMBED_ORIGINS",
];
export const requiredKeys = [
  "NETLIFY_AUTH_TOKEN",
  "NETLIFY_SITE_ID",
  "NEXT_PUBLIC_SITE_URL",
  "SITE_ENVIRONMENT",
  "NEXT_PUBLIC_AUTH0_DOMAIN",
  "NEXT_PUBLIC_AUTH0_CLIENT_ID",
  "NEXT_PUBLIC_AUTH0_AUDIENCE",
  "NEXT_PUBLIC_TURNSTILE_SITE_KEY",
  "NEXT_PUBLIC_GTM_CONTAINER_ID",
  "NEXT_PUBLIC_GA4_MEASUREMENT_ID",
  ...privateRuntimeKeys.filter(
    (key) =>
      !["AUTH0_EMAIL_CONNECTION", "INSIGHTS_EMBED_ORIGINS"].includes(key),
  ),
];
export function validateDeployment(env) {
  const errors = requiredKeys
    .filter((key) => !env[key]?.trim())
    .map((key) => `Missing ${key}`);
  if (env.SUPPORT_SESSION_SECRET && env.SUPPORT_SESSION_SECRET.length < 32)
    errors.push("SUPPORT_SESSION_SECRET must contain at least 32 characters");
  for (const key of ["NEXT_PUBLIC_SITE_URL", "INSIGHTS_API_ORIGIN"]) {
    if (!env[key]) continue;
    try {
      const url = new URL(env[key]);
      if (
        url.protocol !== "https:" ||
        url.username ||
        url.password ||
        url.search ||
        url.hash ||
        url.pathname !== "/"
      )
        throw new DeploymentConfigError();
    } catch {
      errors.push(`Invalid HTTPS URL in ${key}`);
    }
  }
  if (env.AUTH0_DOMAIN && env.AUTH0_DOMAIN !== env.NEXT_PUBLIC_AUTH0_DOMAIN)
    errors.push("Server and SPA Auth0 domains must match");
  if (
    env.AUTH0_AUDIENCE &&
    env.AUTH0_AUDIENCE !== env.NEXT_PUBLIC_AUTH0_AUDIENCE
  )
    errors.push("Server and SPA Auth0 audiences must match");
  if (
    env.AUTH0_DOMAIN &&
    !/^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?\.[a-z]{2,}$/i.test(env.AUTH0_DOMAIN)
  )
    errors.push("AUTH0_DOMAIN must be a hostname without a scheme or path");
  if (
    env.NEXT_PUBLIC_GTM_CONTAINER_ID &&
    !/^GTM-[A-Z0-9]+$/.test(env.NEXT_PUBLIC_GTM_CONTAINER_ID)
  )
    errors.push("Invalid NEXT_PUBLIC_GTM_CONTAINER_ID");
  if (
    env.NEXT_PUBLIC_GA4_MEASUREMENT_ID &&
    !/^G-[A-Z0-9]+$/.test(env.NEXT_PUBLIC_GA4_MEASUREMENT_ID)
  )
    errors.push("Invalid NEXT_PUBLIC_GA4_MEASUREMENT_ID");
  if (
    env.SITE_ENVIRONMENT &&
    !["dev", "qa", "prod"].includes(env.SITE_ENVIRONMENT)
  )
    errors.push("Invalid SITE_ENVIRONMENT");
  if (errors.length) throw new DeploymentConfigError(errors.join("\n"));
}

export async function syncNetlifyEnvironment(env, fetcher = fetch) {
  validateDeployment(env);
  const api = "https://api.netlify.com/api/v1";
  const headers = {
    Authorization: `Bearer ${env.NETLIFY_AUTH_TOKEN}`,
    "Content-Type": "application/json",
  };
  async function call(path, options = {}) {
    let response;
    try {
      response = await fetcher(`${api}${path}`, {
        ...options,
        headers,
        redirect: "error",
        signal: AbortSignal.timeout(20000),
      });
    } catch {
      throw new DeploymentConfigError(
        "Netlify configuration request failed; no response body or credentials were logged",
      );
    }
    return response;
  }
  const siteResponse = await call(
    `/sites/${encodeURIComponent(env.NETLIFY_SITE_ID)}`,
  );
  if (!siteResponse.ok)
    throw new DeploymentConfigError(
      `Netlify site lookup failed (HTTP ${siteResponse.status})`,
    );
  const site = await siteResponse.json();
  if (!site.account_id)
    throw new DeploymentConfigError(
      "Netlify did not return the site's account identifier",
    );
  // Refuse an accidental dev/QA/prod site mismatch before changing its environment.
  const siteHosts = [
    site.ssl_url,
    site.url,
    site.custom_domain ? `https://${site.custom_domain}` : null,
    ...(site.domain_aliases || []).map((host) => `https://${host}`),
  ]
    .filter(Boolean)
    .map((value) => new URL(value).hostname);
  if (!siteHosts.includes(new URL(env.NEXT_PUBLIC_SITE_URL).hostname))
    throw new DeploymentConfigError(
      "Selected Netlify site does not match NEXT_PUBLIC_SITE_URL; no configuration was changed",
    );
  const endpoint = `/accounts/${encodeURIComponent(site.account_id)}/env`;
  const query = `?site_id=${encodeURIComponent(env.NETLIFY_SITE_ID)}`;
  for (const key of [...publicBuildKeys, ...privateRuntimeKeys]) {
    const value = env[key] || (key.endsWith("EMAIL_CONNECTION") ? "email" : "");
    // Empty optional values overwrite old values, avoiding stale configuration.
    // Use all scopes rather than a Pro-only granular restriction.
    const payload = {
      key,
      scopes: ["builds", "functions", "runtime", "post-processing"],
      values: [{ context: "production", value }],
    };
    const response = await call(
      `${endpoint}/${encodeURIComponent(key)}${query}`,
      { method: "PUT", body: JSON.stringify(payload) },
    );
    if (response.status === 404) {
      const created = await call(`${endpoint}${query}`, {
        method: "POST",
        body: JSON.stringify([payload]),
      });
      if (!created.ok)
        throw new DeploymentConfigError(
          `Netlify configuration failed for ${key} (HTTP ${created.status})`,
        );
    } else if (!response.ok)
      throw new DeploymentConfigError(
        `Netlify configuration failed for ${key} (HTTP ${response.status})`,
      );
    // Never read or print environment-value response bodies.
  }
  return [...publicBuildKeys, ...privateRuntimeKeys].length;
}
