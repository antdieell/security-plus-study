/**
 * THE ONLY PLACE TO SET THE SITE PASSWORD.
 *
 * Store the SHA-256 hex digest of your password. Do not put the password itself here.
 *
 * Generate a new hash:
 *   node -e "console.log(require('crypto').createHash('sha256').update('YOUR_PASSWORD','utf8').digest('hex'))"
 *
 * Then replace SITE_LOCK.hash below, commit, and push to GitHub Pages.
 *
 * This is a casual gate for a personal study site on static hosting.
 * It is not server-side security. Anyone can download deployed files.
 */
var SITE_LOCK = {
  hash: "ea3080ac2bedca6fc93944cd404eda22c506abf601b8d944caa07f8fb1a8aa58"
};
