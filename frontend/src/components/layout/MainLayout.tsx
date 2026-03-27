import { useState, useEffect, useRef } from 'react';
import { Outlet } from 'react-router-dom';
import { RefreshCw } from 'lucide-react';
import Sidebar from './Sidebar';
import Header from './Header';
import { syncOfflineData } from '../../api/syncQueue'; // 👈 Импорт функции синхронизации
import toast from 'react-hot-toast'; // 👈 Импорт уведомлений

export default function MainLayout() {
	const [isMobileOpen, setIsMobileOpen] = useState(false);
	const [pullProgress, setPullProgress] = useState(0);
	const [isRefreshing, setIsRefreshing] = useState(false);
	const [refreshKey, setRefreshKey] = useState(0); // Ключ для перерисовки страниц
	const mainRef = useRef<HTMLElement>(null);

	// Храним состояние touch-событий в ref, чтобы не вызывать пересоздание слушателей
	const touchState = useRef({
		startY: 0,
		isPulling: false,
		pullProgress: 0,
		isRefreshing: false
	});

	// ==========================================
	// МАГИЯ ОФЛАЙНА: СЛУШАЕМ СТАТУС ИНТЕРНЕТА
	// ==========================================
	useEffect(() => {
		const handleOnline = () => {
			toast.success('🌐 Подключение восстановлено!', { duration: 4000 });
			syncOfflineData(); // Как только появился интернет, отправляем всё из очереди
		};

		const handleOffline = () => {
			toast.error('📶 Нет интернета. Включен офлайн-режим.', { duration: 4000 });
		};

		// Вешаем слушатели событий на браузер
		window.addEventListener('online', handleOnline);
		window.addEventListener('offline', handleOffline);

		// При первой загрузке тоже проверяем: если есть интернет, пробуем синхронизироваться
		if (window.navigator.onLine) {
			syncOfflineData();
		}

		// Очищаем слушатели при уходе со страницы
		return () => {
			window.removeEventListener('online', handleOnline);
			window.removeEventListener('offline', handleOffline);
		};
	}, []);

	// ==========================================
	// PULL TO REFRESH НА МОБИЛКАХ
	// ==========================================
	useEffect(() => {
		const mainEl = mainRef.current;
		if (!mainEl) return;

		const handleTouchStart = (e: TouchEvent) => {
			if (mainEl.scrollTop <= 0 && !touchState.current.isRefreshing) {
				touchState.current.startY = e.touches[0].clientY;
				touchState.current.isPulling = true;
			}
		};

		const handleTouchMove = (e: TouchEvent) => {
			if (!touchState.current.isPulling || touchState.current.isRefreshing) return;
			const currentY = e.touches[0].clientY;
			const pullDistance = currentY - touchState.current.startY;

			if (pullDistance > 0 && mainEl.scrollTop <= 0) {
				if (e.cancelable) e.preventDefault();
				const resistance = Math.min(pullDistance * 0.4, 70);
				touchState.current.pullProgress = resistance;
				setPullProgress(resistance);
			} else {
				touchState.current.pullProgress = 0;
				setPullProgress(0);
			}
		};

		const handleTouchEnd = async () => {
			if (!touchState.current.isPulling) return;
			touchState.current.isPulling = false;

			if (touchState.current.pullProgress > 50 && !touchState.current.isRefreshing) {
				touchState.current.isRefreshing = true;
				setIsRefreshing(true);

				touchState.current.pullProgress = 50;
				setPullProgress(50);

				try {
					// Вызываем событие обновления, которое страницы могут перехватить
					window.dispatchEvent(new Event('app-refresh'));

					// Меняем ключ чтобы заставить текущую страницу смонтироваться заново (и обновить данные)
					setRefreshKey(prev => prev + 1);

					// Ждем минимум 1 секунду для красивой анимации
					await new Promise(resolve => setTimeout(resolve, 1000));

				} finally {
					// Плавно скрываем
					touchState.current.pullProgress = 0;
					setPullProgress(0);

					setTimeout(() => {
						touchState.current.isRefreshing = false;
						setIsRefreshing(false);
					}, 300); // Ждем пока уедет наверх
				}
			} else {
				touchState.current.pullProgress = 0;
				setPullProgress(0);
			}
		};

		mainEl.addEventListener('touchstart', handleTouchStart, { passive: true });
		mainEl.addEventListener('touchmove', handleTouchMove, { passive: false });
		mainEl.addEventListener('touchend', handleTouchEnd, { passive: true });

		return () => {
			mainEl.removeEventListener('touchstart', handleTouchStart);
			mainEl.removeEventListener('touchmove', handleTouchMove);
			mainEl.removeEventListener('touchend', handleTouchEnd);
		};
	}, []);

	return (
		/* УБРАЛИ сплошной цвет фона (bg-[#F8FAFC]).
		   Теперь фон прозрачный, и сквозь него видно нашу анимацию из index.css */
		<div className="flex h-screen bg-transparent font-sans text-slate-800 selection:bg-indigo-500/30">

			<Sidebar
				isMobileOpen={isMobileOpen}
				setIsMobileOpen={setIsMobileOpen}
			/>

			<div className="flex-1 flex flex-col overflow-hidden relative">

				<Header onMenuClick={() => setIsMobileOpen(true)} />

				{/* Pull to refresh индикатор */}
				<div
					className={`absolute left-1/2 -translate-x-1/2 z-50 flex items-center justify-center bg-white/90 backdrop-blur-sm rounded-full shadow-[0_4px_20px_rgba(0,0,0,0.1)] transition-all duration-300 ease-out ${isRefreshing ? 'top-20' : 'top-16'}`}
					style={{
						width: '44px',
						height: '44px',
						transform: `translate(-50%, ${isRefreshing ? 0 : (pullProgress > 0 ? pullProgress - 20 : -50)}px)`,
						opacity: isRefreshing ? 1 : (pullProgress > 0 ? Math.min(pullProgress / 50, 1) : 0),
						visibility: (pullProgress > 0 || isRefreshing) ? 'visible' : 'hidden'
					}}
				>
					<RefreshCw
						className={`text-indigo-600 w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`}
						style={{ transform: isRefreshing ? 'none' : `rotate(${pullProgress * 7}deg)` }}
					/>
				</div>

				<main ref={mainRef} className="flex-1 overflow-y-auto p-4 lg:p-8 relative z-0 transition-transform duration-300" style={{ transform: pullProgress > 0 && !isRefreshing ? `translateY(${pullProgress * 0.5}px)` : 'none' }}>
					<Outlet key={refreshKey} />
				</main>
			</div>
		</div>
	);
}