import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Users, UserX, Calendar, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../api/axios';

interface StudentRow {
	id: number;
	first_name: string;
	last_name: string;
	is_absent: boolean;
}

interface ClassRow {
	class_id: number;
	class_name: string;
	students: StudentRow[];
	absent_count: number;
	total_count: number;
}

function todayIso(): string {
	const d = new Date();
	const mm = String(d.getMonth() + 1).padStart(2, '0');
	const dd = String(d.getDate()).padStart(2, '0');
	return `${d.getFullYear()}-${mm}-${dd}`;
}

export default function SecretaryAttendance() {
	const { t } = useTranslation();

	const [date, setDate] = useState<string>(todayIso());
	const [classes, setClasses] = useState<ClassRow[]>([]);
	const [loading, setLoading] = useState(true);
	const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
	const [togglingId, setTogglingId] = useState<number | null>(null);

	const fetchData = useCallback(async () => {
		try {
			setLoading(true);
			const response = await api.get(`secretary/classes/?date=${date}`);
			setClasses(response.data.classes || []);
		} catch (error) {
			console.error('Failed to fetch secretary classes:', error);
			toast.error(t('secretary.load_error'));
		} finally {
			setLoading(false);
		}
	}, [date, t]);

	useEffect(() => {
		fetchData();
	}, [fetchData]);

	const selectedClass = classes.find(c => c.class_id === selectedClassId) || null;

	const toggleStudent = async (student: StudentRow) => {
		if (togglingId === student.id) return;
		setTogglingId(student.id);

		// Optimistic update
		const prevClasses = classes;
		const nextAbsent = !student.is_absent;
		setClasses(cs => cs.map(c => {
			if (c.class_id !== selectedClassId) return c;
			const newStudents = c.students.map(s => s.id === student.id ? { ...s, is_absent: nextAbsent } : s);
			const absent_count = newStudents.filter(s => s.is_absent).length;
			return { ...c, students: newStudents, absent_count };
		}));

		try {
			await api.post('secretary/attendance/toggle/', {
				student_id: student.id,
				date,
			});
		} catch (error) {
			console.error('Toggle failed:', error);
			toast.error(t('secretary.toggle_error'));
			setClasses(prevClasses);
		} finally {
			setTogglingId(null);
		}
	};

	if (loading && classes.length === 0) {
		return <div className="p-6 text-slate-400">{t('auto.t_38_borkun_zagruzka')}</div>;
	}

	return (
		<div className="p-4 lg:p-6 space-y-6">
			<div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
				<div>
					<h1 className="text-2xl font-bold text-slate-800 dark:text-zinc-100">
						{t('secretary.title')}
					</h1>
					<p className="text-slate-500 dark:text-zinc-400 mt-1 text-sm">
						{t('secretary.subtitle')}
					</p>
				</div>

				<label className="flex items-center gap-2 bg-white/60 dark:bg-zinc-900 backdrop-blur-md rounded-2xl px-4 py-2 border border-white dark:border-zinc-800 shadow-sm">
					<Calendar size={18} className="text-indigo-500" />
					<input
						type="date"
						value={date}
						onChange={(e) => {
							setDate(e.target.value);
							setSelectedClassId(null);
						}}
						className="bg-transparent outline-none text-sm text-slate-700 dark:text-zinc-200"
					/>
				</label>
			</div>

			{!selectedClass && (
				<>
					{classes.length === 0 ? (
						<div className="bg-white/60 dark:bg-zinc-900 backdrop-blur-md rounded-3xl p-8 border border-white dark:border-zinc-800 text-center shadow-sm">
							<p className="text-slate-500 dark:text-zinc-400">{t('secretary.no_classes')}</p>
						</div>
					) : (
						<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
							{classes.map(cls => {
								const allPresent = cls.absent_count === 0;
								return (
									<button
										key={cls.class_id}
										onClick={() => setSelectedClassId(cls.class_id)}
										className="group text-left bg-white/70 dark:bg-zinc-900 backdrop-blur-md rounded-3xl p-5 border border-white dark:border-zinc-800 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all"
									>
										<div className="flex items-center justify-between mb-3">
											<div className="w-10 h-10 rounded-2xl bg-indigo-500/10 flex items-center justify-center">
												<Users size={20} className="text-indigo-500" />
											</div>
											{allPresent ? (
												<CheckCircle2 size={18} className="text-emerald-500" />
											) : (
												<span className="text-xs font-bold text-red-500 bg-red-500/10 px-2 py-0.5 rounded-full">
													{cls.absent_count}
												</span>
											)}
										</div>
										<div className="text-lg font-bold text-slate-800 dark:text-zinc-100">
											{cls.class_name}
										</div>
										<div className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
											{cls.total_count} {t('secretary.students_count')}
										</div>
									</button>
								);
							})}
						</div>
					)}
				</>
			)}

			{selectedClass && (
				<div className="space-y-4">
					<div className="flex items-center justify-between">
						<button
							onClick={() => setSelectedClassId(null)}
							className="flex items-center gap-2 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
						>
							<ArrowLeft size={18} />
							{t('secretary.back_to_classes')}
						</button>
						<div className="text-sm font-medium text-slate-500 dark:text-zinc-400">
							<span className="text-red-500 font-bold">{selectedClass.absent_count}</span>
							{' / '}
							<span>{selectedClass.total_count}</span>
							{' '}{t('secretary.absent_short')}
						</div>
					</div>

					<div className="bg-white/60 dark:bg-zinc-900 backdrop-blur-md rounded-3xl p-5 border border-white dark:border-zinc-800 shadow-sm">
						<h2 className="text-xl font-bold text-slate-800 dark:text-zinc-100 mb-4">
							{selectedClass.class_name}
						</h2>

						{selectedClass.students.length === 0 ? (
							<p className="text-slate-500 dark:text-zinc-400 text-sm">{t('secretary.no_students')}</p>
						) : (
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
								{selectedClass.students.map((s, idx) => (
									<button
										key={s.id}
										onClick={() => toggleStudent(s)}
										disabled={togglingId === s.id}
										className={`flex items-center gap-3 p-4 rounded-2xl border transition-all text-left ${
											s.is_absent
												? 'bg-red-500/90 border-red-600 text-white shadow-md shadow-red-500/20'
												: 'bg-white dark:bg-zinc-800 border-slate-200 dark:border-zinc-700 text-slate-800 dark:text-zinc-100 hover:bg-slate-50 dark:hover:bg-zinc-700'
										} ${togglingId === s.id ? 'opacity-60' : ''}`}
									>
										<div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm ${
											s.is_absent ? 'bg-white/20 text-white' : 'bg-indigo-500/10 text-indigo-500'
										}`}>
											{idx + 1}
										</div>
										<div className="flex-1 min-w-0">
											<div className="font-semibold truncate">
												{s.last_name} {s.first_name}
											</div>
											<div className={`text-xs mt-0.5 ${s.is_absent ? 'text-white/80' : 'text-slate-500 dark:text-zinc-400'}`}>
												{s.is_absent ? t('secretary.absent') : t('secretary.present')}
											</div>
										</div>
										{s.is_absent && <UserX size={18} className="text-white shrink-0" />}
									</button>
								))}
							</div>
						)}
					</div>
				</div>
			)}
		</div>
	);
}
