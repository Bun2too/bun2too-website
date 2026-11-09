# Deployment and Auth0 setup

## 1. GitHub and Netlify environments

Use the complete [security and configuration inventory](security.md). Create GitHub environments `dev`, `qa`, and `prod`, each with a distinct Netlify site. Populate the listed environment Secrets and Variables; no tenant/client, backend, agent, or tracking deployment defaults are retained in source.

The workflow validates configuration and synchronizes the named site-level runtime settings to the selected Netlify site's **production** context through the API. GitHub secrets do not reach Netlify by themselves. The synchronization step bridges that gap without writing values into files or printing response bodies. Netlify deployment credentials remain runner-only. The site host must match `NEXT_PUBLIC_SITE_URL` before synchronization proceeds.

Use the repository's `netlify.toml`: Next.js adapter, Node 24, build `npm run build`, publish `.next`. Static export would break server APIs. Disable separate Netlify Git-triggered publication and untrusted preview builds so GitHub Actions owns promotion. Protect the release branches and environment permissions. `dev → dev`, `qa → qa`, `main → prod` refers to three separate sites; each uses its production context. Free-compatible ordinary environment storage is supported; no paid Functions-only scope or Secrets Controller is assumed.

## 2. Auth0 SPA application

Create or select an Auth0 **Single Page Application**, with token endpoint authentication method **None**. Use its authorized dashboard to obtain the real tenant hostname and SPA client ID. The SDK reads environment configuration only. When these are missing, the site keeps public pages available and explains that account sign-in is being connected.

Use separate applications per environment (and preferably a separate production tenant). In [Auth0 Applications](https://manage.auth0.com/), allow the actual local/dev/QA/prod origins:

| Setting                             | Local value              | Each deployed origin |
| ----------------------------------- | ------------------------ | -------------------- |
| Allowed Callback URLs               | `http://localhost:3000/` | `https://YOUR-HOST/` |
| Allowed Logout URLs                 | `http://localhost:3000/` | `https://YOUR-HOST/` |
| Allowed Web Origins                 | `http://localhost:3000`  | `https://YOUR-HOST`  |
| Allowed Origins (CORS), if required | `http://localhost:3000`  | `https://YOUR-HOST`  |

The callback always returns to the origin root, then the SDK routes to `/account`. `/account` is not the configured redirect URI. Use exact URLs with HTTPS in hosted environments; no wildcards are needed. The browser tests use 3100 and do not complete a real Auth0 login; add 3100 only if manually testing login on that port.

Use Auth0 Universal Login and enable the connections you want for standard account creation/login. The SDK handles redirects, PKCE, tokens, state, and logout. This is SPA authentication, not a server session: future private server resources must independently validate their access tokens, as the preferences API does.

## 3. Custom API for preference management

Create an Auth0 API named **Bun2Too Website API**, with an identifier such as `https://bun2too.com/api` (it is an identifier; it does not need to serve a URL). Use **RS256** signing. Add a permission named:

```text
manage:subscriptions
```

Authorize the SPA to request it. For a first-party application, configure the API's consent policy appropriately. If RBAC is enabled, grant this permission to the intended customer role/users so it appears in the issued token's `scope` claim. The application requests `openid profile email manage:subscriptions` and this API audience. The server rejects ID tokens, tokens for another audience/client/issuer, expired tokens, machine identities, and tokens without the scope.

Use the same identifier for `NEXT_PUBLIC_AUTH0_AUDIENCE` and `AUTH0_AUDIENCE`. Sign out and back in after changing token audience or scopes. Without an audience configured, regular login can still work, but the account UI explains that preferences are not connected.

## 4. Credentialless subscriber profiles

Enable **Authentication → Passwordless → Email**, connection name `email`, and enable that connection for your SPA. Configure the email provider and templates in Auth0. Enable this passwordless connection for the Management API M2M application's `enabled_clients` as required for user creation. Keep the two connection environment variables in sync. The code does not create fake passwords or mark unverified emails as verified.

Create a **separate Machine-to-Machine application**, authorize it for the **Auth0 Management API**, and grant only:

```text
read:users
create:users
update:users_app_metadata
```

Store this application's client ID/secret as the server-only Management variables. The SDK obtains Management API tokens using those credentials; never use the public SPA application as a confidential client.

If your tenant requires `update:users` for a particular connection policy, confirm that in Auth0 before broadening the grant. The implementation updates only `app_metadata` and needs no role assignment, user deletion, password changes, or identity-linking permissions.

On request, the site creates:

```json
{
  "connection": "email",
  "email": "customer@example.com",
  "email_verified": false,
  "app_metadata": {
    "bun2too": {
      "newsletter": {
        "status": "pending_verification",
        "topics": ["customer-technology"],
        "consent_version": "2026-11-07",
        "requested_at": "<UTC timestamp>",
        "updated_at": "<UTC timestamp>",
        "source": "website-newsletter"
      }
    }
  }
}
```

Auth0 may send its configured verification email when creating a passwordless profile; do not rely on `verify_email: false` to suppress it for passwordless connections. Test your tenant's provider/template behavior. The site does not itself send campaign email.

The visitor chooses **Continue with email** on `/account`, authenticates the same email identity through Auth0, then explicitly confirms subscription topics. The backend fetches their current profile and requires `email_verified: true`. An authenticated unsubscribe records `unsubscribed` and a withdrawal timestamp without deleting the identity.

Anonymous duplicates return the same generic acceptance response and cannot overwrite preferences or reactivate an unsubscribed user. If an email also belongs to a database or social identity, a separate passwordless profile may exist. Do not automatically merge accounts by email. A subscriber must use their passwordless email identity to manage that profile; account linking is outside this implementation.

Only export/send marketing to records where **newsletter.status is subscribed AND email_verified is true**, honoring current topics and withdrawal. Add campaign delivery, campaign-specific unsubscribe links, and a durable event/audit store if needed later. Auth0 app metadata stores the latest preference state, not an immutable history.

## 5. Public signup verification

Create a Cloudflare Turnstile widget for all intended website hostnames (including any Netlify hostnames you use). Set the public key in GitHub build variables and the private verification key in Netlify Functions. The widget action is `subscribe`; the server verifies token success, hostname, and action before provisioning. Production signup fails closed when verification is missing. Local `npm run dev` can omit both keys; local `npm start` runs production mode and still requires them for a successful signup.

Development/testing should use Cloudflare's documented test keys in an isolated environment, never on the live site. Production browser tests in CI mock the newsletter API and do not provision real subscribers. Configure Netlify firewall/rate limits for the public signup route if your traffic requires them; application input checks and CAPTCHA do not replace infrastructure limits.

## 6. Verify after configuration

1. Log in, create an account, log out, and return to the same origin. Check for callback errors.
2. Submit a new email with explicit consent and topics. Confirm the passwordless Auth0 profile has no password and remains pending/unverified until the owner authenticates.
3. Use **Continue with email**, finish Auth0 verification, and confirm topics. Check `app_metadata.bun2too.newsletter.status` changes to `subscribed` with a confirmation timestamp.
4. Change topics and unsubscribe. Submit the anonymous signup form again; it must not reactivate the withdrawn subscription.
5. Confirm that existing unrelated app metadata remains intact and no Management secrets appear in browser bundles.
6. Merge to dev and check GitHub Actions, the selected Netlify site, and the workflow's live smoke tests. Repeat promotions to QA and prod.

Useful references: [Auth0 React quickstart](https://auth0.com/docs/quickstart/spa/react), [official Management SDK](https://github.com/auth0/node-auth0), [Netlify Next.js support](https://docs.netlify.com/build/frameworks/framework-setup-guides/nextjs/overview/), [Netlify CLI deploy](https://cli.netlify.com/commands/deploy/), [Turnstile server validation](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/).

## Search and support configuration

Also follow [search setup](search.md) for environment-specific canonical URLs, indexing controls, and ownership verification, and [support setup](support.md) for the private Netlify inquiry records, runtime secrets, and the future AI integration boundary.
