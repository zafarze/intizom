import { useState, useEffect } from 'react';
import { Users, TrendingUp, AlertOctagon, ShieldAlert, Download, Award, Loader2, X, UserX } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import StatCard from '../../components/ui/StatCard';
import api from '../../api/axios';

// ==========================================
// 1. ТИПИЗАЦИЯ (TypeScript)
// ==========================================
interface Student {
	id: number;
	first_name: string;
	last_name: string;
	class_name: string;
	points: number;
}

interface ActionLog {
	id: number;
	student_detail: Student;
	rule_detail: {
		title: string;
		points_impact: number;
	};
	created_at: string;
}



export default function AdminDashboard() {
	const navigate = useNavigate();
	const { t } = useTranslation();

	const SLIDES = [
		{
			id: 1,
			type: 'image',
			src: 'https://media.tenor.com/JaS6UyBMXtEAAAAC/tc-classmate.gif',
			title: t('dashboard.slides.welcome.title'),
			desc: t('dashboard.slides.welcome.desc')
		},
		{
			id: 2,
			type: 'image',
			src: 'https://media.tenor.com/CXSAcNItAF8AAAAC/yes-blippi.gif',
			title: t('dashboard.slides.performance.title'),
			desc: t('dashboard.slides.performance.desc')
		},
		{
			id: 3,
			type: 'image',
			src: 'https://media.tenor.com/7Z37gFSTJPcAAAAC/happy-children%27s-day-mighty-little-bheem.gif',
			title: t('dashboard.slides.future.title'),
			desc: t('dashboard.slides.future.desc')
		}
	];

	// --- СОСТОЯНИЯ ---
	const [stats, setStats] = useState<any>(null);
	const [isLoading, setIsLoading] = useState(true);

	// Модальные окна для карточек
	type ModalType = 'risk' | 'violations' | 'students' | null;
	const [activeModal, setActiveModal] = useState<ModalType>(null);
	const [atRiskStudents, setAtRiskStudents] = useState<Student[]>([]);
	const [violationsModalData, setViolationsModalData] = useState<ActionLog[]>([]);

	// --- СОСТОЯНИЯ ДЛЯ СЛАЙДЕРА ---
	const [currentSlide, setCurrentSlide] = useState(0);

	useEffect(() => {
		const timer = setInterval(() => {
			setCurrentSlide((prev) => (prev + 1) % SLIDES.length);
		}, 6000);
		return () => clearInterval(timer);
	}, []);

	// ==========================================
	// 2. ЗАГРУЗКА ДАННЫХ ИЗ БАЗЫ
	// ==========================================
	useEffect(() => {
		const fetchDashboardData = async () => {
			try {
				const statsRes = await api.get('dashboard-stats/');
				setStats(statsRes.data);
			} catch (error) {
				console.error("Ошибка при загрузке данных дашборда:", error);
			} finally {
				setIsLoading(false);
			}
		};

		fetchDashboardData();
	}, []);

	// Подгружаем учеников в зоне риска при открытии модалки
	useEffect(() => {
		if (activeModal === 'risk' && atRiskStudents.length === 0) {
			api.get('students/?ordering=points&page_size=100').then(res => {
				const all: Student[] = res.data.results || res.data;
				setAtRiskStudents(all.filter(s => s.points < 25));
			});
		}
	}, [activeModal]);

	// Лениво подгружаем полный список нарушений только при открытии модалки
	useEffect(() => {
		if (activeModal === 'violations' && violationsModalData.length === 0) {
			api.get('logs/?page_size=30').then(res => {
				const all: ActionLog[] = res.data.results || res.data;
				setViolationsModalData(all.filter(l => l.rule_detail && l.rule_detail.points_impact < 0));
			}).catch(err => console.error('Failed to load violations:', err));
		}
	}, [activeModal, violationsModalData.length]);

	// ==========================================
	// 3. ВЫЧИСЛЕНИЕ СТАТИСТИКИ (Адаптировано)
	// ==========================================

	// Берем готовые цифры из нашего нового API
	const totalStudents = stats?.total_students || 0;
	const averageScore = stats?.average_score || '0';
	const atRiskCount = stats?.at_risk_count || 0;
	const absentTodayCount = stats?.absent_today_count || 0;

	// Все эти цифры приходят готовыми из dashboard-stats — без отдельного вызова logs/
	const violationsCount: number = stats?.violations_count || 0;
	const recentViolations: ActionLog[] = stats?.recent_violations || [];
	const violations: ActionLog[] = violationsModalData;

	// Утилита для красивого отображения даты
	const formatDate = (isoString: string) => {
		const date = new Date(isoString);
		return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
	};

	// ==========================================
	// 4. РЕНДЕР И ЗАЩИТА ОТ ОШИБОК
	// ==========================================

	// Показываем спиннер, пока данные грузятся
	if (isLoading) {
		return (
			<div className="h-[calc(100vh-100px)] flex flex-col items-center justify-center text-indigo-500">
				<Loader2 className="animate-spin mb-4" size={48} />
				<p className="font-bold text-slate-500">{t('auto.t_73_zagruzka_statistiki')}</p>
			</div>
		);
	}

	// Защита: Если бэкенд упал или вернул 404, показываем красивую ошибку вместо белого экрана
	if (!stats) {
		return (
			<div className="h-[calc(100vh-100px)] flex flex-col items-center justify-center gap-4 animate-in fade-in">
				<div className="p-4 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 rounded-2xl font-bold border border-red-100 dark:border-red-500/20 flex items-center gap-2">
					<ShieldAlert size={20} />
					Ошибка связи с сервером (API недоступно)
				</div>
				<button onClick={() => window.location.reload()} className="text-indigo-500 font-bold hover:text-indigo-600 transition-colors">
					Попробовать снова
				</button>
			</div>
		);
	}

	// --- ОСНОВНОЙ ДИЗАЙН ---
	return (
		<>
			<div className="space-y-6 max-w-7xl mx-auto pb-8 animate-in fade-in duration-500">

				{/* Шапка дашборда (Premium Media Slider) */}
				<div className="relative overflow-hidden bg-slate-900 dark:bg-zinc-950 rounded-[2rem] shadow-xl border border-indigo-500/20 dark:border-white/50 min-h-[240px] flex items-center group">
					{/* Фон слайдов (Фото/Видео) */}
					{SLIDES.map((slide, index) => (
						<div
							key={slide.id}
							className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${currentSlide === index ? 'opacity-100 z-0' : 'opacity-0 -z-10 pointer-events-none'
								}`}
						>
							{/* Отрисовка фото или видео */}
							{slide.type === 'image' ? (
								<img src={slide.src} alt={slide.title} className="absolute right-0 top-1/2 -translate-y-1/2 w-36 sm:w-48 md:w-64 lg:w-72 object-contain opacity-100 drop-shadow-xl mr-2 md:mr-10 z-0" />
							) : slide.type === 'video' ? (
								<video src={slide.src} autoPlay muted loop playsInline className="absolute inset-0 w-full h-full object-cover z-0" />
							) : null}

							{/* Темный оверлей сверху фото/видео для идеальной читаемости текста на всех устройствах */}
							<div className="absolute inset-0 bg-gradient-to-r from-slate-900/95 via-slate-900/80 md:via-slate-900/60 to-slate-900/30 dark:from-zinc-950/95 dark:via-zinc-950/80 dark:md:via-zinc-950/70 dark:to-zinc-950/50 z-10 pointer-events-none"></div>
						</div>
					))}

					{/* Контент поверх слайдера */}
					<div className="relative z-20 flex flex-col w-full h-full px-6 py-8 sm:p-10">
						<div className="max-w-2xl text-white flex-1 flex flex-col justify-center">
							<div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 backdrop-blur-md mb-5 shadow-sm w-fit">
								<span className="relative flex h-2 w-2">
									<span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
									<span className="relative inline-flex rounded-full h-2 w-2 bg-green-400"></span>
								</span>
								<span className="text-[11px] font-bold text-indigo-50 uppercase tracking-wider">{t('auto.t_87_sistema_vklyuchena')}</span>
							</div>

							{/* Фиксируем высоту текстового блока, чтобы слайдер не прыгал (размер не менялся) */}
							<div className="min-h-[160px] md:min-h-[120px] flex flex-col justify-center">
								<h1
									key={`title-${currentSlide}`}
									className="text-3xl md:text-4xl lg:text-5xl font-black text-white tracking-tight mb-3 drop-shadow-lg animate-in slide-in-from-bottom-4 fade-in duration-500"
								>
									{SLIDES[currentSlide].title}
								</h1>
								<p
									key={`desc-${currentSlide}`}
									className="text-indigo-50 text-sm md:text-base font-medium max-w-xl leading-relaxed opacity-90 drop-shadow-md animate-in slide-in-from-bottom-2 fade-in duration-700"
								>
									{SLIDES[currentSlide].desc}
								</p>
							</div>

							{/* Элементы управления: индикаторы и кнопки в одном ряду */}
							<div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 mt-8">
								{/* Индикаторы слайдера */}
								<div className="flex gap-2">
									{SLIDES.map((_, idx) => (
										<button
											key={idx}
											onClick={() => setCurrentSlide(idx)}
											className={`h-1.5 rounded-full transition-all duration-300 ${currentSlide === idx ? 'w-8 bg-white shadow-[0_0_10px_rgba(255,255,255,0.8)]' : 'w-2 bg-white/30 hover:bg-white/60'
												}`}
										/>
									))}
								</div>

								{/* Кнопки действий */}
								<div className="flex flex-wrap gap-3 w-full sm:w-auto mt-2 sm:mt-0">
									<button className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white px-5 py-2.5 rounded-xl text-sm font-bold border border-white/20 backdrop-blur-md transition-all active:scale-95 shadow-lg relative overflow-hidden group/btn">
										<div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover/btn:translate-x-full duration-1000 ease-in-out transition-transform"></div>
										<Download size={18} />
										<span>{t('dashboard.report')}</span>
									</button>
									<button onClick={() => navigate('/teacher')} className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-white text-indigo-700 hover:text-indigo-800 hover:bg-indigo-50 px-5 py-2.5 rounded-xl text-sm font-bold shadow-[0_0_20px_rgba(255,255,255,0.2)] transition-all active:scale-95 border border-white group/btn relative overflow-hidden">
										<div className="absolute inset-0 bg-gradient-to-r from-transparent via-indigo-100/50 to-transparent -translate-x-full group-hover/btn:translate-x-full duration-1000 ease-in-out transition-transform"></div>
										<Award size={18} />
										<span>{t('dashboard.grade_student')}</span>
									</button>
								</div>
							</div>
						</div>
					</div>
				</div>

				{/* Карточки статистики (ЖИВЫЕ ДАННЫЕ ИЗ НОВОГО API) */}
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 lg:gap-6">
					<StatCard
						title={t('dashboard.total_students')}
						value={totalStudents.toString()}
						subtitle={t('dashboard.in_database')}
						icon={<Users size={20} />}
						color="indigo"
						onClick={() => {
							localStorage.setItem('management_active_tab', 'students');
							navigate('/management');
						}}
					/>
					<StatCard
						title={t('dashboard.average_score')}
						value={averageScore.toString()}
						subtitle={t('dashboard.across_school')}
						trend="Live"
						trendUp
						icon={<TrendingUp size={20} />}
						color="green"
					/>
					<StatCard
						title={t('dashboard.violations')}
						value={violationsCount.toString()}
						subtitle={t('dashboard.all_time')}
						icon={<AlertOctagon size={20} />}
						color="orange"
						onClick={() => setActiveModal('violations')}
					/>
					<StatCard
						title={t('dashboard.risk_exclusion')}
						value={atRiskCount.toString()}
						subtitle={t('dashboard.points_under_25')}
						trend={atRiskCount > 0 ? "Нужен педсовет" : "Всё отлично"}
						trendDown={atRiskCount > 0}
						icon={<ShieldAlert size={20} />}
						color="red"
						onClick={() => setActiveModal('risk')}
					/>
					<StatCard
						title={t('dashboard.absent_today')}
						value={absentTodayCount.toString()}
						subtitle={t('dashboard.absent_today_subtitle')}
						icon={<UserX size={20} />}
						color="orange"
						onClick={() => navigate('/secretary')}
					/>
				</div>

				{/* Основной контент (Таблица + виджет) */}
				<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

					{/* Таблица последних событий */}
					<div className="lg:col-span-2 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl border border-white dark:border-zinc-800/60 rounded-[2rem] p-6 shadow-sm flex flex-col">
						<div className="flex justify-between items-center mb-6">
							<h2 className="text-lg font-bold text-slate-800 dark:text-zinc-50">{t('dashboard.recent_violations')}</h2>
							<button className="text-[13px] font-bold text-indigo-600 hover:text-indigo-800 transition-colors">{t('dashboard.view_all')}</button>
						</div>

						<div className="overflow-x-auto flex-1">
							<table className="w-full text-left border-collapse">
								<thead>
									<tr className="border-b border-slate-200/60 dark:border-zinc-800/60">
										<th className="pb-3 text-[12px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">{t('auto.t_14_uchenik')}</th>
										<th className="pb-3 text-[12px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">{t('auto.t_10_klass')}</th>
										<th className="pb-3 text-[12px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">{t('auto.t_197_narushenie')}</th>
										<th className="pb-3 text-[12px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider text-right">{t('auto.t_211_ball')}</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-slate-100 dark:divide-zinc-800/60">
									{recentViolations.length > 0 ? (
										recentViolations.map((log) => (
											<tr key={log.id} className="hover:bg-white/50 dark:hover:bg-zinc-800/40 transition-colors group">
												<td className="py-4">
													<div className="font-bold text-slate-800 dark:text-zinc-100 text-[14px]">
														{log.student_detail?.first_name} {log.student_detail?.last_name}
													</div>
													<div className="text-[11px] text-slate-400 dark:text-zinc-500 font-medium">
														{formatDate(log.created_at)}
													</div>
												</td>
												<td className="py-4 text-[13px] font-medium text-slate-600 dark:text-zinc-400">
													{log.student_detail?.class_name || '-'}
												</td>
												<td className="py-4 text-[13px] font-medium text-slate-600 dark:text-zinc-400">
													{log.rule_detail?.title}
												</td>
												<td className="py-4 text-right">
													<span className="inline-flex items-center justify-center px-2.5 py-1 rounded-lg bg-red-50 dark:bg-rose-500/10 text-red-600 dark:text-rose-400 border border-red-100 dark:border-rose-500/20 text-[12px] font-bold">
														{log.rule_detail?.points_impact}
													</span>
												</td>
											</tr>
										))
									) : (
										<tr>
											<td colSpan={4} className="py-8 text-center text-slate-400 text-sm font-medium">
												Нарушений пока нет. Отличная дисциплина!
											</td>
										</tr>
									)}
								</tbody>
							</table>
						</div>
					</div>

					{/* Боковой виджет */}
					<div className="bg-gradient-to-br from-indigo-500 to-purple-600 dark:from-zinc-900/90 dark:to-zinc-900/90 rounded-[2rem] p-6 text-white shadow-lg relative overflow-hidden flex flex-col justify-between dark:border dark:border-white/5">
						<div className="absolute top-[-20%] right-[-10%] w-48 h-48 bg-white/20 dark:bg-white/5 rounded-full blur-[40px] pointer-events-none"></div>
						<div className="absolute bottom-[-10%] left-[-10%] w-32 h-32 bg-black/10 dark:bg-black/40 rounded-full blur-[30px] pointer-events-none"></div>

						<div className="relative z-10">
							<div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mb-6 border border-white/30">
								<TrendingUp size={24} className="text-white" />
							</div>
							<h2 className="text-xl font-bold mb-2">{t('dashboard.discipline_dynamics')}</h2>
							<p className="text-indigo-100 text-sm font-medium leading-relaxed">
								Средний балл по школе сейчас составляет <strong>{averageScore}</strong>.
								{atRiskCount > 0
									? ` Обратите внимание, ${atRiskCount} учеников находятся в зоне риска исключения!`
									: ' Ситуация стабильная, учеников в зоне риска нет.'}
							</p>

							{/* Мини-статистика */}
							<div className="grid grid-cols-3 gap-2 mt-5">
								<div className="bg-white/15 backdrop-blur-sm border border-white/20 rounded-xl p-3 text-center">
									<p className="text-[22px] font-black text-white leading-none">{totalStudents}</p>
									<p className="text-[10px] text-indigo-200 font-bold mt-1 leading-tight">{t('auto.t_128_vsego')}<br />{t('auto.t_13_uchenikov')}</p>
								</div>
								<div className="bg-white/15 backdrop-blur-sm border border-white/20 rounded-xl p-3 text-center">
									<p className="text-[22px] font-black text-white leading-none">{violationsCount}</p>
									<p className="text-[10px] text-indigo-200 font-bold mt-1 leading-tight">{t('auto.t_74_narusheniy')}<br />{t('auto.t_103_vsego')}</p>
								</div>
								<div className={`${atRiskCount > 0 ? 'bg-red-500/30 border-red-300/30' : 'bg-white/15 border-white/20'} backdrop-blur-sm border rounded-xl p-3 text-center`}>
									<p className="text-[22px] font-black text-white leading-none">{atRiskCount}</p>
									<p className="text-[10px] text-indigo-200 font-bold mt-1 leading-tight">{t('auto.t_204_zona')}<br />{t('auto.t_132_riska')}</p>
								</div>
							</div>

							{/* Полоса среднего балла */}
							<div className="mt-4">
								<div className="flex justify-between items-center mb-1.5">
									<span className="text-[11px] text-indigo-200 font-bold">{t('dashboard.discipline_level')}</span>
									<span className="text-[11px] text-white font-black">{averageScore}/100</span>
								</div>
								<div className="w-full bg-white/20 rounded-full h-1.5">
									<div
										className={`h-1.5 rounded-full transition-all duration-1000 ${Number(averageScore) >= 80 ? 'bg-green-400' : Number(averageScore) >= 60 ? 'bg-yellow-400' : 'bg-red-400'}`}
										style={{ width: `${Math.min(Number(averageScore), 100)}%` }}
									/>
								</div>
							</div>
						</div>

						<button
							onClick={() => navigate('/statistics')}
							className="relative z-10 mt-5 w-full bg-white dark:bg-zinc-800 text-indigo-600 dark:text-zinc-100 font-bold py-3 rounded-xl shadow-md dark:shadow-none dark:border-zinc-700 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-300"
						>
							Смотреть итоги месяца
						</button>
					</div>
				</div>
			</div>

			{/* ============================================
		     МОДАЛЬНЫЕ ОКНА ДЛЯ КАРТОЧЕК СТАТИСТИКИ
		============================================ */}
			{activeModal && (
				<div
					className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 dark:bg-zinc-950/80 backdrop-blur-sm animate-in fade-in duration-200"
					onClick={() => setActiveModal(null)}
				>
					<div
						className="bg-white dark:bg-zinc-900 rounded-[2rem] shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col animate-in zoom-in-95 duration-200"
						onClick={e => e.stopPropagation()}
					>
						{/* Шапка */}
						<div className={`p-6 rounded-t-[2rem] flex items-center justify-between ${activeModal === 'risk' ? 'bg-gradient-to-r from-red-50 to-rose-50 dark:from-red-500/10 dark:to-rose-500/5' :
							activeModal === 'violations' ? 'bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-500/10 dark:to-amber-500/5' :
								'bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-500/10 dark:to-blue-500/5'
							}`}>
							<div className="flex items-center gap-3">
								<div className={`w-10 h-10 rounded-xl flex items-center justify-center ${activeModal === 'risk' ? 'bg-red-100 dark:bg-red-500/20' :
									activeModal === 'violations' ? 'bg-orange-100 dark:bg-orange-500/20' :
										'bg-indigo-100 dark:bg-indigo-500/20'
									}`}>
									{activeModal === 'risk' && <ShieldAlert size={20} className="text-red-600 dark:text-red-400" />}
									{activeModal === 'violations' && <AlertOctagon size={20} className="text-orange-600 dark:text-orange-400" />}
									{activeModal === 'students' && <Users size={20} className="text-indigo-600 dark:text-indigo-400" />}
								</div>
								<div>
									<h3 className="text-lg font-black text-slate-800 dark:text-zinc-50">
										{activeModal === 'risk' && 'Ученики в зоне риска'}
										{activeModal === 'violations' && 'Последние нарушения'}
										{activeModal === 'students' && 'Все ученики'}
									</h3>
									<p className="text-xs text-slate-500 dark:text-zinc-400 font-medium">
										{activeModal === 'risk' && `${atRiskStudents.length} учеников с баллами ниже 25`}
										{activeModal === 'violations' && `${violations.length} нарушений всего`}
										{activeModal === 'students' && `${totalStudents} в базе данных`}
									</p>
								</div>
							</div>
							<button
								onClick={() => setActiveModal(null)}
								className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-rose-500/10 dark:hover:text-rose-400 rounded-xl transition-all"
							>
								<X size={20} />
							</button>
						</div>

						{/* Список */}
						<div className="overflow-y-auto flex-1 p-4">

							{/* Зона риска */}
							{activeModal === 'risk' && (
								atRiskStudents.length === 0 ? (
									<div className="py-12 text-center">
										<p className="text-4xl mb-3">🎉</p>
										<p className="font-black text-slate-700 dark:text-zinc-200">Учеников в зоне риска нет!</p>
										<p className="text-sm text-slate-400 dark:text-zinc-500 mt-1">Отличная дисциплина по всей школе</p>
									</div>
								) : (
									<div className="flex flex-col gap-2">
										{atRiskStudents.map((s, index) => {
											const level = s.points >= 25 ? { label: 'Ниже нормы', color: 'orange' } : { label: 'Критично', color: 'red' };
											return (
												<div key={s.id} className="flex items-center gap-3 bg-slate-50 dark:bg-zinc-800/60 border border-slate-100 dark:border-zinc-700/60 rounded-2xl p-4">
													<div className="font-bold text-slate-400 w-5 text-center shrink-0">{index + 1}</div>
													<div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-500/10 flex items-center justify-center shrink-0 font-black text-red-600 dark:text-red-400 text-sm">
														{s.first_name[0]}{s.last_name[0]}
													</div>
													<div className="flex-1 min-w-0">
														<p className="font-black text-slate-800 dark:text-zinc-100 text-sm truncate">{s.first_name} {s.last_name}</p>
														<p className="text-xs text-slate-400 dark:text-zinc-500 font-medium">{s.class_name || '—'}</p>
													</div>
													<div className="text-right shrink-0">
														<p className={`text-lg font-black ${s.points < 25 ? 'text-red-600 dark:text-red-400' : 'text-orange-600 dark:text-orange-400'}`}>{s.points}</p>
														<span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${level.color === 'red'
															? 'bg-red-100 dark:bg-red-500/10 text-red-600 dark:text-red-400'
															: 'bg-orange-100 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400'
															}`}>{level.label}</span>
													</div>
												</div>
											);
										})}
									</div>
								)
							)}

							{/* Нарушения */}
							{activeModal === 'violations' && (
								violations.length === 0 ? (
									<div className="py-12 text-center">
										<p className="text-4xl mb-3">✅</p>
										<p className="font-black text-slate-700 dark:text-zinc-200">Нарушений нет!</p>
									</div>
								) : (
									<div className="flex flex-col gap-2">
										{violations.slice(0, 30).map(log => (
											<div key={log.id} className="flex items-center gap-3 bg-slate-50 dark:bg-zinc-800/60 border border-slate-100 dark:border-zinc-700/60 rounded-2xl p-4">
												<div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-500/10 flex items-center justify-center shrink-0 font-black text-orange-600 dark:text-orange-400 text-sm">
													{log.student_detail?.first_name?.[0]}{log.student_detail?.last_name?.[0]}
												</div>
												<div className="flex-1 min-w-0">
													<p className="font-black text-slate-800 dark:text-zinc-100 text-sm truncate">
														{log.student_detail?.first_name} {log.student_detail?.last_name}
													</p>
													<p className="text-xs text-slate-400 dark:text-zinc-500 font-medium truncate">{log.rule_detail?.title}</p>
												</div>
												<div className="text-right shrink-0">
													<span className="text-sm font-black text-red-600 dark:text-red-400">{log.rule_detail?.points_impact}</span>
													<p className="text-[10px] text-slate-400 dark:text-zinc-500">{formatDate(log.created_at)}</p>
												</div>
											</div>
										))}
									</div>
								)
							)}

							{/* Все ученики */}
							{activeModal === 'students' && (
								<div className="py-8 text-center">
									<p className="text-4xl mb-3">👥</p>
									<p className="font-black text-slate-700 dark:text-zinc-200 text-lg">{totalStudents} учеников</p>
									<p className="text-sm text-slate-400 dark:text-zinc-500 mt-1">Перейдите в раздел Управление для просмотра</p>
									<button
										onClick={() => { setActiveModal(null); navigate('/management'); }}
										className="mt-4 px-6 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl font-bold transition-all active:scale-95"
									>
										Перейти к Управлению
									</button>
								</div>
							)}
						</div>
					</div>
				</div>
			)}
		</>
	);
}