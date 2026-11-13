import { publicSupportConfig } from "../src/lib/openwebui.ts";

const config = publicSupportConfig();
if (!config) {
  console.error(
    "Public AI configuration is incomplete, disabled, or has an invalid HTTPS origin. Check OPENWEBUI_PUBLIC_SUPPORT_ENABLED, OPENWEBUI_BASE_URL, OPENWEBUI_API_KEY, OPENWEBUI_MODEL_ID and OPENWEBUI_KNOWLEDGE_ID. Values withheld.",
  );
  process.exitCode = 1;
} else {
  try {
    for (const [label, path] of [
      ["model", "/api/models"],
      [
        "knowledge",
        `/api/v1/knowledge/${encodeURIComponent(config.knowledge)}`,
      ],
    ]) {
      const response = await fetch(`${config.origin}${path}`, {
        headers: { Authorization: `Bearer ${config.key}` },
        redirect: "error",
        signal: AbortSignal.timeout(10000),
      });
      if (!response.ok) {
        await response.body?.cancel();
        console.error(
          `Public AI ${label} check failed: HTTP ${response.status}. Values and provider response withheld.`,
        );
        if (response.status === 401)
          console.error(
            "The service key was rejected. Use the restricted account's API key, not its browser/session JWT. Check API-key enablement and account permissions, replace OPENWEBUI_API_KEY, then restart development.",
          );
        if (response.status === 403)
          console.error(
            "Check the service account's resource permissions and whether this read-only check is allowed by the API endpoint restrictions. Do not grant administrator access.",
          );
        process.exitCode = 1;
        break;
      }
      const body = await response.json();
      if (label === "model") {
        const models = body.data || body.models || [];
        if (
          !Array.isArray(models) ||
          !models.some((model) => model.id === config.model)
        ) {
          console.error(
            "The configured public support model is not available to this service account. Model inventory withheld.",
          );
          process.exitCode = 1;
          break;
        }
      }
      console.log(
        `Public AI configured ${label} read check passed. No IDs, names or document content printed.`,
      );
    }
    console.log(
      "No inference request was made. Read access does not verify retrieval quality, public-only permissions or a completed answer.",
    );
  } catch {
    console.error(
      "Public AI connection, redirect or response-format check failed. Check network reachability and TLS. Provider details withheld.",
    );
    process.exitCode = 1;
  }
}
