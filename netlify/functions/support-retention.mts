import { getStore } from "@netlify/blobs";
export const config = { schedule: "0 4 * * *" };
export default async function cleanup() {
  const store = getStore({ name: "bun2too-support", consistency: "strong" });
  const now = Date.now();
  let removed = 0;
  for await (const page of store.list({ paginate: true })) {
    for (let offset = 0; offset < page.blobs.length; offset += 20) {
      await Promise.all(
        page.blobs.slice(offset, offset + 20).map(async (blob) => {
          if (!/^(conversations|inquiries|limits)\//.test(blob.key)) return;
          const record = (await store.get(blob.key, { type: "json" })) as {
            expiresAt?: number;
          } | null;
          if (
            record &&
            typeof record.expiresAt === "number" &&
            record.expiresAt <= now
          ) {
            await store.delete(blob.key);
            removed++;
          }
        }),
      );
    }
  }
  return Response.json({ removed });
}
