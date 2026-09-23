# Single-password private hosting

The study app is no longer meant to sit open on GitHub Pages. GitHub can stay the source repo. The live site is a **Cloudflare Pages** project with a Function that blocks every request until the site password is accepted.

## Why this host

- One password, no email, no username, no signup
- Home PC can be off — Cloudflare serves the site
- Free for a single-user study app
- The gate runs on the server, not in public JavaScript
- HttpOnly session cookie after a correct password

## 1. Create a Cloudflare account

1. Open [https://dash.cloudflare.com/sign-up](https://dash.cloudflare.com/sign-up)
2. Create a free account
3. In **Workers & Pages**, create a **Pages** project connected to this GitHub repo, or deploy from your computer with Wrangler

## 2. Set secrets (never put these in Git)

Pages → project → **Settings → Environment variables** (Production):

| Name | Value |
| --- | --- |
| `SITE_PASSWORD` | the one site password |
| `SESSION_SECRET` | a long random string (password manager or `openssl rand -hex 32`) |

Encrypt / hide both.

## 3. Local test

```powershell
copy .dev.vars.example .dev.vars
```

Edit `.dev.vars` with a temporary password and session secret.

```powershell
node scripts/dev-server.js
```

Open `http://127.0.0.1:8788/`. A wrong password must not show the app. A correct password unlocks it and sets a cookie.

## 4. Add purchased Messer data later

1. Build `private-data/messer-questions.json` from your purchased material
2. Keep that file gitignored
3. Deploy a copy of the project **including** `private-data/` with Wrangler (`npx wrangler pages deploy .`) so Cloudflare has the file even though Git does not

Until that file exists, the UI uses fake placeholders only.

Do not connect GitHub Pages to this repo as the public site. After Cloudflare is live, treat that URL as the only place the app is reachable.

## 5. GitHub Pages

Do not use GitHub Pages as the live site. It cannot keep this password gate or the private files off the internet.
