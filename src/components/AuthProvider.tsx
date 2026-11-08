"use client";
import { Auth0Provider } from "@auth0/auth0-react";
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
      {children}
    </Auth0Provider>
  );
}
