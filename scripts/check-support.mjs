const required = [
  "ONYX_API_BASE_URL",
  "ONYX_API_KEY",
  "ONYX_PUBLIC_AGENT_ID",
  "ONYX_PUBLIC_DOCUMENT_SET",
  "ONYX_SEARCH_TOOL_ID",
  "SUPPORT_SESSION_SECRET",
];
const missing = required.filter((name) => !process.env[name]);
if (missing.length)
  throw new Error(
    `Missing server configuration: ${missing.join(", ")}. See docs/support.md. Do not paste API keys into chat or browser variables.`,
  );
if (process.env.SUPPORT_SESSION_SECRET.length < 32)
  throw new Error(
    "SUPPORT_SESSION_SECRET must contain at least 32 random characters.",
  );
const base = new URL(process.env.ONYX_API_BASE_URL);
if (
  base.protocol !== "https:" ||
  base.username ||
  base.password ||
  base.search ||
  base.hash
)
  throw new Error("Set a valid HTTPS Onyx API base URL.");
const prefix = base.href.replace(/\/$/, "");
for (const path of [
  "/health",
  "/version",
  `/persona/${encodeURIComponent(process.env.ONYX_PUBLIC_AGENT_ID)}`,
]) {
  const response = await fetch(`${prefix}${path}`, {
    headers: { Authorization: `Bearer ${process.env.ONYX_API_KEY}` },
    signal: AbortSignal.timeout(15000),
    redirect: "error",
  });
  if (!response.ok)
    throw new Error(
      `Onyx ${path.split("/")[1]} check returned HTTP ${response.status}. Check service account permissions and the agent ID.`,
    );
  const data = await response.json();
  if (path === "/version")
    console.log(`Onyx version: ${data.backend_version || "not supplied"}`);
  else console.log(`OK Onyx ${path.split("/")[1]}`);
}
console.log(
  "Read-only checks passed. This did not send a chat or validate answer quality. Use an approved test question on /support to verify public RAG answers and source links.",
);
console.log(
  "Verify private inquiry persistence in Netlify Data & Storage → Blobs → bun2too-support.",
);
