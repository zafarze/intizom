import { useEffect, useState, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Users, UserX, Calendar, CheckCircle2, CalendarDays, CalendarRange, GraduationCap, CalendarClock, Clock, HeartPulse, UserCheck, X } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../api/axios';

type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'EXCUSED' | 'LATE' | 'SICK';

interface StudentRow {
	id: number;
	first_name: string;
	last_name: string;
	status: AttendanceStatus;
	is_absent: boolean;
	late_minutes: number | null;
}

interface ClassRow {
	class_id: number;
	class_name: string;
	students: StudentRow[];
	absent_count: number;
	total_count: number;
}

interface AdminStats {
	today: number;
	week: number;
	month: number;
	quarter: number;
	year: number;
	quarter_name: string | null;
}

function todayIso(): string {
	const d = new Date();
	const mm = String(d.getMonth() + 1).padStart(2, '0');
	const dd = String(d.getDate()).padStart(2, '0');
	return `${d.getFullYear()}-${mm}-${dd}`;
}

const STATUS_STYLES: Record<AttendanceStatus, { card: string; badge: string }> = {
	PRESENT: {
		card: 'bg-white dark:bg-zinc-800 border-slate-200 dark:border-zinc-700 text-slate-800 dark:text-zinc-100 hover:bg-slate-50 dark:hover:bg-zinc-700',
		badge: 'bg-indigo-500/10 text-indigo-500',
	},
	ABSENT: {
		card: 'bg-red-500/90 border-red-600 text-white shadow-md shadow-red-500/20',
		badge: 'bg-white/20 text-white',
	},
	LATE: {
		card: 'bg-amber-400/90 border-amber-500 text-white shadow-md shadow-amber-500/20',
		badge: 'bg-white/20 text-white',
	},
	EXCUSED: {
		card: 'bg-sky-500/90 border-sky-600 text-white shadow-md shadow-sky-500/20',
		badge: 'bg-white/20 text-white',
	},
	SICK: {
		card: 'bg-violet-500/90 border-violet-600 text-white shadow-md shadow-violet-500/20',
		badge: 'bg-white/20 text-white',
	},
};

export default function SecretaryAttendance() {
	const { t } = useTranslation();

	const [date, setDate] = useState<string>(todayIso());
	const [classes, setClasses] = useState<ClassRow[]>([]);
	const [loading, setLoading] = useState(true);
	const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
	const [togglingId, setTogglingId] = useState<number | null>(null);
	const [adminStats, setAdminStats] = useState<AdminStats | null>(null);
	const [sheetStudent, setSheetStudent] = useState<StudentRow | null>(null);
	const [lateMinutesInput, setLateMinutesInput] = useState<string>('');

	const userStr = typeof localStorage !== 'undefined' ? localStorage.getItem('user') : null;
	const user = userStr ? JSON.parse(userStr) : null;
	const isAdmin = (user?.role || '').toLowerCase() === 'admin';

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

	useEffect(() => {
		if (!isAdmin) return;
		api.get('secretary/stats/')
			.then(res => setAdminStats(res.data))
			.catch(err => console.error('Failed to load admin stats:', err));
	}, [isAdmin, classes]);

	const selectedClass = classes.find(c => c.class_id === selectedClassId) || null;

	const applyOptimisticStatus = (studentId: number, nextStatus: AttendanceStatus, nextMinutes: number | null) => {
		setClasses(cs => cs.map(c => {
			if (c.class_id !== selectedClassId) return c;
			const newStudents = c.students.map(s =>
				s.id === studentId
					? { ...s, status: nextStatus, is_absent: nextStatus === 'ABSENT', late_minutes: nextMinutes }
					: s
			);
			const absent_count = newStudents.filter(s => s.is_absent).length;
			return { ...c, students: newStudents, absent_count };
		}));
	};

	const sendStatus = async (student: StudentRow, nextStatus: AttendanceStatus, lateMinutes: number | null = null) => {
		if (togglingId === student.id) return;
		setTogglingId(student.id);

		const prevClasses = classes;
		applyOptimisticStatus(student.id, nextStatus, nextStatus === 'LATE' ? lateMinutes : null);

		try {
			await api.post('secretary/attendance/toggle/', {
				student_id: student.id,
				date,
				status: nextStatus,
				late_minutes: nextStatus === 'LATE' ? lateMinutes : null,
			});
		} catch (error) {
			console.error('Status update failed:', error);
			toast.error(t('secretary.toggle_error'));
			setClasses(prevClasses);
		} finally {
			setTogglingId(null);
		}
	};

	const toggleShortTap = (student: StudentRow) => {
		// short tap: any non-present state clears to PRESENT; PRESENT toggles to ABSENT.
		const next: AttendanceStatus = student.status === 'PRESENT' ? 'ABSENT' : 'PRESENT';
		sendStatus(student, next);
	};

	// Long-press: open the bottom sheet instead of toggling
	const pressTimerRef = useRef<number | null>(null);
	const longPressedRef = useRef(false);

	const startPress = (student: StudentRow) => {
		longPressedRef.current = false;
		if (pressTimerRef.current) window.clearTimeout(pressTimerRef.current);
		pressTimerRef.current = window.setTimeout(() => {
			longPressedRef.current = true;
			setLateMinutesInput(student.late_minutes ? String(student.late_minutes) : '');
			setSheetStudent(student);
		}, 500);
	};
	const cancelPress = () => {
		if (pressTimerRef.current) {
			window.clearTimeout(pressTimerRef.current);
			pressTimerRef.current = null;
		}
	};
	const endPress = (student: StudentRow, e: React.MouseEvent | React.TouchEvent) => {
		cancelPress();
		if (longPressedRef.current) {
			e.preventDefault();
			return;
		}
		toggleShortTap(student);
	};

	const closeSheet = () => {
		setSheetStudent(null);
		setLateMinutesInput('');
	};

	const pickSheetStatus = async (nextStatus: AttendanceStatus) => {
		if (!sheetStudent) return;
		if (nextStatus === 'LATE') {
			const parsed = parseInt(lateMinutesInput, 10);
			const mins = Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
			await sendStatus(sheetStudent, 'LATE', mins);
		} else {
			await sendStatus(sheetStudent, nextStatus);
		}
		closeSheet();
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

			{!selectedClass && isAdmin && adminStats && (
				<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
					{[
						{ key: 'today',   label: t('secretary.stats_today'),   value: adminStats.today,   Icon: UserX,         color: 'from-red-500/10 to-red-500/5 text-red-600 dark:text-red-400' },
						{ key: 'week',    label: t('secretary.stats_week'),    value: adminStats.week,    Icon: CalendarDays,  color: 'from-orange-500/10 to-orange-500/5 text-orange-600 dark:text-orange-400' },
						{ key: 'month',   label: t('secretary.stats_month'),   value: adminStats.month,   Icon: CalendarRange, color: 'from-amber-500/10 to-amber-500/5 text-amber-600 dark:text-amber-400' },
						{ key: 'quarter', label: t('secretary.stats_quarter'), value: adminStats.quarter, Icon: CalendarClock, color: 'from-indigo-500/10 to-indigo-500/5 text-indigo-600 dark:text-indigo-400' },
						{ key: 'year',    label: t('secretary.stats_year'),    value: adminStats.year,    Icon: GraduationCap, color: 'from-emerald-500/10 to-emerald-500/5 text-emerald-600 dark:text-emerald-400' },
					].map(({ key, label, value, Icon, color }) => (
						<div
							key={key}
							className={`bg-gradient-to-br ${color} bg-white/70 dark:bg-zinc-900 backdrop-blur-md rounded-2xl p-4 border border-white dark:border-zinc-800 shadow-sm`}
						>
							<div className="flex items-center justify-between mb-2">
								<Icon size={18} />
								<span className="text-xs font-medium opacity-75">{label}</span>
							</div>
							<div className="text-2xl font-black text-slate-800 dark:text-zinc-100">{value}</div>
							<div className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">
								{t('secretary.stats_absences')}
							</div>
						</div>
					))}
				</div>
			)}

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

						<p className="text-[11px] text-slate-400 dark:text-zinc-500 mb-3">
							{t('secretary.long_press_hint')}
						</p>

						{selectedClass.students.length === 0 ? (
							<p className="text-slate-500 dark:text-zinc-400 text-sm">{t('secretary.no_students')}</p>
						) : (
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
								{selectedClass.students.map((s, idx) => {
									const style = STATUS_STYLES[s.status];
									const statusLabel =
										s.status === 'ABSENT' ? t('secretary.status_absent') :
										s.status === 'LATE' ? `${t('secretary.status_late')}${s.late_minutes ? ` · ${s.late_minutes} ${t('secretary.minutes_short')}` : ''}` :
										s.status === 'EXCUSED' ? t('secretary.status_excused') :
										s.status === 'SICK' ? t('secretary.status_sick') :
										t('secretary.present');
									return (
										<button
											key={s.id}
											onMouseDown={() => startPress(s)}
											onMouseUp={(e) => endPress(s, e)}
											onMouseLeave={cancelPress}
											onTouchStart={() => startPress(s)}
											onTouchEnd={(e) => endPress(s, e)}
											onTouchCancel={cancelPress}
											onContextMenu={(e) => e.preventDefault()}
											disabled={togglingId === s.id}
											className={`flex items-center gap-3 p-4 rounded-2xl border transition-all text-left select-none ${style.card} ${togglingId === s.id ? 'opacity-60' : ''}`}
										>
											<div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm ${style.badge}`}>
												{idx + 1}
											</div>
											<div className="flex-1 min-w-0">
												<div className="font-semibold truncate">
													{s.last_name} {s.first_name}
												</div>
												<div className={`text-xs mt-0.5 ${s.status === 'PRESENT' ? 'text-slate-500 dark:text-zinc-400' : 'text-white/80'}`}>
													{statusLabel}
												</div>
											</div>
											{s.status === 'ABSENT' && <UserX size={18} className="text-white shrink-0" />}
											{s.status === 'LATE' && <Clock size={18} className="text-white shrink-0" />}
											{s.status === 'EXCUSED' && <UserCheck size={18} className="text-white shrink-0" />}
											{s.status === 'SICK' && <HeartPulse size={18} className="text-white shrink-0" />}
										</button>
									);
								})}
							</div>
						)}
					</div>
				</div>
			)}

			{sheetStudent && (
				<div
					className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm"
					onClick={closeSheet}
				>
					<div
						className="w-full sm:max-w-md bg-white dark:bg-zinc-900 rounded-t-3xl sm:rounded-3xl shadow-2xl p-5 space-y-3"
						onClick={(e) => e.stopPropagation()}
					>
						<div className="flex items-center justify-between">
							<div>
								<div className="text-xs text-slate-500 dark:text-zinc-400">{t('secretary.set_status_for')}</div>
								<div className="text-lg font-bold text-slate-800 dark:text-zinc-100">
									{sheetStudent.last_name} {sheetStudent.first_name}
								</div>
							</div>
							<button
								onClick={closeSheet}
								className="w-9 h-9 rounded-full bg-slate-100 dark:bg-zinc-800 flex items-center justify-center text-slate-500 dark:text-zinc-400"
							>
								<X size={18} />
							</button>
						</div>

						<button
							onClick={() => pickSheetStatus('PRESENT')}
							className="w-full flex items-center gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-700 text-left"
						>
							<CheckCircle2 size={20} className="text-emerald-500" />
							<span className="font-medium text-slate-800 dark:text-zinc-100">{t('secretary.status_present')}</span>
						</button>

						<button
							onClick={() => pickSheetStatus('ABSENT')}
							className="w-full flex items-center gap-3 p-3 rounded-2xl bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 text-left"
						>
							<UserX size={20} className="text-red-500" />
							<div className="flex-1">
								<div className="font-medium text-slate-800 dark:text-zinc-100">{t('secretary.status_absent')}</div>
								<div className="text-xs text-slate-500 dark:text-zinc-400">−15</div>
							</div>
						</button>

						<button
							onClick={() => pickSheetStatus('EXCUSED')}
							className="w-full flex items-center gap-3 p-3 rounded-2xl bg-sky-50 dark:bg-sky-500/10 hover:bg-sky-100 dark:hover:bg-sky-500/20 text-left"
						>
							<UserCheck size={20} className="text-sky-500" />
							<div className="flex-1">
								<div className="font-medium text-slate-800 dark:text-zinc-100">{t('secretary.status_excused')}</div>
								<div className="text-xs text-slate-500 dark:text-zinc-400">{t('secretary.no_points_impact')}</div>
							</div>
						</button>

						<div className="rounded-2xl bg-amber-50 dark:bg-amber-500/10 p-3 space-y-2">
							<div className="flex items-center gap-3">
								<Clock size={20} className="text-amber-600" />
								<div className="flex-1">
									<div className="font-medium text-slate-800 dark:text-zinc-100">{t('secretary.status_late')}</div>
									<div className="text-xs text-slate-500 dark:text-zinc-400">{t('secretary.late_auto_rule')}</div>
								</div>
							</div>
							<div className="flex items-center gap-2">
								<input
									type="number"
									min={0}
									value={lateMinutesInput}
									onChange={(e) => setLateMinutesInput(e.target.value)}
									placeholder={t('secretary.minutes_placeholder') as string}
									className="flex-1 px-3 py-2 rounded-xl border border-amber-200 dark:border-amber-900 bg-white dark:bg-zinc-900 text-sm text-slate-800 dark:text-zinc-100 outline-none"
								/>
								<button
									onClick={() => pickSheetStatus('LATE')}
									className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold text-sm"
								>
									{t('secretary.apply')}
								</button>
							</div>
						</div>

						<button
							onClick={() => pickSheetStatus('SICK')}
							className="w-full flex items-center gap-3 p-3 rounded-2xl bg-violet-50 dark:bg-violet-500/10 hover:bg-violet-100 dark:hover:bg-violet-500/20 text-left"
						>
							<HeartPulse size={20} className="text-violet-500" />
							<div className="flex-1">
								<div className="font-medium text-slate-800 dark:text-zinc-100">{t('secretary.status_sick')}</div>
								<div className="text-xs text-slate-500 dark:text-zinc-400">{t('secretary.no_points_impact')}</div>
							</div>
						</button>
					</div>
				</div>
			)}
		</div>
	);
}
