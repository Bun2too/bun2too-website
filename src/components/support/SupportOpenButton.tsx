"use client";
export default function SupportOpenButton({
  inquiry = false,
  children = "Ask Bun2Too",
}: {
  inquiry?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      className="button button-lime"
      onClick={() =>
        window.dispatchEvent(
          new CustomEvent("bun2too:open-support", { detail: { inquiry } }),
        )
      }
    >
      {children}
    </button>
  );
}
