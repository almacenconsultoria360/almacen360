// sw.js
self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    console.log('✅ Service Worker de Tres Sesenta Activo');
});

// Escucha las notificaciones enviadas desde el sistema
self.addEventListener('showNotification', function(event) {
    const data = event.data;
    const options = {
        body: data.body,
        icon: 'assets/img/logo.png',
        badge: 'assets/img/logo.png',
        vibrate: [500, 110, 500, 110, 450, 110, 200, 110, 170, 40, 450, 110, 200, 110, 170, 40],
        timestamp: Date.now(),
        data: { url: 'https://tu-url-de-firebase.web.app' }, // Cambia por tu URL real
        tag: 'alerta-stock', // Evita que se amontonen mil notificaciones iguales
        renotify: true
    };

    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

// Al hacer clic en la notificación, abre la app
self.addEventListener('notificationclick', function(event) {
    event.notification.close();
    event.waitUntil(
        clients.openWindow('/')
    );
});