"use client";
import { Auth0Provider, useAuth0 } from "@auth0/auth0-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authConfig, authConfigured } from "@/lib/auth-config";
export default function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [origin, setOrigin] = useState("");
  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);
  // Render public content on the server; construct the SPA SDK only in the browser.
  if (!origin || !authConfigured) return children;
  return (
    <Auth0Provider
      domain={authConfig.domain}
      clientId={authConfig.clientId}
      authorizationParams={{
        redirect_uri: `${origin}/`,
        scope: `openid profile email${authConfig.audience ? " manage:subscriptions" : ""}`,
        ...(authConfig.audience ? { audience: authConfig.audience } : {}),
      }}
      cacheLocation="memory"
      onRedirectCallback={(appState) => {
        const path = appState?.returnTo;
        router.replace(
          typeof path === "string" &&
            path.startsWith("/") &&
            !path.startsWith("//") &&
            !path.includes("\\")
            ? path
            : "/account",
        );
      }}
    >
      <CallbackFailure />
      {children}
    </Auth0Provider>
  );
}

function CallbackFailure() {
  const { error } = useAuth0();
  const router = useRouter();
  useEffect(() => {
    if (!error) return;
    const params = new URLSearchParams(window.location.search);
    // The SDK's success callback is not called when Auth0 rejects authorization.
    // Keep its validated error in context, show the account recovery UI, and
    // remove callback parameters instead of leaving a silent failure on `/`.
    if (params.has("state") && (params.has("error") || params.has("code")))
      router.replace("/account");
  }, [error, router]);
  return null;
}
