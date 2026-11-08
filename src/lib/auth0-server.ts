import { ManagementClient } from "auth0";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { RequestError } from "./consent";
import type { SubscriberStore } from "./subscriptions";
let management: ManagementClient | undefined;
export function getStore(): SubscriberStore {
  const domain = process.env.AUTH0_DOMAIN;
  const clientId = process.env.AUTH0_MANAGEMENT_CLIENT_ID;
  const clientSecret = process.env.AUTH0_MANAGEMENT_CLIENT_SECRET;
  if (!domain || !clientId || !clientSecret)
    throw new RequestError(
      503,
      "Email preferences are not available yet. Please try again later.",
    );
  management ??= new ManagementClient({
    domain,
    clientId,
    clientSecret,
    timeoutInSeconds: 12,
    maxRetries: 0,
  });
  const client = management;
  return {
    findByEmail: (email) => client.users.listUsersByEmail({ email }),
    create: (input) => client.users.create(input),
    get: (id) => client.users.get(id),
    update: (id, app_metadata) => client.users.update(id, { app_metadata }),
  };
}
const keySets = new Map<string, ReturnType<typeof createRemoteJWKSet>>();
export async function authenticate(request: Request): Promise<string> {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ") || header.length > 10000)
    throw new RequestError(401, "Sign in to manage your email preferences.");
  const domain = process.env.AUTH0_DOMAIN;
  const audience = process.env.AUTH0_AUDIENCE;
  const clientId = process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID;
  if (!domain || !audience || !clientId)
    throw new RequestError(
      503,
      "Email preferences are not available yet. Please try again later.",
    );
  const issuer = `https://${domain}/`;
  let jwks = keySets.get(issuer);
  if (!jwks) {
    jwks = createRemoteJWKSet(new URL(`${issuer}.well-known/jwks.json`), {
      timeoutDuration: 10000,
    });
    keySets.set(issuer, jwks);
  }
  try {
    const { payload } = await jwtVerify(header.slice(7), jwks, {
      issuer,
      audience,
      algorithms: ["RS256"],
      requiredClaims: ["exp", "sub"],
    });
    const authorizedParty = payload.azp || payload.client_id;
    if (
      authorizedParty !== clientId ||
      typeof payload.sub !== "string" ||
      payload.sub.endsWith("@clients")
    )
      throw new Error("Invalid client or subject");
    if (
      typeof payload.scope !== "string" ||
      !payload.scope.split(" ").includes("manage:subscriptions")
    )
      throw new RequestError(
        403,
        "This account cannot manage email preferences.",
      );
    return payload.sub;
  } catch (error) {
    if (error instanceof RequestError) throw error;
    throw new RequestError(
      401,
      "Your session could not be verified. Please sign in again.",
    );
  }
}
