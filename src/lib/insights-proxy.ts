import { insightsOrigin } from "./insights-origin";
import { publicOrigin } from "./api";

const paths = new Set([
  "/insights/feed.xml",
  "/insights/feed.atom",
  "/insights/unsubscribe",
  "/insights/push-config",
  "/insights/push-subscriptions",
]);
export async function proxyInsights(request: Request, path: string) {
  const unavailable = () =>
    new Response("This feature is temporarily unavailable.", {
      status: 503,
      headers: {
        "Cache-Control": "no-store",
        "X-Robots-Tag": "noindex, nofollow",
      },
    });
  if (!paths.has(path)) return unavailable();
  try {
    const base = insightsOrigin();
    const url = new URL(path, base);
    url.search = new URL(request.url).search;
    const headers = new Headers();
    const type = request.headers.get("content-type");
    if (type) headers.set("content-type", type);
    const isPost = request.method === "POST";
    if (isPost && request.headers.get("origin") !== publicOrigin(request))
      return new Response("Request not allowed.", { status: 403 });
    let body: string | undefined;
    if (isPost && request.body) {
      const reader = request.body.getReader();
      const decoder = new TextDecoder();
      let size = 0;
      body = "";
      for (;;) {
        const chunk = await reader.read();
        if (chunk.done) break;
        size += chunk.value.byteLength;
        if (size > 16384) {
          await reader.cancel();
          return new Response("Request too large.", { status: 413 });
        }
        body += decoder.decode(chunk.value, { stream: true });
      }
      body += decoder.decode();
    }
    const response = await fetch(url, {
      method: request.method,
      headers,
      ...(body ? { body } : {}),
      redirect: "manual",
      signal: AbortSignal.timeout(10000),
      cache: "no-store",
    });
    const output = new Headers({
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex, nofollow",
    });
    if (response.headers.get("location")) {
      const destination = new URL(response.headers.get("location")!, base);
      if (
        destination.origin !== base ||
        !destination.pathname.startsWith("/insights")
      )
        return unavailable();
      output.set(
        "location",
        `${destination.pathname}${destination.search}${destination.hash}`,
      );
    }
    if (response.headers.get("content-type"))
      output.set("content-type", response.headers.get("content-type")!);
    // Do not expose upstream headers/cookies, internal redirects, or error bodies.
    if (response.status >= 400) {
      console.error("Insights proxy request failed", {
        path,
        status: response.status,
      });
      return unavailable();
    }
    return new Response(
      response.status === 204 || response.status === 304 ? null : response.body,
      { status: response.status, headers: output },
    );
  } catch {
    console.error("Insights proxy request failed", {
      path,
      reason: "configuration, network or timeout; provider details withheld",
    });
    return unavailable();
  }
}
