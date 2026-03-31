import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
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
	const [quarterStartDate, setQuarterStartDate] = useState('');
	const [quarterEndDate, setQuarterEndDate] = useState('');

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
		setEditingQuarterId(item?.id || null);
		setQuarterName(item?.name || '');
		setQuarterYearId(item?.academic_year || '');
		setIsQuarterActive(item?.is_active || false);
		setQuarterStartDate(item?.start_date || '');
		setQuarterEndDate(item?.end_date || '');
		setIsQuarterModalOpen(true);
	};
	const handleQuarterDelete = async (id: number) => {
		if (!window.confirm('Удалить эту четверть?')) return;
		try { await api.delete(`quarters/${id}/`); fetchQuarters(); toast.success('Удалено'); }
		catch (err: any) { toast.error(err.response?.data?.detail || 'Ошибка'); }
	};
	const handleQuarterSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		// Если учебный год выбран вручную — передаём его, иначе — не передаём (бэкенд угадает по датам)
		const payload: any = {
			name: quarterName,
			is_active: isQuarterActive,
			start_date: quarterStartDate || null,
			end_date: quarterEndDate || null,
		};
		if (quarterYearId) payload.academic_year = quarterYearId;
		try {
			editingQuarterId ? await api.patch(`quarters/${editingQuarterId}/`, payload) : await api.post(`quarters/`, payload);
			setIsQuarterModalOpen(false); fetchQuarters(); toast.success('Сохранено');
		} catch (err: any) { toast.error(err.response?.data?.detail || JSON.stringify(err.response?.data) || 'Ошибка'); }
	};


	// ==========================================
	// УМНЫЙ СТАТУС — определяется по дате
	// Формат года: "2025-2026"
	// Учебный год: сентябрь(стартовый год) – июнь(конечный год)
	// ==========================================
	const getYearStatus = (yearStr: string, isActive: boolean) => {
		const parts = yearStr?.match(/(\d{4})-(\d{4})/);
		if (!parts) return { label: isActive ? 'Активный' : 'Неактивный', color: 'bg-slate-50 text-slate-500 border-slate-200' };

		const startYear = parseInt(parts[1]);
		const endYear = parseInt(parts[2]);
		const now = new Date();

		// Учебный год: 1 сентября startYear — 30 июня endYear
		const yearStart = new Date(startYear, 8, 1);   // сентябрь = месяц 8
		const yearEnd   = new Date(endYear, 5, 30);    // июнь = месяц 5

		if (now > yearEnd) {
			// Год уже закончился — всегда Завершен
			return { label: 'Завершен', color: 'bg-slate-50 text-slate-500 border-slate-200' };
		} else if (now >= yearStart && now <= yearEnd) {
			// Сейчас внутри учебного года
			if (isActive) {
				return { label: 'Активный', color: 'bg-green-50 text-green-700 border-green-200' };
			} else {
				return { label: 'Неактивный', color: 'bg-slate-50 text-slate-500 border-slate-200' };
			}
		} else {
			// Год ещё не начался (now < yearStart)
			if (isActive) {
				return { label: 'Ожидает', color: 'bg-blue-50 text-blue-600 border-blue-200' };
			} else {
				return { label: 'Запланирован', color: 'bg-slate-50 text-slate-400 border-slate-200' };
			}
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
					<TableTemplate headers={['№', 'Учебный год', 'Статус', 'Действия']}>
						{data.map((y, idx) => {
							const status = getYearStatus(y.year, y.is_active);
							return (
								<tr key={y.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
									<td className="py-4 px-4 text-xs font-bold text-slate-400">{idx + 1}</td>
									<td className="py-4 px-4 font-bold text-lg text-slate-800 whitespace-nowrap">{y.year}</td>
									<td className="py-4 px-4">
										<span className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border ${status.color}`}>
											{status.label}
										</span>
									</td>
									<td className="py-4 px-4">
										<ActionButtons onEdit={() => openYearModal(y)} onDelete={() => handleYearDelete(y.id)} />
									</td>
								</tr>
							);
						})}
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
					<TableTemplate headers={['№', 'Четверть', 'Период', 'Статус', 'Действия']}>
						{[...quarters].sort((a, b) => new Date(b.start_date || 0).getTime() - new Date(a.start_date || 0).getTime()).map((q, idx) => (
							<tr key={q.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
								<td className="py-4 px-4 text-xs font-bold text-slate-400">{idx + 1}</td>
								<td className="py-4 px-4 font-bold text-slate-800 whitespace-nowrap">{q.name}</td>
								<td className="py-4 px-4 text-xs font-medium text-slate-500 whitespace-nowrap">
									{q.start_date && q.end_date
										? `${new Date(q.start_date).toLocaleDateString('ru-RU', {day:'numeric',month:'short'})} – ${new Date(q.end_date).toLocaleDateString('ru-RU', {day:'numeric',month:'short',year:'numeric'})}`
										: <span className="text-slate-300">—</span>
									}
								</td>
								<td className="py-4 px-4">
									{(() => {
										const now = new Date();
										if (q.start_date && q.end_date) {
											const s = new Date(q.start_date);
											const e = new Date(q.end_date);
											if (now < s) return <span className="px-3 py-1.5 rounded-lg text-[11px] font-bold border bg-blue-50 text-blue-600 border-blue-200">Ожидает</span>;
											if (now >= s && now <= e) return <span className="px-3 py-1.5 rounded-lg text-[11px] font-bold border bg-green-50 text-green-700 border-green-200">Текущая</span>;
											if (now > e) return <span className="px-3 py-1.5 rounded-lg text-[11px] font-bold border bg-slate-50 text-slate-500 border-slate-200">Завершена</span>;
										}
										// Если дат нет — опираемся на is_active
										return <span className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border ${q.is_active ? 'bg-green-50 text-green-700 border-green-200' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>{q.is_active ? 'Текущая' : 'Архив'}</span>;
									})()}
								</td>
								<td className="py-4 px-4">
									<ActionButtons
										onEdit={() => openQuarterModal(q)}
										onDelete={() => handleQuarterDelete(q.id)}
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
						<h3 className="font-black text-xl mb-1">{editingQuarterId ? 'Редактировать' : 'Добавить'} четверть</h3>
						<p className="text-xs text-slate-500 font-medium mb-4">Учебный год определится автоматически по датам</p>
						<form onSubmit={handleQuarterSubmit} className="space-y-4">
							<div>
								<label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Название</label>
								<input required placeholder="Например: 1-ум чоряк" value={quarterName} onChange={e => setQuarterName(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-medium outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 transition-all" />
							</div>

							<div className="grid grid-cols-2 gap-3">
								<div>
									<label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Начало</label>
									<input type="date" value={quarterStartDate} onChange={e => setQuarterStartDate(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-3 text-sm font-medium outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 transition-all" />
								</div>
								<div>
									<label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Конец</label>
									<input type="date" value={quarterEndDate} onChange={e => setQuarterEndDate(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-3 text-sm font-medium outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 transition-all" />
								</div>
							</div>

							{/* Автоопределение учебного года — превью */}
							{quarterStartDate && (() => {
								const d = new Date(quarterStartDate);
								const m = d.getMonth() + 1;
								const y = d.getFullYear();
								const sy = m >= 9 ? y : y - 1;
								return (
									<div className="bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-2.5 flex items-center gap-2">
										<span className="text-[11px] font-bold text-indigo-500 uppercase tracking-wider">Учебный год:</span>
										<span className="text-sm font-black text-indigo-700">{sy}-{sy + 1}</span>
										<span className="text-[10px] text-indigo-400 ml-1">(автоматически)</span>
									</div>
								);
							})()}

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