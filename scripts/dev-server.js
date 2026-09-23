/**
 * Local password gate that matches production Cloudflare middleware.
 * Reads SITE_PASSWORD and SESSION_SECRET from .dev.vars (never commit that file).
 *
 *   copy .dev.vars.example .dev.vars
 *   node scripts/dev-server.js
 */
const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { URL } = require("url");

const ROOT = path.join(__dirname, "..");
const PORT = Number(process.env.PORT) || 8788;
const COOKIE = "secplus_session";
const TTL_SEC = 30 * 24 * 60 * 60;

function readDevVars() {
  const file = path.join(ROOT, ".dev.vars");
  const env = {};
  if (!fs.existsSync(file)) {
    return env;
  }
  fs.readFileSync(file, "utf8").split(/\r?\n/).forEach(function (line) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.charAt(0) === "#") {
      return;
    }
    const idx = trimmed.indexOf("=");
    if (idx === -1) {
      return;
    }
    env[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim();
  });
  return env;
}

const VARS = Object.assign(readDevVars(), process.env);
const PASSWORD = VARS.SITE_PASSWORD || "";
const SECRET = VARS.SESSION_SECRET || "";

function timingSafeEqual(a, b) {
  const left = Buffer.from(String(a || ""), "utf8");
  const right = Buffer.from(String(b || ""), "utf8");
  if (left.length !== right.length) {
    crypto.timingSafeEqual(left, left);
    return false;
  }
  return crypto.timingSafeEqual(left, right);
}

function sign(payload) {
  return crypto.createHmac("sha256", SECRET).update(payload).digest("hex");
}

function passwordStamp() {
  return crypto.createHash("sha256").update(String(PASSWORD)).digest("hex").slice(0, 16);
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

function validSession(req) {
  const raw = parseCookies(req.headers.cookie)[COOKIE];
  if (!raw || !SECRET) {
    return false;
  }
  const bits = raw.split(".");
  if (bits.length !== 4 || bits[0] !== "v1") {
    return false;
  }
  const exp = Number(bits[1]);
  if (!exp || exp * 1000 < Date.now()) {
    return false;
  }
  if (!timingSafeEqual(bits[2], passwordStamp())) {
    return false;
  }
  const payload = "v1." + bits[1] + "." + bits[2];
  return timingSafeEqual(sign(payload), bits[3]);
}

function cookie(value, maxAge) {
  return COOKIE + "=" + value + "; Path=/; HttpOnly; SameSite=Lax; Max-Age=" + maxAge;
}

function loginPage(error) {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>SEC+ Study — Locked</title>
<style>:root{color-scheme:dark}body{margin:0;min-height:100dvh;display:grid;place-items:center;background:#070b14;color:#f1f5f9;font-family:ui-sans-serif,system-ui,Segoe UI,Roboto,Helvetica,Arial,sans-serif}
form{width:min(92vw,360px);background:#141c2e;border:1px solid rgba(148,163,184,.16);border-radius:16px;padding:22px}h1{margin:0 0 8px;font-size:1.35rem}p{color:#94a3b8}
input{width:100%;box-sizing:border-box;margin:12px 0;padding:12px;border-radius:12px;border:1px solid rgba(148,163,184,.28);background:#0c1220;color:#f1f5f9;font:inherit}
button{width:100%;min-height:48px;border:0;border-radius:12px;background:#0ea5e9;color:#062033;font-weight:800}.err{color:#f87171}</style></head>
<body><form method="post" action="/auth/login"><h1>SEC+ Study</h1><p>This study site is private. Enter the site password to continue.</p>
${error ? "<p class=err>Incorrect password. Nothing on this site is available without the correct password.</p>" : ""}
<label>Password<input type="password" name="password" required autofocus></label><button type="submit">Unlock</button></form></body></html>`;
}

function mime(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return ({
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".json": "application/json",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".webmanifest": "application/manifest+json"
  })[ext] || "application/octet-stream";
}

function send(res, status, headers, body) {
  headers["Cache-Control"] = headers["Cache-Control"] || "no-store";
  res.writeHead(status, headers);
  res.end(body);
}

function serveStatic(req, res) {
  let urlPath = decodeURIComponent(new URL(req.url, "http://127.0.0.1").pathname);
  if (urlPath === "/") {
    urlPath = "/index.html";
  }
  const safe = path.normalize(urlPath).replace(/^(\.\.[/\\])+/, "");
  const filePath = path.join(ROOT, safe);
  if (!filePath.startsWith(ROOT)) {
    send(res, 403, { "Content-Type": "text/plain" }, "Forbidden");
    return;
  }
  fs.readFile(filePath, function (err, data) {
    if (err) {
      send(res, 404, { "Content-Type": "text/plain" }, "Not found");
      return;
    }
    const headers = { "Content-Type": mime(filePath) };
    if (filePath.indexOf("data" + path.sep) !== -1 || filePath.indexOf("private-data") !== -1) {
      headers["Cache-Control"] = "private, no-store";
    }
    send(res, 200, headers, data);
  });
}

function readBody(req) {
  return new Promise(function (resolve) {
    const chunks = [];
    req.on("data", function (c) { chunks.push(c); });
    req.on("end", function () { resolve(Buffer.concat(chunks).toString("utf8")); });
  });
}

const server = http.createServer(async function (req, res) {
  const url = new URL(req.url, "http://127.0.0.1");
  if (url.pathname === "/auth/logout" && req.method === "POST") {
    send(res, 200, { "Set-Cookie": cookie("deleted", 0), "Content-Type": "text/plain" }, "ok");
    return;
  }
  if (url.pathname === "/auth/login" && req.method === "POST") {
    const raw = await readBody(req);
    let submitted = "";
    if ((req.headers["content-type"] || "").indexOf("application/json") !== -1) {
      try { submitted = String(JSON.parse(raw).password || ""); } catch (err) { submitted = ""; }
    } else {
      submitted = String(new URLSearchParams(raw).get("password") || "");
    }
    if (!PASSWORD || !SECRET || !timingSafeEqual(submitted, PASSWORD)) {
      send(res, 401, { "Content-Type": "text/html; charset=utf-8" }, loginPage(true));
      return;
    }
    const exp = Math.floor(Date.now() / 1000) + TTL_SEC;
    const payload = "v1." + exp + "." + passwordStamp();
    send(res, 303, { Location: "/", "Set-Cookie": cookie(payload + "." + sign(payload), TTL_SEC) }, "");
    return;
  }
  if (!validSession(req)) {
    send(res, 401, { "Content-Type": "text/html; charset=utf-8" }, loginPage(false));
    return;
  }
  serveStatic(req, res);
});

if (!PASSWORD || !SECRET) {
  console.error("Create .dev.vars from .dev.vars.example and set SITE_PASSWORD and SESSION_SECRET.");
  process.exit(1);
}

server.listen(PORT, "127.0.0.1", function () {
  console.log("Private study app: http://127.0.0.1:" + PORT + "/");
});
