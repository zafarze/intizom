import { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
	LayoutDashboard, BarChart2, Activity, Users,
	Settings, LogOut, PanelLeftClose, PanelLeftOpen, RefreshCw
} from 'lucide-react';
import logoUrl from '../../assets/logo.png';

interface SidebarProps {
	isMobileOpen: boolean;
	setIsMobileOpen: (isOpen: boolean) => void;
}

export default function Sidebar({ isMobileOpen, setIsMobileOpen }: SidebarProps) {
	const [expanded, setExpanded] = useState(true);
	const navigate = useNavigate();

	// ==========================================
	// ЖЕЛЕЗОБЕТОННОЕ ЧТЕНИЕ РОЛИ
	// ==========================================
	const userStr = localStorage.getItem('user');
	const user = userStr ? JSON.parse(userStr) : null;

	// Используем toLowerCase() для защиты от опечаток в регистре (Admin / admin)
	const role = user?.role?.toLowerCase() || '';
	const isAdmin = role === 'admin';
	const isTeacher = role === 'teacher';

	useEffect(() => {
		const handleResize = () => {
			if (window.innerWidth >= 1024) {
				setIsMobileOpen(false);
			}
		};

		window.addEventListener('resize', handleResize);
		return () => window.removeEventListener('resize', handleResize);
	}, [setIsMobileOpen]);

	const handleLogout = () => {
		localStorage.removeItem('access_token');
		localStorage.removeItem('refresh_token');
		localStorage.removeItem('user');
		navigate('/login');
	};

	const handleNavClick = () => {
		if (window.innerWidth < 1024) {
			setIsMobileOpen(false);
		}
	};

	return (
		<>
			{isMobileOpen && (
				<div
					className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300"
					onClick={() => setIsMobileOpen(false)}
				></div>
			)}

			<aside className={`
                fixed lg:relative h-[calc(100vh-2rem)] m-4 rounded-[2rem] flex flex-col overflow-hidden shadow-[0_15px_40px_rgba(0,0,0,0.12)] z-50 lg:z-10 border border-white/50 transition-all duration-500 cubic-bezier(0.4, 0, 0.2, 1)
                ${expanded ? 'lg:w-[260px]' : 'lg:w-[88px]'}
                w-[260px] ${isMobileOpen ? 'translate-x-0' : '-translate-x-[120%] lg:translate-x-0'}
            `}>

				<div className="absolute inset-0 bg-gradient-to-br from-indigo-200/90 via-purple-200/90 to-orange-100/90 backdrop-blur-3xl"></div>

				<div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
					<div className="absolute top-[-10%] right-[-10%] w-48 h-48 bg-white/60 rounded-full blur-[50px]"></div>
					<div className="absolute bottom-[-10%] left-[-10%] w-64 h-64 bg-blue-300/40 rounded-full blur-[60px]"></div>
				</div>

				<div className="relative z-10 flex flex-col h-full p-4">

					<div className="flex flex-col mb-8 mt-2 relative">
						<button
							onClick={() => {
								if (window.innerWidth < 1024) {
									setIsMobileOpen(false);
								} else {
									setExpanded(!expanded);
								}
							}}
							className="absolute right-0 top-1 p-1.5 rounded-lg text-indigo-900/40 hover:text-indigo-600 hover:bg-white/40 transition-colors z-20"
						>
							{expanded || window.innerWidth < 1024 ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
						</button>

						<div className={`flex flex-col items-center justify-center transition-all duration-300 ${expanded ? 'mt-2' : 'mt-0'}`}>
							<div className={`rounded-2xl bg-white/40 backdrop-blur-md border border-white/60 shadow-sm flex items-center justify-center transition-all duration-300 ${expanded ? 'w-16 h-16 mb-3 p-2' : 'w-12 h-12 mb-0 p-1.5'}`}>
								<img src={logoUrl} alt="Logo" className="w-full h-full object-contain" />
							</div>

							<div className={`text-center transition-all duration-300 overflow-hidden whitespace-nowrap ${expanded ? 'opacity-100 max-h-10' : 'opacity-0 max-h-0'}`}>
								<h2 className="text-[14px] font-bold text-slate-900 tracking-tight">Абдураҳмони Ҷомӣ</h2>
							</div>
						</div>
					</div>

					<div className="flex-1 overflow-y-auto space-y-4 [&::-webkit-scrollbar]:hidden mt-2">
						<div>
							<p className={`text-[10px] font-bold tracking-[0.2em] text-slate-800/40 mb-3 transition-all duration-300 whitespace-nowrap ${expanded ? 'opacity-100 text-left pl-2' : 'opacity-0 h-0 hidden'}`}>
								ОСНОВНОЕ
							</p>
							<nav className="space-y-1.5">
								{/* 1. Дашборд видят все */}
								<NavItem
									expanded={expanded}
									to={isAdmin ? "/admin" : isTeacher ? "/teacher" : "/student"}
									icon={<LayoutDashboard size={20} />}
									label="Дашбоард"
									onClick={handleNavClick}
								/>

								{/* 2. Статистику видят Админ и Учитель */}
								{(isAdmin || isTeacher) && (
									<>
										<NavItem expanded={expanded} to="/statistics" icon={<BarChart2 size={20} />} label="Статистика" onClick={handleNavClick} />
										<NavItem expanded={expanded} to="/monitoring" icon={<Activity size={20} />} label="Мониторинг" badge="Live" onClick={handleNavClick} />
									</>
								)}

								{/* 3. Управление видит ТОЛЬКО Админ */}
								{isAdmin && (
									<NavItem expanded={expanded} to="/management" icon={<Users size={20} />} label="Управление" onClick={handleNavClick} />
								)}

								{/* 4. Настройки видят Админ и Учитель */}
								{(isAdmin || isTeacher) && (
									<NavItem expanded={expanded} to="/settings" icon={<Settings size={20} />} label="Настройки" onClick={handleNavClick} />
								)}
							</nav>
						</div>
					</div>

					<div className="mt-4 pt-4 border-t border-slate-900/5 flex flex-col gap-2">
						<ActionButton
							expanded={expanded}
							icon={<RefreshCw size={20} />}
							label="Обновить кэш"
							onClick={() => {
								if ('serviceWorker' in navigator) {
									navigator.serviceWorker.getRegistrations().then((registrations) => {
										for (let registration of registrations) {
											registration.unregister();
										}
									});
								}
								window.location.reload();
							}}
						/>
						<ActionButton
							expanded={expanded}
							icon={<LogOut size={20} />}
							label="Выйти"
							danger
							onClick={handleLogout}
						/>
					</div>
				</div>
			</aside>
		</>
	);
}

// ==========================================
// ВСПОМОГАТЕЛЬНЫЕ КОМПОНЕНТЫ
// ==========================================

interface NavItemProps {
	to: string;
	icon: React.ReactNode;
	label: string;
	badge?: string;
	expanded: boolean;
	onClick?: () => void;
}

function NavItem({ to, icon, label, badge, expanded, onClick }: NavItemProps) {
	return (
		<NavLink onClick={onClick} to={to} className={({ isActive }) => `group relative flex items-center px-3 py-3 rounded-xl transition-all duration-300 ease-out overflow-hidden ${expanded ? 'justify-between' : 'justify-center'} ${isActive ? 'bg-white/60 text-slate-900 font-bold shadow-[0_8px_20px_rgb(0,0,0,0.06)] border border-white/60 backdrop-blur-md translate-x-1' : 'text-slate-700 font-medium hover:bg-white/40 hover:text-slate-900 hover:translate-x-1 hover:shadow-sm'}`} title={!expanded ? label : ""}>
			{({ isActive }) => (
				<>
					<div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 -translate-x-full group-hover:translate-x-full"></div>
					<div className="flex items-center relative z-10">
						<div className={`transition-all duration-300 ${isActive ? 'scale-110 text-indigo-600 drop-shadow-md' : 'text-slate-500 group-hover:text-indigo-600 group-hover:scale-110'} ${!expanded ? 'mx-auto' : ''}`}>{icon}</div>
						<span className={`text-[13px] whitespace-nowrap overflow-hidden transition-all duration-300 ${expanded ? 'w-24 ml-3 opacity-100' : 'w-0 ml-0 opacity-0'}`}>{label}</span>
					</div>
					{badge && <span className={`relative z-10 text-[9px] uppercase font-black px-2 py-0.5 rounded-full shadow-sm transition-all duration-300 ${expanded ? 'opacity-100 scale-100' : 'opacity-0 scale-0 hidden'} ${isActive ? 'bg-red-500 text-white shadow-red-500/30' : 'bg-white/50 text-red-500 border border-white/40'}`}>{badge}</span>}
				</>
			)}
		</NavLink>
	);
}

interface ActionButtonProps {
	icon: React.ReactNode;
	label: string;
	danger?: boolean;
	expanded: boolean;
	onClick?: () => void;
}

function ActionButton({ icon, label, danger = false, expanded, onClick }: ActionButtonProps) {
	return (
		<button
			onClick={onClick}
			className={`flex items-center px-3 py-3 rounded-xl transition-all duration-300 ease-out font-medium text-[13px] overflow-hidden ${expanded ? 'w-full justify-start' : 'w-full justify-center'} ${danger ? 'text-red-600 hover:bg-red-500/10 hover:text-red-700' : 'text-slate-700 hover:bg-white/40 hover:text-slate-900'} hover:translate-x-1`}
			title={!expanded ? label : ""}
		>
			<div className={`${danger ? 'group-hover:text-red-700' : 'text-slate-500'} transition-transform duration-300 hover:scale-110 ${!expanded ? 'mx-auto' : ''}`}>{icon}</div>
			<span className={`whitespace-nowrap overflow-hidden transition-all duration-300 ${expanded ? 'w-auto ml-3 opacity-100' : 'w-0 ml-0 opacity-0'}`}>{label}</span>
		</button>
	);
}