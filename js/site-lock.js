/**
 * Client-side password gate for GitHub Pages.
 * Compares SHA-256(entered password) to SITE_LOCK.hash.
 * Does not store the entered password.
 */
var SiteLock = (function () {
  const TOKEN_KEY = "secplus-gate-token";
  const REMEMBER_KEY = "secplus-gate-remember";

  function configuredHash() {
    return String((typeof SITE_LOCK !== "undefined" && SITE_LOCK.hash) || "").trim().toLowerCase();
  }

  function toHex(buffer) {
    return Array.prototype.map.call(new Uint8Array(buffer), function (byte) {
      return byte.toString(16).padStart(2, "0");
    }).join("");
  }

  function sha256Hex(text) {
    if (!window.crypto || !crypto.subtle) {
      return Promise.reject(new Error("Web Crypto is required. Serve the site over http(s), not a file:// page."));
    }
    return crypto.subtle.digest("SHA-256", new TextEncoder().encode(String(text))).then(toHex);
  }

  function hashesMatch(left, right) {
    const a = String(left || "").toLowerCase();
    const b = String(right || "").toLowerCase();
    if (a.length !== b.length || !a.length) {
      return false;
    }
    let diff = 0;
    for (let i = 0; i < a.length; i += 1) {
      diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return diff === 0;
  }

  function readToken(storage) {
    try {
      return storage.getItem(TOKEN_KEY) || "";
    } catch (err) {
      return "";
    }
  }

  function writeToken(storage, value) {
    try {
      if (value) {
        storage.setItem(TOKEN_KEY, value);
      } else {
        storage.removeItem(TOKEN_KEY);
      }
    } catch (err) {}
  }

  function rememberEnabled() {
    try {
      return localStorage.getItem(REMEMBER_KEY) === "1";
    } catch (err) {
      return false;
    }
  }

  function setRememberFlag(on) {
    try {
      if (on) {
        localStorage.setItem(REMEMBER_KEY, "1");
      } else {
        localStorage.removeItem(REMEMBER_KEY);
      }
    } catch (err) {}
  }

  function isUnlocked() {
    const expected = configuredHash();
    if (!expected) {
      return false;
    }
    return hashesMatch(readToken(sessionStorage), expected) || hashesMatch(readToken(localStorage), expected);
  }

  function persistUnlock(remember) {
    const hash = configuredHash();
    writeToken(sessionStorage, hash);
    setRememberFlag(!!remember);
    writeToken(localStorage, remember ? hash : "");
  }

  function setRemember(on) {
    const unlocked = isUnlocked();
    setRememberFlag(!!on);
    if (!unlocked) {
      return;
    }
    persistUnlock(!!on);
  }

  function lock() {
    writeToken(sessionStorage, "");
    writeToken(localStorage, "");
    if (location.hash && location.hash !== "#home") {
      location.hash = "home";
    }
    location.reload();
  }

  function unlock(password, remember) {
    const entered = String(password || "");
    return sha256Hex(entered).then(function (digest) {
      if (!hashesMatch(digest, configuredHash())) {
        return false;
      }
      persistUnlock(!!remember);
      return true;
    });
  }

  function bind(onUnlock) {
    const form = document.getElementById("site-gate-form");
    const input = document.getElementById("site-gate-password");
    const error = document.getElementById("site-gate-error");
    const submit = document.getElementById("site-gate-submit");
    const toggle = document.getElementById("site-gate-toggle");
    const rememberBox = document.getElementById("site-gate-remember");
    if (!form || !input) {
      return;
    }
    if (rememberBox) {
      rememberBox.checked = rememberEnabled();
    }
    if (toggle) {
      toggle.addEventListener("click", function () {
        const hidden = input.type === "password";
        input.type = hidden ? "text" : "password";
        toggle.textContent = hidden ? "Hide" : "Show";
      });
    }
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      if (error) {
        error.hidden = true;
        error.textContent = "";
      }
      if (submit) {
        submit.disabled = true;
        submit.textContent = "Checking…";
      }
      const entered = input.value;
      const remember = !!(rememberBox && rememberBox.checked);
      unlock(entered, remember).then(function (ok) {
        input.value = "";
        if (!ok) {
          if (error) {
            error.hidden = false;
            error.textContent = "Incorrect password.";
          }
          if (submit) {
            submit.disabled = false;
            submit.textContent = "Unlock";
          }
          input.focus();
          return;
        }
        if (typeof onUnlock === "function") {
          onUnlock();
        }
      }).catch(function () {
        if (error) {
          error.hidden = false;
          error.textContent = "Could not check the password in this browser. Open the site over http(s).";
        }
        if (submit) {
          submit.disabled = false;
          submit.textContent = "Unlock";
        }
      });
    });
    input.focus();
  }

  return {
    isUnlocked: isUnlocked,
    unlock: unlock,
    lock: lock,
    bind: bind,
    rememberEnabled: rememberEnabled,
    setRemember: setRemember
  };
})();
