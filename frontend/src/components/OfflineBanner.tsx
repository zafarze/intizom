import { WifiOff, CloudUpload } from 'lucide-react';
import { useOfflineStatus } from '../hooks/useOfflineStatus';

export default function OfflineBanner() {
	const { isOnline, pending } = useOfflineStatus();

	if (isOnline && pending === 0) return null;

	const bg = isOnline ? 'bg-amber-500' : 'bg-rose-500';
	const Icon = isOnline ? CloudUpload : WifiOff;
	const text = isOnline
		? `Синхронизируем отложенные действия: ${pending}`
		: pending > 0
			? `Вы оффлайн. Ожидают отправки: ${pending}`
			: 'Вы оффлайн. Действия будут сохранены локально.';

	return (
		<div className={`${bg} text-white text-[12px] font-bold px-4 py-1.5 flex items-center justify-center gap-2 shrink-0 shadow-sm`}>
			<Icon size={14} />
			<span>{text}</span>
		</div>
	);
}
