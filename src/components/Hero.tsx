import { getCmsBlock } from "@/lib/contentful";
import { CmsBlockView } from "./CmsBlocks";
export default async function Hero() {
  const block = await getCmsBlock("b2t-block-home-hero");
  return block ? <CmsBlockView block={block} /> : null;
}
