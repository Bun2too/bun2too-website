import { pageMetadata, pageSchema } from "@/lib/seo";
import StructuredData from "@/components/StructuredData";
import UseCases from "@/components/UseCases";
export const metadata = pageMetadata("/usecases");
export default function UseCasesPage() {
  return (
    <main id="main-content">
      <StructuredData data={pageSchema("/usecases")} />
      <UseCases />
    </main>
  );
}
