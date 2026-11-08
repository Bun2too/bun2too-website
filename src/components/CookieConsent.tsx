"use client";

import Link from "next/link";
import {
  createContext,
  Suspense,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  COOKIE_CONSENT_NAME,
  COOKIE_CONSENT_SECONDS,
  READING_STORAGE_KEY,
  cookieConsentFromHeader,
  createCookieConsent,
  type CookieConsent,
  type CookieChoices,
} from "@/lib/cookie-consent";
import GoogleTagManager from "./GoogleTagManager";

type ConsentContext = { preferencesAllowed: boolean; openSettings: () => void };
const Context = createContext<ConsentContext>({
  preferencesAllowed: false,
  openSettings: () => {},
});
export const useCookieConsent = () => useContext(Context);
function savedConsent() {
  try {
    return cookieConsentFromHeader(document.cookie);
  } catch {
    return null;
  }
}

export function CookieSettingsButton() {
  const { openSettings } = useCookieConsent();
  return (
    <button
      type="button"
      className="cookie-settings-link"
      onClick={openSettings}
    >
      Cookie settings
    </button>
  );
}

export default function CookieConsentProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [record, setRecord] = useState<CookieConsent | null>(null);
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);
  const [preferences, setPreferences] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [message, setMessage] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    function refresh() {
      const saved = savedConsent();
      setRecord(saved);
      setReady(true);
      if (!saved?.preferences) {
        try {
          localStorage.removeItem(READING_STORAGE_KEY);
        } catch {
          /* Storage may be blocked. */
        }
      }
    }
    refresh();
    window.addEventListener("focus", refresh);
    const visible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", visible);
    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", visible);
    };
  }, []);

  useEffect(() => {
    if (!record) return;
    const timer = window.setTimeout(
      () => {
        const saved = savedConsent();
        setRecord(saved);
        if (!saved?.preferences) {
          try {
            localStorage.removeItem(READING_STORAGE_KEY);
          } catch {
            /* Best effort deletion. */
          }
        }
      },
      Math.min(record.expiresAt - Date.now(), 2147483647),
    );
    // Re-check on long-lived tabs without extending the stored expiry.
    return () => window.clearTimeout(timer);
  }, [record]);

  useEffect(() => {
    if (open && !dialog.current?.open) dialog.current?.showModal();
    if (!open && dialog.current?.open) dialog.current?.close();
  }, [open]);

  function openSettings() {
    setPreferences(Boolean(record?.preferences));
    setAnalytics(Boolean(record?.analytics));
    setMarketing(Boolean(record?.marketing));
    setOpen(true);
  }
  function save(choices: CookieChoices) {
    const next = createCookieConsent(choices);
    try {
      document.cookie = `${COOKIE_CONSENT_NAME}=${encodeURIComponent(JSON.stringify(next))}; Path=/; Max-Age=${COOKIE_CONSENT_SECONDS}; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
    } catch {
      /* Honor the choice in memory if the browser blocks persistence. */
    }
    setRecord(next);
    if (!choices.preferences) {
      try {
        localStorage.removeItem(READING_STORAGE_KEY);
      } catch {
        /* Do not touch authentication or push state. */
      }
    }
    setMessage(
      savedConsent()?.updatedAt === next.updatedAt
        ? "Cookie choices saved. You can change them anytime in the footer."
        : "Your choice applies to this visit, but your browser could not remember it. We will ask again next time.",
    );
    setOpen(false);
  }

  return (
    <Context.Provider
      value={{
        preferencesAllowed: ready && Boolean(record?.preferences),
        openSettings,
      }}
    >
      {children}
      <Suspense fallback={null}>
        <GoogleTagManager
          ready={ready}
          analytics={Boolean(record?.analytics)}
          marketing={Boolean(record?.marketing)}
        />
      </Suspense>
      {ready && !record && (
        <section
          className="cookie-banner"
          aria-labelledby="cookie-banner-title"
        >
          <p className="eyebrow">YOUR DEVICE. YOUR CHOICE.</p>
          <h2 id="cookie-banner-title">A little clarity on cookies.</h2>
          <p>
            Necessary cookies support sign-in, security, and your choices.
            Optional preferences remember your Insights reading list. With your
            permission, Google Analytics measures site use; marketing choices
            control advertising-related storage and personalization separately.
          </p>
          <div className="cookie-actions">
            <button
              type="button"
              onClick={() =>
                save({ preferences: false, analytics: false, marketing: false })
              }
            >
              Necessary only
            </button>
            <button
              type="button"
              onClick={() =>
                save({ preferences: true, analytics: true, marketing: true })
              }
            >
              Accept optional
            </button>
            <button
              type="button"
              className="cookie-text-button"
              onClick={openSettings}
            >
              Customize
            </button>
          </div>
          <Link href="/cookies">Cookie details</Link>
          <span aria-hidden="true"> · </span>
          <Link href="/privacy">Privacy</Link>
        </section>
      )}
      <p className="cookie-status" role="status">
        {message}
      </p>
      <dialog
        ref={dialog}
        className="cookie-dialog"
        aria-labelledby="cookie-settings-title"
        onCancel={() => setOpen(false)}
        onClose={() => setOpen(false)}
      >
        <div className="cookie-dialog-heading">
          <p className="eyebrow">PRIVACY, WITH OPTIONS</p>
          <button
            type="button"
            aria-label="Close cookie settings"
            onClick={() => setOpen(false)}
          >
            ×
          </button>
        </div>
        <h2 id="cookie-settings-title">Your cookie choices.</h2>
        <p>
          You can browse with necessary cookies only. Your choice applies to
          this browser for 180 days.
        </p>
        <label className="cookie-category">
          <span>
            <strong>Necessary</strong>
            <small>
              Sign-in, security, requested support, and remembering this choice.
              Always active when needed.
            </small>
          </span>
          <input
            type="checkbox"
            checked
            disabled
            aria-label="Necessary cookies, always on"
          />
        </label>
        <label className="cookie-category">
          <span>
            <strong id="cookie-preferences-label">Preferences</strong>
            <small id="cookie-preferences-description">
              Save Insights read status on this device. Turning this off removes
              saved read status.
            </small>
          </span>
          <input
            type="checkbox"
            aria-labelledby="cookie-preferences-label"
            aria-describedby="cookie-preferences-description"
            checked={preferences}
            onChange={(event) => setPreferences(event.target.checked)}
          />
        </label>
        <label className="cookie-category">
          <span>
            <strong id="cookie-analytics-label">Analytics</strong>
            <small id="cookie-analytics-description">
              Allow Google Analytics through Tag Manager to measure public-site
              use. Google tags stay unloaded until this is enabled.
            </small>
          </span>
          <input
            type="checkbox"
            aria-labelledby="cookie-analytics-label"
            aria-describedby="cookie-analytics-description"
            checked={analytics}
            onChange={(event) => setAnalytics(event.target.checked)}
          />
        </label>
        <label className="cookie-category">
          <span>
            <strong id="cookie-marketing-label">Marketing</strong>
            <small id="cookie-marketing-description">
              Allow advertising-related storage and personalization in supported
              Google tags when Analytics is enabled. No separate advertising
              pixel is installed.
            </small>
          </span>
          <input
            type="checkbox"
            aria-labelledby="cookie-marketing-label"
            aria-describedby="cookie-marketing-description"
            checked={marketing}
            onChange={(event) => setMarketing(event.target.checked)}
          />
        </label>
        <p className="small">
          Email subscriptions and browser notifications have separate opt-ins.
          Cookie choices do not change either.{" "}
          <Link href="/cookies">See storage details</Link>. Withdrawing
          analytics or marketing permission reloads this page to stop previously
          loaded tags.
        </p>
        <div className="cookie-actions">
          <button
            type="button"
            onClick={() =>
              save({ preferences: false, analytics: false, marketing: false })
            }
          >
            Necessary only
          </button>
          <button
            type="button"
            onClick={() => save({ preferences, analytics, marketing })}
          >
            Save choices
          </button>
        </div>
      </dialog>
      <noscript>
        <p className="shell small">
          Optional browser storage is off without JavaScript. Read our{" "}
          <a href="/cookies">cookie policy</a>.
        </p>
      </noscript>
    </Context.Provider>
  );
}
