import { useEffect } from 'react';

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
 * Keeps a single sentinel entry at the bottom of the PWA's history so the hardware
 * back button can navigate normally inside the app, but a back press at the very
 * first entry doesn't close the whole application.
 */
export function useBackButtonGuard() {
	useEffect(() => {
		if (!isStandalonePWA()) return;

		// One-time sentinel push. Subsequent react-router pushes stack on top of it,
		// so hardware back walks back through them normally.
		window.history.pushState({ [SENTINEL]: true }, '', window.location.href);

		const onPopState = (e: PopStateEvent) => {
			// Only trap the attempt to leave the PWA: when the popped entry has no
			// state at all, we're about to fall off into the initial browser entry.
			if (e.state === null) {
				window.history.pushState({ [SENTINEL]: true }, '', window.location.href);
			}
		};

		window.addEventListener('popstate', onPopState);
		return () => window.removeEventListener('popstate', onPopState);
	}, []);
}
