import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const indexPath = fileURLToPath(new URL("./index.html", import.meta.url));
const username = process.env.PROXY_USER;
const password = process.env.PROXY_PASS;
const port = Number(process.env.PORT || 3000);
const secureCookie = process.env.COOKIE_SECURE === "true";
const sessionTtlMs = 8 * 60 * 60 * 1000;
const sessions = new Map();
const loginAttempts = new Map();
const cookieName = "orbit_session";

if (!username || !password) {
  throw new Error("Set PROXY_USER and PROXY_PASS before starting the server.");
}
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("PORT must be an integer between 1 and 65535.");
}

function digest(value) {
  return createHash("sha256").update(value).digest();
}

function matchesCredential(candidate, expected) {
  return timingSafeEqual(digest(candidate), digest(expected));
}

function getCookie(request, name) {
  const cookies = request.headers.cookie?.split(";") || [];
  for (const cookie of cookies) {
    const separator = cookie.indexOf("=");
    if (separator < 0) continue;
    if (cookie.slice(0, separator).trim() === name) {
      return cookie.slice(separator + 1).trim();
    }
  }
  return "";
}

function getSession(request) {
  const token = getCookie(request, cookieName);
  const expiresAt = sessions.get(token);
  if (!expiresAt) return null;
  if (expiresAt <= Date.now()) {
    sessions.delete(token);
    return null;
  }
  return token;
}

function cookie(value, maxAge) {
  const attributes = [
    `${cookieName}=${value}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Strict",
    `Max-Age=${maxAge}`
  ];
  if (secureCookie) attributes.push("Secure");
  return attributes.join("; ");
}

function send(response, status, body, headers = {}) {
  response.writeHead(status, {
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
    ...headers
  });
  response.end(body);
}

function sendJson(response, status, data, headers = {}) {
  send(response, status, JSON.stringify(data), {
    ...headers,
    "Content-Type": "application/json; charset=utf-8"
  });
}

function loginPage(message = "") {
  const error = message
    ? `<p class="error" role="alert">${message}</p>`
    : "";
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="dark light">
  <title>Sign in — Orbit</title>
  <style>
    :root{color-scheme:dark;--bg:#111214;--panel:#191a1e;--border:rgba(255,255,255,.09);--text:#f2f1f0;--muted:#898b96;--accent:#c4a8ff;font-family:Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif}
    *{box-sizing:border-box}body{min-width:320px;min-height:100vh;margin:0;display:grid;place-items:center;padding:20px;background:var(--bg);color:var(--text)}
    main{width:min(380px,100%);padding:30px;border:1px solid var(--border);border-radius:16px;background:var(--panel);box-shadow:0 24px 80px #0005}
    h1{margin:0;font-size:23px;letter-spacing:-.04em}p{color:var(--muted);font-size:13px;line-height:1.55}
    label{display:block;margin:16px 0 6px;font-size:12px;color:var(--muted)}input{width:100%;height:40px;padding:0 11px;border:1px solid var(--border);border-radius:8px;background:#202126;color:var(--text);font:inherit}
    input:focus{outline:2px solid var(--accent);outline-offset:2px}button{width:100%;height:40px;margin-top:20px;border:0;border-radius:8px;background:var(--accent);color:#211a2d;font:inherit;font-weight:700;font-size:13px;cursor:pointer}
    .error{color:#ff817d} @media(prefers-color-scheme:light){:root{color-scheme:light;--bg:#f2f1f4;--panel:#fbfafc;--border:rgba(38,33,48,.12);--text:#23212a;--muted:#73717c;--accent:#7550c8}input{background:#f3f1f6}}
  </style>
</head>
<body>
  <main>
    <h1>Sign in to Orbit</h1>
    <p>Enter your account credentials to continue.</p>
    ${error}
    <form method="post" action="/api/auth/login">
      <label for="username">Username</label>
      <input id="username" name="username" autocomplete="username" required autofocus>
      <label for="password">Password</label>
      <input id="password" name="password" type="password" autocomplete="current-password" required>
      <button type="submit">Sign in</button>
    </form>
  </main>
</body>
</html>`;
}

function getLoginAttempt(ip) {
  const attempt = loginAttempts.get(ip);
  if (!attempt || attempt.resetAt <= Date.now()) {
    loginAttempts.delete(ip);
    return null;
  }
  return attempt.failures >= 5 ? attempt : null;
}

function recordFailedLogin(ip) {
  const now = Date.now();
  const previous = loginAttempts.get(ip);
  const failures = (previous && previous.resetAt > now ? previous.failures : 0) + 1;
  loginAttempts.set(ip, {
    failures,
    resetAt: now + 15 * 60 * 1000
  });
}

async function handle(request, response) {
  const url = new URL(request.url, `http://${request.headers.host || "localhost"}`);
  const session = getSession(request);

  if (request.method === "POST" && url.pathname === "/api/auth/login") {
    const ip = request.socket.remoteAddress || "unknown";
    if (getLoginAttempt(ip)) {
      return send(response, 429, loginPage("Too many sign-in attempts. Try again in 15 minutes."), {
        "Content-Type": "text/html; charset=utf-8",
        "Retry-After": "900"
      });
    }
    if (!request.headers["content-type"]?.startsWith("application/x-www-form-urlencoded")) {
      return send(response, 415, loginPage("Submit the sign-in form to continue."), {
        "Content-Type": "text/html; charset=utf-8"
      });
    }
    let body = "";
    for await (const chunk of request) {
      body += chunk;
      if (body.length > 8192) {
        request.destroy();
        return;
      }
    }
    const form = new URLSearchParams(body);
    const suppliedUser = form.get("username") || "";
    const suppliedPass = form.get("password") || "";
    if (!matchesCredential(suppliedUser, username) || !matchesCredential(suppliedPass, password)) {
      recordFailedLogin(ip);
      return send(response, 401, loginPage("Invalid username or password."), {
        "Content-Type": "text/html; charset=utf-8"
      });
    }

    loginAttempts.delete(ip);
    const token = randomBytes(32).toString("base64url");
    sessions.set(token, Date.now() + sessionTtlMs);
    return send(response, 303, "", {
      Location: "/",
      "Set-Cookie": cookie(token, Math.floor(sessionTtlMs / 1000))
    });
  }

  if (url.pathname.startsWith("/api/") && !session) {
    return sendJson(response, 401, { error: "Authentication required." });
  }

  if (request.method === "GET" && url.pathname === "/api/auth/session") {
    return sendJson(response, 200, { authenticated: true });
  }

  if (request.method === "POST" && url.pathname === "/api/auth/logout") {
    sessions.delete(session);
    return sendJson(response, 200, { authenticated: false }, { "Set-Cookie": cookie("", 0) });
  }

  if (url.pathname.startsWith("/api/")) {
    return sendJson(response, 404, { error: "Not found." });
  }

  if ((request.method === "GET" || request.method === "HEAD") &&
      (url.pathname === "/" || url.pathname === "/index.html")) {
    if (!session) {
      return send(response, 200, loginPage(), { "Content-Type": "text/html; charset=utf-8" });
    }
    const html = await readFile(indexPath);
    return send(response, 200, request.method === "HEAD" ? "" : html, {
      "Content-Type": "text/html; charset=utf-8"
    });
  }

  return send(response, 404, "Not found.", { "Content-Type": "text/plain; charset=utf-8" });
}

createServer((request, response) => {
  handle(request, response).catch((error) => {
    console.error("Request failed:", error);
    if (!response.headersSent) sendJson(response, 500, { error: "Internal server error." });
    else response.destroy();
  });
}).listen(port, () => {
  console.log(`Orbit is listening on http://localhost:${port}`);
});
