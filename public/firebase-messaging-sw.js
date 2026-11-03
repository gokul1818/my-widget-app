/* eslint-disable no-restricted-globals */
/**
 * Firebase Cloud Messaging Service Worker
 * Handles background push notifications when the browser or tab is inactive or closed.
 */

// Try loading Firebase compat scripts if network is available
try {
  self.importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
  self.importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');
} catch {
  // If offline or scripts unreachable, native push event listener below will handle push messages
}

// Check if Firebase was loaded and initialize if config provided
if (typeof firebase !== 'undefined' && firebase.apps && firebase.apps.length === 0) {
  try {
    const urlParams = new URL(self.location.href).searchParams;
    const apiKey = urlParams.get('apiKey');
    const projectId = urlParams.get('projectId');
    const messagingSenderId = urlParams.get('messagingSenderId');
    const appId = urlParams.get('appId');

    if (apiKey && projectId) {
      firebase.initializeApp({
        apiKey,
        projectId,
        messagingSenderId,
        appId,
      });
      const messaging = firebase.messaging();
      messaging.onBackgroundMessage((payload) => {
        const title = payload.notification?.title || payload.data?.title || '🏢 Office Roster Update';
        const options = {
          body: payload.notification?.body || payload.data?.body || 'A team member updated their attendance status.',
          icon: payload.notification?.icon || payload.data?.icon || '/favicon.svg',
          badge: '/favicon.svg',
          tag: payload.data?.tag || 'office-attendance-update',
          renotify: true,
          data: {
            url: payload.data?.url || '/',
            ...payload.data,
          },
        };
        return self.registration.showNotification(title, options);
      });
    }
  } catch (err) {
    console.warn('[firebase-messaging-sw] Background init error:', err);
  }
}

// Fallback & Universal Native Web Push Event Listener
self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch {
      data = {
        notification: {
          title: '🏢 Office Roster Update',
          body: event.data.text(),
        },
      };
    }
  }

  const notification = data.notification || {};
  const customData = data.data || {};

  const title = notification.title || customData.title || '🏢 Office Attendance Update';
  const options = {
    body: notification.body || customData.body || 'A team member changed their attendance status.',
    icon: notification.icon || customData.icon || '/favicon.svg',
    badge: '/favicon.svg',
    tag: customData.tag || 'office-attendance-status',
    renotify: true,
    vibrate: [200, 100, 200],
    data: {
      url: customData.url || '/',
      timestamp: Date.now(),
      ...customData,
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Handle clicking on the push notification banner
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Focus already open window if present
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise open new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
      return null;
    })
  );
});

// Activate immediately when updated
self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});
