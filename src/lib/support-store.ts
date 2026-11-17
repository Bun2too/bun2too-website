import { getStore } from "@netlify/blobs";
import type { SupportStore } from "./support";
import { RequestError } from "./consent";
export const SUPPORT_STORE = "bun2too-support";
export function getSupportStore(signal?: AbortSignal): SupportStore {
  try {
    const store = getStore({
      name: SUPPORT_STORE,
      consistency: "strong",
      ...(signal
        ? {
            fetch: (input: Parameters<typeof fetch>[0], init?: RequestInit) => {
              signal.throwIfAborted();
              return fetch(input, {
                ...init,
                signal: init?.signal
                  ? AbortSignal.any([signal, init.signal])
                  : signal,
              });
            },
          }
        : {}),
    });
    return {
      read: async <T>(key: string) => {
        let result = await store.getWithMetadata(key, {
          type: "json",
          consistency: "strong",
        });
        // The local Blobs server omits ETags on GET, but exposes the same
        // conditional-write ETags in LIST. Bracket a fresh read with matching
        // versions so concurrent writes cannot pair old data with a new ETag.
        // Production still requires the ETag supplied by GET.
        if (
          result &&
          !result.etag &&
          process.env.NETLIFY_DEV === "true" &&
          process.env.NODE_ENV !== "production"
        ) {
          const version = async () => {
            const page = await store.list({ prefix: key });
            return page.blobs.find((entry) => entry.key === key)?.etag;
          };
          for (let attempt = 0; attempt < 3; attempt++) {
            const before = await version();
            result = await store.getWithMetadata(key, {
              type: "json",
              consistency: "strong",
            });
            if (!result) return null;
            const after = await version();
            if (before && before === after) {
              result = { ...result, etag: after };
              break;
            }
          }
        }
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
      "Private inquiries are currently unavailable. Please email our team.",
    );
  }
}
