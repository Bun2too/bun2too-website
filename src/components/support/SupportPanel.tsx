"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import Icon from "@/components/Icon";
import SupportCaptcha from "./SupportCaptcha";
import type { SupportSource } from "@/lib/support";
type Message = {
  role: "user" | "assistant";
  content: string;
  sources?: SupportSource[];
};
export default function SupportPanel({
  open,
  initialInquiry,
  onClose,
}: {
  open: boolean;
  initialInquiry: boolean;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const history = useRef<HTMLDivElement>(null);
  const requestId = useRef<string | null>(null);
  const [tab, setTab] = useState<"chat" | "inquiry">(
    initialInquiry ? "inquiry" : "chat",
  );
  const [availability, setAvailability] = useState({
    loading: true,
    chat: false,
    inquiries: false,
  });
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [chatConsent, setChatConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [reference, setReference] = useState("");
  const [chatCaptcha, setChatCaptcha] = useState("");
  const [inquiryCaptcha, setInquiryCaptcha] = useState("");
  const [captchaReset, setCaptchaReset] = useState(0);
  const needsCaptcha = Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY);
  useEffect(() => {
    const element = dialog.current;
    if (open && element && !element.open) element.showModal();
    else if (!open && element?.open) element.close();
  }, [open]);
  useEffect(() => {
    if (open) setTab(initialInquiry ? "inquiry" : "chat");
  }, [open, initialInquiry]);
  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/support/session", {
      signal: controller.signal,
      cache: "no-store",
    })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok)
          throw new Error(body.error || "Support is temporarily unavailable.");
        setAvailability({
          loading: false,
          chat: body.chat === true,
          inquiries: body.inquiries === true,
        });
      })
      .catch((err) => {
        if (!controller.signal.aborted) {
          setAvailability({ loading: false, chat: false, inquiries: false });
          setError(err.message);
        }
      });
    return () => controller.abort();
  }, []);
  useEffect(() => {
    if (history.current)
      history.current.scrollTop = history.current.scrollHeight;
  }, [messages, busy, error]);
  async function ask(event: React.FormEvent) {
    event.preventDefault();
    if (busy || !message.trim()) return;
    setBusy(true);
    setError("");
    const question = message.trim();
    try {
      const response = await fetch("/api/support/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: question,
          conversationId,
          consent: chatConsent,
          captchaToken: chatCaptcha,
        }),
        signal: AbortSignal.timeout(55000),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(
          data.error || "The assistant could not answer. Please try again.",
        );
      setMessages((previous) => [
        ...previous,
        { role: "user", content: question },
        { role: "assistant", content: data.answer, sources: data.sources },
      ]);
      setConversationId(data.conversationId);
      setMessage("");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Support is temporarily unavailable.",
      );
    } finally {
      setBusy(false);
      setChatCaptcha("");
      setCaptchaReset((n) => n + 1);
    }
  }
  async function inquire(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = new FormData(event.currentTarget);
    requestId.current ||= crypto.randomUUID();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/support/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.get("name"),
          email: form.get("email"),
          topic: form.get("topic"),
          message: form.get("message"),
          consent: form.get("consent") === "on",
          includeTranscript: form.get("includeTranscript") === "on",
          website: form.get("website"),
          requestId: requestId.current,
          conversationId,
          captchaToken: inquiryCaptcha,
        }),
        signal: AbortSignal.timeout(25000),
      });
      const data = await response.json();
      if (!response.ok || !data.reference)
        throw new Error(
          data.error ||
            "We couldn’t confirm that your inquiry was saved. Please try again.",
        );
      setReference(data.reference);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Your inquiry could not be saved.",
      );
    } finally {
      setBusy(false);
      setInquiryCaptcha("");
      setCaptchaReset((n) => n + 1);
    }
  }
  return (
    <dialog
      id="bun2too-support"
      ref={dialog}
      className="support-panel"
      aria-labelledby="support-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <header className="support-header">
        <img src="/bun2too/logo.png" alt="" width={32} height={32} />
        <div>
          <h2 id="support-title">Ask Bun2Too</h2>
          <p>Customer technology. A little help.</p>
        </div>
        <button
          type="button"
          className="support-icon-button"
          aria-label="Close support"
          onClick={onClose}
        >
          <Icon name="close" size={20} />
        </button>
      </header>
      <div className="support-tabs" role="tablist" aria-label="Support options">
        <button
          role="tab"
          id="support-chat-tab"
          aria-selected={tab === "chat"}
          aria-controls="support-chat-panel"
          onClick={() => {
            setTab("chat");
            setError("");
          }}
        >
          Ask a question
        </button>
        <button
          role="tab"
          id="support-inquiry-tab"
          aria-selected={tab === "inquiry"}
          aria-controls="support-inquiry-panel"
          onClick={() => {
            setTab("inquiry");
            setError("");
          }}
        >
          Send an inquiry
        </button>
      </div>
      <div className="support-body">
        {availability.loading && (
          <p role="status" className="support-note">
            Connecting support…
          </p>
        )}
        <div
          role="tabpanel"
          id="support-chat-panel"
          aria-labelledby="support-chat-tab"
          hidden={tab !== "chat"}
        >
          <div
            ref={history}
            className="support-history"
            role="log"
            aria-label="Support conversation"
            aria-live="polite"
          >
            <div className="support-message support-message-assistant">
              <p>
                Hi, I’m Bun2Too’s AI support assistant. Ask about our services,
                applications, accounts, or website. I’ll look for relevant
                information in our support knowledge base.
              </p>
            </div>
            {messages.map((item, index) => (
              <div
                key={index}
                className={`support-message support-message-${item.role}`}
              >
                <span className="sr-only">
                  {item.role === "user" ? "You" : "Bun2Too assistant"}:
                </span>
                <p>{item.content}</p>
                {item.sources && item.sources.length > 0 && (
                  <ul className="support-sources" aria-label="Answer sources">
                    {item.sources.map((source) => (
                      <li key={source.url}>
                        <a
                          href={source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          [{source.number}] {source.title} ↗
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
                {item.role === "assistant" && !item.sources?.length && (
                  <p className="support-note">
                    No public source links were returned. Confirm important
                    details with our team.
                  </p>
                )}
              </div>
            ))}
            {busy && tab === "chat" && (
              <p role="status" className="support-note">
                Looking through Bun2Too’s knowledge…
              </p>
            )}
            {error && tab === "chat" && (
              <p role="alert" className="form-message error-message">
                {error}
              </p>
            )}
          </div>
          {!availability.loading && !availability.chat && (
            <p className="support-notice">
              The knowledge assistant is being connected. You can send a private
              inquiry or visit{" "}
              <Link href="/contact" onClick={onClose}>
                our contact page
              </Link>
              .
            </p>
          )}
          <form onSubmit={ask} className="support-chat-form">
            <label className="input-label" htmlFor="support-question">
              Your question
            </label>
            <textarea
              id="support-question"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              maxLength={2000}
              rows={2}
              required
              placeholder="How can Bun2Too connect our customer data?"
              disabled={busy}
            />
            {!conversationId && (
              <>
                <label className="check-label">
                  <input
                    type="checkbox"
                    checked={chatConsent}
                    onChange={(event) => setChatConsent(event.target.checked)}
                    required
                  />
                  <span>
                    I agree that Bun2Too and its Onyx service may process my
                    support messages.{" "}
                    <Link href="/privacy" target="_blank">
                      Privacy & consent
                    </Link>
                    .
                  </span>
                </label>
                {availability.chat && tab === "chat" && (
                  <SupportCaptcha
                    action="support-chat"
                    onToken={setChatCaptcha}
                    resetKey={captchaReset}
                  />
                )}
              </>
            )}
            <button
              className="button button-lime"
              type="submit"
              disabled={
                busy ||
                !availability.chat ||
                !chatConsent ||
                !message.trim() ||
                Boolean(!conversationId && needsCaptcha && !chatCaptcha)
              }
            >
              {busy ? "Finding an answer…" : "Ask the assistant"}
              <Icon name="arrow" size={18} />
            </button>
          </form>
        </div>
        <div
          role="tabpanel"
          id="support-inquiry-panel"
          aria-labelledby="support-inquiry-tab"
          hidden={tab !== "inquiry"}
        >
          {reference ? (
            <div className="support-confirmation" role="status">
              <Icon name="check" size={32} />
              <h3>Your inquiry is saved.</h3>
              <p>
                Reference: <strong>{reference}</strong>
              </p>
              <p>
                Our team can use the contact email you provided to respond. You
                have not been subscribed to marketing.
              </p>
            </div>
          ) : (
            <>
              <p className="support-note">
                Tell us what you need and how to reach you. Your inquiry is
                stored privately for the Bun2Too team.
              </p>
              {!availability.loading && !availability.inquiries && (
                <p className="support-notice">
                  Inquiry collection is being connected. Please use{" "}
                  <Link href="/contact" onClick={onClose}>
                    the contact page
                  </Link>
                  .
                </p>
              )}
              <form className="support-inquiry-form" onSubmit={inquire}>
                <label className="input-label" htmlFor="support-name">
                  Your name
                </label>
                <input
                  id="support-name"
                  name="name"
                  autoComplete="name"
                  maxLength={100}
                  required
                />
                <label className="input-label" htmlFor="support-email">
                  Contact email
                </label>
                <input
                  id="support-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  maxLength={254}
                  required
                />
                <label className="input-label" htmlFor="support-topic">
                  What is this about?
                </label>
                <select id="support-topic" name="topic" defaultValue="project">
                  <option value="project">A project or our services</option>
                  <option value="account">My account or sign-in</option>
                  <option value="subscription">Email subscriptions</option>
                  <option value="application">
                    Application or website support
                  </option>
                  <option value="other">Something else</option>
                </select>
                <label
                  className="input-label"
                  htmlFor="support-inquiry-message"
                >
                  How can we help?
                </label>
                <textarea
                  id="support-inquiry-message"
                  name="message"
                  rows={4}
                  minLength={10}
                  maxLength={2000}
                  required
                />
                <div className="honeypot" aria-hidden="true">
                  <label htmlFor="support-website">Website</label>
                  <input
                    id="support-website"
                    name="website"
                    tabIndex={-1}
                    autoComplete="off"
                  />
                </div>
                {conversationId && (
                  <label className="check-label">
                    <input type="checkbox" name="includeTranscript" />
                    <span>Include this chat so the team has context.</span>
                  </label>
                )}
                <label className="check-label">
                  <input type="checkbox" name="consent" required />
                  <span>
                    I agree that Bun2Too may store these details to respond to
                    this inquiry, as described in the{" "}
                    <Link href="/privacy" target="_blank">
                      privacy notice
                    </Link>
                    .
                  </span>
                </label>
                {availability.inquiries && tab === "inquiry" && (
                  <SupportCaptcha
                    action="support-inquiry"
                    onToken={setInquiryCaptcha}
                    resetKey={captchaReset}
                  />
                )}
                <button
                  className="button button-lime"
                  type="submit"
                  disabled={
                    busy ||
                    !availability.inquiries ||
                    Boolean(needsCaptcha && !inquiryCaptcha)
                  }
                >
                  {busy ? "Saving your inquiry…" : "Send private inquiry"}
                  <Icon name="arrow" size={18} />
                </button>
              </form>
            </>
          )}
        </div>
        {error && tab === "inquiry" && (
          <p role="alert" className="form-message error-message">
            {error}
          </p>
        )}
      </div>
      <footer className="support-footer">
        AI answers can be mistaken. Don’t share passwords or payment details.{" "}
        <Link href="/support" onClick={onClose}>
          Support & FAQs
        </Link>
        {" · "}
        <Link href="/terms" target="_blank" rel="noopener noreferrer">
          Terms
        </Link>
      </footer>
    </dialog>
  );
}
