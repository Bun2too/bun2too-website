// Public browser configuration comes only from the selected environment.
export const authConfig = {
  domain: process.env.NEXT_PUBLIC_AUTH0_DOMAIN || "",
  clientId: process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID || "",
  audience: process.env.NEXT_PUBLIC_AUTH0_AUDIENCE || "",
  emailConnection: process.env.NEXT_PUBLIC_AUTH0_EMAIL_CONNECTION || "email",
};
export const authConfigured = Boolean(authConfig.domain && authConfig.clientId);
