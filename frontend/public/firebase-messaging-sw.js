// Firebase Cloud Messaging Service Worker
// Place this at: public/firebase-messaging-sw.js
// This runs in the background to handle push notifications when the app is closed

importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

// Replace these with your actual Firebase config values
firebase.initializeApp({
  apiKey:            self.FIREBASE_API_KEY            || 'YOUR_API_KEY',
  authDomain:        self.FIREBASE_AUTH_DOMAIN        || 'YOUR_PROJECT.firebaseapp.com',
  projectId:         self.FIREBASE_PROJECT_ID         || 'YOUR_PROJECT_ID',
  storageBucket:     self.FIREBASE_STORAGE_BUCKET     || 'YOUR_PROJECT.appspot.com',
  messagingSenderId: self.FIREBASE_MESSAGING_SENDER_ID || 'YOUR_SENDER_ID',
  appId:             self.FIREBASE_APP_ID             || 'YOUR_APP_ID',
});

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[FCM SW] Background message:', payload);

  const { title, body, icon, data } = payload.notification || {};

  self.registration.showNotification(title || '🚨 Arogya Raksha Alert', {
    body:  body  || 'Emergency alert received',
    icon:  icon  || '/icon-192.png',
    badge: '/icon-192.png',
    tag:   data?.incidentId || 'arogya-alert',
    data:  data,
    actions: [
      { action: 'view',    title: '👁️ View Alert' },
      { action: 'dismiss', title: '✖️ Dismiss' },
    ],
    requireInteraction: true, // keeps notification visible until user acts
    vibrate: [200, 100, 200, 100, 200], // SOS pattern
  });
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'view' || !event.action) {
    const url = event.notification.data?.url || '/hospital/portal';
    event.waitUntil(clients.openWindow(url));
  }
});
