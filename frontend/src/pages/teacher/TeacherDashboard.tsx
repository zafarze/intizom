import { useState, useEffect, useCallback } from 'react';
import { Search, CheckCircle2, Award, Clock, Smartphone, UserX, XCircle, Zap, Loader2, X, History, Users, ArrowLeft } from 'lucide-react';
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
	teacher_id: number;
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
	const [bells, setBells] = useState<any[]>([]); // Состояние расписания
	const [classes, setClasses] = useState<any[]>([]); // 👈 Состояние классов школы

	const [searchQuery, setSearchQuery] = useState('');
	const [selectedClass, setSelectedClass] = useState<string | null>(null);
	const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
	const [activeGroup, setActiveGroup] = useState<string | null>(null);
	const [selectedRule, setSelectedRule] = useState<Rule | null>(null);

	// Состояния загрузки и уведомлений
	const [isLoading, setIsLoading] = useState(true);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [successMessage, setSuccessMessage] = useState('');
	const [showMobileHistory, setShowMobileHistory] = useState(false);

	const [currentTime, setCurrentTime] = useState(new Date());

	useEffect(() => {
		const interval = setInterval(() => setCurrentTime(new Date()), 10000); // 10 sec update
		return () => clearInterval(interval);
	}, []);

	const userStr = localStorage.getItem('user');
	const user = userStr ? JSON.parse(userStr) : { name: 'Учитель' };

	// ==========================================
	// 2. ЗАГРУЗКА ДАННЫХ ИЗ DJANGO
	// ==========================================
	// Обернули в useCallback, чтобы можно было вызывать после сохранения оценки
	const fetchData = useCallback(async () => {
		try {
			// Добавили запрос к logs/ для истории учителя
			const [studentsRes, rulesRes, logsRes, bellsRes, classesRes] = await Promise.all([
				api.get('students/'),
				api.get('rules/'),
				api.get('logs/'),
				api.get('timetable/'),
				api.get('classes/')
			]);

			const studentsData = studentsRes.data.results || studentsRes.data;
			const rulesData = rulesRes.data.results || rulesRes.data;
			const logsData = logsRes.data.results || logsRes.data;
			const bellsData = bellsRes.data.results || bellsRes.data;
			const classesData = classesRes.data.results || classesRes.data;

			setStudents(studentsData);
			setRecentLogs(logsData);
			setBells(bellsData);
			setClasses(classesData);

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

	const uniqueClasses = Array.from(new Set(students.map(s => s.class_name))).filter(Boolean).sort();

	// Находим классное руководство (может быть несколько для одного учителя)
	const homeroomClasses = classes.filter(c => c.class_teacher_ids?.includes(user.id));
	const homeroomClassNames = homeroomClasses.map(c => c.name);

	const myClasses = uniqueClasses.filter(c => homeroomClassNames.includes(c));
	const otherClasses = uniqueClasses.filter(c => !homeroomClassNames.includes(c));

	const studentsInClass = selectedClass ? students.filter(s => s.class_name === selectedClass) : [];

	const handleReset = () => {
		setSelectedStudent(null);
		// WE DO NOT reset selectedClass here, so the teacher stays in the same class!
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

	// ==========================================
	// 4. ОТМЕНА ОЦЕНКИ (DELETE LOG)
	// ==========================================
	const handleDeleteLog = async (logId: number) => {
		if (!window.confirm("Вы уверены, что хотите отменить это действие?")) return;

		try {
			await api.delete(`logs/${logId}/`);
			setSuccessMessage("Действие успешно отменено.");
			await fetchData(); // Обновляем списки

			setTimeout(() => {
				setSuccessMessage('');
			}, 3000);
		} catch (error) {
			console.error("Ошибка при удалении:", error);
			alert("Произошла ошибка при отмене. Попробуйте еще раз.");
		}
	};

	if (isLoading) {
		return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-indigo-500" size={40} /></div>;
	}

	// ==========================================
	// 5. РАСЧЕТ РЕЖИМА ДНЯ
	// ==========================================
	const getMinutesFromMidnight = (date: Date) => date.getHours() * 60 + date.getMinutes();
	const getCurrentLessonInfo = () => {
		if (!bells || bells.length === 0) return { type: 'none', label: 'Расписание не загружено' };

		const currentMins = getMinutesFromMidnight(currentTime);

		for (let i = 0; i < bells.length; i++) {
			const bell = bells[i];
			const startParts = bell.start_time.split(':');
			const endParts = bell.end_time.split(':');
			const startMins = parseInt(startParts[0]) * 60 + parseInt(startParts[1]);
			const endMins = parseInt(endParts[0]) * 60 + parseInt(endParts[1]);

			if (currentMins >= startMins && currentMins <= endMins) {
				const percent = Math.max(0, Math.min(100, Math.round(((currentMins - startMins) / (endMins - startMins)) * 100)));
				return { type: 'lesson', label: `${bell.lesson_number} урок`, percent, remains: endMins - currentMins };
			}

			// check if it's break before the next lesson
			if (currentMins < startMins) {
				if (i === 0) return { type: 'before', label: 'До начала занятий', remains: startMins - currentMins };
				const prevBell = bells[i - 1];
				const pEndParts = prevBell.end_time.split(':');
				const pEndMins = parseInt(pEndParts[0]) * 60 + parseInt(pEndParts[1]);
				return { type: 'break', label: 'Перемена', remains: startMins - currentMins, totalBreak: startMins - pEndMins, passed: currentMins - pEndMins };
			}
		}

		return { type: 'after', label: 'Уроки окончены' };
	};

	const lessonInfo = getCurrentLessonInfo();

	const getFilteredLogs = () => {
		let logs = recentLogs;
		if (selectedStudent) {
			logs = logs.filter(log => log.student_detail.id === selectedStudent.id);
		} else if (selectedClass) {
			logs = logs.filter(log => log.student_detail.class_name === selectedClass);
		} else {
			logs = logs.filter(log => log.teacher_id === user.id);
		}
		return logs.slice(0, 10);
	};

	const displayedLogs = getFilteredLogs();

	return (
		<div className="space-y-6 max-w-7xl mx-auto pb-8 animate-in fade-in duration-500">

			{/* 1. ШАПКА И РАСПИСАНИЕ ЗВОНКОВ */}
			<div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 mb-4 mt-2 px-2">
				{/* Приветствие */}
				<div className="flex items-center gap-3">
					<h1 className="text-[15px] font-bold text-slate-500">
						👋 Здравствуйте, <span className="text-indigo-600 font-black">{user.name.split(' ')[0]}</span>!
					</h1>
				</div>

				{/* Мини-виджет расписания */}
				{bells.length > 0 && lessonInfo.type !== 'none' && (
					<div className="bg-white/70 backdrop-blur-xl border border-white px-4 py-3 rounded-2xl shadow-sm flex items-center justify-between sm:justify-end gap-5">
						<div className="flex items-center gap-3">
							<div className={`w-8 h-8 rounded-full flex items-center justify-center ${lessonInfo.type === 'lesson' ? 'bg-indigo-100 text-indigo-500 animate-pulse' : lessonInfo.type === 'break' ? 'bg-orange-100 text-orange-500' : 'bg-slate-100 text-slate-400'}`}>
								<Clock size={16} />
							</div>
							<div className="flex flex-col justify-center">
								<span className="text-[12px] font-black text-slate-800 tracking-wide leading-none">{lessonInfo.label}</span>
								{lessonInfo.type === 'lesson' && (
									<span className="text-[11px] font-bold text-indigo-500 mt-1 leading-none">Осталось {lessonInfo.remains} мин</span>
								)}
								{(lessonInfo.type === 'break' || lessonInfo.type === 'before') && (
									<span className="text-[11px] font-bold text-orange-500 mt-1 leading-none">Начнется через {lessonInfo.remains} мин</span>
								)}
								{lessonInfo.type === 'after' && (
									<span className="text-[11px] font-medium text-slate-400 mt-1 leading-none">Отдыхайте</span>
								)}
							</div>
						</div>

						{/* ProgressBar */}
						{lessonInfo.type === 'lesson' && (
							<div className="w-20 h-2 bg-slate-100 rounded-full overflow-hidden shrink-0 hidden sm:block">
								<div className="h-full bg-indigo-500 rounded-full transition-all duration-1000" style={{ width: `${lessonInfo.percent}%` }}></div>
							</div>
						)}
						{lessonInfo.type === 'break' && (
							<div className="w-20 h-2 bg-slate-100 rounded-full overflow-hidden shrink-0 hidden sm:block">
								<div className="h-full bg-orange-400 rounded-full transition-all duration-1000" style={{ width: `${((lessonInfo.passed ?? 0) / (lessonInfo.totalBreak ?? 1)) * 100}%` }}></div>
							</div>
						)}
					</div>
				)}
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
					<div className="flex items-center justify-between mb-6 border-b border-white pb-4">
						<div className="flex items-center gap-3">
							<div className="w-10 h-10 rounded-xl bg-indigo-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
								<Zap size={20} />
							</div>
							<div>
								<h2 className="text-lg font-black text-slate-800">Быстрая фиксация</h2>

							</div>
						</div>
						<button
							onClick={() => setShowMobileHistory(true)}
							className="xl:hidden flex items-center gap-2 px-3 py-2 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 transition-colors border border-indigo-100/50"
						>
							<History size={18} />
							<span className="text-[13px] font-bold">История</span>
						</button>
					</div>

					{/* WIZARD FLOW */}
					{!selectedClass && !selectedStudent && (
						<div className="animate-in fade-in zoom-in-95 duration-300 relative z-20 mb-6">
							<label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3 block ml-1">1. Выберите класс</label>

							{myClasses.length > 0 && (
								<div className="mb-6 bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100/50">
									<label className="text-[11px] font-black text-indigo-500 uppercase tracking-widest mb-3 block ml-1 flex items-center gap-1">
										<span>⭐️</span> ВАШ КЛАСС
									</label>
									<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
										{myClasses.map(cls => (
											<button
												key={`my-${cls}`}
												onClick={() => setSelectedClass(cls)}
												className="w-full relative overflow-hidden group py-4 px-4 bg-white hover:bg-indigo-600 rounded-2xl shadow-sm border-2 border-indigo-400 transition-all active:scale-95 text-slate-700 hover:text-white flex flex-col items-center justify-center gap-1 shadow-indigo-100"
											>
												<div className="absolute inset-0 bg-gradient-to-br from-indigo-500/0 to-purple-500/0 group-hover:from-indigo-600 group-hover:to-purple-700 transition-all opacity-0 group-hover:opacity-100 z-0"></div>
												<span className="text-xl font-black z-10 transition-transform group-hover:scale-110 duration-300 relative">
													{cls}
												</span>
												<span className="text-[10px] font-bold z-10 opacity-70 relative">
													{students.filter(s => s.class_name === cls).length} чел.
												</span>
											</button>
										))}
									</div>
								</div>
							)}

							{myClasses.length > 0 && otherClasses.length > 0 && (
								<label className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3 block ml-1 mt-4">Остальные классы школы</label>
							)}

							<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
								{otherClasses.length > 0 ? otherClasses.map(cls => (
									<button
										key={cls}
										onClick={() => { setSelectedClass(cls); setSearchQuery(''); }}
										className="bg-white/80 backdrop-blur-md border border-slate-100 hover:border-indigo-300 hover:shadow-md hover:-translate-y-0.5 transition-all p-4 rounded-2xl flex flex-col items-center justify-center gap-2 group"
									>
										<div className="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-500 group-hover:bg-indigo-500 group-hover:text-white transition-colors">
											<Users size={20} />
										</div>
										<span className="font-black text-slate-700 text-lg">{cls}</span>
									</button>
								)) : (
									<div className="col-span-full text-center p-6 text-slate-400 text-sm font-medium border border-dashed border-slate-200 rounded-2xl">
										Классы пока не загружены
									</div>
								)}
							</div>
						</div>
					)}

					{selectedClass && !selectedStudent && (
						<div className="animate-in fade-in slide-in-from-right-4 duration-300 relative z-20 mb-6">
							<div className="flex items-center justify-between mb-4">
								<label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">2. Выберите ученика</label>
								<button onClick={() => { setSelectedClass(null); setSearchQuery(''); }} className="text-[11px] font-bold text-indigo-500 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 active:scale-95">
									<ArrowLeft size={14} /> Назад к классам
								</button>
							</div>

							{/* Поиск внутри класса */}
							<div className="relative mb-4">
								<div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
									<Search size={18} className="text-slate-400" />
								</div>
								<input
									type="text"
									placeholder={`Быстрый поиск в классе ${selectedClass}...`}
									value={searchQuery}
									onChange={(e) => setSearchQuery(e.target.value)}
									className="w-full bg-white border border-slate-200 focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100/50 rounded-2xl pl-11 pr-4 py-3.5 text-[15px] font-medium text-slate-800 placeholder-slate-400 outline-none transition-all shadow-sm"
								/>
							</div>

							<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[40vh] sm:max-h-[350px] overflow-y-auto pr-1 custom-scrollbar">
								{studentsInClass
									.filter(s => `${s.first_name} ${s.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()))
									.map(s => (
										<button
											key={s.id}
											onClick={() => setSelectedStudent(s)}
											className="bg-white border border-slate-100 p-3 rounded-2xl flex items-center justify-between hover:border-indigo-300 hover:shadow-sm transition-all text-left active:scale-[0.98]"
										>
											<div className="flex items-center gap-3 overflow-hidden">
												<div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center font-black text-slate-600 border border-slate-100 shrink-0 shadow-sm">
													{s.first_name.charAt(0)}
												</div>
												<div className="overflow-hidden">
													<p className="font-bold text-slate-800 text-[13px] truncate">{s.first_name} {s.last_name}</p>
												</div>
											</div>
											<div className={`px-2 py-1.5 rounded-xl text-[12px] font-black shrink-0 shadow-sm ${s.points >= 80 ? 'bg-green-100 text-green-700 border border-green-200' : s.points >= 50 ? 'bg-yellow-100 text-yellow-700 border border-yellow-200' : 'bg-red-100 text-red-700 border border-red-200'}`}>
												{s.points} б.
											</div>
										</button>
									))}
								{studentsInClass.filter(s => `${s.first_name} ${s.last_name}`.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && (
									<div className="col-span-full p-4 text-center text-slate-400 text-sm font-medium">Никто не найден</div>
								)}
							</div>
						</div>
					)}

					{selectedStudent && (
						<div className="animate-in fade-in zoom-in-95 duration-300 relative z-20 mb-6">
							<div className="flex items-center justify-between bg-indigo-50 border border-indigo-100 rounded-2xl p-4 shadow-inner">
								<div className="flex items-center gap-4">
									<div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center font-black text-indigo-600 border border-indigo-100">
										{selectedStudent.first_name.charAt(0)}
									</div>
									<div>
										<p className="font-black text-slate-800 text-lg leading-tight">{selectedStudent.first_name} {selectedStudent.last_name}</p>
										<p className="text-sm font-bold text-indigo-600">Класс: {selectedStudent.class_name || '-'} • {selectedStudent.points} баллов</p>
									</div>
								</div>
								<button onClick={() => { setSelectedStudent(null); setActiveGroup(null); setSelectedRule(null); }} className="p-2 sm:px-4 sm:py-2 text-slate-500 hover:text-red-500 hover:bg-red-50 bg-white rounded-xl shadow-sm border border-slate-200 transition-colors flex items-center gap-2 active:scale-95">
									<span className="hidden sm:inline text-xs font-bold">Сменить</span>
									<XCircle size={18} />
								</button>
							</div>
						</div>
					)}

					{/* ШАГ 2: Категория нарушения */}
					<div className={`transition-all duration-500 ${selectedStudent ? 'opacity-100 max-h-[3000px]' : 'opacity-30 pointer-events-none max-h-[400px]'}`}>
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
				<div className="hidden xl:flex bg-white/60 backdrop-blur-xl border border-white rounded-[2rem] p-6 shadow-sm flex-col h-full overflow-hidden">
					<h2 className="text-lg font-bold text-slate-800 mb-6 border-b border-white pb-4">
						{selectedStudent ? 'История ученика' : selectedClass ? `История класса ${selectedClass}` : 'Ваша недавняя история'}
					</h2>
					<div className="flex-1 overflow-y-auto pr-2 space-y-4 hide-scrollbar">
						{displayedLogs.length > 0 ? (
							displayedLogs.map(log => {
								const isPositive = log.rule_detail.points_impact > 0;
								return (
									<div key={log.id} className={`p-4 rounded-2xl border ${isPositive ? 'bg-green-50/50 border-green-100' : 'bg-red-50/50 border-red-100'}`}>
										<div className="flex justify-between items-start mb-2">
											<span className="font-bold text-[13px] text-slate-700">
												{log.student_detail.first_name} {log.student_detail.last_name}
											</span>
											<div className="flex items-center gap-2">
												<span className={`text-[12px] font-black px-2 py-1 rounded-lg ${isPositive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
													{isPositive ? '+' : ''}{log.rule_detail.points_impact}
												</span>
												<button
													onClick={() => handleDeleteLog(log.id)}
													className="text-slate-400 hover:text-red-500 transition-colors"
													title="Отменить"
												>
													<XCircle size={16} />
												</button>
											</div>
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

			{/* МОДАЛЬНОЕ ОКНО ИСТОРИИ ДЛЯ МОБИЛЬНЫХ УСТРОЙСТВ */}
			{showMobileHistory && (
				<div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center xl:hidden p-4 sm:p-6 animate-in fade-in duration-200">
					{/* Затемнение фона */}
					<div
						className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
						onClick={() => setShowMobileHistory(false)}
					></div>

					{/* Контент модального окна */}
					<div className="relative w-full max-w-lg bg-white/95 backdrop-blur-xl border border-white rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl flex flex-col max-h-[85vh] animate-in slide-in-from-bottom-8 sm:slide-in-from-bottom-4 duration-300">
						<div className="flex items-center justify-between p-6 border-b border-slate-100">
							<div className="flex items-center gap-3">
								<div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600">
									<History size={20} />
								</div>
								<h2 className="text-lg font-black text-slate-800">
									{selectedStudent ? 'История ученика' : selectedClass ? `История класса ${selectedClass}` : 'Ваша недавняя история'}
								</h2>
							</div>
							<button
								onClick={() => setShowMobileHistory(false)}
								className="p-2 text-slate-400 hover:text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors"
							>
								<X size={20} />
							</button>
						</div>

						<div className="flex-1 overflow-y-auto p-6 space-y-4 hide-scrollbar">
							{displayedLogs.length > 0 ? (
								displayedLogs.map(log => {
									const isPositive = log.rule_detail.points_impact > 0;
									return (
										<div key={log.id} className={`p-4 rounded-2xl border ${isPositive ? 'bg-green-50/50 border-green-100' : 'bg-red-50/50 border-red-100'}`}>
											<div className="flex justify-between items-start mb-2">
												<span className="font-bold text-[14px] text-slate-700">
													{log.student_detail.first_name} {log.student_detail.last_name}
												</span>
												<div className="flex items-center gap-2">
													<span className={`text-[13px] font-black px-2 py-1 rounded-lg ${isPositive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
														{isPositive ? '+' : ''}{log.rule_detail.points_impact}
													</span>
													<button
														onClick={() => handleDeleteLog(log.id)}
														className="text-slate-400 hover:text-red-500 transition-colors"
														title="Отменить"
													>
														<XCircle size={16} />
													</button>
												</div>
											</div>
											<p className="text-[12px] font-medium text-slate-500 mb-2">{log.rule_detail.title}</p>
											<p className="text-[10px] font-bold text-slate-400 uppercase">
												{new Date(log.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
											</p>
										</div>
									);
								})
							) : (
								<div className="text-center text-sm font-medium text-slate-400 mt-10 pb-10">
									Вы еще не выставили ни одной оценки.
								</div>
							)}
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
