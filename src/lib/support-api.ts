import { NextResponse } from "next/server";
import { publicOrigin } from "./api";
import { object, RequestError } from "./consent";
import {
  consumeLimit,
  digest,
  SUPPORT_COOKIE,
  supportSecret,
  visitor,
  type SupportStore,
} from "./support";
export function supportResponse(
  body: unknown,
  request?: Request,
  identity?: ReturnType<typeof visitor>,
  status = 200,
) {
  const response = NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
  if (identity && request && identity.fresh)
    response.cookies.set(SUPPORT_COOKIE, identity.value, {
      httpOnly: true,
      sameSite: "strict",
      secure: publicOrigin(request).startsWith("https://"),
      path: "/",
      maxAge: 86400,
    });
  return response;
}
export function supportError(error: unknown) {
  if (error instanceof RequestError)
    return supportResponse(
      { error: error.message },
      undefined,
      undefined,
      error.status,
    );
  console.error("Support request failed", {
    status:
      typeof object(error).status === "number" ? object(error).status : 500,
  });
  return supportResponse(
    {
      error:
        "Support is temporarily unavailable. Please try again or use the contact page.",
    },
    undefined,
    undefined,
    503,
  );
}
export function supportIdentity(request: Request) {
  return visitor(request, supportSecret());
}
export async function throttleSupport(
  store: SupportStore,
  request: Request,
  owner: string,
) {
  await consumeLimit(store, `inquiry-${owner}`, 5, 3600000);
  const ip = request.headers.get("x-nf-client-connection-ip");
  if (ip)
    await consumeLimit(
      store,
      `inquiry-network-${digest(ip, supportSecret())}`,
      20,
      3600000,
    );
}
