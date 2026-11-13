import { getCmsBlock } from "@/lib/contentful";
import { CmsBlockView } from "./CmsBlocks";
export default async function Articles() {
  const block = await getCmsBlock("b2t-block-insights-promotion");
  return block ? <CmsBlockView block={block} /> : null;
}
