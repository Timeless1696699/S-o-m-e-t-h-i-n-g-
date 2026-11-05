# Authentication and relay security

## Run behind the sign-in gate

Start the app with credentials supplied by the environment:

```sh
PROXY_USER=your-user PROXY_PASS='use-a-strong-password' node server.mjs
```

The server refuses to start if either credential is missing. There is no
default account, registration form, or password reset flow. Do not put real
credentials in source control or share a live password in documentation.

The server returns the sign-in page to unauthenticated visitors and serves
`index.html` only to an authenticated session. It also checks the session on
every `/api/*` route except `POST /api/auth/login`. `POST /api/auth/logout`
invalidates the current session. Requests for other paths return 404. Opening
`index.html` directly bypasses this server-side gate, so users must access the
app through the Node server.

## Session behavior

- Successful login creates an opaque, cryptographically random session token.
- The token is stored server-side in memory and sent as an `HttpOnly`,
  `SameSite=Strict`, eight-hour cookie.
- Restarting the process clears all sessions. There is no persistent session
  store or multi-server session sharing.
- Five failed attempts from an IP address within the 15-minute window result in
  a 15-minute login block.
- Use HTTPS for network access. Set `COOKIE_SECURE=true` when HTTPS terminates
  at this server or at a trusted TLS-terminating reverse proxy.

The built-in server is intentionally minimal. For an internet-facing
deployment, use a properly configured HTTPS reverse proxy, protect the
environment secrets, and consider persistent session storage and operational
monitoring appropriate to the deployment.

## External proxy relay boundary

This repository does **not** implement a proxy relay. The browser's optional
relay settings contact a separately configured endpoint for proxy configuration,
connectivity checks, and navigation. Those requests go directly from the
browser to that endpoint; they do not go through this app's `/api/*` routes.
Consequently, this app's login cookie does not authenticate users to the
external relay.

The relay must independently authenticate and authorize each operation and
enforce a strict destination allowlist. It must block private-network and
metadata targets, validate DNS results, recheck redirect destinations, and
apply equivalent restrictions to subresources. Do not expose an unrestricted
relay or assume the browser-side settings make it safe.

Proxy credentials entered in the browser are held in memory by the page. Other
proxy settings may be saved in the browser's local storage; they are not an
account-wide server-side configuration.
