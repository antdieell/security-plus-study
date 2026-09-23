/**
 * Cloudflare Pages gate.
 * Unauthenticated requests never receive the study app, question banks,
 * or private-data files. Password is read from SITE_PASSWORD (secret).
 * SESSION_SECRET signs the HttpOnly cookie. Neither value belongs in Git.
 */

const COOKIE = "secplus_session";
const TTL_SEC = 30 * 24 * 60 * 60;

function encoder() {
  return new TextEncoder();
}

function toHex(buf) {
  return [...new Uint8Array(buf)].map(function (b) {
    return b.toString(16).padStart(2, "0");
  }).join("");
}

function timingSafeEqual(a, b) {
  const left = encoder().encode(String(a || ""));
  const right = encoder().encode(String(b || ""));
  const len = Math.max(left.length, right.length);
  let diff = left.length === right.length ? 0 : 1;
  for (let i = 0; i < len; i += 1) {
    diff |= (left[i] || 0) ^ (right[i] || 0);
  }
  return diff === 0;
}

async function sign(secret, payload) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder().encode(payload));
  return toHex(sig);
}

function parseCookies(header) {
  const out = {};
  String(header || "").split(";").forEach(function (part) {
    const idx = part.indexOf("=");
    if (idx === -1) {
      return;
    }
    out[part.slice(0, idx).trim()] = decodeURIComponent(part.slice(idx + 1).trim());
  });
  return out;
}

function cookieHeader(value, secure, maxAge) {
  const parts = [
    COOKIE + "=" + value,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    "Max-Age=" + maxAge
  ];
  if (secure) {
    parts.push("Secure");
  }
  return parts.join("; ");
}

async function passwordStamp(password) {
  const digest = await crypto.subtle.digest("SHA-256", encoder().encode(String(password || "")));
  return toHex(digest).slice(0, 16);
}

async function readSession(request, secret, password) {
  if (!secret) {
    return null;
  }
  const raw = parseCookies(request.headers.get("Cookie"))[COOKIE];
  if (!raw) {
    return null;
  }
  const bits = raw.split(".");
  if (bits.length !== 4 || bits[0] !== "v1") {
    return null;
  }
  const exp = Number(bits[1]);
  if (!exp || exp * 1000 < Date.now()) {
    return null;
  }
  const stamp = await passwordStamp(password);
  if (!timingSafeEqual(bits[2], stamp)) {
    return null;
  }
  const payload = "v1." + bits[1] + "." + bits[2];
  const expected = await sign(secret, payload);
  if (!timingSafeEqual(expected, bits[3])) {
    return null;
  }
  return { exp: exp };
}

function loginPage(error) {
  const err = error
    ? "<p class=\"err\">Incorrect password. Nothing on this site is available without the correct password.</p>"
    : "";
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex,nofollow">
  <title>SEC+ Study — Locked</title>
  <style>
    :root { color-scheme: dark; }
    body { margin:0; min-height:100dvh; display:grid; place-items:center; background:#070b14; color:#f1f5f9;
      font-family: ui-sans-serif, system-ui, Segoe UI, Roboto, Helvetica, Arial, sans-serif; }
    form { width:min(92vw, 360px); background:#141c2e; border:1px solid rgba(148,163,184,.16); border-radius:16px; padding:22px; }
    h1 { margin:0 0 8px; font-size:1.35rem; }
    p { color:#94a3b8; line-height:1.45; }
    input { width:100%; box-sizing:border-box; margin:12px 0; padding:12px; border-radius:12px; border:1px solid rgba(148,163,184,.28);
      background:#0c1220; color:#f1f5f9; font:inherit; }
    button { width:100%; min-height:48px; border:0; border-radius:12px; background:#0ea5e9; color:#062033; font-weight:800; }
    .err { color:#f87171; }
  </style>
</head>
<body>
  <form method="post" action="/auth/login" autocomplete="current-password">
    <h1>SEC+ Study</h1>
    <p>This study site is private. Enter the site password to continue.</p>
    ${err}
    <label>Password<input type="password" name="password" required autofocus></label>
    <button type="submit">Unlock</button>
  </form>
</body>
</html>`;
}

function noStore(headers) {
  headers.set("Cache-Control", "no-store, max-age=0");
  headers.set("Pragma", "no-cache");
  headers.set("X-Robots-Tag", "noindex, nofollow");
  return headers;
}

export async function onRequest(context) {
  const { request, env, next } = context;
  const url = new URL(request.url);
  const secure = url.protocol === "https:";
  const password = env.SITE_PASSWORD || "";
  const secret = env.SESSION_SECRET || "";

  if (url.pathname === "/auth/logout" && request.method === "POST") {
    return new Response("ok", {
      status: 200,
      headers: noStore(new Headers({
        "Set-Cookie": cookieHeader("deleted", secure, 0),
        "Content-Type": "text/plain; charset=utf-8"
      }))
    });
  }

  if (url.pathname === "/auth/login" && request.method === "POST") {
    let submitted = "";
    const ctype = request.headers.get("content-type") || "";
    if (ctype.indexOf("application/json") !== -1) {
      const body = await request.json().catch(function () { return {}; });
      submitted = String(body.password || "");
    } else {
      const form = await request.formData();
      submitted = String(form.get("password") || "");
    }
    if (!password || !secret || !timingSafeEqual(submitted, password)) {
      return new Response(loginPage(true), {
        status: 401,
        headers: noStore(new Headers({ "Content-Type": "text/html; charset=utf-8" }))
      });
    }
    const exp = Math.floor(Date.now() / 1000) + TTL_SEC;
    const stamp = await passwordStamp(password);
    const payload = "v1." + exp + "." + stamp;
    const token = payload + "." + await sign(secret, payload);
    return new Response(null, {
      status: 303,
      headers: noStore(new Headers({
        Location: "/",
        "Set-Cookie": cookieHeader(token, secure, TTL_SEC)
      }))
    });
  }

  const session = await readSession(request, secret, password);
  if (!session) {
    return new Response(loginPage(false), {
      status: 401,
      headers: noStore(new Headers({ "Content-Type": "text/html; charset=utf-8" }))
    });
  }

  const response = await next();
  const headers = new Headers(response.headers);
  if (url.pathname.indexOf("/data/") !== -1 || url.pathname.indexOf("/private-data/") !== -1) {
    headers.set("Cache-Control", "private, no-store");
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: headers
  });
}
