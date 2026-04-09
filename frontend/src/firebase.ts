// frontend/src/firebase.ts
import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import api from './api/axios';

// Замените этот объект на ваш конфиг из Firebase Console (Project settings -> General)
const firebaseConfig = {
	apiKey: "YOUR_API_KEY",
	authDomain: "YOUR_AUTH_DOMAIN",
	projectId: "YOUR_PROJECT_ID",
	storageBucket: "YOUR_STORAGE_BUCKET",
	messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
	appId: "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
export const messaging = getMessaging(app);

// Ваш VAPID ключ из Firebase Console (Cloud Messaging -> Web configuration -> Web Push certificates)
const VAPID_KEY = "YOUR_VAPID_KEY";

export const requestFirebaseNotificationPermission = async () => {
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
		onMessage(messaging, (payload) => {
			resolve(payload);
		});
	});