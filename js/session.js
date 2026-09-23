/**
 * Client helper for the hosting-layer session.
 * Does not contain the site password or any hash of it.
 */
var SiteSession = (function () {
  function lock() {
    return fetch("/auth/logout", {
      method: "POST",
      credentials: "same-origin"
    }).catch(function () {
      return null;
    }).then(function () {
      const jobs = [];
      if (navigator.serviceWorker) {
        jobs.push(navigator.serviceWorker.getRegistrations().then(function (regs) {
          return Promise.all(regs.map(function (reg) { return reg.unregister(); }));
        }));
      }
      if (window.caches) {
        jobs.push(caches.keys().then(function (keys) {
          return Promise.all(keys.map(function (key) { return caches.delete(key); }));
        }));
      }
      return Promise.all(jobs);
    }).then(function () {
      window.location.replace("/");
    });
  }

  return { lock: lock };
})();
