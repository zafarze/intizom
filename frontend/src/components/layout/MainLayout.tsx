import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { syncOfflineData } from '../../api/syncQueue'; // 👈 Импорт функции синхронизации
import toast from 'react-hot-toast'; // 👈 Импорт уведомлений

export default function MainLayout() {
	const [isMobileOpen, setIsMobileOpen] = useState(false);

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

				<main className="flex-1 overflow-y-auto p-4 lg:p-8 relative z-0">
					<Outlet />
				</main>
			</div>
		</div>
	);
}