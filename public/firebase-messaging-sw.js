importScripts('https://www.gstatic.com/firebasejs/11.10.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/11.10.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyBEN7Sn5kkH4mcnXO0zqaQqvWK5oObzc_A',
  authDomain: 'kaoukabi-c5ad9.firebaseapp.com',
  projectId: 'kaoukabi-c5ad9',
  storageBucket: 'kaoukabi-c5ad9.firebasestorage.app',
  messagingSenderId: '844569229301',
  appId: '1:844569229301:web:162cc5f9b06325446892bc'
});
const messaging = firebase.messaging();
messaging.onBackgroundMessage(payload => {
  const title = payload.notification?.title || 'KAOUKABI';
  const options = {
    body: payload.notification?.body || 'You have a new update.',
    icon: '/kaoukabi-logo.webp',
    badge: '/kaoukabi-logo.webp',
    data: { url: payload.fcmOptions?.link || payload.data?.url || '/' }
  };
  self.registration.showNotification(title, options);
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const target = event.notification.data?.url || '/';
  event.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windows => {
    for (const client of windows) {
      if ('focus' in client) { client.navigate(target); return client.focus(); }
    }
    return clients.openWindow(target);
  }));
});
