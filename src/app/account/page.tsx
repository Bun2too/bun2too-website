import Account from "@/components/Account";
export const metadata = {
  title: "Your account",
  robots: { index: false, follow: false },
};
export default function AccountPage() {
  return (
    <main id="main-content">
      <Account />
    </main>
  );
}
