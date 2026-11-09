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
  "OPENWEBUI_BASE_URL",
  "OPENWEBUI_API_KEY",
  "OPENWEBUI_MODEL_ID",
  "OPENWEBUI_KNOWLEDGE_ID",
  "OPENWEBUI_PUBLIC_SUPPORT_ENABLED",
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
      !["AUTH0_EMAIL_CONNECTION", "INSIGHTS_EMBED_ORIGINS"].includes(key) &&
      !key.startsWith("OPENWEBUI_"),
  ),
];
export function validateDeployment(env) {
  const errors = requiredKeys
    .filter((key) => !env[key]?.trim())
    .map((key) => `Missing ${key}`);
  for (const key of [
    ...publicBuildKeys,
    ...privateRuntimeKeys,
    "NETLIFY_SITE_ID",
    "NETLIFY_AUTH_TOKEN",
  ])
    if (env[key] && env[key] !== env[key].trim())
      errors.push(
        `${key} has leading/trailing whitespace; correct the selected GitHub environment setting`,
      );
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
    errors.push(
      "AUTH0_DOMAIN (Secret) and NEXT_PUBLIC_AUTH0_DOMAIN (Variable) must match in the selected GitHub environment",
    );
  if (
    env.AUTH0_AUDIENCE &&
    env.AUTH0_AUDIENCE !== env.NEXT_PUBLIC_AUTH0_AUDIENCE
  )
    errors.push(
      "AUTH0_AUDIENCE and NEXT_PUBLIC_AUTH0_AUDIENCE must match exactly, including trailing slashes. Use the custom Auth0 API Identifier, not a client ID or Management API audience. CI derives both from the NEXT_PUBLIC_AUTH0_AUDIENCE Variable; local configuration must match too",
    );
  if (
    env.NEXT_PUBLIC_AUTH0_AUDIENCE &&
    (env.NEXT_PUBLIC_AUTH0_AUDIENCE === env.NEXT_PUBLIC_AUTH0_CLIENT_ID ||
      env.NEXT_PUBLIC_AUTH0_AUDIENCE.replace(/\/$/, "") ===
        `https://${env.AUTH0_DOMAIN}/api/v2`)
  )
    errors.push(
      "NEXT_PUBLIC_AUTH0_AUDIENCE must be the custom preference API Identifier, not the SPA client ID or Auth0 Management API audience",
    );
  if (
    env.OPENWEBUI_PUBLIC_SUPPORT_ENABLED &&
    !["true", "false"].includes(env.OPENWEBUI_PUBLIC_SUPPORT_ENABLED)
  )
    errors.push("OPENWEBUI_PUBLIC_SUPPORT_ENABLED must be true or false");
  if (env.OPENWEBUI_PUBLIC_SUPPORT_ENABLED === "true") {
    for (const key of [
      "OPENWEBUI_BASE_URL",
      "OPENWEBUI_API_KEY",
      "OPENWEBUI_MODEL_ID",
      "OPENWEBUI_KNOWLEDGE_ID",
    ])
      if (!env[key]?.trim())
        errors.push(`Missing ${key} for enabled public AI support`);
  }
  if (env.OPENWEBUI_BASE_URL) {
    try {
      const url = new URL(env.OPENWEBUI_BASE_URL);
      if (
        url.protocol !== "https:" ||
        url.username ||
        url.password ||
        url.search ||
        url.hash ||
        url.pathname !== "/"
      )
        throw new Error();
    } catch {
      errors.push(
        "OPENWEBUI_BASE_URL must be an HTTPS origin without credentials, path, query, or fragment",
      );
    }
  }
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

// A token grant checks the M2M connection/scopes without creating a subscriber,
// sending email, or reading customer profiles. Never persist/log the token.
export async function verifyAuth0Connection(env, fetcher = fetch) {
  const scopes = ["read:users", "create:users", "update:users_app_metadata"];
  let response;
  try {
    response = await fetcher(`https://${env.AUTH0_DOMAIN}/oauth/token`, {
      method: "POST",
      redirect: "error",
      signal: AbortSignal.timeout(20000),
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: "client_credentials",
        client_id: env.AUTH0_MANAGEMENT_CLIENT_ID,
        client_secret: env.AUTH0_MANAGEMENT_CLIENT_SECRET,
        audience: `https://${env.AUTH0_DOMAIN}/api/v2/`,
        scope: scopes.join(" "),
      }),
    });
  } catch {
    throw new DeploymentConfigError(
      "Auth0 Management connection failed (network/timeout). Check AUTH0_DOMAIN and runner connectivity; values withheld",
    );
  }
  if (!response.ok)
    throw new DeploymentConfigError(
      `Auth0 Management connection failed (HTTP ${response.status}). Check AUTH0_MANAGEMENT_CLIENT_ID/SECRET, authorize the M2M application for the Management API, and grant read:users, create:users, update:users_app_metadata. Provider body withheld`,
    );
  let result;
  try {
    result = await response.json();
  } catch {
    throw new DeploymentConfigError(
      "Auth0 Management connection returned an invalid response; provider body withheld",
    );
  }
  // OAuth permits scope to be omitted when it equals the requested scope.
  const granted =
    typeof result.scope === "string" ? result.scope.split(" ") : scopes;
  if (
    typeof result.access_token !== "string" ||
    scopes.some((scope) => !granted.includes(scope))
  )
    throw new DeploymentConfigError(
      "Auth0 Management connection did not confirm all required scopes: read:users, create:users, update:users_app_metadata. Check the M2M application's API authorization",
    );
}

export async function syncNetlifyEnvironment(
  env,
  fetcher = fetch,
  progress = () => {},
) {
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
  progress("Looking up the selected Netlify site");
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
  progress(
    "Selected site matches NEXT_PUBLIC_SITE_URL; synchronizing production-context settings",
  );
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
    progress(`Synchronized ${key}`);
  }
  return [...publicBuildKeys, ...privateRuntimeKeys].length;
}
