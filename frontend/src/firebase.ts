// frontend/src/firebase.ts
import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import api from './api/axios';

// Используем переменные окружения для конфигурации Firebase (см. .env файлы)
const firebaseConfig = {
	apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "YOUR_API_KEY",
	authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "YOUR_AUTH_DOMAIN",
	projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "YOUR_PROJECT_ID",
	storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "YOUR_STORAGE_BUCKET",
	messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "YOUR_MESSAGING_SENDER_ID",
	appId: import.meta.env.VITE_FIREBASE_APP_ID || "YOUR_APP_ID"
};

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY || "YOUR_VAPID_KEY";

const isFirebaseConfigured = firebaseConfig.apiKey !== "YOUR_API_KEY" && VAPID_KEY !== "YOUR_VAPID_KEY";

import type { Messaging } from 'firebase/messaging';

let app;
let messaging: Messaging | null = null;

if (isFirebaseConfigured) {
	app = initializeApp(firebaseConfig);
	messaging = getMessaging(app);
}

export const requestFirebaseNotificationPermission = async () => {
	if (!isFirebaseConfigured || !messaging) {
		console.warn('Firebase is not configured. Skipping notification permission request.');
		return;
	}

	try {
		const permission = await Notification.requestPermission();
		if (permission === 'granted') {
			console.log('Notification permission granted.');
			// Получаем токен
			const token = await getToken(messaging, { vapidKey: VAPID_KEY });
			if (token) {
				console.log('FCM Token:', token);
				// Отправляем токен на бэкенд
				await api.post('fcm-token/', { token });
			} else {
				console.log('No registration token available. Request permission to generate one.');
			}
		} else {
			console.log('Unable to get permission to notify.');
		}
	} catch (error) {
		console.error('An error occurred while retrieving token. ', error);
	}
};

export const onMessageListener = () =>
	new Promise((resolve) => {
		if (!messaging) {
			return;
		}
		onMessage(messaging, (payload) => {
			resolve(payload);
		});
	});
