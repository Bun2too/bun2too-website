"use client";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import Script from "next/script";
import Icon from "./Icon";
import { TOPICS } from "@/lib/consent";
import type { RichDocument } from "@/lib/cms-types";
import CmsRichText from "./CmsRichText";
declare global {
  interface Window {
    turnstile?: {
      render: (
        element: HTMLElement,
        options: Record<string, unknown>,
      ) => string;
      reset: (id: string) => void;
      remove: (id: string) => void;
    };
  }
}
export default function Newsletter({
  insights = false,
  content,
}: {
  insights?: boolean;
  content?: { eyebrow: string; heading: RichDocument; body: RichDocument };
}) {
  const id = useId();
  const widget = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | undefined>(undefined);
  const [captcha, setCaptcha] = useState("");
  const [status, setStatus] = useState<
    "idle" | "sending" | "success" | "error"
  >("idle");
  const [message, setMessage] = useState("");
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const renderCaptcha = useCallback(() => {
    if (siteKey && widget.current && window.turnstile && !widgetId.current)
      widgetId.current = window.turnstile.render(widget.current, {
        sitekey: siteKey,
        theme: "dark",
        action: "subscribe",
        callback: (token: string) => setCaptcha(token),
        "expired-callback": () => setCaptcha(""),
        "error-callback": () => {
          setCaptcha("");
          setStatus("error");
          setMessage(
            "Email verification could not load. Refresh the page and try again.",
          );
        },
      });
  }, [siteKey]);
  useEffect(() => {
    renderCaptcha();
    return () => {
      if (widgetId.current) window.turnstile?.remove(widgetId.current);
      widgetId.current = undefined;
    };
  }, [renderCaptcha]);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setStatus("sending");
    setMessage("");
    try {
      const response = await fetch("/api/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: data.get("email"),
          consent: data.get("consent") === "on",
          topics: data.getAll("topics"),
          website: data.get("website"),
          captchaToken: captcha,
        }),
        signal: AbortSignal.timeout(20000),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(
          result.error || "We couldn’t save your request. Please try again.",
        );
      setStatus("success");
      setMessage(
        "Request received. Sign in with this email to verify your address and confirm your subscription.",
      );
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Please try again.");
    } finally {
      setCaptcha("");
      if (widgetId.current) window.turnstile?.reset(widgetId.current);
    }
  }
  return (
    <section
      className="newsletter shell"
      id="subscribe"
      aria-labelledby={`${id}-heading`}
    >
      <div className="newsletter-copy">
        <p className="eyebrow">{content?.eyebrow || "STAY IN THE LOOP"}</p>
        <h2 id={`${id}-heading`}>
          {content ? (
            <CmsRichText document={content.heading} inline />
          ) : (
            <>
              A little curiosity.
              <br />
              <em>In your inbox.</em>
            </>
          )}
        </h2>
        <p>
          {content ? (
            <CmsRichText document={content.body} inline />
          ) : insights ? (
            "A weekly reading list of our latest AI and engineering insights. Choose AI & automation below to receive the digest."
          ) : (
            "Get Bun2Too updates about customer technology, AI, and the occasional fintech experiment. Choose what interests you."
          )}
        </p>
      </div>
      <form className="newsletter-form" onSubmit={submit}>
        <label className="input-label" htmlFor={`${id}-email`}>
          Your email address
        </label>
        <div className="input-row">
          <input
            id={`${id}-email`}
            name="email"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            maxLength={254}
            required
            disabled={status === "sending"}
          />
          <button
            className="button button-lime"
            type="submit"
            disabled={status === "sending" || Boolean(siteKey && !captcha)}
          >
            {status === "sending" ? "Saving…" : "Subscribe"}
            <Icon name="arrow" size={18} />
          </button>
        </div>
        <div className="honeypot" aria-hidden="true">
          <label htmlFor={`${id}-website`}>Website</label>
          <input
            id={`${id}-website`}
            name="website"
            tabIndex={-1}
            autoComplete="off"
          />
        </div>
        <fieldset className="topic-options">
          <legend>I’m interested in</legend>
          {TOPICS.map((topic, i) => (
            <label className="check-label" key={topic.value}>
              <input
                type="checkbox"
                name="topics"
                value={topic.value}
                defaultChecked={
                  insights ? topic.value === "ai-automation" : i === 0
                }
              />
              {topic.label}
            </label>
          ))}
        </fieldset>
        <label className="check-label">
          <input type="checkbox" name="consent" required />{" "}
          <span>
            I agree to receive email updates on my chosen topics and to the{" "}
            <Link href="/privacy">privacy & consent notice</Link>. I can
            unsubscribe in my account.
          </span>
        </label>
        {siteKey && (
          <>
            <Script
              src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
              strategy="afterInteractive"
              onReady={renderCaptcha}
              onError={() => {
                setStatus("error");
                setMessage(
                  "Security verification could not load. Allow challenges.cloudflare.com in your browser or content blocker, then reload.",
                );
              }}
            />
            <div ref={widget} className="turnstile-container" />
          </>
        )}
        <p className="small">
          No password needed to request updates. Email verification and
          confirmation are required before activation.
        </p>
        {message && (
          <div
            role={status === "error" ? "alert" : "status"}
            className={`form-message ${status === "error" ? "error-message" : ""}`}
          >
            {message}
            {status === "success" && (
              <>
                {" "}
                <Link href="/account">Confirm in your account ↗</Link>
              </>
            )}
          </div>
        )}
      </form>
    </section>
  );
}
