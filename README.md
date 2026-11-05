# Orbit

Orbit is a static, browser-style web app with tabs, address/search, bookmarks,
history, and theme settings. It has no built-in sign-in or account system.

## Run locally

Open `index.html` in a modern browser, or serve this directory with any static
file server. There are no packages or build step.

## Publish as a static website

Upload `index.html` to an S3 bucket configured for static website hosting, or
serve it through CloudFront. The site does not require `server.mjs`; that
authentication server has been removed. Keep the bucket and CDN configuration
appropriate for the intended public/private access.

## Proxy configuration limitations

Orbit cannot set a visitor's browser-level HTTP or SOCKS proxy. The proxy form
only sends requests to a separately operated, compatible relay endpoint that
the visitor configures. A static S3 site does not provide that relay, and this
repository does not include one. Without a trusted relay endpoint, navigation
connects directly from the visitor's browser.

If you provide a relay, it must independently authenticate and authorize
requests and enforce strict destination restrictions. Do not expose an
unrestricted relay. Static hosting makes the app itself publicly available
unless access is restricted separately; do not put secrets in the page.
