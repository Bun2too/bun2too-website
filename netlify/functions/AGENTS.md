# Netlify function guidance

Read the root guide, `../../docs/architecture.md`, and `../../docs/support.md`. Next.js API handlers live under `src/app/api`; this directory currently owns the scheduled private-support cleanup function.

`support-retention.mts` runs at `0 4 * * *` (UTC). It uses the private site-wide `bun2too-support` store and removes expired `conversations/`, `inquiries/`, and `limits/` entries. Conversation expiry is 24 hours and inquiry expiry is 90 days; these policies are also documented in the privacy view and support guide.

Keep storage authenticated through Netlify runtime context, records private, and logs free of personal data. Do not add a generic unauthenticated blob read/list/delete endpoint. Changes to store names, record schema, expiry, or schedule must account for existing records and update the API logic and documentation together.

An offline Netlify build verifies function packaging and schedule discovery without publishing or contacting customers. Do not use production deletion as a test. Website cleanup does not delete separate Onyx/model-provider history.
