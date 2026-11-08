import Newsletter from "@/components/Newsletter";
export const metadata = {
  title: "Subscribe to insights",
  robots: { index: false, follow: false },
};
export default function Signup() {
  return (
    <main id="main-content" className="insights-signup-embed">
      <Newsletter insights />
    </main>
  );
}
