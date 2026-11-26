/* SMPS service worker — 오프라인에서도 열리게 앱 파일과 폰트를 캐시.
   앱을 새로 배포할 때 아래 버전 문자열만 바꾸면 예전 캐시가 정리됨. */
const VERSION = 'smps-5010f7c0b3';
const SHELL = ['./', 'index.html', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png'];
const FONT_HOSTS = /(^|\.)jsdelivr\.net$|^fonts\.googleapis\.com$|^fonts\.gstatic\.com$/;

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => Promise.all(SHELL.map(u => c.add(u).catch(() => null)))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url), same = url.origin === self.location.origin;
  if (!same && !FONT_HOSTS.test(url.hostname)) return;
  const isShell = same && (req.mode === 'navigate' || /\/(index\.html)?$/.test(url.pathname));
  if (isShell) {
    // 캐시를 먼저 보여주고 뒤에서 새 버전을 받아둔다 → 지하 헬스장에서도 바로 열림
    e.respondWith(caches.open(VERSION).then(async c => {
      const hit = (await c.match(req, { ignoreSearch: true })) || (await c.match('index.html')) || (await c.match('./'));
      const net = fetch(req).then(r => { if (r && r.ok) c.put(req, r.clone()); return r; }).catch(() => null);
      return hit || (await net) || new Response('offline', { status: 503, headers: { 'Content-Type': 'text/plain' } });
    }));
    return;
  }
  e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(r => {
    if (r && (r.ok || r.type === 'opaque')) { const cp = r.clone(); caches.open(VERSION).then(c => c.put(req, cp)); }
    return r;
  })));
});
