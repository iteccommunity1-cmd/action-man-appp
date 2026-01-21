self.addEventListener('push', function(event) {
  const data = event.data.json();
  const title = data.title || 'New Notification';
  const options = {
    body: data.body || 'You have a new notification.',
    icon: data.icon || '/favicon.ico', // Use your app's favicon or a custom icon
    badge: data.badge || '/favicon.ico', // A small icon for notification tray
    data: {
      url: data.url || self.location.origin // URL to open when notification is clicked
    }
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  );
});