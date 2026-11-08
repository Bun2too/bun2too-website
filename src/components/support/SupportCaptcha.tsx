"use client";
import Script from "next/script";
import { useCallback, useEffect, useRef } from "react";
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
  const render = useCallback(() => {
    if (key && target.current && window.turnstile && !widget.current)
      widget.current = window.turnstile.render(target.current, {
        sitekey: key,
        action,
        theme: "dark",
        callback: onToken,
        "expired-callback": () => onToken(""),
        "error-callback": () => onToken(""),
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
      />
      <div ref={target} className="support-captcha" />
    </>
  );
}
