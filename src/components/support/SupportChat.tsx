"use client";
import { useState } from "react";
import Link from "next/link";
import SupportCaptcha from "./SupportCaptcha";

export default function SupportChat({ available }: { available: boolean }) {
  const [question, setQuestion] = useState("");
  const [consent, setConsent] = useState(false);
  const [captcha, setCaptcha] = useState("");
  const [reset, setReset] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [answer, setAnswer] = useState("");
  const needsCaptcha = Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY);
  if (!available)
    return (
      <p className="support-note">
        AI answers are being connected. You can still send a private inquiry
        below.
      </p>
    );
  return (
    <details className="support-chat">
      <summary>Ask the Bun2Too AI assistant</summary>
      <p className="support-note">
        Answers use our approved public knowledge. AI can make mistakes and
        cannot access your account. Each question is independent. Don’t share
        personal or confidential details.
      </p>
      <form
        className="support-inquiry-form"
        onSubmit={async (event) => {
          event.preventDefault();
          if (busy || !consent) return;
          setBusy(true);
          setError("");
          setAnswer("");
          try {
            const response = await fetch("/api/support/chat", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                question,
                consent,
                captchaToken: captcha,
              }),
              signal: AbortSignal.timeout(45000),
            });
            const data = await response.json();
            if (!response.ok || typeof data.answer !== "string")
              throw new Error(
                data.error || "AI answers are temporarily unavailable.",
              );
            setAnswer(data.answer);
          } catch (error) {
            setError(
              error instanceof Error
                ? error.message
                : "Please try again or send an inquiry.",
            );
          } finally {
            setBusy(false);
            setCaptcha("");
            setReset((value) => value + 1);
          }
        }}
      >
        <label className="input-label" htmlFor="support-question">
          Your public support question
        </label>
        <textarea
          id="support-question"
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          maxLength={1500}
          rows={3}
          required
          disabled={busy}
        />
        <label className="check-label">
          <input
            type="checkbox"
            checked={consent}
            onChange={(event) => setConsent(event.target.checked)}
            required
          />
          <span>
            I agree to send this question to Bun2Too’s AI service and its
            configured model provider for an answer, under the{" "}
            <Link href="/privacy" target="_blank" rel="noopener noreferrer">
              privacy notice
            </Link>
            . This does not submit an inquiry or subscribe me.
          </span>
        </label>
        <SupportCaptcha
          action="support-chat"
          onToken={setCaptcha}
          resetKey={reset}
        />
        <button
          className="button button-outline"
          type="submit"
          disabled={
            busy || !consent || !question.trim() || (needsCaptcha && !captcha)
          }
        >
          {busy ? "Finding an answer…" : "Ask AI"}
        </button>
      </form>
      {error && (
        <p role="alert" className="form-message error-message">
          {error}
        </p>
      )}
      {answer && (
        <div className="support-answer" role="status">
          <strong>AI answer</strong>
          <p>{answer}</p>
          <p>
            <Link href="/services">Services</Link>
            {" · "}
            <Link href="/support">FAQs</Link>
            {" · "}
            <Link href="/insights">Insights</Link>
          </p>
        </div>
      )}
    </details>
  );
}
