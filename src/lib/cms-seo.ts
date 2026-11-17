import { getCmsPage } from "./contentful";
import { pageMetadata } from "./seo";
export async function cmsMetadata(path: string) {
  const page = await getCmsPage(path);
  return pageMetadata(path, page?.seoTitle, page?.seoDescription);
}
