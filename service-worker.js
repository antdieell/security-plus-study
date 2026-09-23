const CACHE_NAME = "secplus-study-v14";
const ASSETS = [
  "./",
  "./index.html",
  "./css/styles.css",
  "./js/utils.js",
  "./js/storage.js",
  "./js/session.js",
  "./js/question-bank.js",
  "./js/pbq-engine.js",
  "./js/explanations.js",
  "./js/coverage.js",
  "./js/analytics.js",
  "./js/adaptive.js",
  "./js/plan.js",
  "./js/study.js",
  "./js/quiz.js",
  "./js/exam.js",
  "./js/flashcards.js",
  "./js/progress.js",
  "./js/pbq.js",
  "./js/drills.js",
  "./js/rapid.js",
  "./js/settings.js",
  "./js/app.js",
  "./data/domains.js",
  "./data/objectives.js",
  "./data/examConfig.js",
  "./data/questions.js",
  "./data/questions-source-v2.js",
  "./data/flashcards.js",
  "./data/studyTopics.js",
  "./data/pbqs.js",
  "./data/pbqs-v3.js",
  "./data/pbq-lab.js",
  "./data/messer-placeholders.js",
  "./data/ports.js",
  "./data/acronyms.js",
  "./manifest.json",
  "./assets/icon.svg",
  "./assets/icon-192.png",
  "./assets/icon-512.png"
];

function matchCached(request) {
  return caches.match(request).then(function (cached) {
    return cached || caches.match(request, { ignoreSearch: true });
  });
}

function isAuthPath(url) {
  return url.pathname.indexOf("/auth/") === 0;
}

function isPrivatePath(url) {
  return url.pathname.indexOf("/private-data/") !== -1;
}

function cacheable(response) {
  if (!response || !response.ok) {
    return false;
  }
  const control = response.headers.get("Cache-Control") || "";
  if (control.indexOf("no-store") !== -1 || control.indexOf("private") !== -1) {
    return false;
  }
  return true;
}

function lockedResponse() {
  return new Response("This study site is locked. Sign in again.", {
    status: 401,
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" }
  });
}

function purgeCaches() {
  return caches.keys().then(function (keys) {
    return Promise.all(keys.map(function (key) { return caches.delete(key); }));
  });
}

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(ASSETS);
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (key) {
        return key !== CACHE_NAME;
      }).map(function (key) {
        return caches.delete(key);
      }));
    }).then(function () {
      return self.clients.claim();
    })
  );
});

self.addEventListener("fetch", function (event) {
  if (event.request.method !== "GET") {
    return;
  }
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) {
    return;
  }
  if (isAuthPath(url) || isPrivatePath(url)) {
    event.respondWith(fetch(event.request, { credentials: "same-origin" }));
    return;
  }
  const isNavigate = event.request.mode === "navigate" || url.pathname === "/" || url.pathname.endsWith("/") || url.pathname.endsWith(".html");
  const isCode = /\.(js|css)$/.test(url.pathname) || url.pathname.indexOf("/data/") !== -1;
  if (isNavigate || isCode) {
    event.respondWith(
      fetch(event.request).then(function (response) {
        if (response && response.status === 401) {
          return purgeCaches().then(function () {
            return response;
          });
        }
        if (cacheable(response)) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(function (cache) {
            cache.put(event.request, copy);
          });
        }
        return response;
      }).catch(function () {
        return matchCached(event.request).then(function (cached) {
          return cached || lockedResponse();
        });
      })
    );
    return;
  }
  event.respondWith(
    matchCached(event.request).then(function (cached) {
      if (cached) {
        return cached;
      }
      return fetch(event.request).then(function (response) {
        if (response && response.status === 401) {
          return purgeCaches().then(function () {
            return response;
          });
        }
        if (cacheable(response)) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(function (cache) {
            cache.put(event.request, copy);
          });
        }
        return response;
      }).catch(function () {
        return lockedResponse();
      });
    })
  );
});
