// ================================================
// AI Tools Daily — Service Worker v2
// 오프라인 캐싱 + 푸시 알림 + 캐시 전략 분리
// ================================================

const CACHE_VERSION = 'ai-tools-daily-v2';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const DYNAMIC_CACHE = `${CACHE_VERSION}-dynamic`;

// 프리캐시: 앱 셸 리소스 (오프라인에서 반드시 필요한 것들)
const PRECACHE_ASSETS = [
  '/',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

// API/외부 요청은 캐시하지 않음
const NO_CACHE_PATTERNS = [
  /\/api\//,
  /supabase/,
  /analytics/,
  /chrome-extension/,
];

// ---- 설치: 프리캐시 ----
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE_ASSETS))
  );
  self.skipWaiting();
});

// ---- 활성화: 이전 버전 캐시 삭제 ----
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== STATIC_CACHE && key !== DYNAMIC_CACHE)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// ---- Fetch: 전략 분리 ----
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // GET 요청만 캐시
  if (request.method !== 'GET') return;

  // 캐시 제외 패턴 (API, 외부 서비스)
  if (NO_CACHE_PATTERNS.some((p) => p.test(url.href))) return;

  // 페이지 네비게이션: Network-first → 캐시 폴백
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(DYNAMIC_CACHE).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match(request).then((r) => r || caches.match('/')))
    );
    return;
  }

  // 정적 에셋 (JS/CSS/이미지/폰트): Cache-first → 네트워크 폴백
  if (
    url.pathname.match(/\.(js|css|png|jpg|jpeg|svg|gif|webp|woff|woff2)$/) ||
    url.pathname.startsWith('/_next/')
  ) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            const clone = response.clone();
            caches.open(STATIC_CACHE).then((cache) => cache.put(request, clone));
            return response;
          })
      )
    );
    return;
  }

  // 기타: Stale-while-revalidate
  event.respondWith(
    caches.match(request).then((cached) => {
      const freshFetch = fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(DYNAMIC_CACHE).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => cached);

      return cached || freshFetch;
    })
  );
});

// ---- 푸시 알림 수신 ----
self.addEventListener('push', (event) => {
  let data = {
    title: '⚡ AI Tools Daily',
    body: '오늘의 새로운 AI 툴이 도착했습니다!',
    url: '/',
  };

  if (event.data) {
    try {
      data = { ...data, ...event.data.json() };
    } catch {
      data.body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icons/icon-192.png',
      badge: '/icons/badge-72.png',
      data: { url: data.url },
      vibrate: [100, 50, 100],
      tag: 'ai-daily-update',       // 같은 태그 → 기존 알림 교체
      renotify: true,                // 교체 시에도 알림 울림
      actions: [
        { action: 'open', title: '🔍 확인하기' },
        { action: 'dismiss', title: '닫기' },
      ],
    })
  );
});

// ---- 알림 클릭 ----
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') return;

  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      // 이미 열린 탭이 있으면 포커스 + 네비게이션
      for (const client of clients) {
        if (new URL(client.url).origin === self.location.origin) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      // 없으면 새 창 열기
      return self.clients.openWindow(targetUrl);
    })
  );
});

// ---- 주기적 캐시 정리 (7일 이상 된 동적 캐시) ----
self.addEventListener('message', (event) => {
  if (event.data === 'CLEAN_CACHE') {
    caches.open(DYNAMIC_CACHE).then((cache) => {
      cache.keys().then((keys) => {
        if (keys.length > 100) {
          // 가장 오래된 50개 삭제
          keys.slice(0, 50).forEach((key) => cache.delete(key));
        }
      });
    });
  }
});
