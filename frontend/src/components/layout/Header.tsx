import { useState, useRef, useEffect } from 'react';
import { Search, Bell, ChevronDown, User, LogOut, Settings, Menu, Loader2, LayoutDashboard, BarChart2, Activity, Users, X, Globe } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../../api/axios';
import { requestFirebaseNotificationPermission, onMessageListener } from '../../firebase';

export default function Header({ onMenuClick }: { onMenuClick?: () => void }) {
	const [isProfileOpen, setIsProfileOpen] = useState(false);
	const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
	const [isNotifOpen, setIsNotifOpen] = useState(false);
	const [isLangOpen, setIsLangOpen] = useState(false);
	const { i18n } = useTranslation();
	const langRef = useRef<HTMLDivElement>(null);
	// --- СОСТОЯНИЯ ГЛОБАЛЬНОГО ПОИСКА ---
	const [searchQuery, setSearchQuery] = useState('');
	const [studentResults, setStudentResults] = useState<any[]>([]);
	const [navResults, setNavResults] = useState<any[]>([]);
	const [isSearching, setIsSearching] = useState(false);

	// --- СОСТОЯНИЕ ИСТОРИИ УЧЕНИКА ---
	const [selectedStudentHistory, setSelectedStudentHistory] = useState<any>(null);
	const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
	const [isLoadingHistory, setIsLoadingHistory] = useState(false);

	// --- СОСТОЯНИЯ УВЕДОМЛЕНИЙ ---
	const [notifications, setNotifications] = useState<any[]>([]);
	const [unreadCount, setUnreadCount] = useState(0);
	const [isLoadingNotifs, setIsLoadingNotifs] = useState(false);
	const [selectedNotification, setSelectedNotification] = useState<any>(null);
	const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);

	const navigate = useNavigate();
	const location = useLocation();

	const getPageTitle = () => {
		const path = location.pathname;
		if (path.includes('/management')) return 'Управление школой';
		if (path.includes('/statistics')) return 'Статистика школы';
		if (path.includes('/monitoring')) return 'Мониторинг (Live)';
		if (path.includes('/settings')) return 'Настройки системы';
		if (path.includes('/admin') || path.includes('/teacher')) return 'Главная (Дашбоард)';
		return 'Система Интизом';
	};

	const profileRef = useRef<HTMLDivElement>(null);
	const searchRef = useRef<HTMLDivElement>(null);
	const searchDropdownRef = useRef<HTMLDivElement>(null);
	const notifRef = useRef<HTMLDivElement>(null);

	// ==========================================
	// 1. ДАННЫЕ ПОЛЬЗОВАТЕЛЯ И НАВИГАЦИЯ
	// ==========================================
	const userStr = localStorage.getItem('user');
	const user = userStr ? JSON.parse(userStr) : { name: 'Гость', initials: 'Г', role: 'unknown', email: '' };

	let roleDisplay = '';
	switch (user.role) {
		case 'admin': roleDisplay = 'Админ'; break;
		case 'teacher': roleDisplay = 'Учитель'; break;
		case 'student': roleDisplay = 'Ученик'; break;
		default: roleDisplay = 'Пользователь';
	}

	// Карта сайта для поиска
	const SITE_PAGES = [
		{ title: 'Дашбоард (Главная)', link: user.role === 'admin' ? '/admin' : '/teacher', icon: <LayoutDashboard size={14} />, roles: ['admin', 'teacher'] },
		{ title: 'Статистика школы', link: '/statistics', icon: <BarChart2 size={14} />, roles: ['admin', 'teacher'] },
		{ title: 'Мониторинг (Live)', link: '/monitoring', icon: <Activity size={14} />, roles: ['admin', 'teacher'] },
		{ title: 'Управление (Классы, Учителя, Ученики)', link: '/management', icon: <Users size={14} />, roles: ['admin'] },
		{ title: 'Настройки системы', link: '/settings', icon: <Settings size={14} />, roles: ['admin', 'teacher'] },
	];

	// ==========================================
	// 2. ЖИВЫЕ УВЕДОМЛЕНИЯ (API)
	// ==========================================
	const fetchNotifications = async () => {
		setIsLoadingNotifs(true);
		try {
			const [logsRes, notifsRes] = await Promise.all([
				api.get('logs/').catch(() => ({ data: [] })),
				api.get('notifications/').catch(() => ({ data: [] }))
			]);

			const logs = logsRes.data?.results || logsRes.data || [];
			const notifs = notifsRes.data?.results || notifsRes.data || [];

			const filteredLogs = logs.filter((l: any) => l.teacher_id !== user?.id);

			const mappedLogs = filteredLogs.map((l: any) => ({ ...l, itemType: 'log' }));
			const mappedNotifs = notifs.map((n: any) => ({ ...n, itemType: 'sys' }));

			const combined = [...mappedLogs, ...mappedNotifs].sort((a, b) =>
				new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
			);

			// Берем последние 15 событий
			const latestLogs = combined.slice(0, 15);
			setNotifications(latestLogs);

			// Считаем непрочитанные (ищем ВРЕМЯ последнего просмотра в памяти браузера)
			const lastSeenTimeStr = localStorage.getItem('last_seen_notif_time');
			const lastSeenTime = lastSeenTimeStr ? new Date(lastSeenTimeStr).getTime() : 0;

			const unread = latestLogs.filter((item: any) => new Date(item.created_at).getTime() > lastSeenTime).length;
			setUnreadCount(unread);

			// PWA Апдейт иконки (для телефонов и ПК)
			if ('setAppBadge' in navigator) {
				if (unread > 0) {
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
					(navigator as any).setAppBadge(unread).catch(console.error);
				} else {
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
					(navigator as any).clearAppBadge().catch(console.error);
				}
			}

			// Browser Push Notifications
			if (unread > 0 && Notification.permission === 'granted') {
				const lastPushedTimeStr = localStorage.getItem('last_pushed_notif_time');
				const lastPushedTime = lastPushedTimeStr ? new Date(lastPushedTimeStr).getTime() : 0;

				const newToPush = latestLogs.filter((item: any) => new Date(item.created_at).getTime() > lastPushedTime);

				if (newToPush.length > 0) {
					newToPush.forEach((item: any) => {
						const title = item.itemType === 'sys' ? item.title : 'Изменение баллов';
						const body = item.itemType === 'sys' ? item.message : `${item.student_detail?.first_name} ${item.student_detail?.last_name} (${item.rule_detail?.points_impact > 0 ? '+' : ''}${item.rule_detail?.points_impact})`;

						new Notification(title, {
							body: body,
							icon: '/vite.svg'
						});
					});

					localStorage.setItem('last_pushed_notif_time', newToPush[0].created_at);
				}
			}

		} catch (err) {
			console.error("Ошибка загрузки уведомлений", err);
		} finally {
			setIsLoadingNotifs(false);
		}
	};

	// Загружаем уведомления при монтировании шапки
	useEffect(() => {
		fetchNotifications();

		// Запрашиваем разрешение на Push-уведомления (Firebase FCM)
		if ('Notification' in window) {
			requestFirebaseNotificationPermission();
		}

		// Слушаем Firebase-пуши в активном окне
		onMessageListener().then((payload: any) => {
			console.log("Firebase Foreground Notification received: ", payload);
			// При получении пуша сразу обновляем список уведомлений
			fetchNotifications();
			// Можно также показать браузерный Push:
			if (Notification.permission === 'granted') {
				new Notification(payload.notification?.title || "Новое уведомление", {
					body: payload.notification?.body || "",
					icon: '/vite.svg'
				});
			}
		}).catch(err => console.log('failed: ', err));

		// Периодическое обновление (каждые 30 секунд) для живых уведомлений
		const interval = setInterval(fetchNotifications, 30000);
		return () => clearInterval(interval);
	}, []);

	const markAllAsRead = () => {
		if (notifications.length > 0) {
			// Сохраняем текущее время как время прочтения
			localStorage.setItem('last_seen_notif_time', new Date().toISOString());
			setUnreadCount(0); // Убираем красную точку

			// PWA: Убираем бейдж с иконки на рабочем столе
			if ('clearAppBadge' in navigator) {
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				(navigator as any).clearAppBadge().catch(console.error);
			}
		}
	};

	// ==========================================
	// 3. ГЛОБАЛЬНЫЙ ПОИСК (PAGES + API)
	// ==========================================
	useEffect(() => {
		if (searchQuery.trim().length >= 2) {
			setIsSearching(true);
			const query = searchQuery.toLowerCase();

			// 3.1. Ищем по разделам сайта (Локально)
			const filteredNav = SITE_PAGES.filter(page =>
				page.roles.includes(user.role) && page.title.toLowerCase().includes(query)
			);
			setNavResults(filteredNav);

			// 3.2. Ищем учеников (Через API)
			const delayDebounceFn = setTimeout(() => {
				api.get(`students/?search=${query}`)
					.then(res => setStudentResults(res.data.results || res.data))
					.catch(err => console.error(err))
					.finally(() => setIsSearching(false));
			}, 300);

			return () => clearTimeout(delayDebounceFn);
		} else {
			setStudentResults([]);
			setNavResults([]);
		}
	}, [searchQuery]);

	// ==========================================
	// 4. ИСТОРИЯ УЧЕНИКА
	// ==========================================
	const openStudentHistory = async (studentId: number) => {
		setIsLoadingHistory(true);
		try {
			const res = await api.get(`students/${studentId}/history/`);
			setSelectedStudentHistory(res.data);
			setIsHistoryModalOpen(true);
		} catch (err) {
			console.error("Ошибка загрузки истории:", err);
		} finally {
			setIsLoadingHistory(false);
			setSearchQuery('');
			setIsMobileSearchOpen(false);
		}
	};

	const handleDeleteLog = async (logId: number) => {
		if (!window.confirm("Вы уверены, что хотите отменить это действие?")) return;
		try {
			await api.delete(`logs/${logId}/`);
			// Обновляем историю после удаления
			if (selectedStudentHistory) {
				const res = await api.get(`students/${selectedStudentHistory.id}/history/`);
				setSelectedStudentHistory(res.data);
			}
		} catch (error) {
			console.error("Ошибка при удалении лога:", error);
			alert("Произошла ошибка при отмене. Попробуйте еще раз.");
		}
	};

	// ==========================================
	// 5. ЭФФЕКТЫ И ЗАКРЫТИЕ ОКОН
	// ==========================================
	useEffect(() => {
		function handleClickOutside(event: MouseEvent) {
			const target = event.target as Node;
			if (profileRef.current && !profileRef.current.contains(target)) setIsProfileOpen(false);
			if (notifRef.current && !notifRef.current.contains(target)) setIsNotifOpen(false);
			if (
				searchRef.current && !searchRef.current.contains(target) &&
				(!searchDropdownRef.current || !searchDropdownRef.current.contains(target))
			) {
				setIsMobileSearchOpen(false);
			}
		}

		function handleKeyDown(e: KeyboardEvent) {
			if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
				e.preventDefault();
				document.getElementById('desktop-search')?.focus();
			}
		}

		document.addEventListener("mousedown", handleClickOutside);
		document.addEventListener("keydown", handleKeyDown);
		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
			document.removeEventListener("keydown", handleKeyDown);
		}
	}, []);

	const handleLogout = () => {
		localStorage.clear(); // Очищаем вообще всё при выходе
		navigate('/login');
	};

	const goToPage = (path: string) => {
		navigate(path);
		setSearchQuery('');
		setIsMobileSearchOpen(false);
	};

	// Красивое форматирование даты "Сегодня в 14:30"
	const formatTime = (dateString: string) => {
		const date = new Date(dateString);
		return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
	};

	return (
		<header className="h-[64px] my-4 mx-5 lg:mx-0 lg:mr-4 lg:ml-2 rounded-[1.5rem] flex items-center justify-between px-4 relative shadow-[0_10px_30px_rgba(0,0,0,0.08)] z-30 border border-white/50 transition-all duration-300">

			{/* Фон и декоративные блики */}
			<div className="absolute inset-0 rounded-[1.5rem] overflow-hidden pointer-events-none">
				<div className="absolute inset-0 bg-gradient-to-r from-indigo-200/60 via-purple-100/60 to-orange-50/80 backdrop-blur-xl"></div>
				<div className="absolute top-[-50%] left-[20%] w-64 h-64 bg-white/70 rounded-full blur-[40px]"></div>
				<div className="absolute bottom-[-50%] right-[5%] w-48 h-48 bg-indigo-300/40 rounded-full blur-[30px]"></div>
			</div>

			{/* ЛЕВАЯ ЧАСТЬ: Гамбургер + ЗАГОЛОВОК (вместо поиска) */}
			<div className="relative z-10 flex items-center gap-3">
				<button onClick={onMenuClick} className="lg:hidden p-2 rounded-xl text-indigo-900/60 bg-white/30 backdrop-blur-md border border-white/50 shadow-sm hover:text-indigo-700 hover:bg-white/50 transition-all active:scale-95">
					<Menu size={20} />
				</button>

				{/* ДИНАМИЧЕСКИЙ ЗАГОЛОВОК СТРАНИЦЫ */}
				<div className="hidden lg:flex items-center">
					<h1 className="text-2xl font-black text-slate-800 tracking-tight">{getPageTitle()}</h1>
				</div>
			</div>

			{/* ПРАВАЯ ЧАСТЬ: Поиск, Иконки и профиль */}
			<div className="relative z-10 flex items-center gap-2 sm:gap-3">

				{/* ПОИСКОВИК ДЛЯ ПК (ПЕРЕНЕСЕН СЮДА) */}
				{user.role !== 'student' && (
					<div className="hidden lg:flex relative group items-center bg-white/30 backdrop-blur-md rounded-xl px-3 py-1.5 h-10 w-[240px] xl:w-[320px] border border-white/50 shadow-sm focus-within:bg-white/60 focus-within:shadow-md focus-within:border-white transition-all duration-500 z-[80] mr-1">
						<Search size={16} className="text-indigo-900/40 group-focus-within:text-indigo-600 transition-colors duration-300 shrink-0" />
						<input
							id="desktop-search"
							type="text"
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							placeholder="Поиск..."
							className="bg-transparent border-none outline-none ml-2 text-[13px] w-full placeholder-indigo-900/40 text-slate-800 font-medium"
						/>
						<div className="flex items-center justify-center px-1.5 py-0.5 rounded-md bg-white/50 text-[9px] font-black text-indigo-900/50 border border-white/50 shadow-sm uppercase tracking-widest shrink-0">
							⌘ K
						</div>

						{/* ВЫПАДАЮЩИЙ СПИСОК РЕЗУЛЬТАТОВ (ГЛОБАЛЬНЫЙ) */}
						{searchQuery && (
							<div className="absolute top-[calc(100%+12px)] right-0 w-[400px] bg-white/95 backdrop-blur-3xl rounded-3xl shadow-[0_30px_60px_rgba(0,0,0,0.15)] border border-white p-2 animate-in fade-in slide-in-from-top-2">
								{isSearching ? (
									<div className="p-6 flex flex-col items-center justify-center text-indigo-500">
										<Loader2 className="animate-spin mb-2" size={24} />
										<span className="text-xs font-bold text-slate-500">Поиск по базе...</span>
									</div>
								) : (navResults.length > 0 || studentResults.length > 0) ? (
									<div className="max-h-[400px] overflow-y-auto p-1 space-y-4 custom-scrollbar">

										{/* Разделы сайта */}
										{navResults.length > 0 && (
											<div>
												<p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-3 mb-2">Разделы системы</p>
												{navResults.map((nav, idx) => (
													<button key={`nav-${idx}`} onClick={() => goToPage(nav.link)} className="w-full p-2.5 hover:bg-slate-50 rounded-xl flex items-center gap-3 transition-colors text-left group">
														<div className="p-2 rounded-lg bg-indigo-50 text-indigo-500 group-hover:bg-indigo-100 transition-colors">{nav.icon}</div>
														<span className="font-bold text-[13px] text-slate-700">{nav.title}</span>
													</button>
												))}
											</div>
										)}

										{/* Ученики */}
										{studentResults.length > 0 && (
											<div>
												<p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-3 mb-2">Ученики</p>
												{studentResults.map(s => (
													<div key={s.id} onClick={() => openStudentHistory(s.id)} className="p-3 hover:bg-indigo-50/80 rounded-xl cursor-pointer transition-all flex justify-between items-center group border border-transparent hover:border-indigo-100 relative">
														{isLoadingHistory && <div className="absolute inset-0 bg-white/50 backdrop-blur-sm rounded-xl z-10 flex items-center justify-center"><Loader2 className="animate-spin text-indigo-500" size={20} /></div>}
														<div>
															<p className="font-bold text-slate-800 text-[13px] group-hover:text-indigo-700 transition-colors">{s.first_name} {s.last_name}</p>
															<p className="text-[11px] font-medium text-slate-500 mt-0.5">Класс: <span className="font-bold text-slate-600">{s.class_name || '—'}</span></p>
														</div>
														<div className={`px-2.5 py-1 rounded-lg text-[11px] font-black ${s.points >= 80 ? 'bg-green-100 text-green-700' : s.points >= 50 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
															{s.points}
														</div>
													</div>
												))}
											</div>
										)}
									</div>
								) : (
									<div className="p-6 text-center">
										<div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-2 text-slate-400"><Search size={20} /></div>
										<p className="text-sm font-bold text-slate-600">Ничего не найдено</p>
									</div>
								)}
							</div>
						)}
					</div>
				)}

				{/* ВЫБОР ЯЗЫКА (ТОЛЬКО ДЛЯ ПК) */}
				<div className="relative hidden lg:block" ref={langRef}>
					<button
						onClick={() => setIsLangOpen(!isLangOpen)}
						className={`p-2 rounded-xl backdrop-blur-md border transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 focus:outline-none flex items-center gap-1 ${isLangOpen ? 'bg-white/60 border-white shadow-md text-indigo-600' : 'bg-white/30 border-white/50 shadow-sm text-indigo-900/60 hover:text-indigo-700 hover:bg-white/50'}`}
					>
						<Globe size={18} />
						<span className="text-[12px] font-bold uppercase hidden sm:block">{i18n.language}</span>
					</button>

					{isLangOpen && (
						<div className="absolute right-0 top-[calc(100%+12px)] w-32 bg-white/95 backdrop-blur-3xl rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-slate-100 p-1.5 z-[70] transform origin-top-right transition-all animate-in fade-in zoom-in-95 duration-200">
							<button onClick={() => { i18n.changeLanguage('ru'); setIsLangOpen(false); }} className={`w-full text-left px-3 py-2 rounded-xl text-[13px] font-bold transition-colors ${i18n.language === 'ru' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-600 hover:bg-slate-50'}`}>Русский</button>
							<button onClick={() => { i18n.changeLanguage('tg'); setIsLangOpen(false); }} className={`w-full text-left px-3 py-2 rounded-xl text-[13px] font-bold transition-colors ${i18n.language === 'tg' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-600 hover:bg-slate-50'}`}>Тоҷикӣ</button>
							<button onClick={() => { i18n.changeLanguage('en'); setIsLangOpen(false); }} className={`w-full text-left px-3 py-2 rounded-xl text-[13px] font-bold transition-colors ${i18n.language === 'en' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-600 hover:bg-slate-50'}`}>English</button>
						</div>
					)}
				</div>

				{/* ЖИВЫЕ УВЕДОМЛЕНИЯ */}
				<div className="relative" ref={notifRef}>
					<button
						onClick={() => setIsNotifOpen(!isNotifOpen)}
						className={`relative p-2 rounded-xl backdrop-blur-md border transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 focus:outline-none ${isNotifOpen ? 'bg-white/60 border-white shadow-md text-indigo-600' : 'bg-white/30 border-white/50 shadow-sm text-indigo-900/60 hover:text-indigo-700 hover:bg-white/50'}`}
					>
						<Bell size={18} className="transition-transform duration-300 hover:scale-110" />
						{unreadCount > 0 && (
							<span className="absolute top-1.5 right-1.5 flex h-2 w-2">
								<span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
								<span className="relative inline-flex rounded-full h-2 w-2 bg-red-500 border border-white flex items-center justify-center text-[8px] font-bold text-white leading-none pt-[1px] shadow-sm"></span>
							</span>
						)}
					</button>

					{/* ПАНЕЛЬ УВЕДОМЛЕНИЙ */}
					{isNotifOpen && (
						<div className="fixed sm:absolute left-4 right-4 sm:left-auto sm:right-0 top-[76px] sm:top-[calc(100%+12px)] sm:w-80 bg-white/95 backdrop-blur-3xl rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.15)] border border-slate-100 p-2 z-[70] transform origin-top-right transition-all animate-in fade-in zoom-in-95 duration-200">
							<div className="px-4 py-3 border-b border-slate-100/50 flex justify-between items-center">
								<h3 className="font-black text-slate-800 text-[14px]">События</h3>
								{unreadCount > 0 && (
									<button onClick={markAllAsRead} className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 transition-colors">Прочитать всё</button>
								)}
							</div>

							<div className="max-h-[50vh] sm:max-h-[350px] overflow-y-auto mt-2 space-y-1 custom-scrollbar">
								{isLoadingNotifs ? (
									<div className="p-6 flex justify-center text-indigo-400"><Loader2 className="animate-spin" size={24} /></div>
								) : notifications.length > 0 ? (
									notifications.map(item => {
										const lastSeenTimeStr = localStorage.getItem('last_seen_notif_time');
										const lastSeenTime = lastSeenTimeStr ? new Date(lastSeenTimeStr).getTime() : 0;
										const isUnread = new Date(item.created_at).getTime() > lastSeenTime;

										if (item.itemType === 'sys') {
											return (
												<div
													key={`sys-${item.id}`}
													onClick={() => {
														setSelectedNotification(item);
														setIsNotificationModalOpen(true);
														setIsNotifOpen(false);
													}}
													className={`p-3 rounded-2xl transition-colors cursor-pointer flex gap-3 items-start ${isUnread ? 'bg-indigo-50/50 hover:bg-indigo-50' : 'hover:bg-slate-50'}`}
												>
													<div className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${isUnread ? 'bg-indigo-500' : 'bg-transparent'}`}></div>
													<div className="flex-1">
														<p className={`text-[12px] leading-tight ${isUnread ? 'font-bold text-slate-800' : 'font-medium text-slate-600'}`}>
															<span className="text-indigo-600 font-bold">{item.title}</span>
														</p>
														<p className="text-[11px] text-slate-600 mt-1 leading-snug truncate max-w-[200px]">{item.message}</p>
														<p className="text-[9px] font-bold text-slate-400 mt-1.5">{formatTime(item.created_at)}</p>
													</div>
												</div>
											);
										}

										const isPositive = item.rule_detail?.points_impact > 0;
										return (
											<div
												key={`log-${item.id}`}
												onClick={() => {
													setSelectedNotification(item);
													setIsNotificationModalOpen(true);
													setIsNotifOpen(false);
												}}
												className={`p-3 rounded-2xl transition-colors cursor-pointer flex gap-3 items-start ${isUnread ? 'bg-indigo-50/50 hover:bg-indigo-50' : 'hover:bg-slate-50'}`}
											>
												<div className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${isUnread ? 'bg-indigo-500' : 'bg-transparent'}`}></div>
												<div className="flex-1">
													<p className={`text-[12px] leading-tight ${isUnread ? 'font-bold text-slate-800' : 'font-medium text-slate-600'}`}>
														<span className="text-indigo-600 font-bold">{item.student_detail?.first_name} {item.student_detail?.last_name?.[0]}.</span> получил(а) <span className={isPositive ? 'text-green-600 font-bold' : 'text-red-600 font-bold'}>{isPositive ? '+' : ''}{item.rule_detail?.points_impact}</span>
													</p>
													<p className="text-[11px] text-slate-500 mt-1 truncate max-w-[200px]">{item.rule_detail?.title}</p>
													<p className="text-[9px] font-bold text-slate-400 mt-1.5">{formatTime(item.created_at)}</p>
												</div>
											</div>
										);
									})
								) : (
									<div className="p-4 text-center text-sm font-medium text-slate-400">Нет новых событий</div>
								)}
							</div>
						</div>
					)}
				</div>

				{/* ПРОФИЛЬ */}
				<div className="relative" ref={profileRef}>
					<button
						onClick={() => setIsProfileOpen(!isProfileOpen)}
						className={`flex items-center gap-2.5 p-1 pr-3 rounded-xl border backdrop-blur-md transition-all duration-300 hover:shadow-md hover:bg-white/50 hover:-translate-y-0.5 focus:outline-none ${isProfileOpen ? 'bg-white/60 border-white shadow-md ring-2 ring-indigo-500/20' : 'bg-white/30 border-white/50 shadow-sm'}`}
					>
						<div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-[12px] border border-white shadow-sm">
							{user.initials}
						</div>
						<div className="text-left hidden sm:block">
							<p className="font-bold text-slate-800 text-[12px] leading-none">{user.name}</p>
							<p className="text-[9px] font-black text-indigo-900/50 uppercase tracking-widest mt-1 leading-none">{roleDisplay}</p>
						</div>
						<ChevronDown size={14} className={`text-indigo-900/40 ml-0.5 transition-transform duration-300 ${isProfileOpen ? 'rotate-180 text-indigo-600' : ''}`} />
					</button>

					{isProfileOpen && (
						<div className="absolute right-0 top-[calc(100%+12px)] w-56 bg-white/95 backdrop-blur-3xl rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-slate-100 p-2 z-[70] transform origin-top-right transition-all animate-in fade-in zoom-in-95 duration-200">
							<div className="px-3 py-3 bg-slate-50/80 rounded-2xl mb-2">
								<p className="text-[13px] font-bold text-slate-900 leading-tight">{user.name}</p>
								<p className="text-[11px] font-medium text-slate-500 truncate mt-1 leading-none">{user.email || 'Нет email'}</p>
							</div>
							<div className="space-y-0.5">
								<a href="#profile" className="group flex items-center gap-3 px-3 py-2.5 rounded-xl text-[12px] font-bold text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 transition-all duration-200">
									<User size={16} className="text-slate-400 group-hover:text-indigo-500 transition-colors" /> Мой профиль
								</a>
								{user.role !== 'student' && (
									<a href="#settings" className="group flex items-center gap-3 px-3 py-2.5 rounded-xl text-[12px] font-bold text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 transition-all duration-200">
										<Settings size={16} className="text-slate-400 group-hover:text-indigo-500 transition-colors" /> Настройки
									</a>
								)}
							</div>

							{/* Инлайн кнопки выбора языка (ТОЛЬКО ДЛЯ МОБИЛОК) */}
							<div className="mt-2 pt-2 border-t border-slate-100 block lg:hidden">
								<p className="text-[10px] font-bold text-slate-400 px-3 uppercase tracking-widest mt-1 mb-2">Язык интерфейса</p>
								<div className="flex gap-2 px-2 pb-1">
									<button onClick={(e) => { e.stopPropagation(); i18n.changeLanguage('en'); setIsProfileOpen(false); }} className={`flex-1 py-2 rounded-xl text-center text-[12px] font-black tracking-wider transition-colors border ${i18n.language === 'en' ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-200 transform scale-[1.02]' : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100 hover:text-slate-700'}`}>EN</button>
									<button onClick={(e) => { e.stopPropagation(); i18n.changeLanguage('tg'); setIsProfileOpen(false); }} className={`flex-1 py-2 rounded-xl text-center text-[12px] font-black tracking-wider transition-colors border ${i18n.language === 'tg' ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-200 transform scale-[1.02]' : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100 hover:text-slate-700'}`}>TJ</button>
									<button onClick={(e) => { e.stopPropagation(); i18n.changeLanguage('ru'); setIsProfileOpen(false); }} className={`flex-1 py-2 rounded-xl text-center text-[12px] font-black tracking-wider transition-colors border ${i18n.language === 'ru' ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-200 transform scale-[1.02]' : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100 hover:text-slate-700'}`}>RU</button>
								</div>
							</div>

							<div className="mt-2 pt-2 border-t border-slate-100">
								<button onClick={handleLogout} className="w-full group flex items-center gap-3 px-3 py-2.5 rounded-xl text-[12px] font-bold text-red-600 hover:bg-red-50 transition-all duration-200">
									<LogOut size={16} className="text-red-400 group-hover:text-red-600 transition-colors" /> Выйти
								</button>
							</div>
						</div>
					)}
				</div>
			</div>

			{/* ПОИСКОВИК ДЛЯ МОБИЛЬНОЙ ВЕРСИИ */}
			{isMobileSearchOpen && user.role !== 'student' && (
				<div ref={searchDropdownRef} className="fixed left-4 right-4 top-[76px] bg-white/95 backdrop-blur-3xl rounded-3xl shadow-[0_30px_60px_rgba(0,0,0,0.15)] border border-white p-3 z-[9997] animate-in fade-in slide-in-from-top-2 duration-200 lg:hidden">
					<div className="flex items-center bg-white rounded-2xl px-4 py-3 border border-slate-100 shadow-inner focus-within:border-indigo-300 focus-within:ring-4 focus-within:ring-indigo-100/50 transition-all">
						<Search size={18} className="text-indigo-500" />
						<input
							type="text"
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							placeholder="Поиск разделов и учеников..."
							autoFocus
							className="bg-transparent border-none outline-none ml-3 text-[15px] w-full placeholder-slate-400 text-slate-800 font-bold"
						/>
					</div>

					{searchQuery && (
						<div className="mt-3 max-h-[50vh] overflow-y-auto">
							{isSearching ? (
								<div className="p-4 flex justify-center text-indigo-500"><Loader2 className="animate-spin" size={24} /></div>
							) : (navResults.length > 0 || studentResults.length > 0) ? (
								<div className="space-y-4 pb-2">
									{/* Разделы */}
									{navResults.length > 0 && (
										<div>
											<p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2 mb-2">Разделы</p>
											{navResults.map((nav, idx) => (
												<button key={`mob-nav-${idx}`} onClick={() => goToPage(nav.link)} className="w-full p-3 bg-slate-50/80 active:bg-indigo-50 rounded-2xl flex items-center gap-3 transition-colors mb-1 text-left">
													<div className="text-indigo-500">{nav.icon}</div>
													<span className="font-bold text-[13px] text-slate-700">{nav.title}</span>
												</button>
											))}
										</div>
									)}

									{/* Ученики */}
									{studentResults.length > 0 && (
										<div>
											<p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2 mb-2">Ученики</p>
											{studentResults.map(s => (
												<div key={s.id} onClick={() => openStudentHistory(s.id)} className="p-3 bg-slate-50/80 active:bg-indigo-50 rounded-2xl flex justify-between items-center transition-colors mb-1 relative">
													{isLoadingHistory && <div className="absolute inset-0 bg-white/50 backdrop-blur-sm rounded-2xl z-10 flex items-center justify-center"><Loader2 className="animate-spin text-indigo-500" size={20} /></div>}
													<div>
														<p className="font-bold text-slate-800 text-[13px]">{s.first_name} {s.last_name}</p>
														<p className="text-[11px] font-medium text-slate-500 mt-0.5">Класс: <span className="font-bold text-slate-600">{s.class_name || '—'}</span></p>
													</div>
													<div className={`px-2.5 py-1.5 rounded-xl text-[12px] font-black ${s.points >= 80 ? 'bg-green-100 text-green-700' : s.points >= 50 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
														{s.points}
													</div>
												</div>
											))}
										</div>
									)}
								</div>
							) : (
								<div className="p-4 text-center text-[13px] font-bold text-slate-500">Ничего не найдено</div>
							)}
						</div>
					)}
				</div>
			)}

			{/* МОДАЛКА ИСТОРИИ УЧЕНИКА */}
			{isHistoryModalOpen && selectedStudentHistory && (
				<div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
					<div className="bg-white p-6 rounded-3xl w-full max-w-lg max-h-[80vh] flex flex-col relative shadow-2xl">
						<button onClick={() => setIsHistoryModalOpen(false)} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all">
							<X size={20} />
						</button>
						<h3 className="text-xl font-black text-slate-800 mb-1">{selectedStudentHistory.first_name} {selectedStudentHistory.last_name}</h3>
						<div className="text-sm text-slate-500 font-medium mb-4 flex items-center flex-wrap gap-2">
							<span>Класс: <span className="font-bold text-slate-700">{selectedStudentHistory.class_name}</span></span>
							<span className="text-slate-300">•</span>
							<span>Баллы: <span className={`font-bold ${selectedStudentHistory.points >= 80 ? 'text-green-600' : selectedStudentHistory.points >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>{selectedStudentHistory.points}</span></span>
							{selectedStudentHistory.status_info && (
								<>
									<span className="text-slate-300">•</span>
									<span>Статус: <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold border ${selectedStudentHistory.status_info.level === 'excellent' ? 'text-green-700 bg-green-50 border-green-200' : selectedStudentHistory.status_info.level === 'warning' ? 'text-yellow-700 bg-yellow-50 border-yellow-200' : 'text-red-700 bg-red-50 border-red-200'}`}>{selectedStudentHistory.status_info.text}</span></span>
								</>
							)}
						</div>

						<div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-2 mt-2">
							<h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">История изменений</h4>
							{selectedStudentHistory.recent_logs?.length > 0 ? (
								// eslint-disable-next-line @typescript-eslint/no-explicit-any
								selectedStudentHistory.recent_logs.map((log: any) => {
									const canDelete = user.role === 'admin' || user.id === log.teacher_id;
									return (
										<div key={log.id} className="p-3 bg-slate-50 rounded-2xl flex gap-3 items-start border border-slate-100 transition-all hover:bg-slate-100">
											<div className={`mt-1 flex items-center justify-center w-9 h-9 rounded-xl font-black text-sm shrink-0 shadow-sm ${log.is_positive ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-red-100 text-red-700 border border-red-200'}`}>
												{log.is_positive ? '+' : ''}{log.points_impact}
											</div>
											<div className="flex-1">
												<div className="flex justify-between items-start">
													<p className="text-[13px] font-bold text-slate-800 leading-tight pr-2">{log.rule_title}</p>
													{canDelete && (
														<button
															onClick={() => handleDeleteLog(log.id)}
															className="text-slate-400 hover:text-red-500 transition-colors shrink-0"
															title="Отменить"
														>
															<X size={16} />
														</button>
													)}
												</div>
												<p className="text-[11px] font-medium text-slate-500 mt-1.5 flex items-center gap-1.5">
													<span className="inline-flex items-center justify-center w-4 h-4 bg-white rounded-full border border-slate-200 text-[8px] font-bold text-slate-600 shadow-sm">
														{log.teacher_name[0]}
													</span>
													{log.teacher_name} • {formatTime(log.created_at)}
												</p>
											</div>
										</div>
									);
								})
							) : (
								<div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
									<Activity size={32} className="mx-auto text-slate-300 mb-3" />
									<p className="text-sm font-bold text-slate-500">История пуста</p>
									<p className="text-xs font-medium text-slate-400 mt-1">Никаких событий не зафиксировано</p>
								</div>
							)}
						</div>

						<div className="mt-5 pt-4 border-t border-slate-100">
							<button onClick={() => setIsHistoryModalOpen(false)} className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-xl font-bold transition-all active:scale-95">Закрыть</button>
						</div>
					</div>
				</div>
			)}

			{/* МОДАЛКА УВЕДОМЛЕНИЯ */}
			{isNotificationModalOpen && selectedNotification && (
				<div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
					<div className="bg-white p-6 rounded-3xl w-full max-w-md flex flex-col relative shadow-2xl">
						<button onClick={() => setIsNotificationModalOpen(false)} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all">
							<X size={20} />
						</button>

						{selectedNotification.itemType === 'sys' ? (
							<>
								<div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center mb-4">
									<Bell size={24} />
								</div>
								<h3 className="text-xl font-black text-slate-800 mb-2">{selectedNotification.title}</h3>
								<p className="text-sm text-slate-600 mb-6 whitespace-pre-wrap">{selectedNotification.message}</p>
								<p className="text-xs font-bold text-slate-400">{formatTime(selectedNotification.created_at)}</p>
							</>
						) : (
							<>
								<div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 font-black text-xl ${selectedNotification.rule_detail?.points_impact > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
									{selectedNotification.rule_detail?.points_impact > 0 ? '+' : ''}{selectedNotification.rule_detail?.points_impact}
								</div>
								<h3 className="text-xl font-black text-slate-800 mb-2">Изменение баллов</h3>

								<div className="space-y-3 mb-6 mt-2 bg-slate-50 p-4 rounded-2xl border border-slate-100">
									<div>
										<p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Ученик</p>
										<p className="text-sm font-bold text-slate-800">{selectedNotification.student_detail?.first_name} {selectedNotification.student_detail?.last_name}</p>
									</div>
									<div>
										<p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Правило / Нарушение</p>
										<p className="text-sm font-medium text-slate-700">{selectedNotification.rule_detail?.title}</p>
									</div>
									{selectedNotification.description && (
										<div>
											<p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Комментарий</p>
											<p className="text-sm text-slate-600 whitespace-pre-wrap">{selectedNotification.description}</p>
										</div>
									)}
									<div>
										<p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Учитель</p>
										<p className="text-sm text-slate-600">{selectedNotification.teacher_name}</p>
									</div>
								</div>

								<p className="text-xs font-bold text-slate-400">{formatTime(selectedNotification.created_at)}</p>
							</>
						)}

						<div className="mt-6 pt-4 border-t border-slate-100">
							<button onClick={() => setIsNotificationModalOpen(false)} className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-xl font-bold transition-all active:scale-95">Закрыть</button>
						</div>
					</div>
				</div>
			)}

			{/* ПЛАВАЮЩИЙ ВИДЖЕТ ПОИСКА ДЛЯ МОБИЛЬНЫХ */}
			{user.role !== 'student' && (
				<div className="fixed top-[90px] right-6 lg:hidden z-[9998]" ref={searchRef}>
					<button
						onClick={() => setIsMobileSearchOpen(!isMobileSearchOpen)}
						className={`flex items-center justify-center w-[48px] h-[48px] rounded-full transition-all duration-300 focus:outline-none ${isMobileSearchOpen ? 'bg-indigo-600 text-white shadow-[0_10px_25px_rgba(79,70,229,0.5)]' : 'text-white shadow-[0_10px_25px_rgba(124,58,237,0.4)] hover:-translate-y-[3px] hover:scale-105 active:translate-y-0 active:scale-95'}`}
						style={!isMobileSearchOpen ? { background: 'linear-gradient(135deg, #7C3AED, #4F46E5)' } : {}}
					>
						<Search size={20} className={isMobileSearchOpen ? 'scale-110' : ''} />
					</button>
				</div>
			)}
		</header>
	);
}
