// Moma service worker: the app shell (/app/) works offline; AI and admin calls always go to the network.
const CACHE = 'moma-v3';
self.addEventListener('install', e => { self.skipWaiting(); e.waitUntil(caches.open(CACHE).then(c => c.addAll(['/app/', '/manifest.json', '/icons/icon-192.png']))); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin || u.pathname.startsWith('/api/') || u.pathname.startsWith('/admin')) return;
  if (e.request.mode === 'navigate') {
    const app = u.pathname === '/app' || u.pathname.startsWith('/app/');
    e.respondWith(fetch(e.request).then(r => { if (r.ok && app) { const cp = r.clone(); caches.open(CACHE).then(c => c.put('/app/', cp)); } return r; })
      .catch(() => caches.match(app ? '/app/' : e.request).then(h => h || caches.match('/app/'))));
    return;
  }
  e.respondWith(caches.match(e.request).then(hit => hit || fetch(e.request).then(r => { if (r.ok) { const cp = r.clone(); caches.open(CACHE).then(c => c.put(e.request, cp)); } return r; })));
});

// Push notifications: the push carries no content, so fetch this phone's unread messages and show them.
self.addEventListener('push', e => {
  e.waitUntil((async () => {
    let items = [];
    try {
      const sub = await self.registration.pushManager.getSubscription();
      const r = await fetch('/api/push?a=inbox', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ endpoint: sub ? sub.endpoint : '' }) });
      items = (await r.json()).items || [];
    } catch (err) {}
    if (!items.length) items = [{ id: 'x', title: 'Moma', body: 'You have a new update.', url: '/app/' }];
    for (const m of items) await self.registration.showNotification(m.title, { body: m.body, icon: '/icons/icon-192.png', badge: '/icons/icon-192.png', tag: 'moma-' + m.id, data: { url: m.url || '/app/' } });
  })());
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = new URL((e.notification.data && e.notification.data.url) || '/app/', self.location.origin).href;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cs => {
    const c = cs.find(x => x.url.startsWith(self.location.origin + '/app'));
    if (c) { c.navigate(url).catch(() => {}); return c.focus(); }
    return self.clients.openWindow(url);
  }));
});
