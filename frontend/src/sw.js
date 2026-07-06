import { precacheAndRoute } from 'workbox-precaching';

// Precaching routes injected by vite-plugin-pwa
precacheAndRoute(self.__WB_MANIFEST || []);

// Handle push notification event
self.addEventListener('push', (event) => {
  let data = {
    title: 'Portail Terrain',
    body: 'Nouvelle notification d\'intervention.',
    data: { url: '/' }
  };

  if (event.data) {
    try {
      data = event.data.json();
    } catch (err) {
      data = {
        title: 'Portail Terrain',
        body: event.data.text(),
        data: { url: '/' }
      };
    }
  }

  const options = {
    body: data.body,
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-72.png',
    vibrate: [100, 50, 100],
    data: data.data || {},
    actions: [
      { action: 'open', title: 'Ouvrir' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Handle notification click event
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Check if there is already a window open with this app
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url.includes(urlToOpen) && 'focus' in client) {
          return client.focus();
        }
      }
      // If not open, open a new window
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
