// Controle Financeiro — Service Worker
const CACHE = 'cf-v1';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(clients.claim()));

// Handle server-sent push events (future use)
self.addEventListener('push', function (e) {
  const data = e.data ? e.data.json() : {};
  e.waitUntil(
    self.registration.showNotification(data.title || 'Controle Financeiro', {
      body: data.body || 'Você tem dados financeiros para revisar!',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      data: { url: data.url || '/dashboard' },
      requireInteraction: false,
    })
  );
});

// Open the app when notification is clicked
self.addEventListener('notificationclick', function (e) {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      const existing = list.find(c => c.url.includes('/dashboard') && 'focus' in c);
      if (existing) return existing.focus();
      return clients.openWindow(e.notification.data?.url || '/dashboard');
    })
  );
});

// Triggered by the main thread when it's time to show a scheduled notification
self.addEventListener('message', function (e) {
  if (e.data?.type === 'SHOW_REMINDER') {
    self.registration.showNotification('Controle Financeiro', {
      body: e.data.body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      data: { url: '/dashboard' },
      requireInteraction: false,
    });
  }
});
