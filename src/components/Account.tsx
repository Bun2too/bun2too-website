"use client";
import { useAuth0 } from "@auth0/auth0-react";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { authConfig, authConfigured } from "@/lib/auth-config";
import { NewsletterPreference, TOPICS, Topic } from "@/lib/consent";
import { PageHero } from "./PageArtwork";
export default function Account() {
  if (!authConfigured)
    return (
      <section className="section shell">
        <PageHero artwork="trust-by-design">
          <p className="eyebrow">YOUR BUN2TOO</p>
          <h1 className="page-title">Your account.</h1>
          <p className="page-intro">
            Sign-in is being connected. You can still browse the site and{" "}
            <Link href="/contact">contact our team</Link>.
          </p>
        </PageHero>
      </section>
    );
  return <ConnectedAccount />;
}
function ConnectedAccount() {
  const {
    isAuthenticated,
    isLoading,
    user,
    error,
    loginWithRedirect,
    logout,
    getAccessTokenSilently,
  } = useAuth0();
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);
  const [preference, setPreference] = useState<NewsletterPreference | null>(
    null,
  );
  const [topics, setTopics] = useState<Topic[]>(["customer-technology"]);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const api = useCallback(
    async (method: "GET" | "PATCH", data?: unknown) => {
      const token = await getAccessTokenSilently();
      const response = await fetch("/api/preferences", {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          ...(data ? { "Content-Type": "application/json" } : {}),
        },
        ...(data ? { body: JSON.stringify(data) } : {}),
        signal: AbortSignal.timeout(20000),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "We couldn’t load your preferences.");
      return result.newsletter as NewsletterPreference | null;
    },
    [getAccessTokenSilently],
  );
  useEffect(() => {
    if (!isAuthenticated || !authConfig.audience) return;
    let active = true;
    setLoaded(false);
    void api("GET")
      .then((value) => {
        if (active) {
          setPreference(value);
          if (value?.topics) setTopics(value.topics);
          setLoaded(true);
        }
      })
      .catch((err) => {
        if (active) {
          setMessage(err.message);
          setFailed(true);
        }
      });
    return () => {
      active = false;
    };
  }, [isAuthenticated, api]);
  async function save(subscribed: boolean) {
    setBusy(true);
    setMessage("");
    setFailed(false);
    try {
      const value = await api("PATCH", { subscribed, topics, consent });
      setPreference(value);
      setConsent(false);
      setMessage(
        subscribed
          ? "Your subscription is confirmed. Your topic preferences have been saved."
          : "You are unsubscribed. Your sign-in account remains available.",
      );
    } catch (err) {
      setFailed(true);
      setMessage(err instanceof Error ? err.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }
  async function signIn(signup = false, passwordless = false) {
    setMessage("");
    setFailed(false);
    try {
      await loginWithRedirect({
        appState: { returnTo: "/account" },
        authorizationParams: {
          ...(signup ? { screen_hint: "signup" } : {}),
          ...(passwordless ? { connection: authConfig.emailConnection } : {}),
        },
      });
    } catch {
      setFailed(true);
      setMessage("Sign-in could not start. Please try again.");
    }
  }
  return (
    <section className="section shell">
      <PageHero artwork="trust-by-design">
        <p className="eyebrow">YOUR BUN2TOO</p>
        <h1 className="page-title">
          Welcome to
          <br />
          <em>your connections.</em>
        </h1>
        <p className="page-intro">
          A familiar place for your identity, subscriptions, and communication
          choices. Secure sign-in through Auth0, with your preferences in your
          hands.
        </p>
      </PageHero>
      {error && (
        <p role="alert" className="form-message error-message">
          Sign-in could not complete. Please try again. If this continues, check
          that this website address is allowed by the Auth0 application.
        </p>
      )}
      {isLoading ? (
        <p role="status">Loading your account…</p>
      ) : !isAuthenticated ? (
        <div className="account-card">
          <h2>A familiar place to connect.</h2>
          <p>
            Sign in or create an account with Bun2Too. Your identity is managed
            by Auth0.
          </p>
          <div className="actions">
            <button
              className="button button-lime"
              onClick={() => void signIn()}
            >
              Log in ↗
            </button>
            <button
              className="button button-outline"
              onClick={() => void signIn(true)}
            >
              Create an account ↗
            </button>
          </div>
          <hr
            style={{
              border: 0,
              borderTop: "1px solid var(--line)",
              margin: "30px 0",
            }}
          />
          <h2>Requested email updates?</h2>
          <p>
            Use the same email address to verify it through passwordless
            sign-in. Then confirm your subscription and topics here.
          </p>
          <button
            className="button button-outline"
            onClick={() => void signIn(false, true)}
          >
            Continue with email ↗
          </button>
          <p className="small" style={{ marginTop: 20 }}>
            Signing in does not automatically subscribe you.{" "}
            <Link href="/privacy">Read about privacy & consent.</Link>{" "}
            <Link href="/terms">Review the website terms.</Link>
          </p>
        </div>
      ) : (
        <>
          <div className="account-card">
            <div className="profile-row">
              <span className="profile-avatar" aria-hidden="true">
                {(user?.name || user?.email || "B").slice(0, 1).toUpperCase()}
              </span>
              <div>
                <h2>{user?.name || "Your account"}</h2>
                <p>{user?.email}</p>
              </div>
            </div>
            <span className="badge">
              {user?.email_verified
                ? "EMAIL VERIFIED"
                : "EMAIL NOT YET VERIFIED"}
            </span>
            <div className="actions">
              <button
                className="button button-outline"
                onClick={() => {
                  void logout({
                    logoutParams: { returnTo: `${window.location.origin}/` },
                  }).catch(() => {
                    setFailed(true);
                    setMessage(
                      "Sign-out could not complete. Please try again.",
                    );
                  });
                }}
              >
                Log out
              </button>
            </div>
          </div>
          <div className="account-card">
            <h2>Your email, your choice.</h2>
            <p>
              Choose the updates you want. If you requested updates before
              creating an account, use the same passwordless email identity to
              manage that request.
            </p>
            {!authConfig.audience ? (
              <p className="form-message">
                Email preferences will be available once the subscription
                service is connected.
              </p>
            ) : (
              <>
                <p>
                  Current status:{" "}
                  <strong>
                    {preference?.status === "subscribed"
                      ? "Subscribed"
                      : preference?.status === "pending_verification"
                        ? "Awaiting your confirmation"
                        : "Not subscribed"}
                  </strong>
                </p>
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    void save(true);
                  }}
                >
                  <fieldset
                    className="topic-options"
                    disabled={busy || !loaded}
                  >
                    <legend>Your topics</legend>
                    {TOPICS.map((topic) => (
                      <label key={topic.value} className="check-label">
                        <input
                          type="checkbox"
                          checked={topics.includes(topic.value)}
                          onChange={(e) =>
                            setTopics(
                              e.target.checked
                                ? [...topics, topic.value]
                                : topics.filter((t) => t !== topic.value),
                            )
                          }
                        />
                        {topic.label}
                      </label>
                    ))}
                  </fieldset>
                  <label className="check-label">
                    <input
                      type="checkbox"
                      checked={consent}
                      onChange={(e) => setConsent(e.target.checked)}
                      required
                    />
                    <span>
                      I agree to receive updates on these topics under the{" "}
                      <Link href="/privacy">privacy & consent notice</Link>.
                    </span>
                  </label>
                  <div className="actions">
                    <button
                      className="button button-lime"
                      disabled={
                        busy ||
                        !loaded ||
                        !consent ||
                        topics.length === 0 ||
                        !user?.email_verified
                      }
                      type="submit"
                    >
                      {busy ? "Saving…" : "Confirm subscription & topics"}
                    </button>
                    <button
                      className="button button-outline"
                      disabled={busy || !loaded}
                      type="button"
                      onClick={() => void save(false)}
                    >
                      Unsubscribe
                    </button>
                  </div>
                </form>
                {!user?.email_verified && (
                  <p className="small" style={{ marginTop: 15 }}>
                    Verify your email using Auth0’s verification message, then
                    sign in again to enable confirmation.
                  </p>
                )}
              </>
            )}
          </div>
        </>
      )}
      {message && (
        <p
          role={failed ? "alert" : "status"}
          className={`form-message ${failed ? "error-message" : ""}`}
        >
          {message}
        </p>
      )}
    </section>
  );
}
