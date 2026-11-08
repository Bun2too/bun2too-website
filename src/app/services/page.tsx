import { pageMetadata, pageSchema } from "@/lib/seo";
import StructuredData from "@/components/StructuredData";
import Services from "@/components/Services";
import CTA from "@/components/CTA";
import { PageHero } from "@/components/PageArtwork";
export const metadata = pageMetadata("/services");
export default function ServicesPage() {
  return (
    <main id="main-content">
      <StructuredData data={pageSchema("/services")} />
      <PageHero artwork="ai-foundation" className="page-header shell">
        <p className="eyebrow">OUR CAPABILITIES</p>
        <h1 className="page-title">
          AI that works.
          <br />
          <em>Technology that connects.</em>
        </h1>
        <p className="page-intro">
          AI forward-deployed engineering and infrastructure setup, alongside
          customer data platforms, CIAM, analytics, and consent management. We
          help your team build, deploy, and operate technology around real
          business needs.
        </p>
      </PageHero>
      <Services full />
      <CTA />
    </main>
  );
}
