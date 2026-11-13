import { getCmsBlock } from "@/lib/contentful";
import { CmsBlockView } from "./CmsBlocks";
export default async function CTA() {
  const block = await getCmsBlock("b2t-block-cta");
  return block ? <CmsBlockView block={block} /> : null;
}
