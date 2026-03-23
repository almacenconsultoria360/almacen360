self.addEventListener('push', function(event) {
    const data = event.data.json();
    const options = {
        body: data.body,
        icon: data.icon || 'assets/img/logo360.png',
        badge: data.badge || 'assets/img/logo360.png',
        vibrate: [200, 100, 200]
    };
    event.waitUntil(self.registration.showNotification(data.title, options));
});

self.addEventListener('notificationclick', function(event) {
    event.notification.close();
    event.waitUntil(clients.openWindow('/')); // Abre el sistema al tocar la notificación
});
