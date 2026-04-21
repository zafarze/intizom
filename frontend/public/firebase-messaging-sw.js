importScripts('https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js');
importScripts('https://www.gstatic.com/firebasejs/8.10.1/firebase-messaging.js');

// SW-скрипт грузится браузером как статика и не видит import.meta.env,
// поэтому конфиг инлайнится здесь. Web-ключи Firebase публичны по дизайну.
const firebaseConfig = {
  apiKey: "AIzaSyDZMDN1u5iufHHlsAQH-12Z0PjoUPNYGS4",
  authDomain: "intizom-school.firebaseapp.com",
  projectId: "intizom-school",
  storageBucket: "intizom-school.firebasestorage.app",
  messagingSenderId: "597088346121",
  appId: "1:597088346121:web:c0e4fdd9f9d832fd3798d8"
};

const isFirebaseConfigured = !!firebaseConfig.apiKey;

// ==========================================
// Badge counter (IndexedDB — переживает kill SW)
// ==========================================
const BADGE_DB = 'intizom-badge';
const BADGE_STORE = 'kv';
const BADGE_KEY = 'count';

function openBadgeDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(BADGE_DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(BADGE_STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function getBadgeCount() {
  try {
    const db = await openBadgeDb();
    return await new Promise((resolve) => {
      const tx = db.transaction(BADGE_STORE, 'readonly');
      const getReq = tx.objectStore(BADGE_STORE).get(BADGE_KEY);
      getReq.onsuccess = () => resolve(getReq.result || 0);
      getReq.onerror = () => resolve(0);
    });
  } catch {
    return 0;
  }
}

async function setBadgeCount(count) {
  try {
    const db = await openBadgeDb();
    return await new Promise((resolve) => {
      const tx = db.transaction(BADGE_STORE, 'readwrite');
      tx.objectStore(BADGE_STORE).put(count, BADGE_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    /* ignore */
  }
}

function applyNativeBadge(count) {
  const nav = self.navigator;
  if (!nav) return;
  if (count > 0) {
    nav.setAppBadge && nav.setAppBadge(count).catch(() => {});
  } else {
    nav.clearAppBadge && nav.clearAppBadge().catch(() => {});
  }
}

// Клиент (страница) шлёт авторитетное значение — перезаписываем счётчик и бейдж.
self.addEventListener('message', (event) => {
  if (!event.data || event.data.type !== 'SET_BADGE') return;
  const count = Math.max(0, Math.floor(event.data.count || 0));
  event.waitUntil((async () => {
    await setBadgeCount(count);
    applyNativeBadge(count);
  })());
});

if (isFirebaseConfigured) {
  firebase.initializeApp(firebaseConfig);

  const messaging = firebase.messaging();

  messaging.onBackgroundMessage((payload) => {
    const notificationTitle = (payload.notification && payload.notification.title) || 'Intizom';
    const notificationOptions = {
      body: (payload.notification && payload.notification.body) || '',
      icon: '/icon-192x192.png',
      badge: '/icon-192x192.png',
    };

    // Инкрементируем бейдж. Если backend прислал data.unread_total —
    // используем его как авторитетное значение.
    const authoritative =
      payload.data && payload.data.unread_total !== undefined
        ? parseInt(payload.data.unread_total, 10)
        : null;

    const updateBadge = (async () => {
      let next;
      if (authoritative !== null && !Number.isNaN(authoritative)) {
        next = Math.max(0, authoritative);
      } else {
        const current = await getBadgeCount();
        next = current + 1;
      }
      await setBadgeCount(next);
      applyNativeBadge(next);
    })();

    // showNotification — Promise, waitUntil держит SW живым до завершения обоих.
    const show = self.registration.showNotification(notificationTitle, notificationOptions);

    // onBackgroundMessage не принимает waitUntil напрямую — выполняем параллельно.
    Promise.all([updateBadge, show]);
  });
}
