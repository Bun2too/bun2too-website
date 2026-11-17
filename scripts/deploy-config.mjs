import { readFileSync } from "node:fs";
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
  "CONTENTFUL_ENABLED",
  "CONTENTFUL_SPACE_ID",
  "CONTENTFUL_DELIVERY_TOKEN",
  "CONTENTFUL_ENVIRONMENT",
  "AUTH0_DOMAIN",
  "AUTH0_AUDIENCE",
  "AUTH0_MANAGEMENT_CLIENT_ID",
  "AUTH0_MANAGEMENT_CLIENT_SECRET",
  "AUTH0_EMAIL_CONNECTION",
  "TURNSTILE_SECRET_KEY",
  "SUPPORT_SESSION_SECRET",
  "SUPPORT_SES_SMTP_HOST",
  "SUPPORT_SES_SMTP_PORT",
  "SUPPORT_SES_SMTP_USERNAME",
  "SUPPORT_SES_SMTP_PASSWORD",
  "SUPPORT_INQUIRY_FROM_EMAIL",
  "SUPPORT_INQUIRY_TO_EMAIL",
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
      !key.startsWith("CONTENTFUL_") &&
      !key.startsWith("OPENWEBUI_"),
  ),
];
export function validateDeployment(env) {
  const errors = requiredKeys
    .filter((key) => !env[key]?.trim())
    .map((key) => `Missing ${key}`);
  if (
    env.CONTENTFUL_ENABLED &&
    !["true", "false"].includes(env.CONTENTFUL_ENABLED)
  )
    errors.push("CONTENTFUL_ENABLED must be true or false");
  if (env.CONTENTFUL_ENABLED === "true") {
    for (const key of [
      "CONTENTFUL_SPACE_ID",
      "CONTENTFUL_DELIVERY_TOKEN",
      "CONTENTFUL_ENVIRONMENT",
    ])
      if (!env[key]?.trim())
        errors.push(`Missing ${key} for enabled CMS delivery`);
    if (
      env.CONTENTFUL_SPACE_ID &&
      !/^[A-Za-z0-9_-]+$/.test(env.CONTENTFUL_SPACE_ID)
    )
      errors.push("Invalid CONTENTFUL_SPACE_ID");
    const expected = env.SITE_ENVIRONMENT === "prod" ? "master" : "qa";
    if (env.CONTENTFUL_ENVIRONMENT !== expected)
      errors.push(
        "CONTENTFUL_ENVIRONMENT must be master for prod and qa for dev/qa",
      );
  }
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
  const emailKeys = [
    "SUPPORT_SES_SMTP_HOST",
    "SUPPORT_SES_SMTP_PORT",
    "SUPPORT_SES_SMTP_USERNAME",
    "SUPPORT_SES_SMTP_PASSWORD",
    "SUPPORT_INQUIRY_FROM_EMAIL",
    "SUPPORT_INQUIRY_TO_EMAIL",
  ];
  if (emailKeys.some((key) => env[key])) {
    for (const key of emailKeys)
      if (!env[key]?.trim()) errors.push(`Missing ${key} for inquiry email`);
    for (const key of [
      "SUPPORT_INQUIRY_FROM_EMAIL",
      "SUPPORT_INQUIRY_TO_EMAIL",
    ])
      if (
        env[key] &&
        !/^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(
          env[key],
        )
      )
        errors.push(`Invalid mailbox in ${key}`);
    if (
      env.SUPPORT_SES_SMTP_HOST &&
      !/^[a-zA-Z0-9.-]+$/.test(env.SUPPORT_SES_SMTP_HOST)
    )
      errors.push("Invalid SUPPORT_SES_SMTP_HOST");
    if (
      env.SUPPORT_SES_SMTP_PORT &&
      ![25, 465, 587, 2465, 2587].includes(Number(env.SUPPORT_SES_SMTP_PORT))
    )
      errors.push("Invalid SUPPORT_SES_SMTP_PORT");
  }
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
      errors.push(
        `Invalid HTTPS URL in ${key}; use a plain HTTPS origin without quotes, commas, Markdown, credentials, query, or path`,
      );
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

export async function verifyContentfulConnection(env, fetcher = fetch) {
  if (env.CONTENTFUL_ENABLED !== "true") return null;
  const seed = JSON.parse(
    readFileSync(
      new URL("../src/content/website-seed.json", import.meta.url),
      "utf8",
    ),
  );
  const requiredPaths = seed.entries
    .filter((entry) => entry.type === "b2tPage")
    .map((entry) => entry.fields.path);
  let pageCount = 0;
  for (const type of ["b2tPage", "b2tSite"]) {
    let response;
    try {
      response = await fetcher(
        `https://cdn.contentful.com/spaces/${env.CONTENTFUL_SPACE_ID}/environments/${env.CONTENTFUL_ENVIRONMENT}/entries?content_type=${type}&include=5&limit=1000`,
        {
          headers: { Authorization: `Bearer ${env.CONTENTFUL_DELIVERY_TOKEN}` },
          redirect: "error",
          signal: AbortSignal.timeout(10000),
        },
      );
    } catch {
      throw new DeploymentConfigError(
        "Contentful delivery check failed (network/timeout); values withheld",
      );
    }
    if (!response.ok)
      throw new DeploymentConfigError(
        `Contentful delivery check failed (HTTP ${response.status}); check CONTENTFUL_SPACE_ID, CONTENTFUL_DELIVERY_TOKEN and CONTENTFUL_ENVIRONMENT. Values withheld`,
      );
    let body;
    try {
      body = await response.json();
    } catch {
      throw new DeploymentConfigError(
        "Contentful delivery returned invalid JSON; provider body withheld",
      );
    }
    if (!Array.isArray(body.items) || body.errors?.length)
      throw new DeploymentConfigError(
        "Contentful has unresolved published references; publish linked blocks, actions, cards and assets before deploying",
      );
    if (type === "b2tPage") {
      const paths = new Set(
        body.items
          .filter(
            (entry) => entry.fields?.seoTitle && entry.fields?.blocks?.length,
          )
          .map((entry) => entry.fields.path),
      );
      if (requiredPaths.some((path) => !paths.has(path)))
        throw new DeploymentConfigError(
          "Contentful is missing required published website pages; complete the seed publication in the selected environment",
        );
      pageCount = paths.size;
    } else if (!body.items.some((entry) => entry.fields?.key === "website"))
      throw new DeploymentConfigError(
        "Contentful is missing the published website settings entry",
      );
  }
  return pageCount;
}

// Public read-only probes: no editorial administration credential, visitor
// cookie, subscriber write, push registration, or email send is involved.
export async function verifyInsightsConnection(
  env,
  fetcher = fetch,
  progress = () => {},
) {
  let origin;
  try {
    const url = new URL(env.INSIGHTS_API_ORIGIN);
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.pathname !== "/" ||
      url.search ||
      url.hash
    )
      throw new Error();
    origin = url.origin;
  } catch {
    throw new DeploymentConfigError(
      "INSIGHTS_API_ORIGIN must be the HTTPS origin only, without /insights or /api. Obtain it from the working public Insights website; value withheld",
    );
  }
  async function get(path, type = "application/json") {
    let response;
    const route = path.startsWith("/insights/api/articles/")
      ? "/insights/api/articles/{id}"
      : path;
    try {
      response = await fetcher(`${origin}${path}`, {
        headers: { Accept: type },
        redirect: "error",
        cache: "no-store",
        signal: AbortSignal.timeout(15000),
      });
    } catch {
      throw new DeploymentConfigError(
        `Insights GET [INSIGHTS_API_ORIGIN]${route} failed (network, timeout, or redirect). Check the origin and public-path firewall rules; provider details withheld`,
      );
    }
    progress(
      `Insights GET [INSIGHTS_API_ORIGIN]${route} -> HTTP ${response.status}`,
    );
    if (!response.ok)
      throw new DeploymentConfigError(
        `Insights public endpoint ${route} returned HTTP ${response.status}. Correct the selected GitHub environment's INSIGHTS_API_ORIGIN Secret and allow public article/feed requests from Netlify; response body withheld`,
      );
    return response;
  }
  async function json(response) {
    try {
      return await response.json();
    } catch {
      throw new DeploymentConfigError(
        "Insights returned non-JSON content. Check INSIGHTS_API_ORIGIN and whether a login page or bot challenge is intercepting the public API; body withheld",
      );
    }
  }
  const index = await json(await get("/insights/api/articles"));
  const valid = (article) =>
    article &&
    typeof article.id === "string" &&
    /^[a-zA-Z0-9-]+$/.test(article.id) &&
    typeof article.title === "string" &&
    typeof article.body === "string";
  if (
    !Array.isArray(index?.articles) ||
    index.articles.some((article) => !valid(article))
  )
    throw new DeploymentConfigError(
      "Insights public article index has an incompatible schema; expected an articles array with public IDs, titles and bodies. Response withheld",
    );
  if (index.articles.length) {
    const first = index.articles[0];
    const article = await json(
      await get(`/insights/api/articles/${encodeURIComponent(first.id)}`),
    );
    if (!valid(article) || article.id !== first.id)
      throw new DeploymentConfigError(
        "Insights individual-article endpoint has an incompatible response; body withheld",
      );
  }
  const feed = await get("/insights/feed.xml", "application/rss+xml");
  if (!/<rss\b|<feed\b/i.test(await feed.text()))
    throw new DeploymentConfigError(
      "Insights feed endpoint did not return an RSS/Atom document; check INSIGHTS_API_ORIGIN. Body withheld",
    );
  return index.articles.length;
}

function netlifyClient(env, fetcher, progress) {
  const api = "https://api.netlify.com/api/v1";
  const headers = {
    Authorization: `Bearer ${env.NETLIFY_AUTH_TOKEN}`,
    "Content-Type": "application/json",
  };
  progress(
    "Netlify transport: Node fetch; Authorization: Bearer [redacted]; redirects rejected; timeout 20 seconds",
  );
  return async function call(path, options, displayPath) {
    const method = options?.method || "GET";
    const request = `${method} ${api}${displayPath}`;
    progress(`[Netlify request] ${request} (IDs and body values redacted)`);
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
        `Netlify request failed: ${request} (network, timeout, or redirect). Credentials and provider details withheld`,
      );
    }
    progress(`[Netlify response] ${request} -> HTTP ${response.status}`);
    return response;
  };
}

function siteHost(value, isDomain = false) {
  if (typeof value !== "string" || !value) return null;
  try {
    const url = new URL(isDomain ? `https://${value}` : value);
    if (
      !["https:", "http:"].includes(url.protocol) ||
      url.username ||
      url.password ||
      url.pathname !== "/" ||
      url.search ||
      url.hash ||
      url.port
    )
      return null;
    return url.hostname;
  } catch {
    return null;
  }
}

async function checkedNetlifySite(env, call, progress) {
  progress(
    `Site environment: ${["dev", "qa", "prod"].includes(env.SITE_ENVIRONMENT) ? env.SITE_ENVIRONMENT : "not supplied"}`,
  );
  const expectedHost = new URL(env.NEXT_PUBLIC_SITE_URL).hostname;
  progress(
    `Expected NEXT_PUBLIC_SITE_URL hostname: ${JSON.stringify(expectedHost)}`,
  );
  const siteResponse = await call(
    `/sites/${encodeURIComponent(env.NETLIFY_SITE_ID)}`,
    undefined,
    "/sites/{NETLIFY_SITE_ID}",
  );
  if (!siteResponse.ok)
    throw new DeploymentConfigError(
      `Netlify site lookup failed (HTTP ${siteResponse.status}). Check NETLIFY_AUTH_TOKEN access and NETLIFY_SITE_ID in the selected GitHub environment. Provider body withheld`,
    );
  let site;
  try {
    site = await siteResponse.json();
    if (!site || typeof site !== "object" || Array.isArray(site))
      throw new Error();
  } catch {
    throw new DeploymentConfigError(
      "Netlify site lookup returned invalid JSON metadata; provider body withheld",
    );
  }
  if (typeof site.id === "string")
    progress(
      `Returned site.id equals NETLIFY_SITE_ID: ${site.id === env.NETLIFY_SITE_ID} (ID values redacted)`,
    );
  // Allowlist public domain fields only: site metadata can contain private
  // repository details, environment values, passwords and notification emails.
  const entries = [
    ["ssl_url", siteHost(site.ssl_url)],
    ["url", siteHost(site.url)],
    ["custom_domain", siteHost(site.custom_domain, true)],
    [
      "default domain from site.name",
      typeof site.name === "string" &&
      /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(site.name)
        ? `${site.name.toLowerCase()}.netlify.app`
        : null,
    ],
    ...(Array.isArray(site.domain_aliases)
      ? site.domain_aliases.map((value, index) => [
          `domain_aliases[${index}]`,
          siteHost(value, true),
        ])
      : []),
  ];
  for (const [field, host] of entries)
    progress(
      `Returned ${field} hostname: ${host ? JSON.stringify(host) : "not returned or invalid (raw value withheld)"}`,
    );
  const siteHosts = [
    ...new Set(entries.map(([, host]) => host).filter(Boolean)),
  ];
  const matches = siteHosts.includes(expectedHost);
  progress(
    `Hostname comparison: ${matches ? "MATCH" : "MISMATCH"}; DNS and redirects are not used for this check`,
  );
  if (!matches)
    throw new DeploymentConfigError(
      `Selected Netlify site does not match NEXT_PUBLIC_SITE_URL; no configuration was changed. Expected hostname ${JSON.stringify(expectedHost)}; returned hostnames ${JSON.stringify(siteHosts)}. Compare NETLIFY_SITE_ID with the Project ID shown in that project's Netlify settings and check the selected GitHub environment (main uses prod). A trailing slash does not affect this hostname comparison`,
    );
  return site;
}

// This path deliberately requires no Auth0/model credentials and performs GET
// only. It is usable independently when diagnosing the deployment destination.
export async function inspectNetlifySite(
  env,
  fetcher = fetch,
  progress = () => {},
) {
  for (const key of [
    "NETLIFY_AUTH_TOKEN",
    "NETLIFY_SITE_ID",
    "NEXT_PUBLIC_SITE_URL",
  ])
    if (!env[key]?.trim())
      throw new DeploymentConfigError(
        `Missing ${key} for read-only Netlify inspection`,
      );
  const url = siteHost(env.NEXT_PUBLIC_SITE_URL);
  if (
    !url ||
    !env.NEXT_PUBLIC_SITE_URL.startsWith("https://") ||
    env.NEXT_PUBLIC_SITE_URL !== env.NEXT_PUBLIC_SITE_URL.trim()
  )
    throw new DeploymentConfigError(
      "Invalid NEXT_PUBLIC_SITE_URL; enter a plain HTTPS origin without quotes, commas or Markdown",
    );
  return checkedNetlifySite(
    env,
    netlifyClient(env, fetcher, progress),
    progress,
  );
}

export async function syncNetlifyEnvironment(
  env,
  fetcher = fetch,
  progress = () => {},
) {
  validateDeployment(env);
  const call = netlifyClient(env, fetcher, progress);
  const site = await checkedNetlifySite(env, call, progress);
  // Netlify's environment service uses account_slug as its account locator,
  // despite the OpenAPI path parameter being named account_id. Match the
  // pinned Netlify CLI's env:set implementation; never fall back to the UUID.
  if (typeof site.account_slug !== "string" || !site.account_slug.trim())
    throw new DeploymentConfigError(
      "Netlify did not return site.account_slug required by the environment API; no configuration was changed",
    );
  const endpoint = `/accounts/${encodeURIComponent(site.account_slug)}/env`;
  progress(
    "Selected site matches NEXT_PUBLIC_SITE_URL; environment API account locator: site.account_slug (value withheld)",
  );
  const query = `?site_id=${encodeURIComponent(env.NETLIFY_SITE_ID)}`;
  // Determine creation vs update before writing, as Netlify's CLI does. Do not
  // interpret a forbidden update as permission to try a different write route.
  const listed = await call(
    `${endpoint}${query}`,
    undefined,
    "/accounts/{account_slug}/env?site_id={NETLIFY_SITE_ID}",
  );
  if (!listed.ok)
    throw new DeploymentConfigError(
      `Netlify site environment lookup failed (HTTP ${listed.status}); account locator is site.account_slug and site_id is supplied. No configuration was changed; provider body withheld`,
    );
  let existingKeys;
  try {
    const entries = await listed.json();
    if (
      !Array.isArray(entries) ||
      entries.some((entry) => !entry || typeof entry.key !== "string")
    )
      throw new Error();
    // Response values are private. Retain only key names; never log the body.
    existingKeys = new Set(entries.map((entry) => entry.key));
  } catch {
    throw new DeploymentConfigError(
      "Netlify site environment lookup returned invalid metadata; no configuration was changed; provider body withheld",
    );
  }
  progress(
    "Synchronizing production-context settings using all CLI-compatible scopes (including post_processing)",
  );
  for (const key of [...publicBuildKeys, ...privateRuntimeKeys]) {
    const value = env[key] || (key.endsWith("EMAIL_CONNECTION") ? "email" : "");
    // Empty optional values overwrite old values, avoiding stale configuration.
    // Use all scopes rather than a Pro-only granular restriction.
    const payload = {
      key,
      // Envelope uses an underscore here. The OpenAPI spelling differs.
      scopes: ["builds", "functions", "runtime", "post_processing"],
      values: [{ context: "production", value }],
    };
    const create = () =>
      call(
        `${endpoint}${query}`,
        {
          method: "POST",
          body: JSON.stringify([payload]),
        },
        "/accounts/{account_slug}/env?site_id={NETLIFY_SITE_ID}",
      );
    let response;
    if (existingKeys.has(key)) {
      response = await call(
        `${endpoint}/${encodeURIComponent(key)}${query}`,
        { method: "PUT", body: JSON.stringify(payload) },
        `/accounts/{account_slug}/env/${key}?site_id={NETLIFY_SITE_ID}`,
      );
      if (response.status === 404) response = await create(); // Concurrent deletion.
    } else response = await create();
    if (!response.ok)
      throw new DeploymentConfigError(
        `Netlify configuration failed for ${key} (HTTP ${response.status}); request used site.account_slug, site_id and CLI-compatible scopes. Provider body withheld; check team/SSO authorization or plan restrictions if access is still denied`,
      );
    // Never read or print environment-value response bodies.
    progress(`Synchronized ${key}`);
  }
  return [...publicBuildKeys, ...privateRuntimeKeys].length;
}
