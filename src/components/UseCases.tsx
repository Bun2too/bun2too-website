import { getCmsBlock } from "@/lib/contentful";
import { CmsBlockView } from "./CmsBlocks";
export default async function UseCases() {
  const intro = await getCmsBlock("b2t-block-usecases-intro");
  const block = await getCmsBlock("b2t-block-usecases");
  return (
    <section className="section shell">
      {intro && <CmsBlockView block={intro} contained />}
      {block && <CmsBlockView block={block} contained />}
    </section>
  );
}
