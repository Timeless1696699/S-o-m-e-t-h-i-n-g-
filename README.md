# Orbit

Orbit is a single-page browser-style app with tabs, address/search, bookmarks,
history, theme settings, and an optional external relay configuration. It is
served by a small Node.js server that requires sign-in before delivering the
app.

## Requirements

- Node.js 18 or newer
- No npm packages or install step

## Start

From the repository directory, set the login credentials and start the server:

```sh
PROXY_USER=admin PROXY_PASS='choose-a-strong-password' node server.mjs
```

Open [http://localhost:3000](http://localhost:3000) and sign in with those
credentials. Use a different port by setting `PORT`:

```sh
PROXY_USER=admin PROXY_PASS='choose-a-strong-password' PORT=8080 node server.mjs
```

Stop the server with `Ctrl+C`. Both `PROXY_USER` and `PROXY_PASS` are required;
there is no default account or registration flow.

## Authentication and security

The server serves the app only after successful sign-in. It guards `/api/*`
routes, uses an eight-hour in-memory session with an `HttpOnly`,
`SameSite=Strict` cookie, and rate-limits repeated failed logins. Restarting the
server clears active sessions. In production, use HTTPS and a secret manager,
and set `COOKIE_SECURE=true` so cookies are marked `Secure`.

Run the app through `server.mjs`; opening `index.html` directly bypasses the
login gate. The sign-in gate protects this app, not any separate relay service.

## External relay

No proxy/relay backend is included in this repository. The browser can be
configured to contact a separately operated relay, but its requests do not pass
through this app's authenticated `/api/*` routes, and this app's session cookie
does not authenticate to that relay. Do not treat the browser's proxy settings
as access control. Any relay must independently authenticate callers and enforce
strict destination allowlists, block private and metadata addresses, and
revalidate redirects and subresource requests. Never expose an unrestricted
relay.

See [AUTHENTICATION.md](./AUTHENTICATION.md) for implementation details and
deployment notes.
