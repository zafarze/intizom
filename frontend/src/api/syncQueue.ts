// src/api/syncQueue.ts
import api from './axios';
import toast from 'react-hot-toast';
import i18n from '../i18n';

export const syncOfflineData = async () => {
	// 1. Достаем запросы из хранилища браузера
	const queue = JSON.parse(localStorage.getItem('offline_queue') || '[]');

	if (queue.length === 0) return; // Если очередь пуста, ничего не делаем

	toast.loading(i18n.t('common.syncing_data', { count: queue.length }), { id: 'sync' });

	let successCount = 0;
	const failedQueue = [];

	// 2. Проходимся по каждому сохраненному запросу и отправляем на бэкенд
	for (const req of queue) {
		try {
			await api({
				method: req.method,
				url: req.url,
				data: req.data ? JSON.parse(req.data) : undefined,
				headers: { 'Content-Type': 'application/json' }
			});
			successCount++;
		} catch (error) {
			console.error('Ошибка отправки отложенного запроса:', error);
			failedQueue.push(req); // Если опять ошибка, оставляем в очереди
		}
	}

	// 3. Обновляем очередь (очищаем успешные)
	if (failedQueue.length === 0) {
		localStorage.removeItem('offline_queue');
		toast.success(i18n.t('common.sync_success', { count: successCount }), { id: 'sync' });
	} else {
		localStorage.setItem('offline_queue', JSON.stringify(failedQueue));
		toast.error(i18n.t('common.sync_error', { count: failedQueue.length }), { id: 'sync' });
	}
};
