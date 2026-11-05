# Orbit

Orbit is a small browser-style web app served by a Node.js authentication
gateway. Sign-in is required before the app is delivered.

## Requirements

- Node.js 18 or newer
- No npm packages or install step

## Start the app

In the repository directory, set a username and a strong password, then start
the server:

```sh
PROXY_USER=admin PROXY_PASS='choose-a-strong-password' node server.mjs
```

Open [http://localhost:3000](http://localhost:3000) and sign in with those
credentials. To use a different port, set `PORT`, for example:

```sh
PROXY_USER=admin PROXY_PASS='choose-a-strong-password' PORT=8080 node server.mjs
```

Stop the server with `Ctrl+C`. The server does not save credentials or session
data to disk. Sessions are held in memory and expire after eight hours; restarting
the server signs everyone out.

For HTTPS deployments, set `COOKIE_SECURE=true` so session cookies are marked
Secure. Do not expose this service over plain HTTP on an untrusted network.

## Proxy relay note

The repository does not include a proxy backend. The browser can be configured
to use an external relay, but this app's login does not authenticate that
separate service. The relay must implement its own authentication, access
controls, and destination restrictions. Do not operate an unrestricted relay.

See [AUTHENTICATION.md](./AUTHENTICATION.md) for session and relay details.
