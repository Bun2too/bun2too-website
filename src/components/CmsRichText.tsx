import { Fragment, type ReactNode } from "react";
import Link from "next/link";
import { CookieSettingsButton } from "./CookieConsent";
import EmailButton from "./EmailButton";
import SupportOpenButton from "./support/SupportOpenButton";
import Icon from "./Icon";
import { site } from "@/lib/site";
import { safeCmsHref } from "@/lib/cms-links";
import type { CmsAction, RichNode } from "@/lib/cms-types";

export function CmsActionView({
  action,
  className,
}: {
  action: CmsAction;
  className?: string;
}) {
  const style =
    className ??
    (action.variant === "text"
      ? "text-link"
      : `button button-${action.variant === "outline" ? "outline" : action.variant}`);
  if (action.kind === "cookieSettings") return <CookieSettingsButton />;
  if (action.kind === "inquiry")
    return (
      <SupportOpenButton className={style}>{action.label} ↗</SupportOpenButton>
    );
  if (action.kind === "email")
    return (
      <EmailButton
        className={
          className ?? (action.variant === "text" ? "email-action" : style)
        }
        email={
          action.id === "b2t-action-legal-email"
            ? site.legalEmail
            : process.env.NEXT_PUBLIC_CONTACT_EMAIL || site.legalEmail
        }
      >
        {action.label}
        {action.variant !== "text" && " ↗"}
      </EmailButton>
    );
  const href = safeCmsHref(action.href);
  if (!href) return null;
  return (
    <Link
      href={href}
      className={style}
      {...(href.startsWith("https:")
        ? { target: "_blank", rel: "noopener noreferrer" }
        : {})}
    >
      {action.label}{" "}
      <Icon
        name={action.variant === "cream" ? "external" : "arrow"}
        size={20}
      />
    </Link>
  );
}

export default function CmsRichText({
  document,
  inline = false,
  subtle = false,
}: {
  document: RichNode;
  inline?: boolean;
  subtle?: boolean;
}) {
  const render = (node: RichNode, key: string): ReactNode => {
    const children = (node.content || []).map((child, i) =>
      render(child, `${key}-${i}`),
    );
    if (node.nodeType === "text") {
      let value: ReactNode = (node.value || "").split("\n").map((line, i) => (
        <Fragment key={i}>
          {i > 0 && <br />}
          {line}
        </Fragment>
      ));
      for (const mark of node.marks || []) {
        if (mark.type === "italic")
          value = subtle ? (
            <span className="subtle">{value}</span>
          ) : (
            <em>{value}</em>
          );
        if (mark.type === "bold") value = <strong>{value}</strong>;
        if (mark.type === "underline") value = <u>{value}</u>;
        if (mark.type === "code") value = <code>{value}</code>;
      }
      return <Fragment key={key}>{value}</Fragment>;
    }
    if (node.nodeType === "embedded-entry-inline") {
      const action = node.data?.action as CmsAction | undefined;
      return action ? <CmsActionView key={key} action={action} /> : null;
    }
    if (node.nodeType === "hyperlink") {
      const href = safeCmsHref(node.data?.uri);
      return href ? (
        <Link key={key} href={href}>
          {children}
        </Link>
      ) : (
        <Fragment key={key}>{children}</Fragment>
      );
    }
    if (node.nodeType === "document" || inline)
      return <Fragment key={key}>{children}</Fragment>;
    switch (node.nodeType) {
      case "paragraph":
        return <p key={key}>{children}</p>;
      case "heading-1":
        return <h1 key={key}>{children}</h1>;
      case "heading-2":
        return <h2 key={key}>{children}</h2>;
      case "heading-3":
        return <h3 key={key}>{children}</h3>;
      case "heading-4":
        return <h4 key={key}>{children}</h4>;
      case "heading-5":
        return <h5 key={key}>{children}</h5>;
      case "heading-6":
        return <h6 key={key}>{children}</h6>;
      case "unordered-list":
        return <ul key={key}>{children}</ul>;
      case "ordered-list":
        return <ol key={key}>{children}</ol>;
      case "list-item":
        return <li key={key}>{children}</li>;
      case "blockquote":
        return <blockquote key={key}>{children}</blockquote>;
      case "hr":
        return <hr key={key} />;
      case "table":
        return (
          <div
            key={key}
            className="cookie-table-wrap"
            role="region"
            aria-label="Cookie and browser storage inventory"
            tabIndex={0}
          >
            <table className="cookie-table">
              <caption>Current website storage and its purpose</caption>
              <tbody>{children}</tbody>
            </table>
          </div>
        );
      case "table-row":
        return <tr key={key}>{children}</tr>;
      case "table-cell":
        return <td key={key}>{children}</td>;
      case "table-header-cell":
        return <th key={key}>{children}</th>;
      default:
        return null;
    }
  };
  return render(document, "rich");
}
