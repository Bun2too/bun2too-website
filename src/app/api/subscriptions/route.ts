import { getStore } from "@/lib/auth0-server";
import { parseSignup } from "@/lib/consent";
import { provisionSubscriber } from "@/lib/subscriptions";
import {
  failure,
  json,
  publicOrigin,
  readBody,
  sameOrigin,
  verifyCaptcha,
} from "@/lib/api";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const signup = parseSignup(await readBody(request));
    if (!signup) return json({ accepted: true }, 202);
    const store = getStore();
    await verifyCaptcha(
      signup.captchaToken,
      new URL(publicOrigin(request)).hostname,
    );
    await provisionSubscriber(
      store,
      process.env.AUTH0_EMAIL_CONNECTION || "email",
      signup.email,
      signup.topics,
    );
    return json({ accepted: true }, 202);
  } catch (error) {
    return failure(error);
  }
}
