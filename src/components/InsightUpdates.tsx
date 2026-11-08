"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { CookieSettingsButton, useCookieConsent } from "./CookieConsent";
import { READING_STORAGE_KEY, readInsightIds } from "@/lib/cookie-consent";
type Preview = { id: string; title: string; published_at: string };
export default function InsightUpdates({ articles }: { articles: Preview[] }) {
  const { preferencesAllowed } = useCookieConsent();
  const [unread, setUnread] = useState<Preview[]>([]);
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    if (!preferencesAllowed) {
      setUnread(articles);
      return;
    }
    try {
      const read = readInsightIds(preferencesAllowed, localStorage);
      setUnread(articles.filter((a) => !read.includes(a.id)));
    } catch {
      setUnread(articles);
    }
  }, [articles, preferencesAllowed]);
  useEffect(() => {
    if ("serviceWorker" in navigator)
      void navigator.serviceWorker
        .getRegistration("/")
        .then((r) => r?.pushManager?.getSubscription())
        .then((s) => setEnabled(Boolean(s)))
        .catch(() => {});
  }, []);
  function markRead() {
    setUnread([]);
    if (!preferencesAllowed) {
      setMessage(
        "Marked as read for this view. Enable optional preferences to remember this on your device.",
      );
      return;
    }
    try {
      localStorage.setItem(
        READING_STORAGE_KEY,
        JSON.stringify(articles.map((a) => a.id)),
      );
    } catch {
      setMessage("Your browser could not save read status.");
    }
  }
  async function togglePush() {
    setBusy(true);
    setMessage("");
    try {
      if (
        !("serviceWorker" in navigator) ||
        !("PushManager" in window) ||
        !("Notification" in window)
      )
        throw new Error(
          "Push notifications are not supported in this browser. RSS and email are available below.",
        );
      const registration = await navigator.serviceWorker.register(
        "/insights-sw.js",
        { scope: "/" },
      );
      await navigator.serviceWorker.ready;
      const existing = await registration.pushManager.getSubscription();
      if (existing) {
        await existing.unsubscribe();
        setEnabled(false);
        setMessage("Browser push notifications are off.");
        return;
      }
      const response = await fetch("/api/insights/push-config");
      if (!response.ok)
        throw new Error("Push notifications are not available yet.");
      const config = await response.json();
      if (!config.public_key)
        throw new Error("Push notifications are not available yet.");
      if ((await Notification.requestPermission()) !== "granted")
        throw new Error(
          "Notifications were not enabled. You can change permission in your browser settings.",
        );
      const raw = atob(config.public_key.replace(/-/g, "+").replace(/_/g, "/"));
      const key = Uint8Array.from(raw, (c) => c.charCodeAt(0));
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: key,
      });
      const saved = await fetch("/api/insights/push-subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscription: subscription.toJSON(),
          consent: true,
        }),
      });
      if (!saved.ok) {
        await subscription.unsubscribe();
        throw new Error(
          "Could not save notification preferences. Please try again later.",
        );
      }
      setEnabled(true);
      setMessage("Browser notifications enabled for new insights.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="shell insights-updates" aria-label="Follow insights">
      <div className="insights-update-actions">
        <button
          type="button"
          aria-expanded={open}
          aria-controls="insights-unread"
          onClick={() => setOpen(!open)}
        >
          Your reading list{" "}
          <span className="insights-count">{unread.length}</span>
        </button>
        <button type="button" onClick={() => void togglePush()} disabled={busy}>
          {busy
            ? "Saving…"
            : enabled
              ? "Turn off browser notifications"
              : "Enable browser notifications"}
        </button>
        <Link href="#subscribe">Email digest ↗</Link>
        <a href="/insights/feed.xml">RSS</a>
        <a href="/insights/feed.atom">Atom</a>
      </div>
      {open && (
        <div id="insights-unread" className="insights-unread">
          <h2>New to your reading list</h2>
          <p>
            {preferencesAllowed
              ? "Read status is saved in this browser only."
              : "Read status lasts for this view unless you enable optional preferences."}{" "}
            <CookieSettingsButton />
          </p>
          {unread.length ? (
            <>
              <ul>
                {unread.slice(0, 8).map((a) => (
                  <li key={a.id}>
                    <Link href={`/insights/${a.id}`}>{a.title} ↗</Link>
                  </li>
                ))}
              </ul>
              <button onClick={markRead}>Mark all as read</button>
            </>
          ) : (
            <p>You’re all caught up.</p>
          )}
        </div>
      )}
      {message && <p role="status">{message}</p>}
    </section>
  );
}
