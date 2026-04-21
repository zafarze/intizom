// Единый менеджер бейджа иконки PWA.
// Несколько источников (уведомления, чат) независимо сообщают свои счётчики,
// суммарное значение выставляется в navigator.setAppBadge и отправляется в SW
// для авторитетной синхронизации (иначе SW-инкремент на background-пушах
// «убежит» от правды).

const sources = new Map<string, number>();

function totalUnread(): number {
	let sum = 0;
	for (const v of sources.values()) sum += v;
	return sum;
}

function applyNativeBadge(total: number) {
	const nav = navigator as Navigator & {
		setAppBadge?: (n?: number) => Promise<void>;
		clearAppBadge?: () => Promise<void>;
	};
	if (total > 0) {
		nav.setAppBadge?.(total).catch(() => {});
	} else {
		nav.clearAppBadge?.().catch(() => {});
	}
}

function syncToServiceWorker(total: number) {
	if (!('serviceWorker' in navigator)) return;
	navigator.serviceWorker.ready
		.then(reg => {
			// postMessage достаёт активного SW. controller = null, пока страница не
			// перехвачена им (например, первая загрузка) — тогда просто пропускаем.
			const target = navigator.serviceWorker.controller || reg.active;
			target?.postMessage({ type: 'SET_BADGE', count: total });
		})
		.catch(() => {});
}

/**
 * Зарегистрировать/обновить количество непрочитанных от конкретного источника.
 * Источник — строковый ключ, уникальный для модуля (например 'notifications', 'chat').
 */
export function setBadgeSource(name: string, count: number) {
	const safe = Math.max(0, Math.floor(count || 0));
	sources.set(name, safe);
	const total = totalUnread();
	applyNativeBadge(total);
	syncToServiceWorker(total);
}

/** Полностью сбросить все источники (при logout). */
export function clearAllBadges() {
	sources.clear();
	applyNativeBadge(0);
	syncToServiceWorker(0);
}
