// This service worker handles background push notifications.
// Firebase Messaging SDK configures it automatically when getToken() is called.

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = event.notification.data?.FCM_MSG?.data || {};
  const gameId = data.gameId;
  const type = data.type;

  let url = '/lobby';
  if (type === 'turn' && gameId) url = `/game/${gameId}`;
  if (type === 'friend_request') url = '/friends';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (new URL(client.url).pathname === url && 'focus' in client) {
          return client.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});
