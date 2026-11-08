import { pageMetadata } from "@/lib/seo";
import Hero from "@/components/Hero";
export const metadata = {
  ...pageMetadata("/"),
  robots: { index: false, follow: true },
};
export default function HeroPage() {
  return (
    <main id="main-content">
      <Hero />
    </main>
  );
}
