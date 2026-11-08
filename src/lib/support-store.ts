import { getStore } from "@netlify/blobs";
import type { SupportStore } from "./support";
import { RequestError } from "./consent";
export const SUPPORT_STORE = "bun2too-support";
export function getSupportStore(): SupportStore {
  try {
    const store = getStore({ name: SUPPORT_STORE, consistency: "strong" });
    return {
      read: async <T>(key: string) => {
        const result = await store.getWithMetadata(key, {
          type: "json",
          consistency: "strong",
        });
        if (result && !result.etag)
          throw new RequestError(
            503,
            "Support storage could not confirm this record. Please try again.",
          );
        return result ? { data: result.data as T, etag: result.etag! } : null;
      },
      write: (key, data, condition) =>
        store.setJSON(
          key,
          data,
          condition?.onlyIfMatch
            ? { onlyIfMatch: condition.onlyIfMatch }
            : condition?.onlyIfNew
              ? { onlyIfNew: true }
              : undefined,
        ),
      remove: (key) => store.delete(key),
    };
  } catch {
    throw new RequestError(
      503,
      "Private inquiry storage is not available yet. Please use the contact page for now.",
    );
  }
}
