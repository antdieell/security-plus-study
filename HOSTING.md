# Hosting: GitHub Pages + a casual password gate

This is a **static** site. Deploy with:

```powershell
git add .
git commit -m "your message"
git push
```

GitHub Pages serves it from:

`https://antdieell.github.io/security-plus-study/`

The public app and the Professor Messer JSON both live on GitHub Pages as static files. The Messer bank is `data/messer-questions.json`. Local preview: `python -m http.server`.

## This is not secure storage

GitHub Pages is static hosting. The password screen stops casual visitors. It does **not** stop someone technical from downloading or inspecting deployed files, including JavaScript, the question banks, and the password hash.

Anyone who can fetch the deployed site can also fetch `data/messer-questions.json`. Keep purchased PDFs and work-in-progress copies gitignored under `private-data/`.

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
