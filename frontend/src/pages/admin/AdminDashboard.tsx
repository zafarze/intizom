import { useState, useEffect } from 'react';
import { Users, TrendingUp, AlertOctagon, ShieldAlert, Download, Plus, Loader2 } from 'lucide-react';
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
	// --- СОСТОЯНИЯ ---
	const [stats, setStats] = useState<any>(null); // Храним статистику с бэкенда
	const [logs, setLogs] = useState<ActionLog[]>([]); // Оставляем логи для таблицы
	const [isLoading, setIsLoading] = useState(true);

	// ==========================================
	// 2. ЗАГРУЗКА ДАННЫХ ИЗ БАЗЫ
	// ==========================================
	useEffect(() => {
		const fetchDashboardData = async () => {
			try {
				// Запрашиваем новую статистику и логи (для таблицы) параллельно
				const [statsRes, logsRes] = await Promise.all([
					api.get('dashboard-stats/'),
					api.get('logs/')
				]);

				setStats(statsRes.data);
				// Поддержка пагинации DRF
				setLogs(logsRes.data.results || logsRes.data);
			} catch (error) {
				console.error("Ошибка при загрузке данных дашборда:", error);
			} finally {
				setIsLoading(false);
			}
		};

		fetchDashboardData();
	}, []);

	// ==========================================
	// 3. ВЫЧИСЛЕНИЕ СТАТИСТИКИ (Адаптировано)
	// ==========================================

	// Берем готовые цифры из нашего нового API
	const totalStudents = stats?.total_students || 0;
	const averageScore = stats?.average_score || '0';
	const atRiskCount = stats?.at_risk_count || 0;

	// Считаем сколько всего было нарушений (оставляем фильтр по логам, чтобы таблица работала как раньше)
	const violations = logs.filter(log => log.rule_detail && log.rule_detail.points_impact < 0);
	const violationsCount = violations.length;

	// Берем только 5 последних нарушений для красивой таблицы
	const recentViolations = violations.slice(0, 5);

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
				<p className="font-bold text-slate-500">Загрузка статистики...</p>
			</div>
		);
	}

	// Защита: Если бэкенд упал или вернул 404, показываем красивую ошибку вместо белого экрана
	if (!stats) {
		return (
			<div className="h-[calc(100vh-100px)] flex flex-col items-center justify-center gap-4 animate-in fade-in">
				<div className="p-4 bg-red-50 text-red-600 rounded-2xl font-bold border border-red-100 flex items-center gap-2">
					<ShieldAlert size={20} />
					Ошибка связи с сервером (API недоступно)
				</div>
				<button onClick={() => window.location.reload()} className="text-indigo-500 font-bold hover:text-indigo-600 transition-colors">
					Попробовать снова
				</button>
			</div>
		);
	}

	// --- ОСНОВНОЙ ДИЗАЙН (БЕЗ ИЗМЕНЕНИЙ) ---
	return (
		<div className="space-y-6 max-w-7xl mx-auto pb-8 animate-in fade-in duration-500">

			{/* Шапка дашборда */}
			<div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 bg-white/40 backdrop-blur-md border border-white p-6 rounded-[2rem] shadow-sm">
				<div>
					<h1 className="text-2xl font-black text-slate-800 tracking-tight">Панель Администратора</h1>
					<p className="text-sm font-medium text-slate-500 mt-1">Общая статистика школы и контроль дисциплины</p>
				</div>
				<div className="flex gap-3">
					<button className="flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 px-4 py-2.5 rounded-xl text-sm font-bold border border-slate-200 shadow-sm transition-all active:scale-95">
						<Download size={16} />
						<span className="hidden sm:inline">Отчет</span>
					</button>
					<button className="flex items-center gap-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold shadow-md hover:shadow-lg hover:shadow-indigo-500/20 transition-all active:scale-95 border border-indigo-400/50">
						<Plus size={16} />
						<span className="hidden sm:inline">Добавить ученика</span>
					</button>
				</div>
			</div>

			{/* Карточки статистики (ЖИВЫЕ ДАННЫЕ ИЗ НОВОГО API) */}
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
				<StatCard
					title="Всего учеников"
					value={totalStudents.toString()}
					subtitle="В базе данных"
					icon={<Users size={20} />}
					color="indigo"
				/>
				<StatCard
					title="Средний балл"
					value={averageScore.toString()}
					subtitle="По всей школе"
					trend="Live"
					trendUp
					icon={<TrendingUp size={20} />}
					color="green"
				/>
				<StatCard
					title="Нарушения"
					value={violationsCount.toString()}
					subtitle="За всё время"
					icon={<AlertOctagon size={20} />}
					color="orange"
				/>
				<StatCard
					title="Риск исключения"
					value={atRiskCount.toString()}
					subtitle="Баллы < 25"
					trend={atRiskCount > 0 ? "Нужен педсовет" : "Всё отлично"}
					trendDown={atRiskCount > 0}
					icon={<ShieldAlert size={20} />}
					color="red"
				/>
			</div>

			{/* Основной контент (Таблица + виджет) */}
			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

				{/* Таблица последних событий */}
				<div className="lg:col-span-2 bg-white/60 backdrop-blur-xl border border-white rounded-[2rem] p-6 shadow-sm flex flex-col">
					<div className="flex justify-between items-center mb-6">
						<h2 className="text-lg font-bold text-slate-800">Последние серьезные нарушения</h2>
						<button className="text-[13px] font-bold text-indigo-600 hover:text-indigo-800 transition-colors">Смотреть все</button>
					</div>

					<div className="overflow-x-auto flex-1">
						<table className="w-full text-left border-collapse">
							<thead>
								<tr className="border-b border-slate-200/60">
									<th className="pb-3 text-[12px] font-bold text-slate-400 uppercase tracking-wider">Ученик</th>
									<th className="pb-3 text-[12px] font-bold text-slate-400 uppercase tracking-wider">Класс</th>
									<th className="pb-3 text-[12px] font-bold text-slate-400 uppercase tracking-wider">Нарушение</th>
									<th className="pb-3 text-[12px] font-bold text-slate-400 uppercase tracking-wider text-right">Балл</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-slate-100">
								{recentViolations.length > 0 ? (
									recentViolations.map((log) => (
										<tr key={log.id} className="hover:bg-white/50 transition-colors group">
											<td className="py-4">
												<div className="font-bold text-slate-800 text-[14px]">
													{log.student_detail?.first_name} {log.student_detail?.last_name}
												</div>
												<div className="text-[11px] text-slate-400 font-medium">
													{formatDate(log.created_at)}
												</div>
											</td>
											<td className="py-4 text-[13px] font-medium text-slate-600">
												{log.student_detail?.class_name || '-'}
											</td>
											<td className="py-4 text-[13px] font-medium text-slate-600">
												{log.rule_detail?.title}
											</td>
											<td className="py-4 text-right">
												<span className="inline-flex items-center justify-center px-2.5 py-1 rounded-lg bg-red-50 text-red-600 border border-red-100 text-[12px] font-bold">
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
				<div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-[2rem] p-6 text-white shadow-lg relative overflow-hidden flex flex-col justify-between">
					<div className="absolute top-[-20%] right-[-10%] w-48 h-48 bg-white/20 rounded-full blur-[40px] pointer-events-none"></div>
					<div className="absolute bottom-[-10%] left-[-10%] w-32 h-32 bg-black/10 rounded-full blur-[30px] pointer-events-none"></div>

					<div className="relative z-10">
						<div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mb-6 border border-white/30">
							<TrendingUp size={24} className="text-white" />
						</div>
						<h2 className="text-xl font-bold mb-2">Динамика дисциплины</h2>
						<p className="text-indigo-100 text-sm font-medium leading-relaxed">
							Средний балл по школе сейчас составляет <strong>{averageScore}</strong>.
							{atRiskCount > 0
								? ` Обратите внимание, ${atRiskCount} учеников находятся в зоне риска исключения!`
								: ' Ситуация стабильная, учеников в зоне риска нет.'}
						</p>
					</div>

					<button className="relative z-10 mt-8 w-full bg-white text-indigo-600 font-bold py-3 rounded-xl shadow-md hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-300">
						Смотреть итоги месяца
					</button>
				</div>
			</div>
		</div>
	);
}