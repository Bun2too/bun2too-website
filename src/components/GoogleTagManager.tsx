"use client";
import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import {
  canMeasurePage,
  clearGoogleCookies,
  GA4_MEASUREMENT_ID,
  googleConsent,
  GTM_CONTAINER_ID,
} from "@/lib/tag-manager";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

export default function GoogleTagManager({
  analytics,
  marketing,
  ready,
}: {
  analytics: boolean;
  marketing: boolean;
  ready: boolean;
}) {
  const pathname = usePathname();
  const query = useSearchParams().toString();
  const loaded = useRef(false);
  const previous = useRef({ analytics: false, marketing: false });

  useEffect(() => {
    if (!ready) return;
    const permittedPage =
      canMeasurePage(new URL(location.href)) && window.self === window.top;
    const was = previous.current;
    previous.current = { analytics, marketing };
    if (GA4_MEASUREMENT_ID)
      (window as unknown as Record<string, unknown>)[
        `ga-disable-${GA4_MEASUREMENT_ID}`
      ] = !analytics || !permittedPage;

    if (document.getElementById("bun2too-gtm")) loaded.current = true;
    if (!analytics || !marketing)
      clearGoogleCookies(analytics, analytics && marketing);
    if (
      !/^GTM-[A-Z0-9]+$/.test(GTM_CONTAINER_ID) ||
      !/^G-[A-Z0-9]+$/.test(GA4_MEASUREMENT_ID)
    )
      return;
    if (
      loaded.current &&
      (!permittedPage || !analytics || (was.marketing && !marketing))
    ) {
      window.gtag?.(
        "consent",
        "update",
        googleConsent(analytics && permittedPage, marketing && permittedPage),
      );
      document.getElementById("bun2too-gtm")?.remove();
      // Removing a script does not undo its listeners or stop cookieless pings.
      // Reload once with the saved choice to fully unload third-party runtime.
      window.location.reload();
      return;
    }
    if (!analytics || !permittedPage) return;
    if (loaded.current) {
      window.gtag?.("set", {
        page_location: `${location.origin}${pathname}`,
        allow_google_signals: marketing,
        allow_ad_personalization_signals: marketing,
      });
      window.gtag?.("consent", "update", googleConsent(analytics, marketing));
      return;
    }

    window.dataLayer = window.dataLayer || [];
    window.gtag = function () {
      window.dataLayer!.push(arguments);
    };
    window.gtag("consent", "default", googleConsent(false, false));
    window.gtag("set", "ads_data_redaction", true);
    window.gtag("set", "url_passthrough", false);
    window.gtag("set", {
      page_location: `${location.origin}${pathname}`,
      page_referrer: document.referrer ? new URL(document.referrer).origin : "",
      allow_google_signals: marketing,
      allow_ad_personalization_signals: marketing,
    });
    window.gtag("consent", "update", googleConsent(analytics, marketing));
    window.gtag("js", new Date());
    window.dataLayer.push({ "gtm.start": Date.now(), event: "gtm.js" });
    const script = document.createElement("script");
    script.id = "bun2too-gtm";
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtm.js?id=${GTM_CONTAINER_ID}`;
    script.onerror = () => {
      loaded.current = false;
      script.remove();
    };
    loaded.current = true;
    document.head.appendChild(script);
  }, [analytics, marketing, ready, pathname, query]);

  return null;
}
