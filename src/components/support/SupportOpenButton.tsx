"use client";
export default function SupportOpenButton({
  children = "Contact Bun2Too",
  className = "button button-lime",
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      className={className}
      aria-haspopup="dialog"
      aria-controls="bun2too-support"
      onClick={() => window.dispatchEvent(new Event("bun2too:open-support"))}
    >
      {children}
    </button>
  );
}
