import { useTranslation } from 'react-i18next';
import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { PieChart, BarChart3, TrendingUp, Award, Loader2, ShieldAlert, TrendingDown, Activity, X } from 'lucide-react';
import api from '../../api/axios';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// Types for better structure and no ESLint errors
interface StudentStat {
	id: number;
	first_name: string;
	last_name: string;
	points: number;
	class_name: string;
	name?: string;
	total?: number;
}

interface TrendData {
	month: string;
	bonuses: number;
	violations: number;
}

interface StatisticsData {
	violations: Record<string, { count: number, percent: number }>;
	risk_levels: Record<string, { count: number, percent: number }>;
	monthly_bonuses: number;
	super_students: StudentStat[];
	trend_data: TrendData[];
	top_10_best: StudentStat[];
	top_10_worst: StudentStat[];
}

interface LogModalData {
	isOpen: boolean;
	title: string;
	type: 'category' | 'risk';
	filterValue: string;
}

export default function Statistics() {
	const { t } = useTranslation();

	const [stats, setStats] = useState<StatisticsData | null>(null);
	const [modalData, setModalData] = useState<LogModalData>({ isOpen: false, title: '', type: 'category', filterValue: '' });
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const [modalLogs, setModalLogs] = useState<any[]>([]);
	const [isModalLoading, setIsModalLoading] = useState(false);
	const [isLoading, setIsLoading] = useState(true);

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const studentsRef = useRef<any[] | null>(null);
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const logsCacheRef = useRef<Record<string, any[]>>({});

	useEffect(() => {
		const fetchAll = async () => {
			try {
				const [statsRes, studentsRes] = await Promise.all([
					api.get('statistics/'),
					api.get('students/?limit=2000'),
				]);
				setStats(statsRes.data);
				studentsRef.current = studentsRes.data.results || studentsRes.data;
			} catch (error) {
				console.error(t('auto.t_203_oshibka_zagruzki_statistiki'), error);
			} finally {
				setIsLoading(false);
			}
		};

		fetchAll();
	}, []);

	// Показываем спиннер, пока данные грузятся
	if (isLoading) {
		return (
			<div className="h-[calc(100vh-100px)] flex flex-col items-center justify-center text-indigo-500">
				<Loader2 className="animate-spin mb-4" size={48} />
				<p className="font-bold text-slate-500">{t('stats.analyzing_data')}</p>
			</div>
		);
	}

	// Защита: Если бэкенд упал или произошла ошибка
	if (!stats) {
		return (
			<div className="h-[calc(100vh-100px)] flex flex-col items-center justify-center gap-4 animate-in fade-in">
				<div className="p-4 bg-red-50 text-red-600 rounded-2xl font-bold border border-red-100 flex items-center gap-2">
					<ShieldAlert size={20} />
					{t('stats.server_error')}
				</div>
				<button onClick={() => window.location.reload()} className="text-indigo-500 font-bold hover:text-indigo-600 transition-colors">
					{t('stats.try_again')}
				</button>
			</div>
		);
	}

	const openModal = async (title: string, type: 'category' | 'risk', filterValue: string) => {
		setModalData({ isOpen: true, title, type, filterValue });

		const cacheKey = `${type}:${filterValue}`;
		const cached = logsCacheRef.current[cacheKey];
		if (cached) {
			setModalLogs(cached);
			setIsModalLoading(false);
			return;
		}

		setIsModalLoading(true);
		setModalLogs([]);

		try {
			if (type === 'category') {
				const response = await api.get(`logs/?rule__category=${filterValue}&limit=500`);
				const data = response.data.results || response.data;
				logsCacheRef.current[cacheKey] = data;
				setModalLogs(data);
			} else {
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				let students: any[];
				if (studentsRef.current) {
					students = studentsRef.current;
				} else {
					const response = await api.get(`students/?limit=2000`);
					students = response.data.results || response.data;
					studentsRef.current = students;
				}

				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				const filtered = students.filter((s: any) => {
					if (filterValue === 'exemplary') return s.points >= 81;
					if (filterValue === 'verbal') return s.points >= 70 && s.points < 81;
					if (filterValue === 'written') return s.points >= 45 && s.points < 70;
					if (filterValue === 'labor') return s.points >= 30 && s.points < 45;
					if (filterValue === 'risk') return s.points < 25;
					return false;
				});
				logsCacheRef.current[cacheKey] = filtered;
				setModalLogs(filtered);
			}
		} catch (error) {
			console.error(t('auto.t_12_oshibka_zagruzki_dannyh_dlya'), error);
		} finally {
			setIsModalLoading(false);
		}
	};

	return (
		<div className="space-y-6 max-w-7xl mx-auto pb-8 animate-in fade-in duration-500 relative">
			{/* МОДАЛЬНОЕ ОКНО */}
			{modalData.isOpen && createPortal(
				<div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
					<div className="absolute inset-0 bg-slate-900/60 dark:bg-zinc-950/80 backdrop-blur-sm" onClick={() => setModalData({ ...modalData, isOpen: false })}></div>
					<div className="relative bg-white dark:bg-zinc-950 border dark:border-zinc-800 rounded-3xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
						<div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-zinc-800">
							<h3 className="text-xl font-bold text-slate-800 dark:text-zinc-50">{modalData.title}</h3>
							<button
								onClick={() => setModalData({ ...modalData, isOpen: false })}
								className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-slate-500 dark:text-zinc-400 rounded-full transition-colors"
							>
								<X size={20} />
							</button>
						</div>

						<div className="flex-1 overflow-y-auto p-6 bg-slate-50/50 dark:bg-zinc-900/50">
							{isModalLoading ? (
								<div className="flex flex-col items-center justify-center py-12 text-indigo-500">
									<Loader2 className="animate-spin mb-4" size={32} />
									<p className="font-medium text-slate-500">{t('stats.loading_data')}</p>
								</div>
							) : modalLogs.length === 0 ? (
								<div className="text-center py-12 text-slate-500 font-medium">{t('stats.no_data')}</div>
							) : (
								<div className="space-y-3">
									{modalData.type === 'category' ? (
										// Рендер логов нарушений
										// eslint-disable-next-line @typescript-eslint/no-explicit-any
										modalLogs.map((log: any, idx: number) => (
											<div key={log.id} className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-slate-100 dark:border-zinc-800 shadow-sm flex items-center justify-between gap-4">
												<div className="flex gap-3">
													<span className="font-bold text-slate-400 dark:text-zinc-500 mt-0.5">{idx + 1}.</span>
													<div>
														<p className="font-bold text-slate-800 dark:text-zinc-100">{log.student_detail?.first_name} {log.student_detail?.last_name} <span className="text-slate-400 dark:text-zinc-500 font-normal text-sm ml-2">{log.student_detail?.class_name}</span></p>
														<p className="text-sm text-slate-600 dark:text-zinc-400 mt-1">{log.rule_detail?.title || t('auto.t_197_narushenie')}</p>
														<p className="text-xs text-slate-400 dark:text-zinc-500 mt-1">{new Date(log.created_at).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })} • {t('stats.teacher')}: {log.teacher_name || t('stats.unknown')}</p>
													</div>
												</div>
												<div className="font-black text-red-500 bg-red-50 dark:bg-rose-500/10 dark:text-rose-400 px-3 py-1.5 rounded-lg shrink-0 border dark:border-rose-500/20">
													{log.rule_detail?.points_impact} {t('stats.points_short')}
												</div>
											</div>
										))
									) : (
										// Рендер студентов
										// eslint-disable-next-line @typescript-eslint/no-explicit-any
										modalLogs.map((student: any, idx: number) => (
											<div key={student.id} className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-slate-100 dark:border-zinc-800 shadow-sm flex items-center justify-between gap-4">
												<div className="flex gap-3 items-center">
													<span className="font-bold text-slate-400 dark:text-zinc-500">{idx + 1}.</span>
													<div>
														<p className="font-bold text-slate-800 dark:text-zinc-100">{student.first_name} {student.last_name}</p>
														<p className="text-sm text-slate-500 dark:text-zinc-400">{student.school_class?.name || student.class_name || t('stats.class_not_specified')}</p>
													</div>
												</div>
												<div className={`font-black px-3 py-1.5 rounded-lg shrink-0 border ${student.points >= 90 ? 'text-green-600 bg-green-50 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20' :
													student.points >= 70 ? 'text-yellow-600 bg-yellow-50 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20' :
														student.points >= 45 ? 'text-orange-600 bg-orange-50 dark:bg-orange-500/10 dark:text-orange-400 dark:border-orange-500/20' :
															student.points >= 30 ? 'text-red-500 bg-red-50 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20' :
																'text-red-700 bg-red-100 dark:bg-rose-600/10 dark:text-rose-500 dark:border-rose-600/20'
													}`}>
													{student.points} {t('stats.points_short')}
												</div>
											</div>
										))
									)}
								</div>
							)}
						</div>
					</div>
				</div>,
				document.body
			)}

			{/* ШАПКА */}
			<div className="bg-white/40 dark:bg-zinc-900/60 backdrop-blur-md border border-white dark:border-zinc-800/60 p-6 rounded-[2rem] shadow-sm">
				<h1 className="text-2xl font-black text-slate-800 dark:text-zinc-50">{t('stats.page_title')}</h1>
				<p className="text-sm font-medium text-slate-500 dark:text-zinc-400 mt-1">{t('stats.page_subtitle')}</p>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				{/* 1. СТАТИСТИКА ПО ГРУППАМ НАРУШЕНИЙ */}
				<div className="bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl border border-white dark:border-zinc-800/60 rounded-[2rem] p-6 shadow-sm">
					<div className="flex items-center gap-3 mb-6">
						<div className="p-3 bg-orange-100 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400 rounded-2xl">
							<PieChart size={24} />
						</div>
						<h2 className="text-lg font-bold text-slate-800 dark:text-zinc-50">{t('stats.violations_by_group')}</h2>
					</div>
					<div className="space-y-4">
						<StatBar
							label={t('stats.group_a')}
							value={stats.violations.A.percent}
							color="bg-yellow-400"
							count={stats.violations.A.count}
							onClick={() => openModal('Группа А (Мелкие)', 'category', 'A')}
						/>
						<StatBar
							label={t('stats.group_b')}
							value={stats.violations.B.percent}
							color="bg-orange-400"
							count={stats.violations.B.count}
							onClick={() => openModal('Группа Б (Средние)', 'category', 'B')}
						/>
						<StatBar
							label={t('stats.group_c')}
							value={stats.violations.C.percent}
							color="bg-red-400"
							count={stats.violations.C.count}
							onClick={() => openModal('Группа В (Серьезные)', 'category', 'C')}
						/>
						<StatBar
							label={t('stats.group_d')}
							value={stats.violations.D.percent}
							color="bg-red-600"
							count={stats.violations.D.count}
							onClick={() => openModal('Группа Г (Особо тяжкие)', 'category', 'D')}
						/>
						{stats.violations.BONUS && (
							<StatBar
								label="Ҳавасмандкунӣ (Бонус)"
								value={stats.violations.BONUS.percent}
								color="bg-emerald-500"
								count={stats.violations.BONUS.count}
								onClick={() => openModal('Ҳавасмандкунӣ (Бонус)', 'category', 'BONUS')}
							/>
						)}
					</div>
				</div>

				{/* 2. СТАТИСТИКА ПО УРОВНЯМ РИСКА */}
				<div className="bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl border border-white dark:border-zinc-800/60 rounded-[2rem] p-6 shadow-sm">
					<div className="flex items-center gap-3 mb-6">
						<div className="p-3 bg-indigo-100 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400 rounded-2xl">
							<BarChart3 size={24} />
						</div>
						<h2 className="text-lg font-bold text-slate-800 dark:text-zinc-50">{t('stats.risk_levels_title')}</h2>
					</div>
					<div className="space-y-4">
						<StatBar
							label={t('stats.risk_exemplary')}
							value={stats.risk_levels.exemplary.percent}
							color="bg-green-500"
							count={stats.risk_levels.exemplary.count}
							onClick={() => openModal(t('stats.risk_exemplary'), 'risk', 'exemplary')}
						/>
						<StatBar
							label={t('stats.risk_verbal')}
							value={stats.risk_levels.verbal.percent}
							color="bg-yellow-500"
							count={stats.risk_levels.verbal.count}
							onClick={() => openModal(t('stats.risk_verbal'), 'risk', 'verbal')}
						/>
						<StatBar
							label={t('stats.risk_written')}
							value={stats.risk_levels.written.percent}
							color="bg-orange-500"
							count={stats.risk_levels.written.count}
							onClick={() => openModal(t('stats.risk_written'), 'risk', 'written')}
						/>
						<StatBar
							label={t('stats.risk_labor')}
							value={stats.risk_levels.labor.percent}
							color="bg-red-500"
							count={stats.risk_levels.labor.count}
							onClick={() => openModal(t('stats.risk_labor'), 'risk', 'labor')}
						/>
						<StatBar
							label={t('stats.risk_expulsion')}
							value={stats.risk_levels.risk.percent}
							color="bg-red-700"
							count={stats.risk_levels.risk.count}
							onClick={() => openModal(t('stats.risk_expulsion'), 'risk', 'risk')}
						/>
					</div>
				</div>

				{/* 3. БОНУСЫ ЗА ТЕКУЩИЙ МЕСЯЦ */}
				<div className="col-span-1 lg:col-span-2 bg-gradient-to-r from-green-400 to-emerald-500 dark:from-emerald-900/90 dark:to-emerald-800/90 rounded-[2rem] p-6 shadow-sm text-white dark:border dark:border-emerald-700/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
					<div>
						<h2 className="text-xl font-bold flex items-center gap-2">
							<TrendingUp size={24} /> {t('stats.bonuses_title')}
						</h2>
						<p className="mt-2 text-green-50 dark:text-emerald-100/80">
							{t('stats.bonuses_desc_1')} <strong className="text-white text-lg ml-1">+{stats.monthly_bonuses} {t('stats.bonuses_desc_2')}</strong> {t('stats.bonuses_desc_3')}
						</p>
					</div>
					<button className="bg-white dark:bg-emerald-950 text-green-600 dark:text-emerald-400 px-5 py-2.5 rounded-xl font-bold shadow-sm hover:shadow-md transition-all active:scale-95 whitespace-nowrap">
						{t('stats.more_details')}
					</button>
				</div>

				{/* 5. ТРЕНД ПОВЕДЕНИЯ ПО МЕСЯЦАМ */}
				<div className="col-span-1 lg:col-span-2 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl border border-white dark:border-zinc-800/60 rounded-[2rem] p-6 shadow-sm">
					<div className="flex items-center gap-3 mb-6">
						<div className="p-3 bg-blue-100 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400 rounded-2xl">
							<Activity size={24} />
						</div>
						<h2 className="text-lg font-bold text-slate-800 dark:text-zinc-50">{t('stats.trend_title')}</h2>
					</div>
					<div className="h-[300px] w-full">
						<ResponsiveContainer width="100%" height="100%">
							<LineChart data={stats.trend_data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
								<CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-slate-200 dark:text-zinc-800" vertical={false} />
								<XAxis dataKey="month" stroke="currentColor" className="text-slate-400 dark:text-zinc-600" tick={{ fill: 'currentColor' }} axisLine={false} tickLine={false} />
								<YAxis stroke="currentColor" className="text-slate-400 dark:text-zinc-600" tick={{ fill: 'currentColor' }} axisLine={false} tickLine={false} />
								<Tooltip
									contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', background: 'rgba(24, 24, 27, 0.9)', color: '#fff' }}
								/>
								<Legend wrapperStyle={{ paddingTop: '20px' }} />
								<Line type="monotone" name={t('stats.trend_bonuses')} dataKey="bonuses" stroke="#10b981" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
								<Line type="monotone" name={t('stats.trend_violations')} dataKey="violations" stroke="#ef4444" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
							</LineChart>
						</ResponsiveContainer>
					</div>
				</div>

				{/* 6. ТОП-10 ЛУЧШИХ И ТОП-10 ХУДШИХ УЧЕНИКОВ */}
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-6 col-span-1 lg:col-span-2">
					{/* ТОП-10 ХУДШИХ */}
					<div className="bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl border border-white dark:border-zinc-800/60 rounded-[2rem] p-6 shadow-sm">
						<div className="flex items-center gap-3 mb-6">
							<div className="p-3 bg-red-100 text-red-600 dark:bg-red-500/10 dark:text-red-400 rounded-2xl">
								<TrendingDown size={24} />
							</div>
							<h2 className="text-lg font-bold text-slate-800 dark:text-zinc-50">{t('stats.top_worst')}</h2>
						</div>
						<div className="space-y-3">
							{stats.top_10_worst?.map((student: StudentStat, idx: number) => (
								<div key={student.id} className="flex items-center justify-between bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 p-3 rounded-xl shadow-sm">
									<div className="flex items-center gap-3">
										<div className="w-8 h-8 rounded-full bg-red-100 text-red-600 dark:bg-red-500/10 dark:text-red-400 flex items-center justify-center font-bold text-xs">
											#{idx + 1}
										</div>
										<div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-zinc-800 flex items-center justify-center text-slate-500 dark:text-zinc-400 overflow-hidden font-bold">
											{/* Placeholder for photo */}
											{student.first_name?.[0]}{student.last_name?.[0]}
										</div>
										<div>
											<p className="font-bold text-slate-800 dark:text-zinc-100 text-sm">{student.last_name} {student.first_name}</p>
											<p className="text-xs text-slate-500 dark:text-zinc-500">{student.class_name}</p>
										</div>
									</div>
									<div className="font-black text-red-500 bg-red-50 dark:bg-rose-500/10 dark:text-rose-400 border dark:border-rose-500/20 px-3 py-1 rounded-lg">
										{student.points} {t('stats.points_short')}
									</div>
								</div>
							))}
						</div>
					</div>

					{/* ТОП-10 ЛУЧШИХ */}
					<div className="bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl border border-white dark:border-zinc-800/60 rounded-[2rem] p-6 shadow-sm">
						<div className="flex items-center gap-3 mb-6">
							<div className="p-3 bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 rounded-2xl">
								<TrendingUp size={24} />
							</div>
							<h2 className="text-lg font-bold text-slate-800 dark:text-zinc-50">{t('stats.top_best')}</h2>
						</div>
						<div className="space-y-3">
							{stats.top_10_best?.map((student: StudentStat, idx: number) => (
								<div key={student.id} className="flex items-center justify-between bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 p-3 rounded-xl shadow-sm">
									<div className="flex items-center gap-3">
										<div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 flex items-center justify-center font-bold text-xs">
											#{idx + 1}
										</div>
										<div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-zinc-800 flex items-center justify-center text-slate-500 dark:text-zinc-400 overflow-hidden font-bold">
											{/* Placeholder for photo */}
											{student.first_name?.[0]}{student.last_name?.[0]}
										</div>
										<div>
											<p className="font-bold text-slate-800 dark:text-zinc-100 text-sm">{student.last_name} {student.first_name}</p>
											<p className="text-xs text-slate-500 dark:text-zinc-500">{student.class_name}</p>
										</div>
									</div>
									<div className="font-black text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 dark:text-emerald-400 border dark:border-emerald-500/20 px-3 py-1 rounded-lg">
										{student.points} {t('stats.points_short')}
									</div>
								</div>
							))}
						</div>
					</div>
				</div>

				{/* 4. 👇 НОВЫЙ БЛОК: ГОРДОСТЬ ШКОЛЫ (СУПЕР-УЧЕНИКИ 300+) */}
				<div className="col-span-1 lg:col-span-2 bg-gradient-to-br from-indigo-600 to-purple-700 rounded-[2rem] p-6 shadow-lg text-white">
					<div className="flex items-center gap-3 mb-6">
						<div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
							<Award size={24} className="text-yellow-300" />
						</div>
						<div>
							<h3 className="text-xl font-black tracking-tight">{t('stats.pride_title')}</h3>
							<p className="text-[13px] text-indigo-100 font-medium mt-1">{t('stats.pride_subtitle')}</p>
						</div>
					</div>

					<div className="space-y-3">
						{stats.super_students && stats.super_students.length > 0 ? (
							stats.super_students.map((student: StudentStat, idx: number) => (
								<div key={idx} className="flex justify-between items-center bg-white/10 hover:bg-white/20 transition-colors p-4 rounded-xl border border-white/10 group cursor-default">
									<div className="flex items-center gap-4">
										<div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-300 to-yellow-500 text-yellow-900 font-black flex items-center justify-center text-sm shadow-md group-hover:scale-110 transition-transform">
											{idx + 1}
										</div>
										<div>
											<p className="font-bold text-[15px]">{student.name}</p>
											<p className="text-[12px] text-indigo-200 mt-0.5">{t('stats.class_prefix')} {student.class_name}</p>
										</div>
									</div>
									<div className="flex items-center gap-2 bg-black/20 px-4 py-2 rounded-lg">
										<span className="font-black text-xl text-yellow-300 drop-shadow-md">
											{student.total}
										</span>
										<span className="text-[10px] font-bold text-indigo-200 uppercase tracking-widest">{t('stats.points')}</span>
									</div>
								</div>
							))
						) : (
							<div className="bg-white/5 border border-white/10 rounded-xl p-8 text-center">
								<Award size={32} className="text-indigo-300/50 mx-auto mb-3" />
								<p className="text-sm text-indigo-200 font-medium">{t('stats.pride_empty')}</p>
							</div>
						)}
					</div>
				</div>

			</div>
		</div>
	);
}

// Вспомогательный компонент для рендеринга прогресс-баров
interface StatBarProps {
	label: string;
	value: number;
	color: string;
	count: number;
	onClick?: () => void;
}
function StatBar({ label, value, color, count, onClick }: StatBarProps) {
	const { t } = useTranslation();
	return (
		<div
			onClick={onClick}
			className={onClick ? "cursor-pointer group hover:bg-white/50 dark:hover:bg-zinc-800/50 p-2 -m-2 rounded-xl transition-colors" : ""}
		>
			<div className="flex justify-between text-sm font-semibold mb-1">
				<span className="text-slate-700 dark:text-zinc-200">{label}</span>
				<span className="text-slate-500 dark:text-zinc-500">{count} {t('stats.cases')}</span>
			</div>
			<div className="w-full bg-slate-100 dark:bg-zinc-800 rounded-full h-3 border border-slate-200/50 dark:border-zinc-700/50 overflow-hidden">
				<div
					className={`${color} h-full rounded-full transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(255,255,255,0.2)]`}
					style={{ width: `${Math.max(value, 2)}%` }} // Оставим минимум 2%, чтобы было видно цвет, даже если 0
				></div>
			</div>
		</div>
	);
}