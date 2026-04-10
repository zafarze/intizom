import { useState, useEffect } from 'react';
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
	const [stats, setStats] = useState<StatisticsData | null>(null);
	const [modalData, setModalData] = useState<LogModalData>({ isOpen: false, title: '', type: 'category', filterValue: '' });
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const [modalLogs, setModalLogs] = useState<any[]>([]);
	const [isModalLoading, setIsModalLoading] = useState(false);
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		const fetchStatistics = async () => {
			try {
				const response = await api.get('statistics/');
				setStats(response.data);
			} catch (error) {
				console.error("Ошибка загрузки статистики:", error);
			} finally {
				setIsLoading(false);
			}
		};

		fetchStatistics();
	}, []);

	// Показываем спиннер, пока данные грузятся
	if (isLoading) {
		return (
			<div className="h-[calc(100vh-100px)] flex flex-col items-center justify-center text-indigo-500">
				<Loader2 className="animate-spin mb-4" size={48} />
				<p className="font-bold text-slate-500">Анализ данных...</p>
			</div>
		);
	}

	// Защита: Если бэкенд упал или произошла ошибка
	if (!stats) {
		return (
			<div className="h-[calc(100vh-100px)] flex flex-col items-center justify-center gap-4 animate-in fade-in">
				<div className="p-4 bg-red-50 text-red-600 rounded-2xl font-bold border border-red-100 flex items-center gap-2">
					<ShieldAlert size={20} />
					Ошибка связи с сервером
				</div>
				<button onClick={() => window.location.reload()} className="text-indigo-500 font-bold hover:text-indigo-600 transition-colors">
					Попробовать снова
				</button>
			</div>
		);
	}

	const openModal = async (title: string, type: 'category' | 'risk', filterValue: string) => {
		setModalData({ isOpen: true, title, type, filterValue });
		setIsModalLoading(true);
		setModalLogs([]);

		try {
			if (type === 'category') {
				const response = await api.get(`logs/?rule__category=${filterValue}&limit=500`);
				setModalLogs(response.data.results || response.data);
			} else {
				// Fetch students by risk level
				// For now we might not have a direct endpoint, but we can fetch students and filter them
				const response = await api.get(`students/?limit=1000`);
				const students = response.data.results || response.data;

				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				const filtered = students.filter((s: any) => {
					if (filterValue === 'exemplary') return s.points >= 90;
					if (filterValue === 'verbal') return s.points >= 70 && s.points <= 89;
					if (filterValue === 'written') return s.points >= 45 && s.points <= 69;
					if (filterValue === 'risk') return s.points < 45;
					return false;
				});
				setModalLogs(filtered);
			}
		} catch (error) {
			console.error("Ошибка загрузки данных для модалки:", error);
		} finally {
			setIsModalLoading(false);
		}
	};

	return (
		<div className="space-y-6 max-w-7xl mx-auto pb-8 animate-in fade-in duration-500 relative">
			{/* МОДАЛЬНОЕ ОКНО */}
			{modalData.isOpen && (
				<div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
					<div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setModalData({ ...modalData, isOpen: false })}></div>
					<div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
						<div className="flex items-center justify-between p-6 border-b border-slate-100">
							<h3 className="text-xl font-bold text-slate-800">{modalData.title}</h3>
							<button
								onClick={() => setModalData({ ...modalData, isOpen: false })}
								className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-full transition-colors"
							>
								<X size={20} />
							</button>
						</div>

						<div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
							{isModalLoading ? (
								<div className="flex flex-col items-center justify-center py-12 text-indigo-500">
									<Loader2 className="animate-spin mb-4" size={32} />
									<p className="font-medium text-slate-500">Загрузка данных...</p>
								</div>
							) : modalLogs.length === 0 ? (
								<div className="text-center py-12 text-slate-500 font-medium">Нет данных для отображения</div>
							) : (
								<div className="space-y-3">
									{modalData.type === 'category' ? (
										// Рендер логов нарушений
										// eslint-disable-next-line @typescript-eslint/no-explicit-any
										modalLogs.map((log: any) => (
											<div key={log.id} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between gap-4">
												<div>
													<p className="font-bold text-slate-800">{log.student_detail?.first_name} {log.student_detail?.last_name} <span className="text-slate-400 font-normal text-sm ml-2">{log.student_detail?.class_name}</span></p>
													<p className="text-sm text-slate-600 mt-1">{log.rule_detail?.title || 'Нарушение'}</p>
													<p className="text-xs text-slate-400 mt-1">{new Date(log.created_at).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })} • Учитель: {log.teacher_name || 'Неизвестно'}</p>
												</div>
												<div className="font-black text-red-500 bg-red-50 px-3 py-1.5 rounded-lg shrink-0">
													{log.rule_detail?.points_impact} б.
												</div>
											</div>
										))
									) : (
										// Рендер студентов
										// eslint-disable-next-line @typescript-eslint/no-explicit-any
										modalLogs.map((student: any) => (
											<div key={student.id} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between gap-4">
												<div>
													<p className="font-bold text-slate-800">{student.first_name} {student.last_name}</p>
													<p className="text-sm text-slate-500">{student.school_class?.name || student.class_name || 'Класс не указан'}</p>
												</div>
												<div className={`font-black px-3 py-1.5 rounded-lg shrink-0 ${student.points >= 90 ? 'text-green-600 bg-green-50' :
													student.points >= 70 ? 'text-yellow-600 bg-yellow-50' :
														student.points >= 45 ? 'text-orange-600 bg-orange-50' :
															'text-red-600 bg-red-50'
													}`}>
													{student.points} б.
												</div>
											</div>
										))
									)}
								</div>
							)}
						</div>
					</div>
				</div>
			)}

			{/* ШАПКА */}
			<div className="bg-white/40 backdrop-blur-md border border-white p-6 rounded-[2rem] shadow-sm">
				<h1 className="text-2xl font-black text-slate-800">Статистика дисциплины</h1>
				<p className="text-sm font-medium text-slate-500 mt-1">Детальный анализ нарушений и поощрений</p>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				{/* 1. СТАТИСТИКА ПО ГРУППАМ НАРУШЕНИЙ */}
				<div className="bg-white/60 backdrop-blur-xl border border-white rounded-[2rem] p-6 shadow-sm">
					<div className="flex items-center gap-3 mb-6">
						<div className="p-3 bg-orange-100 text-orange-600 rounded-2xl">
							<PieChart size={24} />
						</div>
						<h2 className="text-lg font-bold text-slate-800">Нарушения по группам</h2>
					</div>
					<div className="space-y-4">
						<StatBar
							label="Группа А (Мелкие)"
							value={stats.violations.A.percent}
							color="bg-yellow-400"
							count={stats.violations.A.count}
							onClick={() => openModal('Группа А (Мелкие)', 'category', 'A')}
						/>
						<StatBar
							label="Группа Б (Средние)"
							value={stats.violations.B.percent}
							color="bg-orange-400"
							count={stats.violations.B.count}
							onClick={() => openModal('Группа Б (Средние)', 'category', 'B')}
						/>
						<StatBar
							label="Группа В (Серьезные)"
							value={stats.violations.C.percent}
							color="bg-red-400"
							count={stats.violations.C.count}
							onClick={() => openModal('Группа В (Серьезные)', 'category', 'C')}
						/>
						<StatBar
							label="Группа Г (Особо тяжкие)"
							value={stats.violations.D.percent}
							color="bg-red-600"
							count={stats.violations.D.count}
							onClick={() => openModal('Группа Г (Особо тяжкие)', 'category', 'D')}
						/>
					</div>
				</div>

				{/* 2. СТАТИСТИКА ПО УРОВНЯМ РИСКА */}
				<div className="bg-white/60 backdrop-blur-xl border border-white rounded-[2rem] p-6 shadow-sm">
					<div className="flex items-center gap-3 mb-6">
						<div className="p-3 bg-indigo-100 text-indigo-600 rounded-2xl">
							<BarChart3 size={24} />
						</div>
						<h2 className="text-lg font-bold text-slate-800">Уровни риска учеников</h2>
					</div>
					<div className="space-y-4">
						<StatBar
							label="Образцовые (90-100 баллов)"
							value={stats.risk_levels.exemplary.percent}
							color="bg-green-500"
							count={stats.risk_levels.exemplary.count}
							onClick={() => openModal('Образцовые (90-100 баллов)', 'risk', 'exemplary')}
						/>
						<StatBar
							label="Устное предупреждение (70-89 баллов)"
							value={stats.risk_levels.verbal.percent}
							color="bg-yellow-500"
							count={stats.risk_levels.verbal.count}
							onClick={() => openModal('Устное предупреждение (70-89 баллов)', 'risk', 'verbal')}
						/>
						<StatBar
							label="Письм. предупреждение (45-69 баллов)"
							value={stats.risk_levels.written.percent}
							color="bg-orange-500"
							count={stats.risk_levels.written.count}
							onClick={() => openModal('Письм. предупреждение (45-69 баллов)', 'risk', 'written')}
						/>
						<StatBar
							label="Риск исключения (<45 баллов)"
							value={stats.risk_levels.risk.percent}
							color="bg-red-500"
							count={stats.risk_levels.risk.count}
							onClick={() => openModal('Риск исключения (<45 баллов)', 'risk', 'risk')}
						/>
					</div>
				</div>

				{/* 3. БОНУСЫ ЗА ТЕКУЩИЙ МЕСЯЦ */}
				<div className="col-span-1 lg:col-span-2 bg-gradient-to-r from-green-400 to-emerald-500 rounded-[2rem] p-6 shadow-sm text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
					<div>
						<h2 className="text-xl font-bold flex items-center gap-2">
							<TrendingUp size={24} /> Поощрения (Бонусы)
						</h2>
						<p className="mt-2 text-green-50">
							В этом месяце начислено <strong className="text-white text-lg ml-1">+{stats.monthly_bonuses} баллов</strong> за хорошие поступки и достижения.
						</p>
					</div>
					<button className="bg-white text-green-600 px-5 py-2.5 rounded-xl font-bold shadow-sm hover:shadow-md transition-all active:scale-95 whitespace-nowrap">
						Подробнее
					</button>
				</div>

				{/* 5. ТРЕНД ПОВЕДЕНИЯ ПО МЕСЯЦАМ */}
				<div className="col-span-1 lg:col-span-2 bg-white/60 backdrop-blur-xl border border-white rounded-[2rem] p-6 shadow-sm">
					<div className="flex items-center gap-3 mb-6">
						<div className="p-3 bg-blue-100 text-blue-600 rounded-2xl">
							<Activity size={24} />
						</div>
						<h2 className="text-lg font-bold text-slate-800">Тренд поведения школы (последние 6 месяцев)</h2>
					</div>
					<div className="h-[300px] w-full">
						<ResponsiveContainer width="100%" height="100%">
							<LineChart data={stats.trend_data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
								<CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
								<XAxis dataKey="month" stroke="#94a3b8" tick={{ fill: '#64748b' }} axisLine={false} tickLine={false} />
								<YAxis stroke="#94a3b8" tick={{ fill: '#64748b' }} axisLine={false} tickLine={false} />
								<Tooltip
									contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
								/>
								<Legend wrapperStyle={{ paddingTop: '20px' }} />
								<Line type="monotone" name="Поощрения (+)" dataKey="bonuses" stroke="#10b981" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
								<Line type="monotone" name="Нарушения (-)" dataKey="violations" stroke="#ef4444" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
							</LineChart>
						</ResponsiveContainer>
					</div>
				</div>

				{/* 6. ТОП-10 ЛУЧШИХ И ТОП-10 ХУДШИХ УЧЕНИКОВ */}
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-6 col-span-1 lg:col-span-2">
					{/* ТОП-10 ХУДШИХ */}
					<div className="bg-white/60 backdrop-blur-xl border border-white rounded-[2rem] p-6 shadow-sm">
						<div className="flex items-center gap-3 mb-6">
							<div className="p-3 bg-red-100 text-red-600 rounded-2xl">
								<TrendingDown size={24} />
							</div>
							<h2 className="text-lg font-bold text-slate-800">Топ-10 нарушителей</h2>
						</div>
						<div className="space-y-3">
							{stats.top_10_worst?.map((student: StudentStat, idx: number) => (
								<div key={student.id} className="flex items-center justify-between bg-white p-3 rounded-xl shadow-sm border border-slate-100">
									<div className="flex items-center gap-3">
										<div className="w-8 h-8 rounded-full bg-red-100 text-red-600 flex items-center justify-center font-bold text-xs">
											#{idx + 1}
										</div>
										<div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 overflow-hidden font-bold">
											{/* Placeholder for photo */}
											{student.first_name?.[0]}{student.last_name?.[0]}
										</div>
										<div>
											<p className="font-bold text-slate-800 text-sm">{student.last_name} {student.first_name}</p>
											<p className="text-xs text-slate-500">{student.class_name}</p>
										</div>
									</div>
									<div className="font-black text-red-500 bg-red-50 px-3 py-1 rounded-lg">
										{student.points} б.
									</div>
								</div>
							))}
						</div>
					</div>

					{/* ТОП-10 ЛУЧШИХ */}
					<div className="bg-white/60 backdrop-blur-xl border border-white rounded-[2rem] p-6 shadow-sm">
						<div className="flex items-center gap-3 mb-6">
							<div className="p-3 bg-emerald-100 text-emerald-600 rounded-2xl">
								<TrendingUp size={24} />
							</div>
							<h2 className="text-lg font-bold text-slate-800">Топ-10 лучших учеников</h2>
						</div>
						<div className="space-y-3">
							{stats.top_10_best?.map((student: StudentStat, idx: number) => (
								<div key={student.id} className="flex items-center justify-between bg-white p-3 rounded-xl shadow-sm border border-slate-100">
									<div className="flex items-center gap-3">
										<div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold text-xs">
											#{idx + 1}
										</div>
										<div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 overflow-hidden font-bold">
											{/* Placeholder for photo */}
											{student.first_name?.[0]}{student.last_name?.[0]}
										</div>
										<div>
											<p className="font-bold text-slate-800 text-sm">{student.last_name} {student.first_name}</p>
											<p className="text-xs text-slate-500">{student.class_name}</p>
										</div>
									</div>
									<div className="font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-lg">
										{student.points} б.
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
							<h3 className="text-xl font-black tracking-tight">Ифтихори мактаб (300+ хол)</h3>
							<p className="text-[13px] text-indigo-100 font-medium mt-1">Номзадҳо барои экскурсия ва имтиёзҳо (Гордость школы)</p>
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
											<p className="text-[12px] text-indigo-200 mt-0.5">Синфи {student.class_name}</p>
										</div>
									</div>
									<div className="flex items-center gap-2 bg-black/20 px-4 py-2 rounded-lg">
										<span className="font-black text-xl text-yellow-300 drop-shadow-md">
											{student.total}
										</span>
										<span className="text-[10px] font-bold text-indigo-200 uppercase tracking-widest">хол</span>
									</div>
								</div>
							))
						) : (
							<div className="bg-white/5 border border-white/10 rounded-xl p-8 text-center">
								<Award size={32} className="text-indigo-300/50 mx-auto mb-3" />
								<p className="text-sm text-indigo-200 font-medium">Ҳоло чунин хонандагон нестанд (Пока нет отличников с 300+ баллами)</p>
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
	return (
		<div
			onClick={onClick}
			className={onClick ? "cursor-pointer group hover:bg-white/50 p-2 -m-2 rounded-xl transition-colors" : ""}
		>
			<div className="flex justify-between text-sm font-semibold mb-1">
				<span className="text-slate-700">{label}</span>
				<span className="text-slate-500">{count} случаев</span>
			</div>
			<div className="w-full bg-slate-100 rounded-full h-3 border border-slate-200/50 overflow-hidden">
				<div
					className={`${color} h-full rounded-full transition-all duration-1000 ease-out`}
					style={{ width: `${Math.max(value, 2)}%` }} // Оставим минимум 2%, чтобы было видно цвет, даже если 0
				></div>
			</div>
		</div>
	);
}