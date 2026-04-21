import { useEffect, useState } from 'react';
import { getPendingCount, onQueueChange } from '../api/syncQueue';

export function useOfflineStatus() {
	const [isOnline, setIsOnline] = useState<boolean>(typeof navigator === 'undefined' ? true : navigator.onLine);
	const [pending, setPending] = useState<number>(getPendingCount());

	useEffect(() => {
		const onOnline = () => setIsOnline(true);
		const onOffline = () => setIsOnline(false);
		const onQueue = () => setPending(getPendingCount());

		window.addEventListener('online', onOnline);
		window.addEventListener('offline', onOffline);
		const off = onQueueChange(onQueue);

		return () => {
			window.removeEventListener('online', onOnline);
			window.removeEventListener('offline', onOffline);
			off();
		};
	}, []);

	return { isOnline, pending };
}
