"use client";
import Script from "next/script";
import { useCallback, useEffect, useRef, useState } from "react";
export default function SupportCaptcha({
  action,
  onToken,
  resetKey = 0,
}: {
  action: string;
  onToken: (token: string) => void;
  resetKey?: number;
}) {
  const target = useRef<HTMLDivElement>(null);
  const widget = useRef<string | undefined>(undefined);
  const key = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const [error, setError] = useState(false);
  const render = useCallback(() => {
    if (key && target.current && window.turnstile && !widget.current)
      widget.current = window.turnstile.render(target.current, {
        sitekey: key,
        action,
        theme: "dark",
        callback: (token: string) => {
          setError(false);
          onToken(token);
        },
        "expired-callback": () => onToken(""),
        "error-callback": () => {
          setError(true);
          onToken("");
        },
      });
  }, [key, action, onToken]);
  useEffect(() => {
    render();
    return () => {
      if (widget.current) window.turnstile?.remove(widget.current);
      widget.current = undefined;
    };
  }, [render]);
  useEffect(() => {
    if (resetKey && widget.current) {
      onToken("");
      window.turnstile?.reset(widget.current);
    }
  }, [resetKey, onToken]);
  if (!key) return null;
  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
        onReady={render}
        onError={() => setError(true)}
      />
      <div ref={target} className="support-captcha" />
      {error && (
        <p role="alert" className="form-message error-message">
          Security verification could not load. Allow challenges.cloudflare.com
          in your browser or content blocker, then reload. You can also email
          our team from the contact page.
        </p>
      )}
    </>
  );
}
