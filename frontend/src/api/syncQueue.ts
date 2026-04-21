// src/api/syncQueue.ts
import api from './axios';
import toast from 'react-hot-toast';
import i18n from '../i18n';

const STORAGE_KEY = 'offline_queue';
const QUEUE_EVENT = 'offline-queue-changed';

export interface QueuedRequest {
	id: string;
	method: string;
	url: string;
	data: unknown;
	headers?: Record<string, string>;
	createdAt: number;
}

const emitChange = () => {
	window.dispatchEvent(new Event(QUEUE_EVENT));
};

export const onQueueChange = (cb: () => void) => {
	window.addEventListener(QUEUE_EVENT, cb);
	return () => window.removeEventListener(QUEUE_EVENT, cb);
};

export const getQueue = (): QueuedRequest[] => {
	try {
		return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
	} catch {
		return [];
	}
};

export const setQueue = (q: QueuedRequest[]) => {
	if (q.length === 0) localStorage.removeItem(STORAGE_KEY);
	else localStorage.setItem(STORAGE_KEY, JSON.stringify(q));
	emitChange();
};

export const enqueueRequest = (req: Omit<QueuedRequest, 'id' | 'createdAt'>) => {
	const q = getQueue();
	const entry: QueuedRequest = {
		...req,
		id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
		createdAt: Date.now(),
	};
	q.push(entry);
	setQueue(q);
	return entry;
};

export const getPendingCount = () => getQueue().length;

let syncInFlight = false;

export const syncOfflineData = async () => {
	if (syncInFlight) return;
	const queue = getQueue();
	if (queue.length === 0) return;

	syncInFlight = true;
	toast.loading(i18n.t('common.syncing_data', { count: queue.length }), { id: 'sync' });

	let successCount = 0;
	const failedQueue: QueuedRequest[] = [];

	for (const req of queue) {
		try {
			// req.data was captured as-is from axios originalRequest.data.
			// Axios re-serializes objects; pre-serialized strings are sent as-is via transformRequest override.
			const isString = typeof req.data === 'string';
			await api({
				method: req.method,
				url: req.url,
				data: req.data,
				headers: {
					...(req.headers || {}),
					'X-Idempotency-Key': req.id,
					...(isString ? { 'Content-Type': 'application/json' } : {}),
				},
				transformRequest: isString ? [(d) => d] : undefined,
			});
			successCount++;
		} catch (error) {
			console.error('Failed to replay queued request:', error);
			failedQueue.push(req);
		}
	}

	setQueue(failedQueue);
	syncInFlight = false;

	if (failedQueue.length === 0) {
		toast.success(i18n.t('common.sync_success', { count: successCount }), { id: 'sync' });
	} else if (successCount > 0) {
		toast.error(i18n.t('common.sync_error', { count: failedQueue.length }), { id: 'sync' });
	} else {
		toast.dismiss('sync');
	}
};
