import { useState, useEffect } from 'react';
import { Plus, PowerOff } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../../api/axios';
import { TableTemplate, ActionButtons, Modal } from './Shared';

export default function YearsTab({ data, refresh }: { data: any[], refresh: () => void }) {
	// Состояния для Учебного Года
	const [isYearModalOpen, setIsYearModalOpen] = useState(false);
	const [editingYearId, setEditingYearId] = useState<number | null>(null);
	const [year, setYear] = useState('');
	const [isYearActive, setIsYearActive] = useState(false);

	// Состояния для Четвертей
	const [quarters, setQuarters] = useState<any[]>([]);
	const [isQuarterModalOpen, setIsQuarterModalOpen] = useState(false);
	const [editingQuarterId, setEditingQuarterId] = useState<number | null>(null);
	const [quarterName, setQuarterName] = useState('');
	const [quarterYearId, setQuarterYearId] = useState('');
	const [isQuarterActive, setIsQuarterActive] = useState(false);

	// Загружаем четверти
	const fetchQuarters = async () => {
		try {
			const res = await api.get('quarters/');
			setQuarters(res.data.results || res.data);
		} catch (err) {
			console.error('Ошибка загрузки четвертей', err);
		}
	};

	useEffect(() => { fetchQuarters(); }, []);

	// --- ЛОГИКА УЧЕБНЫХ ГОДОВ ---
	const openYearModal = (item?: any) => {
		setEditingYearId(item?.id || null); setYear(item?.year || ''); setIsYearActive(item?.is_active || false); setIsYearModalOpen(true);
	};
	const handleYearDelete = async (id: number) => {
		if (!window.confirm('Удалить этот учебный год?')) return;
		try { await api.delete(`years/${id}/`); refresh(); toast.success('Удалено'); }
		catch (err: any) { toast.error(err.response?.data?.detail || 'Ошибка'); }
	};
	const handleYearSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		const payload = { year, is_active: isYearActive };
		try {
			editingYearId ? await api.patch(`years/${editingYearId}/`, payload) : await api.post(`years/`, payload);
			setIsYearModalOpen(false); refresh(); toast.success('Сохранено');
		} catch (err: any) { toast.error(err.response?.data?.detail || 'Ошибка'); }
	};

	// --- ЛОГИКА ЧЕТВЕРТЕЙ ---
	const openQuarterModal = (item?: any) => {
		setEditingQuarterId(item?.id || null); setQuarterName(item?.name || '');
		setQuarterYearId(item?.academic_year || ''); setIsQuarterActive(item?.is_active || false);
		setIsQuarterModalOpen(true);
	};
	const handleQuarterDelete = async (id: number) => {
		if (!window.confirm('Удалить эту четверть?')) return;
		try { await api.delete(`quarters/${id}/`); fetchQuarters(); toast.success('Удалено'); }
		catch (err: any) { toast.error(err.response?.data?.detail || 'Ошибка'); }
	};
	const handleQuarterSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		const payload = { name: quarterName, academic_year: quarterYearId, is_active: isQuarterActive };
		try {
			editingQuarterId ? await api.patch(`quarters/${editingQuarterId}/`, payload) : await api.post(`quarters/`, payload);
			setIsQuarterModalOpen(false); fetchQuarters(); toast.success('Сохранено');
		} catch (err: any) { toast.error(err.response?.data?.detail || 'Ошибка'); }
	};

	// --- КИЛЛЕР-ФИЧА: ЗАКРЫТИЕ ЧЕТВЕРТИ ---
	const handleCloseQuarter = async (quarterId: number, quarterName: string) => {
		const confirmMsg = `ВНИМАНИЕ! Вы собираетесь завершить "${quarterName}".\n\nСистема:\n1. Выдаст статус "Намунавӣ" отличникам и сохранит их в архив.\n2. СБРОСИТ баллы всех учеников школы обратно на 100.\n\nПродолжить?`;
		if (!window.confirm(confirmMsg)) return;

		const toastId = toast.loading('Обработка баллов учеников...');
		try {
			const res = await api.post('students/close_quarter/', { quarter_id: quarterId });
			toast.success(res.data.detail, { id: toastId, duration: 5000 });
			fetchQuarters(); // Обновляем статусы четвертей
			refresh(); // Обновляем учеников (если нужно)
		} catch (err) {
			toast.error('Ошибка при закрытии четверти', { id: toastId });
		}
	};

	return (
		<div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start animate-in fade-in duration-300">

			{/* БЛОК 1: УЧЕБНЫЕ ГОДЫ */}
			<div className="bg-white/60 backdrop-blur-xl border border-white rounded-[2rem] p-6 shadow-sm w-full">
				<div className="flex justify-between items-center mb-6 border-b border-white pb-4">
					<h2 className="text-lg font-black text-slate-800">Учебные годы</h2>
					<button onClick={() => openYearModal()} className="flex items-center gap-2 bg-indigo-500 hover:bg-indigo-600 transition-colors text-white px-4 py-2 rounded-xl text-sm font-bold shadow-md">
						<Plus size={16} /> Создать
					</button>
				</div>
				<div className="overflow-x-auto">
					<TableTemplate headers={['ID', 'Учебный год', 'Статус', 'Действия']}>
						{data.map(y => (
							<tr key={y.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
								<td className="py-4 px-4 text-xs font-mono text-slate-400">{y.id}</td>
								<td className="py-4 px-4 font-bold text-lg text-slate-800 whitespace-nowrap">{y.year}</td>
								<td className="py-4 px-4">
									<span className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border ${y.is_active ? 'bg-green-50 text-green-700 border-green-200' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
										{y.is_active ? 'Активный' : 'Завершен'}
									</span>
								</td>
								<td className="py-4 px-4">
									<ActionButtons onEdit={() => openYearModal(y)} onDelete={() => handleYearDelete(y.id)} />
								</td>
							</tr>
						))}
					</TableTemplate>
				</div>
			</div>

			{/* БЛОК 2: ЧЕТВЕРТИ */}
			<div className="bg-white/60 backdrop-blur-xl border border-white rounded-[2rem] p-6 shadow-sm w-full">
				<div className="flex justify-between items-center mb-6 border-b border-white pb-4">
					<div>
						<h2 className="text-lg font-black text-slate-800">Четверти (Чорякҳо)</h2>
						<p className="text-xs text-slate-500 font-medium mt-1">Периоды внутри учебного года</p>
					</div>
					<button onClick={() => openQuarterModal()} className="flex items-center gap-2 bg-indigo-500 hover:bg-indigo-600 transition-colors text-white px-4 py-2 rounded-xl text-sm font-bold shadow-md">
						<Plus size={16} /> Добавить
					</button>
				</div>

				<div className="overflow-x-auto">
					<TableTemplate headers={['ID', 'Четверть', 'Учебный год', 'Статус', 'Действия']}>
						{quarters.map(q => (
							<tr key={q.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
								<td className="py-4 px-4 text-xs font-mono text-slate-400">{q.id}</td>
								<td className="py-4 px-4 font-bold text-slate-800 whitespace-nowrap">{q.name}</td>
								<td className="py-4 px-4 text-sm font-medium text-slate-600 whitespace-nowrap">{q.academic_year_name}</td>
								<td className="py-4 px-4">
									<span className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border ${q.is_active ? 'bg-green-50 text-green-700 border-green-200' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
										{q.is_active ? 'Текущая' : 'Архив'}
									</span>
								</td>
								<td className="py-4 px-4">
									<ActionButtons
										onEdit={() => openQuarterModal(q)}
										onDelete={() => handleQuarterDelete(q.id)}
										// ДОБАВЛЯЕМ КНОПКУ ЗАКРЫТИЯ ТОЛЬКО ЕСЛИ ЧЕТВЕРТЬ АКТИВНА
										extraButton={q.is_active && (
											<button onClick={() => handleCloseQuarter(q.id, q.name)} className="flex items-center gap-1.5 px-3 py-1.5 mr-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-lg text-[11px] font-bold transition-colors" title="Завершить четверть и сбросить баллы">
												<PowerOff size={14} /> Завершить
											</button>
										)}
									/>
								</td>
							</tr>
						))}
					</TableTemplate>
				</div>
			</div>

			{/* === МОДАЛКА УЧЕБНОГО ГОДА === */}
			<Modal isOpen={isYearModalOpen} onClose={() => setIsYearModalOpen(false)}>
					<div className="bg-white p-6 rounded-3xl w-full max-w-sm">
						<h3 className="font-black text-xl mb-4">{editingYearId ? 'Редактировать' : 'Добавить'} учебный год</h3>
						<form onSubmit={handleYearSubmit} className="space-y-5">
							<input required placeholder="Например: 2025-2026" value={year} onChange={e => setYear(e.target.value)} className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 outline-none rounded-xl px-4 py-3 font-medium" />
							<label className="flex items-center gap-3 cursor-pointer p-3 border border-slate-100 rounded-xl hover:bg-slate-50">
								<input type="checkbox" checked={isYearActive} onChange={e => setIsYearActive(e.target.checked)} className="w-5 h-5 text-indigo-600 rounded-md" />
								<span className="text-sm font-bold text-slate-700">Сделать этот год активным</span>
							</label>
							<div className="flex gap-3 pt-2">
								<button type="button" onClick={() => setIsYearModalOpen(false)} className="flex-1 bg-slate-100 py-3 rounded-xl font-bold text-slate-700">Отмена</button>
								<button type="submit" className="flex-1 bg-indigo-600 text-white py-3 rounded-xl font-bold">Сохранить</button>
							</div>
						</form>
					</div>
			</Modal>

			{/* === МОДАЛКА ЧЕТВЕРТИ === */}
			<Modal isOpen={isQuarterModalOpen} onClose={() => setIsQuarterModalOpen(false)}>
					<div className="bg-white p-6 rounded-3xl w-full max-w-sm">
						<h3 className="font-black text-xl mb-4">{editingQuarterId ? 'Редактировать' : 'Добавить'} четверть</h3>
						<form onSubmit={handleQuarterSubmit} className="space-y-4">
							<input required placeholder="Например: 1-ум чоряк" value={quarterName} onChange={e => setQuarterName(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-medium outline-none" />

							<select required value={quarterYearId} onChange={e => setQuarterYearId(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium outline-none">
								<option value="" disabled>Выберите учебный год</option>
								{data.map(y => <option key={y.id} value={y.id}>{y.year}</option>)}
							</select>

							<label className="flex items-center gap-3 cursor-pointer p-3 border border-slate-100 rounded-xl hover:bg-slate-50">
								<input type="checkbox" checked={isQuarterActive} onChange={e => setIsQuarterActive(e.target.checked)} className="w-5 h-5 text-indigo-600 rounded-md" />
								<span className="text-sm font-bold text-slate-700">Текущая (Активная) четверть</span>
							</label>
							<div className="flex gap-3 pt-2">
								<button type="button" onClick={() => setIsQuarterModalOpen(false)} className="flex-1 bg-slate-100 py-3 rounded-xl font-bold text-slate-700">Отмена</button>
								<button type="submit" className="flex-1 bg-indigo-600 text-white py-3 rounded-xl font-bold">Сохранить</button>
							</div>
						</form>
					</div>
			</Modal>
		</div>
	);
}