import { useEffect, useRef } from 'react';

// Стек активных guard'ов. LIFO: системная "Назад" вызывает только верхний.
const guardStack: Array<() => void> = [];
let popstateAttached = false;

function handleGlobalPop() {
	const cb = guardStack.pop();
	cb?.();
}

function ensurePopstateListener() {
	if (popstateAttached) return;
	window.addEventListener('popstate', handleGlobalPop);
	popstateAttached = true;
}

/**
 * Перехватывает hardware/browser "Назад" для закрытия оверлея/drill-down,
 * вместо ухода на предыдущий URL. Использовать везде, где есть модалка
 * или раскрытое под-состояние внутри страницы.
 *
 * @param active — открыт ли сейчас оверлей.
 * @param onBack — как закрыть (должен флипнуть active → false).
 */
export function useBackGuard(active: boolean, onBack: () => void) {
	const onBackRef = useRef(onBack);
	onBackRef.current = onBack;

	useEffect(() => {
		if (!active) return;
		ensurePopstateListener();

		let consumedByPop = false;
		const cb = () => {
			consumedByPop = true;
			onBackRef.current();
		};
		guardStack.push(cb);
		window.history.pushState({ __backGuard: true }, '');

		return () => {
			const idx = guardStack.indexOf(cb);
			if (idx >= 0) guardStack.splice(idx, 1);
			// Закрыли программно (кнопка X, клик вне) — снимаем sentinel-запись,
			// но только если мы действительно на ней (не ушли на другой роут).
			if (!consumedByPop && window.history.state?.__backGuard) {
				window.history.back();
			}
		};
	}, [active]);
}
