"use client";

// Mail extensions rewrite mailto anchors before React hydrates. A stable button
// opens the browser's chosen mail handler only after an explicit user action.
export default function EmailButton({
  email,
  children,
  className = "email-action",
}: {
  email: string;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      className={className}
      onClick={() => window.location.assign(`mailto:${email}`)}
    >
      {children || email}
    </button>
  );
}
