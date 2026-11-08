import { pageMetadata, pageSchema } from "@/lib/seo";
import StructuredData from "@/components/StructuredData";
import Process from "@/components/Process";
import CTA from "@/components/CTA";
import { PageHero } from "@/components/PageArtwork";
export const metadata = pageMetadata("/process");
export default function ProcessPage() {
  return (
    <main id="main-content">
      <StructuredData data={pageSchema("/process")} />
      <PageHero artwork="delivery-journey" className="page-header shell">
        <p className="eyebrow">THE BUN2TOO APPROACH</p>
        <h1 className="page-title">
          A clear path.
          <br />
          <em>A shared direction.</em>
        </h1>
        <p className="page-intro">
          A collaborative route from the first question to technology your team
          can run. Discover what matters, design the connections, deliver useful
          systems, and keep improving.
        </p>
      </PageHero>
      <Process />
      <CTA />
    </main>
  );
}
