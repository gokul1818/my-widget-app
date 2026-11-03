/**
 * Firebase Cloud Messaging & Web Push Notification Service
 * Manages push tokens, service worker registration, and foreground/background push notifications.
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';

const FCM_TOKEN_STORAGE_KEY = 'office_fcm_device_token';

// Safe environment accessor supporting both Vite (import.meta.env) and Node test runner (process.env)
const env =
  typeof import.meta !== 'undefined' && import.meta.env
    ? import.meta.env
    : typeof process !== 'undefined' && process.env
    ? process.env
    : {};

// Firebase Web App Configuration (from .env or Vercel environment variables)
export const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || '',
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: env.VITE_FIREBASE_APP_ID || '',
  measurementId: env.VITE_FIREBASE_MEASUREMENT_ID || '',
};

export const vapidKey = env.VITE_FIREBASE_VAPID_KEY || '';

/**
 * Checks whether Firebase configuration is provided
 */
export function hasFirebaseConfig() {
  return Boolean(
    firebaseConfig.apiKey &&
    firebaseConfig.projectId &&
    firebaseConfig.messagingSenderId
  );
}

/**
 * Initializes Firebase App instance safely (singleton)
 */
export function getFirebaseApp() {
  if (getApps().length > 0) {
    return getApp();
  }
  if (!hasFirebaseConfig()) {
    return null;
  }
  return initializeApp(firebaseConfig);
}

/**
 * Checks if Push Notifications & Service Workers are supported in the current browser
 */
export function isPushSupported() {
  return (
    typeof window !== 'undefined' &&
    'Notification' in window &&
    'serviceWorker' in navigator
  );
}

/**
 * Gets current Notification permission state ('default', 'granted', 'denied', or 'unsupported')
 */
export function getPushPermissionStatus() {
  if (!isPushSupported()) return 'unsupported';
  return Notification.permission;
}

/**
 * Retrieves the currently saved local FCM device token
 */
export function getSavedPushToken() {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(FCM_TOKEN_STORAGE_KEY) || '';
}

/**
 * Saves or updates the local FCM device token
 */
export function savePushToken(token) {
  if (typeof window === 'undefined') return;
  if (token) {
    localStorage.setItem(FCM_TOKEN_STORAGE_KEY, token);
  } else {
    localStorage.removeItem(FCM_TOKEN_STORAGE_KEY);
  }
}

/**
 * Formats a rich push notification payload when an employee changes attendance status
 */
export function formatStatusPushMessage({
  memberName = 'Colleague',
  newStatus = 'office',
  oldStatus = '',
  teamName = 'Team',
  dateStr = 'Tomorrow',
}) {
  const statusLabel =
    newStatus === 'office' ? 'Office' :
    newStatus === 'wfh' ? 'WFH (Home)' :
    'On Leave';
  const statusEmoji = newStatus === 'office' ? '🏢' : newStatus === 'wfh' ? '🏠' : '🌴';

  const title = `${statusEmoji} ${memberName} is ${statusLabel} (${dateStr})`;
  const body = oldStatus && oldStatus !== newStatus
    ? `${memberName} changed attendance in ${teamName} from ${oldStatus} to ${statusLabel} for ${dateStr}.`
    : `${memberName} checked in as ${statusLabel} in ${teamName} for ${dateStr}.`;

  return {
    title,
    body,
    icon: '/favicon.svg',
    tag: `status-${memberName.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`,
    data: {
      teamName,
      memberName,
      newStatus,
      oldStatus,
      dateStr,
      url: '/',
    },
  };
}

/**
 * Displays a local browser notification immediately (if permission is granted)
 */
export async function showLocalWebNotification({ title, body, icon = '/favicon.svg', data = {} }) {
  if (!isPushSupported() || Notification.permission !== 'granted') {
    return false;
  }

  try {
    // If Service Worker is ready, show via registration for full background badge & action support
    if (navigator.serviceWorker && navigator.serviceWorker.ready) {
      const reg = await navigator.serviceWorker.ready;
      await reg.showNotification(title, {
        body,
        icon,
        badge: '/favicon.svg',
        vibrate: [200, 100, 200],
        tag: data.tag || 'office-local-alert',
        renotify: true,
        data: {
          url: '/',
          ...data,
        },
      });
      return true;
    }

    // Direct Notification fallback
    new Notification(title, {
      body,
      icon,
      badge: '/favicon.svg',
      data,
    });
    return true;
  } catch (err) {
    console.warn('Local web notification error:', err);
    return false;
  }
}

let pendingPermissionPromise = null;

/**
 * Requests push notification permission and retrieves the FCM registration token.
 * Prevents concurrent redundant browser prompts if invoked multiple times on load.
 */
export async function requestPushPermissionAndGetToken() {
  if (pendingPermissionPromise) {
    return pendingPermissionPromise;
  }

  pendingPermissionPromise = (async () => {
    if (!isPushSupported()) {
      return {
        permission: 'unsupported',
        token: null,
        error: 'Push notifications are not supported in this browser.',
      };
    }

    // 1. Request permission directly from user browser prompt
    let permission;
    try {
      permission = await Notification.requestPermission();
    } catch {
      // Legacy callback support fallback
      permission = await new Promise((resolve) => {
        Notification.requestPermission(resolve);
      });
    }

    if (permission !== 'granted') {
      return {
        permission,
        token: null,
        error: 'Notification permission was denied or dismissed.',
      };
    }

    // 2. Register Service Worker with query params for background push compatibility
    let swRegistration = null;
    try {
      const swUrl = hasFirebaseConfig()
        ? `/firebase-messaging-sw.js?apiKey=${encodeURIComponent(firebaseConfig.apiKey)}&projectId=${encodeURIComponent(firebaseConfig.projectId)}&messagingSenderId=${encodeURIComponent(firebaseConfig.messagingSenderId)}&appId=${encodeURIComponent(firebaseConfig.appId)}`
        : '/firebase-messaging-sw.js';

      swRegistration = await navigator.serviceWorker.register(swUrl, { scope: '/' });
      await navigator.serviceWorker.ready;
    } catch (swErr) {
      console.warn('[FCM] Service worker registration error:', swErr);
    }

    // 3. If Firebase config is available and messaging is supported, retrieve official FCM token
    let token = null;
    try {
      const supported = await isSupported();
      if (supported && hasFirebaseConfig()) {
        const app = getFirebaseApp();
        const messaging = getMessaging(app);

        token = await getToken(messaging, {
          vapidKey: vapidKey || undefined,
          serviceWorkerRegistration: swRegistration || undefined,
        });
      }
    } catch (fcmErr) {
      console.warn('[FCM] Error obtaining Firebase token:', fcmErr);
    }

    // 4. Fallback: If no Firebase config is present yet (e.g. dev/local preview), generate a persistent local token
    if (!token) {
      const existing = getSavedPushToken();
      token = existing || `web_fcm_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
    }

    savePushToken(token);

    return {
      permission: 'granted',
      token,
      isRealFCM: Boolean(hasFirebaseConfig()),
    };
  })();

  try {
    return await pendingPermissionPromise;
  } finally {
    pendingPermissionPromise = null;
  }
}

/**
 * Sets up a listener for foreground push notifications
 */
export function listenForegroundMessages(onMessageReceived) {
  if (!isPushSupported()) return () => {};

  let unsubscribeFCM = () => {};

  // 1. Hook Firebase onMessage if available
  try {
    isSupported().then((supported) => {
      if (supported && hasFirebaseConfig()) {
        const app = getFirebaseApp();
        if (app) {
          const messaging = getMessaging(app);
          unsubscribeFCM = onMessage(messaging, (payload) => {
            const formatted = {
              title: payload.notification?.title || payload.data?.title || 'Office Status Update',
              body: payload.notification?.body || payload.data?.body || '',
              data: payload.data || {},
            };
            // Also trigger local web notification if tab is in background or active
            showLocalWebNotification(formatted);
            onMessageReceived?.(formatted);
          });
        }
      }
    });
  } catch (err) {
    console.warn('Foreground FCM listener error:', err);
  }

  // 2. Also listen for Service Worker messages
  const onSwMessage = (event) => {
    if (event.data && event.data.type === 'FCM_PUSH_RECEIVED') {
      onMessageReceived?.(event.data.payload);
    }
  };

  if (navigator.serviceWorker) {
    navigator.serviceWorker.addEventListener('message', onSwMessage);
  }

  return () => {
    unsubscribeFCM();
    if (navigator.serviceWorker) {
      navigator.serviceWorker.removeEventListener('message', onSwMessage);
    }
  };
}
