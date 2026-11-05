# Authentication

Run the app through the Node server; opening `index.html` directly bypasses the
server and does not provide authentication.

```sh
PROXY_USER=your-user PROXY_PASS='use-a-strong-password' node server.mjs
```

The server requires both environment variables and does not provide a default
account. It stores opaque, random session tokens in memory and sends them in
`HttpOnly`, `SameSite=Strict` cookies with an eight-hour lifetime. Sessions are
cleared when the server restarts. Login attempts are rate-limited per client IP.
Set `COOKIE_SECURE=true` when serving the app over HTTPS; production deployments
should use HTTPS and a secret manager for credentials.

The app page and all `/api/*` routes (except the login form) require a valid
session. The server currently does not implement a proxy endpoint. The browser
can be configured to contact an external relay, but this app's session cookie
does not authenticate or protect that separate service. The relay must implement
its own authentication and authorization checks before accepting configuration,
test, or navigation requests; do not expose an unrestricted relay.
