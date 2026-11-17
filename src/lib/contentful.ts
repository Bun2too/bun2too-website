import "server-only";
import { cache } from "react";
import {
  CmsGraph,
  isCmsPath,
  localCms,
  type DeliveryResponse,
} from "./cms-content";

function configuration() {
  if (process.env.CONTENTFUL_ENABLED !== "true") return null;
  const space = process.env.CONTENTFUL_SPACE_ID;
  const token = process.env.CONTENTFUL_DELIVERY_TOKEN;
  const environment = process.env.CONTENTFUL_ENVIRONMENT;
  if (
    !space ||
    !token ||
    !environment ||
    !/^[A-Za-z0-9_-]+$/.test(space) ||
    !/^[A-Za-z0-9_-]+$/.test(environment)
  )
    throw new Error("Incomplete CMS configuration");
  return { space, token, environment };
}
const load = cache(async (type: "b2tPage" | "b2tSite") => {
  try {
    const config = configuration();
    if (!config) return null;
    const url = new URL(
      `https://cdn.contentful.com/spaces/${config.space}/environments/${config.environment}/entries`,
    );
    url.search = new URLSearchParams({
      content_type: type,
      include: "5",
      limit: "1000",
    }).toString();
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${config.token}` },
      next: { revalidate: 60, tags: ["contentful"] },
      signal: AbortSignal.timeout(4000),
    });
    if (!response.ok) {
      console.error("Contentful delivery unavailable", {
        contentType: type,
        status: response.status,
      });
      return null;
    }
    const text = await response.text();
    if (text.length > 4000000) throw new Error("CMS response too large");
    const data = JSON.parse(text) as DeliveryResponse;
    if (!Array.isArray(data.items) || (data.total || 0) > 1000)
      throw new Error("Invalid CMS response");
    if (!data.items.length) {
      console.error("Contentful has no published content", {
        contentType: type,
      });
      return null;
    }
    return new CmsGraph(data);
  } catch {
    console.error("Contentful delivery unavailable", {
      contentType: type,
      reason:
        "configuration, response, network or timeout; provider details withheld",
    });
    return null;
  }
});

export const getCmsPages = cache(async () => {
  try {
    const remote = (await load("b2tPage"))?.pages() || [];
    const pages = new Map(localCms.pages().map((page) => [page.path, page]));
    for (const page of remote) pages.set(page.path, page);
    return [...pages.values()];
  } catch {
    console.error("Contentful reference validation failed", {
      contentType: "b2tPage",
    });
    return localCms.pages();
  }
});
export const getCmsPage = cache(async (path: string) =>
  isCmsPath(path)
    ? (await getCmsPages()).find((page) => page.path === path)
    : undefined,
);
export const getCmsBlock = cache(async (id: string) => {
  try {
    const graph = await load("b2tPage");
    return graph?.block(id) || localCms.block(id);
  } catch {
    console.error("Contentful reference validation failed", {
      contentType: "b2tBlock",
    });
    return localCms.block(id);
  }
});
export const getCmsSite = cache(async () => {
  try {
    return (await load("b2tSite"))?.site() || localCms.site()!;
  } catch {
    console.error("Contentful reference validation failed", {
      contentType: "b2tSite",
    });
    return localCms.site()!;
  }
});
