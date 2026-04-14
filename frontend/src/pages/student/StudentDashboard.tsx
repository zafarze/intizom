import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { Trophy, ShieldAlert, BookOpen, ThumbsUp, TrendingDown, History, Target, AlertTriangle, ShieldCheck, Loader2 } from 'lucide-react';
import api from '../../api/axios';

// 👇 ДОБАВИЛИ status_info В ИНТЕРФЕЙС
interface StudentData {
	id: number;
	first_name: string;
	last_name: string;
	class_name: string;
	points: number;
	status_info: { level: string; text: string };
	rank: number;
	total_students: number;
	recent_logs: {
		id: number;
		rule_title: string;
		points_impact: number;
		teacher_name: string;
		created_at: string;
		is_positive: boolean;
	}[];
}

export default function StudentDashboard() {
  const { t } = useTranslation();

	const [student, setStudent] = useState<StudentData | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState('');

	useEffect(() => {
		const fetchStudentData = async () => {
			try {
				const response = await api.get('students/me/');
				setStudent(response.data);
			} catch (err: any) {
				console.error(t('auto.t_33_oshibka_zagruzki_dashborda'), err);
				setError(t('auto.t_85_ne_udalos_zagruzit_dannye'));
			} finally {
				setIsLoading(false);
			}
		};

		fetchStudentData();
	}, []);

	if (isLoading) {
		return (
			<div className="h-[calc(100vh-100px)] flex flex-col items-center justify-center text-indigo-500">
				<Loader2 className="animate-spin mb-4" size={48} />
				<p className="font-bold text-slate-500">{t('auto.t_183_zagruzka_vashego_dnevnika')}</p>
			</div>
		);
	}

	if (error || !student) {
		return (
			<div className="h-[calc(100vh-100px)] flex flex-col items-center justify-center text-red-500">
				<ShieldAlert size={48} className="mb-4" />
				<p className="font-bold text-slate-700">{error || t('auto.t_160_proizoshla_oshibka')}</p>
			</div>
		);
	}

	// --- ЛОГИКА ЦВЕТОВ И СТАТУСОВ (Синхронизировано с Бэкендом) ---
	let statusConfig = { color: '', bg: '', icon: null as any, message: '', alert: '' };
	const lvl = student.status_info?.level || 'excellent';
	const statusText = student.status_info?.text || t('auto.t_202_obraztsovyy');

	if (lvl === 'excellent') {
		statusConfig = { color: 'text-green-500', bg: 'bg-green-500', icon: <ShieldCheck size={24} className="text-green-500" />, message: t('auto.t_66_otlichnaya_distsiplina_tak_derzhat'), alert: 'bg-green-50 text-green-700 border-green-200' };
	} else if (lvl === 'warning') {
		statusConfig = { color: 'text-yellow-500', bg: 'bg-yellow-500', icon: <AlertTriangle size={24} className="text-yellow-500" />, message: t('auto.t_138_vy_poteryali_neskolko_ballov'), alert: 'bg-yellow-50 text-yellow-700 border-yellow-200' };
	} else if (lvl === 'danger') {
		statusConfig = { color: 'text-orange-500', bg: 'bg-orange-500', icon: <ShieldAlert size={24} className="text-orange-500" />, message: t('auto.t_174_kriticheskaya_situatsiya_v_shkolu'), alert: 'bg-orange-50 text-orange-700 border-orange-200' };
	} else {
		statusConfig = { color: 'text-red-500', bg: 'bg-red-500', icon: <ShieldAlert size={24} className="text-red-500" />, message: t('auto.t_213_vashe_delo_peredano_na'), alert: 'bg-red-50 text-red-700 border-red-200' };
	}

	// Защита прогресс-бара: баллы от 0 до 100 для корректной отрисовки SVG
	const safePointsForSVG = Math.min(Math.max(student.points, 0), 100);
	const strokeDashoffset = 251.2 - (251.2 * safePointsForSVG) / 100;

	return (
		<div className="space-y-6 max-w-7xl mx-auto pb-8 animate-in fade-in duration-500">

			{/* 1. ГЛАВНЫЙ БАННЕР (ГЕЙМИФИКАЦИЯ) */}
			<div className="relative bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-800 rounded-[2.5rem] p-8 sm:p-10 text-white shadow-xl overflow-hidden">
				<div className="absolute top-[-20%] right-[-5%] w-[400px] h-[400px] bg-white/10 rounded-full blur-[50px] pointer-events-none"></div>
				<div className="absolute bottom-[-10%] left-[-5%] w-[300px] h-[300px] bg-black/20 rounded-full blur-[40px] pointer-events-none"></div>

				<div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-8">
					<div className="text-center md:text-left">
						{student.rank > 0 && (
							<div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md px-4 py-1.5 rounded-full text-sm font-bold border border-white/30 mb-6 shadow-sm">
								<Trophy size={16} className="text-yellow-300" />
								Место в классе: #{student.rank} из {student.total_students}
							</div>
						)}
						<h1 className="text-4xl sm:text-5xl font-black mb-2 tracking-tight">{student.first_name} {student.last_name}</h1>
						<p className="text-indigo-100 text-lg font-medium">Ученик класса {student.class_name}</p>
					</div>

					{/* Индикатор баллов */}
					<div className="relative w-48 h-48 flex items-center justify-center shrink-0">
						<svg className="w-full h-full transform -rotate-90 drop-shadow-lg" viewBox="0 0 100 100">
							<circle cx="50" cy="50" r="40" stroke="rgba(255,255,255,0.2)" strokeWidth="8" fill="none" />
							<circle
								cx="50" cy="50" r="40"
								stroke={student.points > 100 ? "#34d399" : "white"}
								strokeWidth="8" fill="none"
								strokeDasharray="251.2"
								strokeDashoffset={strokeDashoffset}
								className="transition-all duration-1000 ease-out"
								strokeLinecap="round"
							/>
						</svg>
						<div className="absolute flex flex-col items-center justify-center text-center">
							<span className={`text-5xl font-black ${student.points > 100 ? 'text-emerald-300' : 'text-white'}`}>
								{student.points}
							</span>
							<span className="text-[10px] font-bold uppercase tracking-widest text-indigo-100 mt-1">{t('auto.t_79_ballov_sin')}</span>
						</div>
					</div>
				</div>
			</div>

			{/* 2. СТАТУС И СОВЕТЫ */}
			<div className="grid grid-cols-1 md:grid-cols-2 gap-6">

				{/* Текущий статус */}
				<div className="bg-white/60 backdrop-blur-xl border border-white rounded-[2rem] p-6 shadow-sm flex flex-col justify-center">
					<h2 className="text-[13px] font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
						<Target size={18} /> Ваш текущий статус
					</h2>
					<div className={`p-5 rounded-2xl border ${statusConfig.alert} flex items-start gap-4 transition-all`}>
						<div className={`p-3 bg-white rounded-xl shadow-sm shrink-0 ${statusConfig.color}`}>
							{statusConfig.icon}
						</div>
						<div>
							<h3 className={`text-lg font-black ${statusConfig.color} mb-1`}>{statusText}</h3>
							<p className="text-sm font-semibold opacity-80 leading-relaxed">{statusConfig.message}</p>
						</div>
					</div>
				</div>

				{/* Как улучшить балл? */}
				<div className="bg-white/60 backdrop-blur-xl border border-white rounded-[2rem] p-6 shadow-sm">
					<h2 className="text-[13px] font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
						<ThumbsUp size={18} /> Как заработать баллы?
					</h2>
					<div className="space-y-3">
						<div className="flex items-center justify-between p-3.5 bg-green-50/50 border border-green-100 rounded-xl hover:bg-green-50 transition-colors group">
							<div className="flex items-center gap-3">
								<div className="p-2 bg-green-100 text-green-600 rounded-lg group-hover:scale-110 transition-transform"><BookOpen size={18} /></div>
								<span className="font-bold text-slate-700 text-[13px]">{t('auto.t_199_prochitat_knigu_vne_programmy')}</span>
							</div>
							<span className="font-black text-green-600 bg-white px-2.5 py-1 rounded-md shadow-sm border border-green-100">{t('auto.t_39_5_ballov')}</span>
						</div>
						<div className="flex items-center justify-between p-3.5 bg-blue-50/50 border border-blue-100 rounded-xl hover:bg-blue-50 transition-colors group">
							<div className="flex items-center gap-3">
								<div className="p-2 bg-blue-100 text-blue-600 rounded-lg group-hover:scale-110 transition-transform"><ThumbsUp size={18} /></div>
								<span className="font-bold text-slate-700 text-[13px]">{t('auto.t_186_pomoshch_shkole_dobroe_delo')}</span>
							</div>
							<span className="font-black text-blue-600 bg-white px-2.5 py-1 rounded-md shadow-sm border border-blue-100">{t('auto.t_39_5_ballov')}</span>
						</div>
						<div className="flex items-center justify-between p-3.5 bg-purple-50/50 border border-purple-100 rounded-xl hover:bg-purple-50 transition-colors group">
							<div className="flex items-center gap-3">
								<div className="p-2 bg-purple-100 text-purple-600 rounded-lg group-hover:scale-110 transition-transform"><ShieldCheck size={18} /></div>
								<span className="font-bold text-slate-700 text-[13px]">{t('auto.t_117_mesyats_bez_narusheniy')}</span>
							</div>
							<span className="font-black text-purple-600 bg-white px-2.5 py-1 rounded-md shadow-sm border border-purple-100">{t('auto.t_118_10_ballov')}</span>
						</div>
					</div>
				</div>

			</div>

			{/* 3. ИСТОРИЯ ДИСЦИПЛИНЫ */}
			<div className="bg-white/60 backdrop-blur-xl border border-white rounded-[2rem] p-6 shadow-sm">
				<div className="flex justify-between items-center mb-6">
					<h2 className="text-lg font-bold text-slate-800 flex items-center gap-2"><History size={20} className="text-indigo-500" /> История изменений</h2>
				</div>

				{/* Идеально ровный Таймлайн */}
				<div className="relative border-l-2 border-slate-200 ml-3 sm:ml-4 space-y-8 pb-4">
					{student.recent_logs.length > 0 ? (
						student.recent_logs.map((log) => (
							<div key={log.id} className="relative pl-6 sm:pl-8">
								{/* Иконка-точка. -left-[13px] центрирует 24px кружок на 2px линии (-(24/2)+1). На sm: -left-[17px] для 32px */}
								<div className={`absolute -left-[13px] sm:-left-[17px] top-2 w-6 h-6 sm:w-8 sm:h-8 rounded-full border-4 border-white flex items-center justify-center shadow-sm ${log.is_positive ? 'bg-green-100' : 'bg-red-100'}`}>
									{log.is_positive ? <Trophy size={12} className="text-green-600 sm:w-3.5 sm:h-3.5" /> : <TrendingDown size={12} className="text-red-600 sm:w-3.5 sm:h-3.5" />}
								</div>
								<div className="bg-white/80 border border-white p-4 rounded-2xl shadow-sm hover:shadow-md transition-all">
									<div className="flex justify-between items-start sm:items-center flex-col sm:flex-row gap-2 sm:gap-0">
										<div>
											<h4 className="font-bold text-slate-800">{log.rule_title}</h4>
											<p className="text-[12px] font-medium text-slate-500 mt-1">Зафиксировал: {log.teacher_name}</p>
										</div>
										<div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
											<span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
												{new Date(log.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
											</span>
											<span className={`font-black px-3 py-1.5 rounded-xl border shadow-sm ${log.is_positive ? 'text-green-600 bg-green-50 border-green-100' : 'text-red-600 bg-red-50 border-red-100'}`}>
												{log.is_positive ? '+' : ''}{log.points_impact} баллов
											</span>
										</div>
									</div>
								</div>
							</div>
						))
					) : (
						<div className="text-center text-slate-500 py-6 font-medium pl-6">{t('auto.t_20_istoriya_pusta_vash_dnevnik')}</div>
					)}

					{/* Финальная точка старта системы */}
					<div className="relative pl-6 sm:pl-8">
						<div className="absolute -left-[13px] sm:-left-[17px] top-1 w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-slate-200 border-4 border-white flex items-center justify-center shadow-sm">
							<div className="w-2 h-2 bg-slate-400 rounded-full"></div>
						</div>
						<div className="pt-1.5">
							<h4 className="font-bold text-slate-500 text-[13px]">{t('auto.t_139_nachalo_chetverti')}</h4>
							<p className="text-[11px] font-bold text-slate-400 mt-1">{t('auto.t_59_nachisleno_100_startovyh_ballov')}</p>
						</div>
					</div>

				</div>
			</div>
		</div>
	);
}