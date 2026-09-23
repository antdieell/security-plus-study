const CACHE_NAME = "secplus-study-v16";
const ASSETS = [
  "./",
  "./index.html",
  "./css/styles.css",
  "./js/site-lock-config.js",
  "./js/site-lock.js",
  "./js/utils.js",
  "./js/storage.js",
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
  const isNavigate = event.request.mode === "navigate" || url.pathname === "/" || url.pathname.endsWith("/") || url.pathname.endsWith(".html");
  const isCode = /\.(js|css)$/.test(url.pathname) || url.pathname.indexOf("/data/") !== -1;
  if (isNavigate || isCode) {
    event.respondWith(
      fetch(event.request).then(function (response) {
        const copy = response.clone();
        caches.open(CACHE_NAME).then(function (cache) {
          cache.put(event.request, copy);
        });
        return response;
      }).catch(function () {
        return matchCached(event.request).then(function (cached) {
          return cached || caches.match("./index.html");
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
        const copy = response.clone();
        caches.open(CACHE_NAME).then(function (cache) {
          cache.put(event.request, copy);
        });
        return response;
      }).catch(function () {
        return caches.match("./index.html");
      });
    })
  );
});
