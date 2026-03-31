import { useState } from 'react';
import { Plus, Clock, Bell, X } from 'lucide-react';
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
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [editingId, setEditingId] = useState<number | null>(null);
	const [form, setForm] = useState({ lesson_number: 1, start_time: '08:00', end_time: '08:45' });

	const openModal = (item?: BellEntry) => {
		if (item) {
			setEditingId(item.id);
			setForm({
				lesson_number: item.lesson_number,
				start_time: item.start_time.slice(0, 5),
				end_time: item.end_time.slice(0, 5),
			});
		} else {
			setEditingId(null);
			const nextLesson = data.length > 0 ? Math.max(...data.map(d => d.lesson_number)) + 1 : 1;
			setForm({ lesson_number: nextLesson, start_time: '08:00', end_time: '08:45' });
		}
		setIsModalOpen(true);
	};

	const handleDelete = async (id: number) => {
		if (!window.confirm('Удалить этот урок из расписания?')) return;
		try {
			await api.delete(`timetable/${id}/`);
			refresh();
			toast.success('Урок удален');
		} catch (err: any) {
			toast.error(err.response?.data?.detail || 'Ошибка при удалении');
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
			toast.success('Сохранено!');
		} catch (err: any) {
			toast.error(err.response?.data?.detail || 'Ошибка сохранения');
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
		<div className="bg-white/60 backdrop-blur-xl border border-white rounded-[2rem] p-6 shadow-sm animate-in fade-in duration-300">
			{/* Заголовок */}
			<div className="flex items-center justify-between mb-8">
				<div className="flex items-center gap-3">
					<div className="w-10 h-10 rounded-2xl bg-indigo-100 flex items-center justify-center">
						<Bell size={20} className="text-indigo-600" />
					</div>
					<div>
						<h2 className="text-lg font-black text-slate-800">Расписание звонков</h2>
						<p className="text-xs text-slate-500 font-medium mt-0.5">
							{data.length} {data.length === 1 ? 'урок' : data.length < 5 ? 'урока' : 'уроков'} в расписании
						</p>
					</div>
				</div>
				<button
					onClick={() => openModal()}
					className="flex items-center gap-2 bg-indigo-500 hover:bg-indigo-600 transition-all active:scale-95 text-white px-4 py-2.5 rounded-xl text-sm font-bold shadow-md"
				>
					<Plus size={16} /> Добавить урок
				</button>
			</div>

			{/* Список уроков */}
			{data.length === 0 ? (
				<div className="flex flex-col items-center justify-center py-16 text-center">
					<div className="w-16 h-16 rounded-3xl bg-slate-100 flex items-center justify-center mb-4">
						<Clock size={28} className="text-slate-400" />
					</div>
					<p className="text-base font-black text-slate-500">Расписание пустое</p>
					<p className="text-sm font-medium text-slate-400 mt-1">Нажмите "Добавить урок" чтобы начать</p>
				</div>
			) : (
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
					{data.map((entry) => (
						<div
							key={entry.id}
							className="group relative bg-white/80 border border-slate-100 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-indigo-100 transition-all"
						>
							{/* Номер урока */}
							<div className="flex items-center justify-between mb-4">
								<div className="flex items-center gap-2.5">
									<div className="w-9 h-9 rounded-xl bg-indigo-500 text-white flex items-center justify-center font-black text-base shadow-sm">
										{entry.lesson_number}
									</div>
									<div>
										<p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Урок</p>
										<p className="text-xs font-bold text-indigo-600">
											{duration(fmt(entry.start_time), fmt(entry.end_time))}
										</p>
									</div>
								</div>
								<div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
									<ActionButtons onEdit={() => openModal(entry)} onDelete={() => handleDelete(entry.id)} />
								</div>
							</div>

							{/* Время */}
							<div className="flex items-center gap-3">
								<div className="flex-1 bg-slate-50 border border-slate-100 rounded-xl p-3 text-center">
									<p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Начало</p>
									<p className="text-xl font-black text-slate-800">{fmt(entry.start_time)}</p>
								</div>
								<div className="text-slate-300">
									<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
										<path d="M5 12h14M12 5l7 7-7 7"/>
									</svg>
								</div>
								<div className="flex-1 bg-slate-50 border border-slate-100 rounded-xl p-3 text-center">
									<p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Конец</p>
									<p className="text-xl font-black text-slate-800">{fmt(entry.end_time)}</p>
								</div>
							</div>
						</div>
					))}
				</div>
			)}

			{/* Модальное окно */}
			<Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
				<div className="bg-white p-6 rounded-[2rem] w-full max-w-sm shadow-2xl">
					{/* Заголовок */}
					<div className="flex justify-between items-start mb-6">
						<div>
							<h3 className="text-xl font-black text-slate-800">
								{editingId ? 'Редактировать урок' : 'Добавить урок'}
							</h3>
							<p className="text-xs text-slate-500 font-medium mt-1">Укажите номер и время звонков</p>
						</div>
						<button
							type="button"
							onClick={() => setIsModalOpen(false)}
							className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
						>
							<X size={20} />
						</button>
					</div>

					<form onSubmit={handleSubmit} className="space-y-4">
						{/* Номер урока */}
						<div>
							<label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Номер урока</label>
							<input
								type="number"
								min={1}
								max={20}
								required
								value={form.lesson_number}
								onChange={e => setForm({ ...form, lesson_number: Number(e.target.value) })}
								className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 outline-none rounded-xl px-4 py-3 font-bold text-slate-800 transition-all"
								placeholder="1"
							/>
						</div>

						{/* Время начала и конца */}
						<div className="grid grid-cols-2 gap-3">
							<div>
								<label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
									<Bell size={12} className="inline mr-1" />Начало
								</label>
								<input
									type="time"
									required
									value={form.start_time}
									onChange={e => setForm({ ...form, start_time: e.target.value })}
									className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 outline-none rounded-xl px-4 py-3 font-bold text-slate-800 transition-all"
								/>
							</div>
							<div>
								<label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
									<Bell size={12} className="inline mr-1" />Конец
								</label>
								<input
									type="time"
									required
									value={form.end_time}
									onChange={e => setForm({ ...form, end_time: e.target.value })}
									className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 outline-none rounded-xl px-4 py-3 font-bold text-slate-800 transition-all"
								/>
							</div>
						</div>

						{/* Превью длительности */}
						{form.start_time && form.end_time && (
							<div className="bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3 flex items-center gap-2">
								<Clock size={14} className="text-indigo-500 shrink-0" />
								<p className="text-sm font-bold text-indigo-700">
									Длительность: {duration(form.start_time, form.end_time)}
								</p>
							</div>
						)}

						<div className="flex gap-3 pt-2">
							<button
								type="button"
								onClick={() => setIsModalOpen(false)}
								className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-xl font-bold transition-all"
							>
								Отмена
							</button>
							<button
								type="submit"
								className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-bold shadow-md transition-all active:scale-95"
							>
								Сохранить
							</button>
						</div>
					</form>
				</div>
			</Modal>
		</div>
	);
}
