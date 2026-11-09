"use client";
export default function SupportOpenButton({
  children = "Contact Bun2Too",
}: {
  children?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      className="button button-lime"
      onClick={() => window.dispatchEvent(new Event("bun2too:open-support"))}
    >
      {children}
    </button>
  );
}
