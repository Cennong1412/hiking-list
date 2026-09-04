// 캐시 버전을 올리면 이전 캐시가 자동으로 정리됩니다.
const CACHE_NAME = "hiking-list-v7";

const CORE_ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./domestic_courses_all.json",
  "./international_courses_all.json",
  "./golf_courses_all.json",
  "./restaurants_all.json",
  "./photos/manifest.json",
  "./photos/notes.json",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// 네트워크 우선(최신 데이터 반영) + 실패 시 캐시 폴백, 성공 응답은 캐시에 갱신 저장
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;

  event.respondWith(
    fetch(req, { cache: "no-store" })
      .then((res) => {
        const clone = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
        return res;
      })
      .catch(() => caches.match(req).then((cached) => cached || caches.match("./index.html")))
  );
});
