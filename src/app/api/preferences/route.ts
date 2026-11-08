import { authenticate, getStore } from "@/lib/auth0-server";
import { object, parseTopics, RequestError } from "@/lib/consent";
import { preferenceFrom, updatePreference } from "@/lib/subscriptions";
import { failure, json, readBody, sameOrigin } from "@/lib/api";
export const runtime = "nodejs";
export async function GET(request: Request) {
  try {
    const subject = await authenticate(request);
    const user = await getStore().get(subject);
    return json({ newsletter: preferenceFrom(user) });
  } catch (error) {
    return failure(error);
  }
}
export async function PATCH(request: Request) {
  try {
    sameOrigin(request);
    const subject = await authenticate(request);
    const body = object(await readBody(request));
    if (typeof body.subscribed !== "boolean")
      throw new RequestError(400, "Choose a subscription preference.");
    if (body.subscribed && body.consent !== true)
      throw new RequestError(400, "Please confirm your consent.");
    const topics = parseTopics(body.topics, body.subscribed);
    const newsletter = await updatePreference(
      getStore(),
      subject,
      body.subscribed,
      topics,
    );
    return json({ newsletter });
  } catch (error) {
    return failure(error);
  }
}
