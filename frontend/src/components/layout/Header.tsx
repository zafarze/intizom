import { useState, useRef, useEffect } from 'react';
import { Search, Bell, ChevronDown, User, LogOut, Settings, Menu, Loader2, LayoutDashboard, BarChart2, Activity, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';

export default function Header({ onMenuClick }: { onMenuClick?: () => void }) {
	const [isProfileOpen, setIsProfileOpen] = useState(false);
	const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
	const [isNotifOpen, setIsNotifOpen] = useState(false);

	// --- СОСТОЯНИЯ ГЛОБАЛЬНОГО ПОИСКА ---
	const [searchQuery, setSearchQuery] = useState('');
	const [studentResults, setStudentResults] = useState<any[]>([]);
	const [navResults, setNavResults] = useState<any[]>([]);
	const [isSearching, setIsSearching] = useState(false);

	// --- СОСТОЯНИЯ УВЕДОМЛЕНИЙ ---
	const [notifications, setNotifications] = useState<any[]>([]);
	const [unreadCount, setUnreadCount] = useState(0);
	const [isLoadingNotifs, setIsLoadingNotifs] = useState(false);

	const navigate = useNavigate();

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
		if (user.role === 'student') return; // Ученикам пока не показываем общие логи

		setIsLoadingNotifs(true);
		try {
			const res = await api.get('logs/');
			const logs = res.data.results || res.data;

			// Берем последние 10 событий
			const latestLogs = logs.slice(0, 10);
			setNotifications(latestLogs);

			// Считаем непрочитанные (ищем ID последнего прочитанного лога в памяти браузера)
			const lastSeenId = parseInt(localStorage.getItem('last_seen_notif_id') || '0', 10);
			const unread = latestLogs.filter((log: any) => log.id > lastSeenId).length;
			setUnreadCount(unread);

		} catch (err) {
			console.error("Ошибка загрузки уведомлений", err);
		} finally {
			setIsLoadingNotifs(false);
		}
	};

	// Загружаем уведомления при монтировании шапки
	useEffect(() => {
		fetchNotifications();
	}, []);

	const markAllAsRead = () => {
		if (notifications.length > 0) {
			const maxId = Math.max(...notifications.map(n => n.id));
			localStorage.setItem('last_seen_notif_id', maxId.toString()); // Запоминаем, что мы всё прочитали
			setUnreadCount(0); // Убираем красную точку
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
	// 4. ЭФФЕКТЫ И ЗАКРЫТИЕ ОКОН
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

			{/* ЛЕВАЯ ЧАСТЬ: Гамбургер + Строка поиска */}
			<div className="relative z-10 flex items-center gap-3">
				<button onClick={onMenuClick} className="lg:hidden p-2 rounded-xl text-indigo-900/60 bg-white/30 backdrop-blur-md border border-white/50 shadow-sm hover:text-indigo-700 hover:bg-white/50 transition-all active:scale-95">
					<Menu size={20} />
				</button>

				{/* ПОИСКОВИК ДЛЯ ПК */}
				{user.role !== 'student' && (
					<div className="hidden lg:flex relative group items-center bg-white/30 backdrop-blur-md rounded-xl px-3 py-1.5 h-10 w-[400px] border border-white/50 shadow-sm focus-within:bg-white/60 focus-within:shadow-md focus-within:border-white transition-all duration-500 z-[80]">
						<Search size={16} className="text-indigo-900/40 group-focus-within:text-indigo-600 transition-colors duration-300 shrink-0" />
						<input
							id="desktop-search"
							type="text"
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							placeholder="Поиск разделов и учеников..."
							className="bg-transparent border-none outline-none ml-2 text-[13px] w-full placeholder-indigo-900/40 text-slate-800 font-medium"
						/>
						<div className="flex items-center justify-center px-1.5 py-0.5 rounded-md bg-white/50 text-[9px] font-black text-indigo-900/50 border border-white/50 shadow-sm uppercase tracking-widest shrink-0">
							⌘ K
						</div>

						{/* ВЫПАДАЮЩИЙ СПИСОК РЕЗУЛЬТАТОВ (ГЛОБАЛЬНЫЙ) */}
						{searchQuery && (
							<div className="absolute top-[calc(100%+12px)] left-0 w-[450px] bg-white/95 backdrop-blur-3xl rounded-3xl shadow-[0_30px_60px_rgba(0,0,0,0.15)] border border-white p-2 animate-in fade-in slide-in-from-top-2">
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
													<div key={s.id} onClick={() => { setSearchQuery(''); }} className="p-3 hover:bg-indigo-50/80 rounded-xl cursor-pointer transition-all flex justify-between items-center group border border-transparent hover:border-indigo-100">
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
			</div>

			{/* ПРАВАЯ ЧАСТЬ: Иконки и профиль */}
			<div className="relative z-10 flex items-center gap-3">

				{/* Иконка мобильного поиска */}
				{user.role !== 'student' && (
					<div className="relative lg:hidden" ref={searchRef}>
						<button onClick={() => setIsMobileSearchOpen(!isMobileSearchOpen)} className={`p-2 rounded-xl backdrop-blur-md border transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 focus:outline-none ${isMobileSearchOpen ? 'bg-white/60 border-white shadow-md text-indigo-600' : 'bg-white/30 border-white/50 shadow-sm text-indigo-900/60 hover:text-indigo-700 hover:bg-white/50'}`}>
							<Search size={18} />
						</button>
					</div>
				)}

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
									notifications.map(log => {
										const isUnread = log.id > parseInt(localStorage.getItem('last_seen_notif_id') || '0', 10);
										const isPositive = log.rule_detail?.points_impact > 0;

										return (
											<div key={log.id} className={`p-3 rounded-2xl transition-colors cursor-pointer flex gap-3 items-start ${isUnread ? 'bg-indigo-50/50 hover:bg-indigo-50' : 'hover:bg-slate-50'}`}>
												<div className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${isUnread ? 'bg-indigo-500' : 'bg-transparent'}`}></div>
												<div className="flex-1">
													<p className={`text-[12px] leading-tight ${isUnread ? 'font-bold text-slate-800' : 'font-medium text-slate-600'}`}>
														<span className="text-indigo-600 font-bold">{log.student_detail.first_name} {log.student_detail.last_name[0]}.</span> получил(а) <span className={isPositive ? 'text-green-600 font-bold' : 'text-red-600 font-bold'}>{isPositive ? '+' : ''}{log.rule_detail.points_impact}</span>
													</p>
													<p className="text-[11px] text-slate-500 mt-1 truncate max-w-[200px]">{log.rule_detail.title}</p>
													<p className="text-[9px] font-bold text-slate-400 mt-1.5">{formatTime(log.created_at)}</p>
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
				<div ref={searchDropdownRef} className="absolute left-2 right-2 top-[calc(100%+12px)] bg-white/95 backdrop-blur-3xl rounded-3xl shadow-[0_30px_60px_rgba(0,0,0,0.15)] border border-white p-3 z-[70] animate-in fade-in slide-in-from-top-2 duration-200 lg:hidden">
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
												<div key={s.id} onClick={() => { setSearchQuery(''); setIsMobileSearchOpen(false); }} className="p-3 bg-slate-50/80 active:bg-indigo-50 rounded-2xl flex justify-between items-center transition-colors mb-1">
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
		</header>
	);
}