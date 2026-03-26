import { useState, useEffect, useCallback } from 'react';
import { Search, Star, CheckCircle2, Award, Clock, Smartphone, UserX, XCircle, Zap, Loader2 } from 'lucide-react';
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
	status_info?: { level: string; text: string };
}

interface Rule {
	id: number;
	title: string;
	category: string;
	points_impact: number;
}

interface ActionLog {
	id: number;
	student_detail: Student;
	rule_detail: Rule;
	created_at: string;
}

// Метаданные для UI (цвета и иконки для категорий)
const CATEGORY_UI_CONFIG: Record<string, any> = {
	'A': { desc: 'Мелкие (-5)', color: 'bg-yellow-100 text-yellow-700 border-yellow-200', activeBg: 'bg-yellow-500 text-white', icon: <Clock size={18} /> },
	'B': { desc: 'Средние (-15)', color: 'bg-orange-100 text-orange-700 border-orange-200', activeBg: 'bg-orange-500 text-white', icon: <Smartphone size={18} /> },
	'C': { desc: 'Серьезные (-35)', color: 'bg-red-100 text-red-700 border-red-200', activeBg: 'bg-red-500 text-white', icon: <UserX size={18} /> },
	'D': { desc: 'Особо тяжкие (-55)', color: 'bg-rose-100 text-rose-700 border-rose-200', activeBg: 'bg-rose-600 text-white', icon: <XCircle size={18} /> },
	'BONUS': { desc: 'Бонусы (+)', color: 'bg-green-100 text-green-700 border-green-200', activeBg: 'bg-green-500 text-white', icon: <Award size={18} /> }
};

export default function TeacherDashboard() {
	// --- СОСТОЯНИЯ ---
	const [students, setStudents] = useState<Student[]>([]);
	const [rulesGrouped, setRulesGrouped] = useState<Record<string, Rule[]>>({});
	const [recentLogs, setRecentLogs] = useState<ActionLog[]>([]); // 👈 Добавили состояние для истории

	const [searchQuery, setSearchQuery] = useState('');
	const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
	const [activeGroup, setActiveGroup] = useState<string | null>(null);
	const [selectedRule, setSelectedRule] = useState<Rule | null>(null);

	// Состояния загрузки и уведомлений
	const [isLoading, setIsLoading] = useState(true);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [successMessage, setSuccessMessage] = useState('');

	// ==========================================
	// 2. ЗАГРУЗКА ДАННЫХ ИЗ DJANGO
	// ==========================================
	// Обернули в useCallback, чтобы можно было вызывать после сохранения оценки
	const fetchData = useCallback(async () => {
		try {
			// Добавили запрос к logs/ для истории учителя
			const [studentsRes, rulesRes, logsRes] = await Promise.all([
				api.get('students/'),
				api.get('rules/'),
				api.get('logs/')
			]);

			const studentsData = studentsRes.data.results || studentsRes.data;
			const rulesData = rulesRes.data.results || rulesRes.data;
			const logsData = logsRes.data.results || logsRes.data;

			setStudents(studentsData);
			setRecentLogs(logsData);

			const grouped = rulesData.reduce((acc: any, rule: Rule) => {
				if (!acc[rule.category]) acc[rule.category] = [];
				acc[rule.category].push(rule);
				return acc;
			}, {});
			setRulesGrouped(grouped);

		} catch (error) {
			console.error("Ошибка загрузки данных:", error);
		} finally {
			setIsLoading(false);
		}
	}, []);

	useEffect(() => {
		fetchData();
	}, [fetchData]);

	const filteredStudents = searchQuery
		? students.filter(s =>
			`${s.first_name} ${s.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
			(s.class_name && s.class_name.toLowerCase().includes(searchQuery.toLowerCase()))
		)
		: [];

	const handleReset = () => {
		setSelectedStudent(null);
		setActiveGroup(null);
		setSelectedRule(null);
		setSearchQuery('');
		setSuccessMessage('');
	};

	// ==========================================
	// 3. ОТПРАВКА ЖУРНАЛА (POST)
	// ==========================================
	const handleSubmit = async () => {
		if (!selectedStudent || !selectedRule) return;

		setIsSubmitting(true);
		try {
			await api.post('logs/', {
				student_id: selectedStudent.id,
				rule_id: selectedRule.id,
				description: 'Зафиксировано через быстрый пульт учителя'
			});

			setSuccessMessage(`Успешно! Баллы для ${selectedStudent.first_name} обновлены.`);

			// 👈 ОБНОВЛЯЕМ ДАННЫЕ, чтобы баллы ученика и история сразу обновились на экране
			await fetchData();

			setTimeout(() => {
				handleReset();
			}, 3000);

		} catch (error) {
			console.error("Ошибка при сохранении:", error);
			alert("Произошла ошибка при сохранении. Попробуйте еще раз.");
		} finally {
			setIsSubmitting(false);
		}
	};

	if (isLoading) {
		return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-indigo-500" size={40} /></div>;
	}

	return (
		<div className="space-y-6 max-w-7xl mx-auto pb-8 animate-in fade-in duration-500">

			{/* 1. ШАПКА */}
			<div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 bg-white/40 backdrop-blur-md border border-white p-6 rounded-[2rem] shadow-sm">
				<div>
					<h1 className="text-2xl font-black text-slate-800 tracking-tight">Здравствуйте, Учитель!</h1>
					<p className="text-sm font-medium text-slate-500 mt-1 flex items-center gap-2">
						<Star size={14} className="text-orange-400 fill-orange-400" />
						Панель управления дисциплиной
					</p>
				</div>
			</div>

			{/* УВЕДОМЛЕНИЕ ОБ УСПЕХЕ */}
			{successMessage && (
				<div className="bg-green-100 border border-green-200 text-green-800 px-4 py-3 rounded-2xl flex items-center gap-2 animate-in slide-in-from-top-2">
					<CheckCircle2 size={20} className="text-green-600" />
					<span className="font-bold text-sm">{successMessage}</span>
				</div>
			)}

			{/* 2. РАБОЧАЯ ЗОНА */}
			<div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

				{/* ГЛАВНЫЙ ВИДЖЕТ */}
				<div className="xl:col-span-2 bg-white/60 backdrop-blur-xl border border-white rounded-[2rem] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col">
					<div className="flex items-center gap-3 mb-6 border-b border-white pb-4">
						<div className="w-10 h-10 rounded-xl bg-indigo-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
							<Zap size={20} />
						</div>
						<div>
							<h2 className="text-lg font-black text-slate-800">Быстрая фиксация</h2>
							<p className="text-[12px] font-bold text-slate-400 uppercase tracking-wider">Журнал СИН</p>
						</div>
					</div>

					{/* ШАГ 1: Поиск ученика */}
					<div className="relative z-20 mb-6">
						<label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2 block ml-1">1. Выберите ученика</label>
						{!selectedStudent ? (
							<div className="relative">
								<div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
									<Search size={18} className="text-slate-400" />
								</div>
								<input
									type="text"
									placeholder="Введите имя или класс (например: Умед или 9 Б)..."
									value={searchQuery}
									onChange={(e) => setSearchQuery(e.target.value)}
									className="w-full bg-white border border-white focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100/50 rounded-2xl pl-11 pr-4 py-4 text-[15px] font-medium text-slate-800 placeholder-slate-400 outline-none transition-all shadow-sm"
								/>

								{/* Выпадающий список поиска */}
								{searchQuery && (
									<div className="absolute top-full left-0 right-0 mt-2 bg-white/90 backdrop-blur-3xl border border-white rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.1)] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
										{filteredStudents.length > 0 ? (
											filteredStudents.map(s => (
												<button
													key={s.id}
													onClick={() => { setSelectedStudent(s); setSearchQuery(''); }}
													className="w-full text-left px-4 py-3 hover:bg-indigo-50 flex items-center justify-between transition-colors border-b border-slate-50 last:border-0"
												>
													<div>
														<p className="font-bold text-slate-800">{s.first_name} {s.last_name}</p>
														<p className="text-[12px] font-medium text-slate-500">Класс: {s.class_name || 'Нет класса'}</p>
													</div>
													<div className={`px-2 py-1 rounded-md text-[11px] font-bold ${s.points >= 80 ? 'bg-green-100 text-green-700' : s.points >= 50 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
														{s.points} баллов
													</div>
												</button>
											))
										) : (
											<div className="px-4 py-6 text-center text-slate-500 text-sm font-medium">Ученик не найден</div>
										)}
									</div>
								)}
							</div>
						) : (
							/* Выбранный ученик */
							<div className="flex items-center justify-between bg-indigo-50 border border-indigo-100 rounded-2xl p-4 shadow-inner animate-in zoom-in-95 duration-200">
								<div className="flex items-center gap-4">
									<div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center font-black text-indigo-600 border border-indigo-100">
										{selectedStudent.first_name.charAt(0)}
									</div>
									<div>
										<p className="font-black text-slate-800 text-lg">{selectedStudent.first_name} {selectedStudent.last_name}</p>
										<p className="text-sm font-bold text-indigo-600">Класс: {selectedStudent.class_name || '-'} • {selectedStudent.points} баллов</p>
									</div>
								</div>
								<button onClick={handleReset} className="p-2 text-slate-400 hover:text-red-500 transition-colors bg-white rounded-xl shadow-sm border border-slate-100">
									<XCircle size={20} />
								</button>
							</div>
						)}
					</div>

					{/* ШАГ 2: Категория нарушения */}
					<div className={`transition-all duration-500 ${selectedStudent ? 'opacity-100 max-h-[800px]' : 'opacity-30 pointer-events-none max-h-[400px]'}`}>
						<label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3 block ml-1">2. Категория СИН</label>
						<div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
							{Object.keys(CATEGORY_UI_CONFIG).map((categoryKey) => {
								const ui = CATEGORY_UI_CONFIG[categoryKey];
								if (!rulesGrouped[categoryKey]) return null;

								return (
									<button
										key={categoryKey}
										onClick={() => { setActiveGroup(categoryKey); setSelectedRule(null); }}
										className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all duration-300 ${activeGroup === categoryKey
											? `${ui.activeBg} shadow-lg transform scale-[1.02] border-transparent`
											: `bg-white hover:bg-slate-50 border-slate-100 shadow-sm text-slate-600`
											}`}
									>
										<div className={`mb-2 p-2 rounded-xl ${activeGroup === categoryKey ? 'bg-white/20' : ui.color}`}>
											{ui.icon}
										</div>
										<p className="text-[12px] font-black tracking-tight">Группа {categoryKey}</p>
										<p className={`text-[10px] font-bold mt-0.5 ${activeGroup === categoryKey ? 'text-white/80' : 'text-slate-400'}`}>{ui.desc}</p>
									</button>
								);
							})}
						</div>

						{/* ШАГ 3: Конкретная причина из БД */}
						{activeGroup && rulesGrouped[activeGroup] && (
							<div className="animate-in slide-in-from-top-4 duration-300 bg-slate-50/50 rounded-2xl p-5 border border-slate-100/50 mb-6">
								<label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3 block">3. Выберите причину</label>
								<div className="flex flex-wrap gap-2">
									{rulesGrouped[activeGroup].map((rule) => (
										<button
											key={rule.id}
											onClick={() => setSelectedRule(rule)}
											className={`px-4 py-2.5 rounded-xl text-[13px] font-bold border transition-all text-left ${selectedRule?.id === rule.id
												? `bg-white border-slate-300 text-slate-800 shadow-md ring-2 ring-offset-1 ${activeGroup === 'BONUS' ? 'ring-green-400' : 'ring-indigo-400'}`
												: 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:shadow-sm'
												}`}
										>
											{rule.title} <span className="opacity-50 ml-1">({rule.points_impact > 0 ? `+${rule.points_impact}` : rule.points_impact})</span>
										</button>
									))}
								</div>
							</div>
						)}

						{/* КНОПКА ОТПРАВКИ В БД */}
						<button
							disabled={!selectedRule || isSubmitting}
							onClick={handleSubmit}
							className={`w-full py-4 rounded-2xl font-black text-[15px] flex items-center justify-center gap-2 transition-all duration-300 ${selectedRule
								? activeGroup === 'BONUS'
									? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg hover:shadow-xl hover:shadow-green-500/30 active:scale-[0.98]'
									: 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg hover:shadow-xl hover:shadow-indigo-500/30 active:scale-[0.98]'
								: 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
								}`}
						>
							{isSubmitting ? (
								<><Loader2 size={20} className="animate-spin" /> Сохранение...</>
							) : selectedRule ? (
								<>
									<CheckCircle2 size={20} />
									{activeGroup === 'BONUS' ? 'Начислить баллы' : 'Зафиксировать нарушение'}
								</>
							) : 'Заполните все поля'}
						</button>
					</div>
				</div>

				{/* БОКОВАЯ КОЛОНКА (ИСТОРИЯ УЧИТЕЛЯ - ОЖИВЛЕНА!) */}
				<div className="bg-white/60 backdrop-blur-xl border border-white rounded-[2rem] p-6 shadow-sm flex flex-col h-full overflow-hidden">
					<h2 className="text-lg font-bold text-slate-800 mb-6 border-b border-white pb-4">Ваша недавняя история</h2>
					<div className="flex-1 overflow-y-auto pr-2 space-y-4 hide-scrollbar">
						{recentLogs.length > 0 ? (
							recentLogs.slice(0, 10).map(log => {
								const isPositive = log.rule_detail.points_impact > 0;
								return (
									<div key={log.id} className={`p-4 rounded-2xl border ${isPositive ? 'bg-green-50/50 border-green-100' : 'bg-red-50/50 border-red-100'}`}>
										<div className="flex justify-between items-start mb-2">
											<span className="font-bold text-[13px] text-slate-700">
												{log.student_detail.first_name} {log.student_detail.last_name}
											</span>
											<span className={`text-[12px] font-black px-2 py-1 rounded-lg ${isPositive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
												{isPositive ? '+' : ''}{log.rule_detail.points_impact}
											</span>
										</div>
										<p className="text-[11px] font-medium text-slate-500 mb-2">{log.rule_detail.title}</p>
										<p className="text-[9px] font-bold text-slate-400 uppercase">
											{new Date(log.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
										</p>
									</div>
								);
							})
						) : (
							<div className="text-center text-sm font-medium text-slate-400 mt-10">
								Вы еще не выставили ни одной оценки.
							</div>
						)}
					</div>
				</div>

			</div>
		</div>
	);
}