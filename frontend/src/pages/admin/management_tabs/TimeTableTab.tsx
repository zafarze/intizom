import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { Plus, Clock, Bell, X, BookOpen } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../../api/axios';
import { ActionButtons, Modal } from './Shared';

type BellEntry = {
	id: number;
	lesson_number: number;
	start_time: string;
	end_time: string;
};

export default function TimeTableTab({ data, refresh }: { data: BellEntry[], refresh: () => void }) {
	const { t } = useTranslation();
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [editingId, setEditingId] = useState<number | null>(null);
	const [form, setForm] = useState({ lesson_number: 1, start_time: '08:00', end_time: '08:45' });

	const openModal = (item?: BellEntry, isReading?: boolean) => {
		if (item) {
			setEditingId(item.id);
			setForm({
				lesson_number: item.lesson_number,
				start_time: item.start_time.slice(0, 5),
				end_time: item.end_time.slice(0, 5),
			});
		} else if (isReading) {
			setEditingId(null);
			setForm({ lesson_number: 99, start_time: '10:00', end_time: '10:25' });
		} else {
			setEditingId(null);
			const normalLessons = data.filter(d => d.lesson_number < 90);
			const nextLesson = normalLessons.length > 0 ? Math.max(...normalLessons.map(d => d.lesson_number)) + 1 : 1;
			setForm({ lesson_number: nextLesson, start_time: '08:00', end_time: '08:45' });
		}
		setIsModalOpen(true);
	};

	const handleDelete = async (id: number) => {
		if (!window.confirm(t('mgmt.t_12'))) return;
		try {
			await api.delete(`timetable/${id}/`);
			refresh();
			toast.success(t('mgmt.t_76'));
		} catch (err: any) {
			toast.error(err.response?.data?.detail || t('mgmt.t_35'));
		}
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		try {
			editingId
				? await api.patch(`timetable/${editingId}/`, form)
				: await api.post(`timetable/`, form);
			setIsModalOpen(false);
			refresh();
			toast.success(t('mgmt.t_81'));
		} catch (err: any) {
			toast.error(err.response?.data?.detail || t('mgmt.t_47'));
		}
	};

	// Форматирование времени — убираем секунды
	const fmt = (t: string) => t?.slice(0, 5) || '';

	// Расчёт длительности урока
	const duration = (start: string, end: string) => {
		const [sh, sm] = start.split(':').map(Number);
		const [eh, em] = end.split(':').map(Number);
		const mins = (eh * 60 + em) - (sh * 60 + sm);
		return mins > 0 ? `${mins} мин` : '-';
	};

	return (
		<div className="bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl border border-white dark:border-zinc-800/60 rounded-[2rem] p-6 shadow-sm animate-in fade-in duration-300">
			{/* Заголовок */}
			<div className="flex items-center justify-between mb-8">
				<div className="flex items-center gap-3">
					<div className="w-10 h-10 rounded-2xl bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center">
						<Bell size={20} className="text-indigo-600 dark:text-indigo-400" />
					</div>
					<div>
						<h2 className="text-lg font-black text-slate-800 dark:text-zinc-50">{t('mgmt.t_38')}</h2>
						<p className="text-xs text-slate-500 dark:text-zinc-400 font-medium mt-0.5">
							{data.length} {data.length === 1 ? t('mgmt.t_127') : data.length < 5 ? t('mgmt.t_122') : t('mgmt.t_118')} в расписании
						</p>
					</div>
				</div>
				<div className="flex items-center gap-2">
					<button
						onClick={() => {
							const existing = data.find(d => d.lesson_number === 99);
							if (existing) openModal(existing);
							else openModal(undefined, true);
						}}
						className="flex items-center gap-2 bg-blue-100 dark:bg-blue-500/20 hover:bg-blue-200 dark:hover:bg-blue-500/30 text-blue-700 dark:text-blue-400 px-4 py-2.5 rounded-xl text-sm font-bold shadow-md transition-all active:scale-95"
					>
						<BookOpen size={16} /> Чтение
					</button>
					<button
						onClick={() => openModal()}
						className="flex items-center gap-2 bg-indigo-500 hover:bg-indigo-600 transition-all active:scale-95 text-white px-4 py-2.5 rounded-xl text-sm font-bold shadow-md"
					>
						<Plus size={16} /> {t('management.common.add')}
					</button>
				</div>
			</div>

			{/* Список уроков */}
			{data.length === 0 ? (
				<div className="flex flex-col items-center justify-center py-16 text-center">
					<div className="w-16 h-16 rounded-3xl bg-slate-100 dark:bg-zinc-800/50 flex items-center justify-center mb-4">
						<Clock size={28} className="text-slate-400 dark:text-zinc-500" />
					</div>
					<p className="text-base font-black text-slate-500 dark:text-zinc-300">{t('mgmt.t_42')}</p>
					<p className="text-sm font-medium text-slate-400 dark:text-zinc-500 mt-1">{t('mgmt.t_9')}</p>
				</div>
			) : (
				<div className="flex flex-col gap-0">
					{[...data].sort((a, b) => {
						const aMins = parseInt(a.start_time.split(':')[0]) * 60 + parseInt(a.start_time.split(':')[1]);
						const bMins = parseInt(b.start_time.split(':')[0]) * 60 + parseInt(b.start_time.split(':')[1]);
						return aMins - bMins;
					}).map((entry, idx, sorted) => {
						// Считаем перемену перед этим уроком (от конца предыдущего до начала текущего)
						const prev = idx > 0 ? sorted[idx - 1] : null;

						// Fallback for translation if missing
						const breakStr = t('management.timetable.break');
						const breakLabel = breakStr.includes('timetable.break') ? 'Перемена' : breakStr;

						let breakMins = 0;
						let pMins = 0;
						let cMins = 0;
						
						if (prev) {
							pMins = parseInt(prev.end_time.split(':')[0]) * 60 + parseInt(prev.end_time.split(':')[1]);
							cMins = parseInt(entry.start_time.split(':')[0]) * 60 + parseInt(entry.start_time.split(':')[1]);
							breakMins = cMins - pMins;
						}

						// Назначаем номер "урока" для перемены (игнорируем 99)
						const nextNormalLesson = entry.lesson_number < 90 ? entry.lesson_number : (idx + 1 < sorted.length ? sorted[idx + 1].lesson_number : entry.lesson_number);

						// Helper to render a regular break badge
						const renderRegularBreak = (startStr: string, endStr: string, mins: number, lessonNum: number) => (
							<div className="flex items-center gap-3 px-2 py-2">
								<div className="flex-1 h-px bg-green-100 dark:bg-emerald-500/20" />
								<div className="flex items-center gap-1.5 bg-green-50 border border-green-200 text-green-700 dark:bg-emerald-500/10 dark:border-emerald-500/20 dark:text-emerald-400 rounded-full px-3 py-1.5 shrink-0">
									<Bell size={11} className="text-green-500 dark:text-emerald-500" />
									<span className="text-[11px] font-black">{breakLabel} перед {lessonNum} уроком • {mins} мин</span>
									<span className="text-[10px] text-green-500 dark:text-emerald-500/80 font-medium">
										{startStr} – {endStr}
									</span>
								</div>
								<div className="flex-1 h-px bg-green-100 dark:bg-emerald-500/20" />
							</div>
						);

						return (
							<div key={entry.id}>
								{/* Индикатор перемены / обеда */}
								{prev && breakMins > 0 && (
									breakMins >= 40 ? (
										// 🍽 ОБЕД — перерыв 40+ минут
										<div className="my-3 mx-1 bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-500/5 dark:to-amber-500/5 border border-orange-200 dark:border-orange-500/20 rounded-2xl px-5 py-4 flex items-center gap-4 shadow-sm">
											<div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-500/10 flex items-center justify-center shrink-0 text-xl">
												🍽
											</div>
											<div className="flex-1">
												<p className="text-sm font-black text-orange-700 dark:text-orange-400">{t('mgmt.t_46')}</p>
												<p className="text-xs text-orange-500 dark:text-orange-500/80 font-medium mt-0.5">
													{prev.end_time.slice(0, 5)} – {entry.start_time.slice(0, 5)} · {breakMins} мин
												</p>
											</div>
											<div className="text-right shrink-0">
												<p className="text-[10px] font-bold text-orange-400 dark:text-orange-500/70 uppercase tracking-wider">{t('mgmt.t_69')}</p>
												<p className="text-lg font-black text-orange-600 dark:text-orange-500">
													{breakMins >= 60 ? `${Math.floor(breakMins / 60)} ч ${breakMins % 60 > 0 ? `${breakMins % 60} мин` : ''}`.trim() : `${breakMins} мин`}
												</p>
											</div>
										</div>
									) : (
										// 🔔 Обычная перемена
										renderRegularBreak(prev.end_time.slice(0, 5), entry.start_time.slice(0, 5), breakMins, nextNormalLesson)
									)
								)}

								{/* Карточка урока или Время Чтения */}
								{entry.lesson_number === 99 ? (
									<div className="group relative bg-white/80 dark:bg-zinc-800/80 my-2 bg-gradient-to-r from-blue-50/50 to-indigo-50/50 dark:from-blue-500/5 dark:to-indigo-500/5 border border-blue-200 dark:border-blue-500/20 rounded-2xl p-5 flex items-center gap-4 shadow-sm hover:shadow-md transition-all">
										<div className="w-11 h-11 rounded-xl bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center shrink-0">
											<BookOpen size={20} className="text-blue-600 dark:text-blue-400" />
										</div>
										<div className="flex-1">
											<p className="text-sm font-black text-blue-700 dark:text-blue-400">Время для чтения книг</p>
											<p className="text-xs text-blue-500 dark:text-blue-500/80 font-medium mt-0.5">
												{fmt(entry.start_time)} – {fmt(entry.end_time)}
											</p>
										</div>
										
										{/* Время и Длительность */}
										<div className="text-right shrink-0 group-hover:opacity-0 transition-opacity">
											<p className="text-[10px] font-bold text-blue-400 dark:text-blue-500/70 uppercase tracking-wider">ЧТЕНИЕ</p>
											<p className="text-lg font-black text-blue-600 dark:text-blue-500">{duration(fmt(entry.start_time), fmt(entry.end_time))}</p>
										</div>

										{/* Действия */}
										<div className="absolute right-5 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
											<ActionButtons onEdit={() => openModal(entry)} onDelete={() => handleDelete(entry.id)} />
										</div>
									</div>
								) : (
									<div className="group relative bg-white/80 dark:bg-zinc-800/80 border border-slate-100 dark:border-zinc-700 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-indigo-100 dark:hover:border-indigo-500/40 transition-all">
										<div className="flex items-center gap-4">
											{/* Номер */}
											<div className="w-11 h-11 rounded-xl bg-indigo-500 text-white flex items-center justify-center font-black text-lg shadow-sm shrink-0">
												{entry.lesson_number}
											</div>

											{/* Урок / длительность */}
											<div className="shrink-0">
												<p className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">{t('mgmt.t_128')}</p>
												<p className="text-xs font-bold text-indigo-600 dark:text-indigo-400">{duration(fmt(entry.start_time), fmt(entry.end_time))}</p>
											</div>

											{/* Разделитель */}
											<div className="flex-1" />

											{/* Время */}
											<div className="flex items-center gap-3">
												<div className="bg-slate-50 dark:bg-zinc-900/50 border border-slate-100 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-center min-w-[72px]">
													<p className="text-[9px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-0.5">{t('mgmt.t_110')}</p>
													<p className="text-lg font-black text-slate-800 dark:text-zinc-100">{fmt(entry.start_time)}</p>
												</div>
												<svg width="16" height="16" viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" className="stroke-slate-300 dark:stroke-zinc-600">
													<path d="M5 12h14M12 5l7 7-7 7"/>
												</svg>
												<div className="bg-slate-50 dark:bg-zinc-900/50 border border-slate-100 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-center min-w-[72px]">
													<p className="text-[9px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-0.5">{t('mgmt.t_125')}</p>
													<p className="text-lg font-black text-slate-800 dark:text-zinc-100">{fmt(entry.end_time)}</p>
												</div>
											</div>

											{/* Кнопки */}
											<div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
												<ActionButtons onEdit={() => openModal(entry)} onDelete={() => handleDelete(entry.id)} />
											</div>
										</div>
									</div>
								)}
							</div>
						);
					})}
				</div>
			)}


			{/* Модальное окно */}
			<Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
				<div className="bg-white dark:bg-zinc-900 p-6 rounded-[2rem] w-full max-w-sm shadow-2xl">
					{/* Заголовок */}
					<div className="flex justify-between items-start mb-6">
						<div>
							<h3 className="text-xl font-black text-slate-800 dark:text-zinc-50">
								{editingId ? t('mgmt.t_41') : t('mgmt.t_63')}
							</h3>
							<p className="text-xs text-slate-500 dark:text-zinc-400 font-medium mt-1">{t('mgmt.t_15')}</p>
						</div>
						<button
							type="button"
							onClick={() => setIsModalOpen(false)}
							className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-rose-500/10 dark:hover:text-rose-400 rounded-xl transition-all"
						>
							<X size={20} />
						</button>
					</div>

					<form onSubmit={handleSubmit} className="space-y-4">
						{/* Номер урока */}
						<div>
							<label className="block text-xs font-bold text-slate-500 dark:text-zinc-500 uppercase tracking-wider mb-2">{t('mgmt.t_78')}</label>
							<input
								type="number"
								min={1}
								max={20}
								required
								value={form.lesson_number}
								onChange={e => setForm({ ...form, lesson_number: Number(e.target.value) })}
								className="w-full bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700 focus:border-indigo-400 dark:focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-100 dark:focus:ring-indigo-500/20 outline-none rounded-xl px-4 py-3 font-bold text-slate-800 dark:text-zinc-100 transition-all"
								placeholder="1"
							/>
						</div>

						{/* Время начала и конца */}
						<div className="grid grid-cols-2 gap-3">
							<div>
								<label className="block text-xs font-bold text-slate-500 dark:text-zinc-500 uppercase tracking-wider mb-2">
									<Bell size={12} className="inline mr-1" />{t('management.timetable.start') || 'Начало'}
								</label>
								<input
									type="time"
									required
									value={form.start_time}
									onChange={e => setForm({ ...form, start_time: e.target.value })}
									className="w-full bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700 focus:border-indigo-400 dark:focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-100 dark:focus:ring-indigo-500/20 outline-none rounded-xl px-4 py-3 font-bold text-slate-800 dark:text-zinc-100 transition-all"
								/>
							</div>
							<div>
								<label className="block text-xs font-bold text-slate-500 dark:text-zinc-500 uppercase tracking-wider mb-2">
									<Bell size={12} className="inline mr-1" />{t('management.timetable.end') || 'Конец'}
								</label>
								<input
									type="time"
									required
									value={form.end_time}
									onChange={e => setForm({ ...form, end_time: e.target.value })}
									className="w-full bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700 focus:border-indigo-400 dark:focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-100 dark:focus:ring-indigo-500/20 outline-none rounded-xl px-4 py-3 font-bold text-slate-800 dark:text-zinc-100 transition-all"
								/>
							</div>
						</div>

						{/* Превью длительности */}
						{form.start_time && form.end_time && (
							<div className="bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 rounded-xl px-4 py-3 flex items-center gap-2">
								<Clock size={14} className="text-indigo-500 dark:text-indigo-400 shrink-0" />
								<p className="text-sm font-bold text-indigo-700 dark:text-indigo-300">
									{t('management.timetable.duration') || 'Длительность:'} {duration(form.start_time, form.end_time)}
								</p>
							</div>
						)}

						<div className="flex gap-3 pt-2">
							<button
								type="button"
								onClick={() => setIsModalOpen(false)}
								className="flex-1 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 py-3 rounded-xl font-bold transition-all"
							>
								{t('management.common.cancel')}
							</button>
							<button
								type="submit"
								className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-bold shadow-md transition-all active:scale-95"
							>
								{t('management.common.save')}
							</button>
						</div>
					</form>
				</div>
			</Modal>
		</div>
	);
}
