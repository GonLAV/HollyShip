self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Simple push handler for future use
self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch {}
  const title = data.title || 'HollyShip';
  const body = data.body || 'You have a delivery update';
  const options = {
    body,
    icon: '/hollyship-icon.svg',
    badge: '/hollyship-icon.svg',
    data: data.data || {},
  };
  event.waitUntil(self.registration.showNotification(title, options));
});
