import { useState, useEffect } from 'react';
import { PieChart, BarChart3, TrendingUp, Award, Loader2, ShieldAlert } from 'lucide-react';
import api from '../../api/axios';

export default function Statistics() {
	const [stats, setStats] = useState<any>(null);
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

	return (
		<div className="space-y-6 max-w-7xl mx-auto pb-8 animate-in fade-in duration-500">
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
						/>
						<StatBar
							label="Группа Б (Средние)"
							value={stats.violations.B.percent}
							color="bg-orange-400"
							count={stats.violations.B.count}
						/>
						<StatBar
							label="Группа В (Серьезные)"
							value={stats.violations.C.percent}
							color="bg-red-400"
							count={stats.violations.C.count}
						/>
						<StatBar
							label="Группа Г (Особо тяжкие)"
							value={stats.violations.D.percent}
							color="bg-red-600"
							count={stats.violations.D.count}
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
						/>
						<StatBar
							label="Устное предупреждение (70-89 баллов)"
							value={stats.risk_levels.verbal.percent}
							color="bg-yellow-500"
							count={stats.risk_levels.verbal.count}
						/>
						<StatBar
							label="Письм. предупреждение (45-69 баллов)"
							value={stats.risk_levels.written.percent}
							color="bg-orange-500"
							count={stats.risk_levels.written.count}
						/>
						<StatBar
							label="Риск исключения (<45 баллов)"
							value={stats.risk_levels.risk.percent}
							color="bg-red-500"
							count={stats.risk_levels.risk.count}
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
							stats.super_students.map((student: any, idx: number) => (
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
function StatBar({ label, value, color, count }: any) {
	return (
		<div>
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