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

if (isFirebaseConfigured) {
  firebase.initializeApp(firebaseConfig);

  const messaging = firebase.messaging();

  messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Received background message ', payload);
    
    const notificationTitle = payload.notification.title;
    const notificationOptions = {
      body: payload.notification.body,
      icon: '/vite.svg',
      badge: '/vite.svg',
    };

    // Опционально: можно тут же обновить счетчик PWA
    if ('setAppBadge' in navigator) {
      // navigator.setAppBadge(1) // логика для счетчика
    }

    self.registration.showNotification(notificationTitle, notificationOptions);
  });
}
