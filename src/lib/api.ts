import { NextResponse } from "next/server";
import { object, RequestError } from "./consent";
export function json(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}
export function failure(error: unknown) {
  if (error instanceof RequestError)
    return json({ error: error.message }, error.status);
  const status = object(error).statusCode || object(error).status;
  // Do not leak email addresses, profile data, tokens, or Auth0 error bodies.
  console.error("Subscription service failure", {
    status: typeof status === "number" ? status : 500,
  });
  if (status === 429)
    return json(
      { error: "Too many requests. Please wait a little before trying again." },
      429,
    );
  return json(
    { error: "We couldn’t save your preferences. Please try again later." },
    503,
  );
}
export function publicOrigin(request: Request) {
  // Next.js can normalize request.url to localhost. Keep the incoming Host;
  // Netlify supplies the original scheme through X-Forwarded-Proto.
  const internal = new URL(request.url);
  const host = request.headers.get("host") || internal.host;
  const forwarded = request.headers.get("x-forwarded-proto");
  const protocol =
    forwarded === "https" || forwarded === "http"
      ? `${forwarded}:`
      : internal.protocol;
  return new URL(`${protocol}//${host}`).origin;
}
export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin || origin !== publicOrigin(request))
    throw new RequestError(
      403,
      "Please submit this form from the Bun2Too website.",
    );
}
export async function readBody(request: Request, limit = 4096) {
  if (
    !request.headers
      .get("content-type")
      ?.toLowerCase()
      .startsWith("application/json")
  )
    throw new RequestError(415, "Send a JSON request.");
  if (Number(request.headers.get("content-length")) > limit)
    throw new RequestError(413, "This request is too large.");
  // Enforce a byte limit while streaming; Content-Length is untrusted and can be absent.
  const reader = request.body?.getReader();
  if (!reader) throw new RequestError(400, "Send a valid JSON request.");
  let bytes = 0;
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    bytes += value.byteLength;
    if (bytes > limit) {
      await reader.cancel();
      throw new RequestError(413, "This request is too large.");
    }
    chunks.push(value);
  }
  try {
    const buffer = new Uint8Array(bytes);
    let offset = 0;
    for (const chunk of chunks) {
      buffer.set(chunk, offset);
      offset += chunk.length;
    }
    return JSON.parse(new TextDecoder().decode(buffer)) as unknown;
  } catch {
    throw new RequestError(400, "Send a valid JSON request.");
  }
}
export async function verifyCaptcha(
  token: string,
  hostname: string,
  action = "subscribe",
) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    if (process.env.NODE_ENV === "production")
      throw new RequestError(
        503,
        action === "subscribe"
          ? "Email signup is not available yet. Please try again later."
          : "Support verification is not available yet. Please try again later.",
      );
    return;
  }
  if (!token || token.length > 2048)
    throw new RequestError(
      400,
      action === "subscribe"
        ? "Complete the verification before subscribing."
        : "Complete the verification before submitting.",
    );
  const response = await fetch(
    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret, response: token }),
      signal: AbortSignal.timeout(10000),
    },
  );
  const result = object(await response.json());
  if (
    !response.ok ||
    result.success !== true ||
    result.hostname !== hostname ||
    result.action !== action
  )
    throw new RequestError(400, "Verification expired. Please try again.");
}
