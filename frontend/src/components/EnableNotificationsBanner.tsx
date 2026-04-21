import { useEffect, useState } from 'react';
import { Bell, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { requestFirebaseNotificationPermission } from '../firebase';

const DISMISS_KEY = 'enable_notif_banner_dismissed_until';
const DISMISS_DAYS = 7;

function shouldShow(): boolean {
	if (typeof window === 'undefined' || !('Notification' in window)) return false;
	if (Notification.permission !== 'default') return false;
	const until = localStorage.getItem(DISMISS_KEY);
	if (until && Date.now() < parseInt(until, 10)) return false;
	return true;
}

export default function EnableNotificationsBanner() {
	const { t } = useTranslation();
	const [visible, setVisible] = useState(false);
	const [busy, setBusy] = useState(false);

	useEffect(() => {
		setVisible(shouldShow());
	}, []);

	if (!visible) return null;

	const handleEnable = async () => {
		setBusy(true);
		try {
			await requestFirebaseNotificationPermission();
		} finally {
			setBusy(false);
			setVisible(false);
		}
	};

	const handleDismiss = () => {
		const until = Date.now() + DISMISS_DAYS * 24 * 60 * 60 * 1000;
		localStorage.setItem(DISMISS_KEY, String(until));
		setVisible(false);
	};

	return (
		<div className="bg-indigo-600 text-white px-4 py-2 flex items-center gap-3 text-sm">
			<Bell className="w-4 h-4 flex-shrink-0" />
			<span className="flex-1">
				{t('notifications.enable_banner', 'Включите уведомления, чтобы не пропустить сообщения и оповещения.')}
			</span>
			<button
				onClick={handleEnable}
				disabled={busy}
				className="bg-white text-indigo-700 font-semibold px-3 py-1 rounded-md text-xs hover:bg-indigo-50 disabled:opacity-60"
			>
				{t('notifications.enable_cta', 'Разрешить')}
			</button>
			<button
				onClick={handleDismiss}
				aria-label="Закрыть"
				className="p-1 rounded hover:bg-white/10"
			>
				<X className="w-4 h-4" />
			</button>
		</div>
	);
}
