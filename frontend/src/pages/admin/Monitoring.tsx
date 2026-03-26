import { useState, useEffect } from 'react';
import { Activity, Users, ArrowUpRight, ArrowDownRight, Loader2, ShieldAlert } from 'lucide-react';
import api from '../../api/axios';

export default function Monitoring() {
	const [data, setData] = useState<any>(null);
	const [isLoading, setIsLoading] = useState(true);

	// Функция загрузки данных
	const fetchMonitoringData = async () => {
		try {
			const response = await api.get('monitoring/');
			setData(response.data);
		} catch (error) {
			console.error("Ошибка загрузки мониторинга:", error);
		} finally {
			setIsLoading(false);
		}
	};

	useEffect(() => {
		// Загружаем данные сразу при открытии страницы
		fetchMonitoringData();

		// МАГИЯ: Запускаем тихий таймер на обновление каждые 10 секунд!
		const intervalId = setInterval(() => {
			fetchMonitoringData();
		}, 10000);

		// Очищаем таймер, если пользователь ушел со страницы
		return () => clearInterval(intervalId);
	}, []);

	if (isLoading && !data) {
		return (
			<div className="h-[calc(100vh-100px)] flex flex-col items-center justify-center text-indigo-500">
				<Loader2 className="animate-spin mb-4" size={48} />
				<p className="font-bold text-slate-500">Подключение к Live-серверу...</p>
			</div>
		);
	}

	if (!data) {
		return (
			<div className="h-[calc(100vh-100px)] flex flex-col items-center justify-center gap-4 animate-in fade-in">
				<div className="p-4 bg-red-50 text-red-600 rounded-2xl font-bold border border-red-100 flex items-center gap-2">
					<ShieldAlert size={20} />
					Связь с сервером потеряна
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-6 max-w-7xl mx-auto pb-8 animate-in slide-in-from-bottom-4 duration-500">
			<div className="flex justify-between items-center bg-white/40 backdrop-blur-md border border-white p-6 rounded-[2rem] shadow-sm">
				<div>
					<h1 className="text-2xl font-black text-slate-800 flex items-center gap-3">
						Мониторинг <span className="bg-red-500 text-white text-[10px] uppercase px-2 py-0.5 rounded-full animate-pulse shadow-md shadow-red-500/20">Live</span>
					</h1>
					<p className="text-sm font-medium text-slate-500 mt-1">Данные обновляются автоматически каждые 10 секунд</p>
				</div>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
				{/* Рейтинг классов */}
				<div className="lg:col-span-2 bg-white/60 backdrop-blur-xl border border-white rounded-[2rem] p-6 shadow-sm flex flex-col">
					<h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
						<Users size={20} className="text-indigo-600" /> Рейтинг классов (Сравнение)
					</h2>

					<div className="space-y-3 overflow-y-auto pr-2 max-h-[600px] hide-scrollbar">
						{data.classes.length > 0 ? (
							data.classes.map((cls: any) => (
								<ClassRow
									key={cls.id}
									name={cls.name}
									score={cls.score}
									trend={cls.trend}
									isUp={cls.isUp}
								/>
							))
						) : (
							<p className="text-center text-slate-400 font-medium py-10">Классы еще не созданы</p>
						)}
					</div>
				</div>

				{/* Живая лента */}
				<div className="bg-white/60 backdrop-blur-xl border border-white rounded-[2rem] p-6 shadow-sm flex flex-col max-h-[700px]">
					<h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
						<Activity size={20} className="text-red-500" /> Лента активности
					</h2>

					<div className="flex-1 overflow-y-auto space-y-4 pr-2 hide-scrollbar">
						{data.live_logs.length > 0 ? (
							data.live_logs.map((log: any) => (
								<LiveItem
									key={log.id}
									text={log.text}
									time={getTimeAgo(log.time)}
									type={log.type}
								/>
							))
						) : (
							<p className="text-center text-slate-400 font-medium py-10">Нарушений нет! Все молодцы.</p>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}

// --- КОМПОНЕНТЫ ---

function ClassRow({ name, score, trend, isUp }: any) {
	return (
		<div className="flex items-center justify-between p-4 bg-white/50 border border-white rounded-2xl shadow-sm hover:shadow-md transition-all group">
			<div className="font-bold text-slate-700 w-20 text-[15px]">Класс {name}</div>
			<div className="flex-1 mx-4 h-2.5 bg-slate-100 rounded-full overflow-hidden relative">
				<div
					className={`absolute top-0 left-0 h-full transition-all duration-1000 ease-out rounded-full ${score >= 90 ? 'bg-green-500' : score >= 70 ? 'bg-yellow-500' : 'bg-red-500'}`}
					style={{ width: `${Math.min(Math.max(score, 0), 100)}%` }}
				></div>
			</div>
			<div className="flex items-center gap-4 w-32 justify-end">
				<span className="font-black text-slate-800">{score} б.</span>
				<span className={`flex items-center text-[12px] font-bold px-2 py-1 rounded-lg border ${isUp ? 'text-green-600 bg-green-50 border-green-100' : 'text-red-600 bg-red-50 border-red-100'}`}>
					{isUp ? <ArrowUpRight size={14} className="mr-1" /> : <ArrowDownRight size={14} className="mr-1" />}
					{trend}
				</span>
			</div>
		</div>
	);
}

function LiveItem({ text, time, type }: any) {
	return (
		<div className={`border-l-4 pl-4 py-2 bg-white/40 rounded-r-xl transition-all hover:bg-white/80 ${type === 'positive' ? 'border-green-500' : 'border-red-500'}`}>
			<p className="text-[13px] font-bold text-slate-700 leading-snug">{text}</p>
			<p className="text-[11px] text-slate-400 font-bold mt-1.5 uppercase tracking-wider">{time}</p>
		</div>
	);
}

// --- УТИЛИТА ДЛЯ КРАСИВОГО ВРЕМЕНИ ---
function getTimeAgo(isoDate: string) {
	const date = new Date(isoDate);
	const now = new Date();
	const seconds = Math.round((now.getTime() - date.getTime()) / 1000);
	const minutes = Math.round(seconds / 60);
	const hours = Math.round(minutes / 60);
	const days = Math.round(hours / 24);

	if (seconds < 60) return 'Только что';
	if (minutes < 60) return `${minutes} мин назад`;
	if (hours < 24) return `${hours} ч назад`;
	if (days === 1) return 'Вчера';
	return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}