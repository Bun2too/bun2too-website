import {
  CONSENT_VERSION,
  NewsletterPreference,
  object,
  RequestError,
  Topic,
} from "./consent";
export type Profile = {
  user_id?: string;
  email?: string;
  email_verified?: boolean;
  app_metadata?: Record<string, unknown>;
  identities?: { connection?: string }[];
};
export interface SubscriberStore {
  findByEmail(email: string): Promise<Profile[]>;
  create(input: {
    email: string;
    connection: string;
    email_verified: false;
    app_metadata: Record<string, unknown>;
  }): Promise<unknown>;
  get(id: string): Promise<Profile>;
  update(id: string, appMetadata: Record<string, unknown>): Promise<unknown>;
}
export async function provisionSubscriber(
  store: SubscriberStore,
  connection: string,
  email: string,
  topics: Topic[],
  now = new Date().toISOString(),
) {
  const users = await store.findByEmail(email);
  // An anonymous request must never change an existing person's preferences or link identities.
  if (
    users.some((user) =>
      user.identities?.some((identity) => identity.connection === connection),
    )
  )
    return;
  const newsletter: NewsletterPreference = {
    status: "pending_verification",
    topics,
    consent_version: CONSENT_VERSION,
    requested_at: now,
    updated_at: now,
    source: "website-newsletter",
  };
  try {
    await store.create({
      email,
      connection,
      email_verified: false,
      app_metadata: { bun2too: { newsletter } },
    });
  } catch (error) {
    if (object(error).statusCode !== 409 && object(error).status !== 409)
      throw error;
  }
}
export function preferenceFrom(profile: Profile): NewsletterPreference | null {
  return (
    (object(object(profile.app_metadata).bun2too)
      .newsletter as NewsletterPreference) || null
  );
}
export async function updatePreference(
  store: SubscriberStore,
  subject: string,
  subscribed: boolean,
  topics: Topic[],
  now = new Date().toISOString(),
) {
  const user = await store.get(subject);
  if (subscribed && user.email_verified !== true)
    throw new RequestError(
      403,
      "Verify your email address before confirming your subscription. Then sign in again.",
    );
  const metadata = object(user.app_metadata);
  const namespace = object(metadata.bun2too);
  const previous = object(namespace.newsletter);
  const newsletter: NewsletterPreference = {
    status: subscribed ? "subscribed" : "unsubscribed",
    topics,
    consent_version: CONSENT_VERSION,
    ...(typeof previous.requested_at === "string"
      ? { requested_at: previous.requested_at }
      : {}),
    ...(subscribed ? { confirmed_at: now } : { withdrawn_at: now }),
    updated_at: now,
    source: "account-preferences",
  };
  await store.update(subject, {
    ...metadata,
    bun2too: { ...namespace, newsletter },
  });
  return newsletter;
}
