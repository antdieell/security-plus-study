# Hosting: GitHub Pages + a casual password gate

This is a **static** site. Deploy with:

```powershell
git add .
git commit -m "your message"
git push
```

GitHub Pages serves it from:

`https://antdieell.github.io/security-plus-study/`

No Cloudflare. No Supabase. No extra hosting account. No Node server after deploy. Local preview is optional (`python -m http.server` or open `index.html`).

## This is not secure storage

GitHub Pages is static hosting. The password screen stops casual visitors. It does **not** stop someone technical from downloading or inspecting deployed files, including JavaScript, the question bank, and the password hash.

Do not treat this as a vault for purchased Professor Messer PDFs or other licensed material. Keep purchased imports gitignored (`private-data/messer-questions.json`) and do not commit them.

## How to set your password

The **only** configuration file is `js/site-lock-config.js`.

1. Choose a password. Do not put that password in the file.
2. Make a SHA-256 hex hash:

```powershell
node -e "console.log(require('crypto').createHash('sha256').update('YOUR_PASSWORD','utf8').digest('hex'))"
```

3. Paste the hex into `SITE_LOCK.hash` in `js/site-lock-config.js`.
4. Commit and push.

The repository ships with a hash for the temporary password `change-me`. Replace that hash before you rely on the site.

Unlock state is a token in `sessionStorage` (this visit) or `localStorage` if **Remember this device** is checked. The entered password is not stored. Changing the hash locks old devices.

## Lock

The header **Lock** button (also in Settings) clears the unlock token and returns to the password screen.
