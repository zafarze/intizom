import axios from 'axios';

// 1. УМНЫЙ BASE URL
// Берем URL из .env файла (для продакшена), а если его нет - используем локальный (для разработки)
const BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api/';

const api = axios.create({
	baseURL: BASE_URL,
});

// ==========================================
// 1. ИНТЕРЦЕПТОР ЗАПРОСОВ (Добавляем токен)
// ==========================================
api.interceptors.request.use(
	(config) => {
		// 👇 ДОБАВЛЕНО: Пропускаем добавление токена для эндпоинтов логина и рефреша
		if (config.url && (config.url.includes('/login') || config.url.includes('/token/refresh'))) {
			return config;
		}

		const token = localStorage.getItem('access_token');
		if (token) {
			config.headers.Authorization = `Bearer ${token}`;
		}
		return config;
	},
	(error) => Promise.reject(error)
);

// ==========================================
// 2. ИНТЕРЦЕПТОР ОТВЕТОВ (Ловим офлайн и 401)
// ==========================================
api.interceptors.response.use(
	(response) => response,
	async (error) => {
		const originalRequest = error.config;

		// ==========================================
		// МАГИЯ ОФЛАЙНА: ПЕРЕХВАТ ОШИБОК СЕТИ
		// ==========================================
		if (!window.navigator.onLine || error.code === 'ERR_NETWORK' || error.message === 'Network Error') {

			const method = originalRequest.method?.toLowerCase();
			if (['post', 'patch', 'put', 'delete'].includes(method || '')) {

				const queue = JSON.parse(localStorage.getItem('offline_queue') || '[]');
				queue.push({
					method: originalRequest.method,
					url: originalRequest.url,
					data: originalRequest.data
				});
				localStorage.setItem('offline_queue', JSON.stringify(queue));

				return Promise.resolve({
					data: { detail: 'Нет сети. Сохранено в память телефона.' },
					status: 200,
					isOffline: true
				});
			}
		}

		// ==========================================
		// ЛОГИКА ОБНОВЛЕНИЯ ТОКЕНА (JWT Refresh)
		// ==========================================
		if (error.response?.status === 401 && !originalRequest._retry) {
			originalRequest._retry = true;

			try {
				const refreshToken = localStorage.getItem('refresh_token');

				if (!refreshToken) {
					localStorage.removeItem('access_token');
					localStorage.removeItem('user_role'); // 👈 ДОБАВЛЕНО: Очищаем роль
					window.location.href = '/login';
					return Promise.reject(error);
				}

				// 👈 ИЗМЕНЕНО: Используем динамический BASE_URL вместо хардкода
				const response = await axios.post(`${BASE_URL}token/refresh/`, {
					refresh: refreshToken,
				});

				const newAccessToken = response.data.access;
				localStorage.setItem('access_token', newAccessToken);

				originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
				return api(originalRequest);

			} catch (refreshError) {
				// Если рефреш-токен протух — убиваем сессию полностью
				localStorage.removeItem('access_token');
				localStorage.removeItem('refresh_token');
				localStorage.removeItem('user_role'); // 👈 ДОБАВЛЕНО: Полностью очищаем стейт юзера
				window.location.href = '/login';
				return Promise.reject(refreshError);
			}
		}

		return Promise.reject(error);
	}
);

export default api;