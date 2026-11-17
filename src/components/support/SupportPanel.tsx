"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import Icon from "@/components/Icon";
import EmailButton from "@/components/EmailButton";
import { site } from "@/lib/site";
import SupportCaptcha from "./SupportCaptcha";
import SupportChat from "./SupportChat";

export default function SupportPanel({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const requestId = useRef<string | null>(null);
  const [availability, setAvailability] = useState({
    loading: true,
    inquiries: false,
    chat: false,
  });
  const [busy, setBusy] = useState(false);
  const [sessionAttempt, setSessionAttempt] = useState(0);
  const [sessionError, setSessionError] = useState("");
  const [sessionNotice, setSessionNotice] = useState("");
  const [error, setError] = useState("");
  const [reference, setReference] = useState("");
  const [notification, setNotification] = useState("");
  const [acknowledgment, setAcknowledgment] = useState("");
  const [captcha, setCaptcha] = useState("");
  const [captchaReset, setCaptchaReset] = useState(0);
  const needsCaptcha = Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY);
  useEffect(() => {
    const element = dialog.current;
    if (open && element && !element.open) element.showModal();
    else if (!open && element?.open) element.close();
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    setAvailability({ loading: true, inquiries: false, chat: false });
    setSessionError("");
    setSessionNotice("");
    void fetch("/api/support/session", {
      signal: AbortSignal.any([controller.signal, AbortSignal.timeout(10000)]),
      cache: "no-store",
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("Session unavailable");
        const body: unknown = await response.json();
        if (
          !body ||
          typeof body !== "object" ||
          !("inquiries" in body) ||
          typeof body.inquiries !== "boolean" ||
          !("chat" in body) ||
          typeof body.chat !== "boolean"
        )
          throw new Error("Invalid session response");
        if (controller.signal.aborted) return;
        setAvailability({
          loading: false,
          inquiries: body.inquiries === true,
          chat: body.chat === true,
        });
        if (sessionAttempt > 0)
          setSessionNotice(
            body.inquiries
              ? "Availability checked: the inquiry form is ready."
              : "Availability checked: private inquiries are still unavailable. Please email our team directly.",
          );
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setAvailability({ loading: false, inquiries: false, chat: false });
          setSessionError(
            "We couldn’t check support availability. Please try again or email our team.",
          );
        }
      });
    return () => controller.abort();
  }, [open, sessionAttempt]);
  async function inquire(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !availability.inquiries) return;
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
          website: form.get("website"),
          requestId: requestId.current,
          captchaToken: captcha,
        }),
        signal: AbortSignal.timeout(25000),
      });
      const data = await response.json();
      if (
        !response.ok ||
        !data.reference ||
        !["accepted", "unconfirmed"].includes(data.notification)
      )
        throw new Error(
          data.error ||
            "We couldn’t confirm that your inquiry was saved. Please try again.",
        );
      setNotification(data.notification);
      setAcknowledgment(
        data.acknowledgment === "accepted" ? "accepted" : "unconfirmed",
      );
      setReference(data.reference);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Your inquiry could not be saved.",
      );
    } finally {
      setBusy(false);
      setCaptcha("");
      setCaptchaReset((value) => value + 1);
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
          <h2 id="support-title">Contact Bun2Too</h2>
          <p>A private inquiry. A human connection.</p>
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
      <div className="support-body">
        <SupportChat
          available={availability.chat}
          checking={availability.loading}
        />
        {sessionNotice && (
          <p role="status" className="support-note">
            {sessionNotice}
          </p>
        )}
        {reference ? (
          <div className="support-confirmation" role="status">
            <Icon name="check" size={32} />
            <h3>Your inquiry is saved.</h3>
            <p>
              Reference: <strong>{reference}</strong>
            </p>
            <p>
              {notification === "accepted"
                ? "An email containing your inquiry has been accepted for delivery to our team. We can reply using the contact email you provided."
                : "Your inquiry is stored privately for our team."}{" "}
              You have not been subscribed to marketing.
            </p>
            {notification === "unconfirmed" && (
              <p role="alert">
                We couldn’t confirm the email notification. Please email our
                team directly and include your reference.{" "}
                <EmailButton
                  email={
                    process.env.NEXT_PUBLIC_CONTACT_EMAIL || site.legalEmail
                  }
                >
                  Email our team directly
                </EmailButton>
              </p>
            )}
            {acknowledgment === "accepted" ? (
              <p>
                A confirmation email has also been accepted for delivery to your
                contact address.
              </p>
            ) : (
              <p role="alert">
                We couldn’t confirm your acknowledgment email. Keep the
                reference shown here.
              </p>
            )}
          </div>
        ) : (
          <>
            <p className="support-note">
              Tell us what you need and how to reach you. We store your inquiry
              privately and email it to the Bun2Too team using Amazon SES.
            </p>
            {availability.loading ? (
              <p role="status" className="support-note">
                Checking inquiry availability…
              </p>
            ) : (
              !availability.inquiries && (
                <div className="support-notice">
                  <p>
                    Private inquiries are currently unavailable.{" "}
                    <EmailButton
                      email={
                        process.env.NEXT_PUBLIC_CONTACT_EMAIL || site.legalEmail
                      }
                    >
                      Email our team directly
                    </EmailButton>{" "}
                    or read the{" "}
                    <Link href="/support" onClick={onClose}>
                      support FAQs
                    </Link>
                    .
                  </p>
                  <button
                    type="button"
                    className="button button-outline"
                    disabled={busy}
                    onClick={() => setSessionAttempt((value) => value + 1)}
                  >
                    Check availability again
                  </button>
                </div>
              )
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
              <label className="input-label" htmlFor="support-inquiry-message">
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
              <label className="check-label">
                <input type="checkbox" name="consent" required />
                <span>
                  I agree that Bun2Too may store and email these details to its
                  team to respond to this inquiry and send me an acknowledgment,
                  as described in the{" "}
                  <Link
                    href="/privacy"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    privacy notice
                  </Link>
                  .
                </span>
              </label>
              {availability.inquiries && (
                <SupportCaptcha
                  action="support-inquiry"
                  onToken={setCaptcha}
                  resetKey={captchaReset}
                />
              )}
              <button
                className="button button-lime"
                type="submit"
                disabled={
                  busy ||
                  !availability.inquiries ||
                  Boolean(needsCaptcha && !captcha)
                }
              >
                {busy ? "Saving your inquiry…" : "Send private inquiry"}
                <Icon name="arrow" size={18} />
              </button>
            </form>
          </>
        )}
        {(sessionError || error) && (
          <p role="alert" className="form-message error-message">
            {sessionError || error}
          </p>
        )}
      </div>
      <footer className="support-footer">
        Don’t share passwords or payment details.{" "}
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
