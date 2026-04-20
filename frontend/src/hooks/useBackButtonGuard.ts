import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const SENTINEL = '__intizom_back_guard__';

function isStandalonePWA(): boolean {
	if (typeof window === 'undefined') return false;
	const mq = window.matchMedia?.('(display-mode: standalone)').matches;
	// iOS Safari legacy
	const iosStandalone = (window.navigator as unknown as { standalone?: boolean }).standalone === true;
	// Android TWA
	const androidApp = typeof document !== 'undefined' && document.referrer.startsWith('android-app://');
	return Boolean(mq || iosStandalone || androidApp);
}

/**
 * Intercepts the hardware back button in PWA so it navigates inside the app
 * instead of closing the whole application.
 */
export function useBackButtonGuard() {
	const location = useLocation();

	useEffect(() => {
		if (!isStandalonePWA()) return;

		// Place a sentinel on top of the current history entry so the next
		// "back" press pops into it instead of exiting the app.
		window.history.pushState({ [SENTINEL]: true }, '', window.location.href);

		const onPopState = (e: PopStateEvent) => {
			const state = e.state as Record<string, unknown> | null;
			const isSentinel = !!state && state[SENTINEL] === true;
			// e.state is null when we've popped past our sentinel into the very
			// first history entry — the next back press would close the PWA.
			const isInitialEntry = state === null;

			if (isSentinel || isInitialEntry) {
				window.history.pushState({ [SENTINEL]: true }, '', window.location.href);
			}
		};

		window.addEventListener('popstate', onPopState);
		return () => window.removeEventListener('popstate', onPopState);
		// Re-arm the sentinel after every in-app navigation so react-router's
		// own pushState doesn't leave us without a guard entry on top.
	}, [location.pathname, location.search]);
}
