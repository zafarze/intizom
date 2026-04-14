import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../../api/axios';
import { TableTemplate, ActionButtons, Modal } from './Shared';

export default function YearsTab({ data, refresh }: { data: any[], refresh: () => void }) {
	const { t } = useTranslation();
	// Состояния для Учебного Года
	const [isYearModalOpen, setIsYearModalOpen] = useState(false);
	const [editingYearId, setEditingYearId] = useState<number | null>(null);
	const [year, setYear] = useState('');
	const [isYearActive, setIsYearActive] = useState(false);

	// Состояния для Четвертей
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const [quarters, setQuarters] = useState<any[]>([]);
	const [isQuarterModalOpen, setIsQuarterModalOpen] = useState(false);
	const [editingQuarterId, setEditingQuarterId] = useState<number | null>(null);
	const [quarterNameRu, setQuarterNameRu] = useState('');
	const [quarterNameTg, setQuarterNameTg] = useState('');
	const [quarterNameEn, setQuarterNameEn] = useState('');
	const [quarterYearId, setQuarterYearId] = useState('');
	const [activeQuarterLang, setActiveQuarterLang] = useState<'ru' | 'tg' | 'en'>('ru');
	const [isQuarterActive, setIsQuarterActive] = useState(false);
	const [quarterStartDate, setQuarterStartDate] = useState('');
	const [quarterEndDate, setQuarterEndDate] = useState('');

	// Загружаем четверти
	const fetchQuarters = async () => {
		try {
			const res = await api.get('quarters/');
			setQuarters(res.data.results || res.data);
		} catch (err) {
			console.error(t('auto.t_41_oshibka_zagruzki_chetvertey'), err);
		}
	};

	useEffect(() => { fetchQuarters(); }, []);

	// --- ЛОГИКА УЧЕБНЫХ ГОДОВ ---
	const openYearModal = (item?: any) => {
		setEditingYearId(item?.id || null); setYear(item?.year || ''); setIsYearActive(item?.is_active || false); setIsYearModalOpen(true);
	};
	const handleYearDelete = async (id: number) => {
		if (!window.confirm(t('mgmt.t_20'))) return;
		try { await api.delete(`years/${id}/`); refresh(); toast.success(t('mgmt.t_105')); }
		catch (err: any) { toast.error(err.response?.data?.detail || t('mgmt.t_113')); }
	};
	const handleYearSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		const payload = { year, is_active: isYearActive };
		try {
			editingYearId ? await api.patch(`years/${editingYearId}/`, payload) : await api.post(`years/`, payload);
			setIsYearModalOpen(false); refresh(); toast.success(t('mgmt.t_85'));
		} catch (err: any) { toast.error(err.response?.data?.detail || t('mgmt.t_113')); }
	};

	// --- ЛОГИКА ЧЕТВЕРТЕЙ ---
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const openQuarterModal = (item?: any) => {
		setEditingQuarterId(item?.id || null);
		setQuarterNameRu(item?.name_ru || '');
		setQuarterNameTg(item?.name_tg || '');
		setQuarterNameEn(item?.name_en || '');
		setQuarterYearId(item?.academic_year || '');
		setIsQuarterActive(item?.is_active || false);
		setQuarterStartDate(item?.start_date || '');
		setQuarterEndDate(item?.end_date || '');
		setIsQuarterModalOpen(true);
		setActiveQuarterLang('ru');
	};
	const handleQuarterDelete = async (id: number) => {
		if (!window.confirm(t('mgmt.t_29'))) return;
		try { await api.delete(`quarters/${id}/`); fetchQuarters(); toast.success(t('mgmt.t_105')); }
		catch (err: any) { toast.error(err.response?.data?.detail || t('mgmt.t_113')); }
	};
	const handleQuarterSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		// Если учебный год выбран вручную — передаём его, иначе — не передаём (бэкенд угадает по датам)
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const payload: any = {
			name_ru: quarterNameRu,
			name_tg: quarterNameTg,
			name_en: quarterNameEn,
			is_active: isQuarterActive,
			start_date: quarterStartDate || null,
			end_date: quarterEndDate || null,
		};
		if (quarterYearId) payload.academic_year = quarterYearId;
		try {
			editingQuarterId ? await api.patch(`quarters/${editingQuarterId}/`, payload) : await api.post(`quarters/`, payload);
			setIsQuarterModalOpen(false); fetchQuarters(); toast.success(t('mgmt.t_85'));
		} catch (err: any) { toast.error(err.response?.data?.detail || JSON.stringify(err.response?.data) || t('mgmt.t_113')); }
	};


	// ==========================================
	// УМНЫЙ СТАТУС — определяется по дате
	// Формат года: "2025-2026"
	// Учебный год: сентябрь(стартовый год) – июнь(конечный год)
	// ==========================================
	const getYearStatus = (yearStr: string, isActive: boolean) => {
		const parts = yearStr?.match(/(\d{4})-(\d{4})/);
		if (!parts) return { label: isActive ? t('mgmt.t_92') : t('mgmt.t_82'), color: 'bg-slate-50 text-slate-500 border-slate-200' };

		const startYear = parseInt(parts[1]);
		const endYear = parseInt(parts[2]);
		const now = new Date();

		// Учебный год: 1 сентября startYear — 30 июня endYear
		const yearStart = new Date(startYear, 8, 1);   // сентябрь = месяц 8
		const yearEnd = new Date(endYear, 5, 30);    // июнь = месяц 5

		if (now > yearEnd) {
			// Год уже закончился — всегда Завершен
			return { label: t('mgmt.t_97'), color: 'bg-slate-50 dark:bg-zinc-800/50 text-slate-500 dark:text-zinc-400 border-slate-200 dark:border-zinc-700' };
		} else if (now >= yearStart && now <= yearEnd) {
			// Сейчас внутри учебного года
			if (isActive) {
				return { label: t('mgmt.t_92'), color: 'bg-green-50 dark:bg-emerald-500/10 text-green-700 dark:text-emerald-400 border-green-200 dark:border-emerald-500/20' };
			} else {
				return { label: t('mgmt.t_82'), color: 'bg-slate-50 dark:bg-zinc-800/50 text-slate-500 dark:text-zinc-400 border-slate-200 dark:border-zinc-700' };
			}
		} else {
			// Год ещё не начался (now < yearStart)
			if (isActive) {
				return { label: t('mgmt.t_107'), color: 'bg-blue-50 dark:bg-indigo-500/10 text-blue-600 dark:text-indigo-400 border-blue-200 dark:border-indigo-500/20' };
			} else {
				return { label: t('mgmt.t_72'), color: 'bg-slate-50 dark:bg-zinc-800/50 text-slate-400 dark:text-zinc-500 border-slate-200 dark:border-zinc-700' };
			}
		}
	};

	return (
		<div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start animate-in fade-in duration-300">

			{/* БЛОК 1: УЧЕБНЫЕ ГОДЫ */}
			<div className="bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl border border-white dark:border-zinc-800/60 rounded-[2rem] p-6 shadow-sm w-full">
				<div className="flex justify-between items-center mb-6 border-b border-white dark:border-zinc-800 pb-4">
					<h2 className="text-lg font-black text-slate-800 dark:text-zinc-50">{t('mgmt.t_74')}</h2>
					<button onClick={() => openYearModal()} className="flex items-center gap-2 bg-indigo-500 hover:bg-indigo-600 transition-colors text-white px-4 py-2 rounded-xl text-sm font-bold shadow-md">
						<Plus size={16} /> {t('management.common.create')}
					</button>
				</div>
				<div className="overflow-x-auto">
					<TableTemplate headers={['№', t('auto.t_154_uchebnyy_god'), t('mgmt.t_112'), t('mgmt.t_94')]}>
						{data.map((y, idx) => {
							const status = getYearStatus(y.year, y.is_active);
							return (
								<tr key={y.id} className="border-b border-slate-100 dark:border-zinc-800/60 hover:bg-slate-50 dark:hover:bg-zinc-800/30 transition-colors">
									<td className="py-4 px-4 text-xs font-bold text-slate-400 dark:text-zinc-500">{idx + 1}</td>
									<td className="py-4 px-4 font-bold text-lg text-slate-800 dark:text-zinc-50 whitespace-nowrap">{y.year}</td>
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
			<div className="bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl border border-white dark:border-zinc-800/60 rounded-[2rem] p-6 shadow-sm w-full">
				<div className="flex justify-between items-center mb-6 border-b border-white dark:border-zinc-800 pb-4">
					<div>
						<h2 className="text-lg font-black text-slate-800 dark:text-zinc-50">{t('mgmt.t_39')}</h2>
						<p className="text-xs text-slate-500 dark:text-zinc-400 font-medium mt-1">{t('mgmt.t_16')}</p>
					</div>
					<button onClick={() => openQuarterModal()} className="flex items-center gap-2 bg-indigo-500 hover:bg-indigo-600 transition-colors text-white px-4 py-2 rounded-xl text-sm font-bold shadow-md">
						<Plus size={16} /> {t('management.common.add')}
					</button>
				</div>

				<div className="overflow-x-auto">
					<TableTemplate headers={['№', t('mgmt.t_100'), t('mgmt.t_111'), t('mgmt.t_112'), t('mgmt.t_94')]}>
						{[...quarters].sort((a, b) => new Date(b.start_date || 0).getTime() - new Date(a.start_date || 0).getTime()).map((q, idx) => (
							<tr key={q.id} className="border-b border-slate-100 dark:border-zinc-800/60 hover:bg-slate-50 dark:hover:bg-zinc-800/30 transition-colors">
								<td className="py-4 px-4 text-xs font-bold text-slate-400 dark:text-zinc-500">{idx + 1}</td>
								<td className="py-4 px-4 font-bold text-slate-800 dark:text-zinc-50 whitespace-nowrap">{q.name}</td>
								<td className="py-4 px-4 text-xs font-medium text-slate-500 dark:text-zinc-400 whitespace-nowrap">
									{q.start_date && q.end_date
										? `${new Date(q.start_date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })} – ${new Date(q.end_date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })}`
										: <span className="text-slate-300 dark:text-zinc-600">—</span>
									}
								</td>
								<td className="py-4 px-4">
									{(() => {
										const now = new Date();
										if (q.start_date && q.end_date) {
											const s = new Date(q.start_date);
											const e = new Date(q.end_date);
											if (now < s) return <span className="px-3 py-1.5 rounded-lg text-[11px] font-bold border bg-blue-50 dark:bg-indigo-500/10 text-blue-600 dark:text-indigo-400 border-blue-200 dark:border-indigo-500/20">{t('mgmt.t_107')}</span>;
											if (now >= s && now <= e) return <span className="px-3 py-1.5 rounded-lg text-[11px] font-bold border bg-green-50 dark:bg-emerald-500/10 text-green-700 dark:text-emerald-400 border-green-200 dark:border-emerald-500/20">{t('mgmt.t_108')}</span>;
											if (now > e) return <span className="px-3 py-1.5 rounded-lg text-[11px] font-bold border bg-slate-50 dark:bg-zinc-800/50 text-slate-500 dark:text-zinc-400 border-slate-200 dark:border-zinc-700">{t('mgmt.t_86')}</span>;
										}
										// Если дат нет — опираемся на is_active
										return <span className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border ${q.is_active ? 'bg-green-50 dark:bg-emerald-500/10 text-green-700 dark:text-emerald-400 border-green-200 dark:border-emerald-500/20' : 'bg-slate-50 dark:bg-zinc-800/50 text-slate-500 dark:text-zinc-400 border-slate-200 dark:border-zinc-700'}`}>{q.is_active ? t('mgmt.t_108') : t('mgmt.t_126')}</span>;
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
				<div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl w-full max-w-sm">
					<h3 className="font-black text-xl mb-4 dark:text-zinc-50">{editingYearId ? t('management.years.modal_edit_year') : t('management.years.modal_add_year')}</h3>
					<form onSubmit={handleYearSubmit} className="space-y-5">
						<input required placeholder={t('mgmt.t_36')} value={year} onChange={e => setYear(e.target.value)} className="w-full bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700 dark:text-zinc-100 focus:border-indigo-400 dark:focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-100 dark:focus:ring-indigo-500/20 outline-none rounded-xl px-4 py-3 font-medium" />
						<label className="flex items-center gap-3 cursor-pointer p-3 border border-slate-100 dark:border-zinc-800 rounded-xl hover:bg-slate-50 dark:hover:bg-zinc-800/50">
							<input type="checkbox" checked={isYearActive} onChange={e => setIsYearActive(e.target.checked)} className="w-5 h-5 text-indigo-600 rounded-md" />
							<span className="text-sm font-bold text-slate-700 dark:text-zinc-300">{t('mgmt.t_21')}</span>
						</label>
						<div className="flex gap-3 pt-2">
							<button type="button" onClick={() => setIsYearModalOpen(false)} className="flex-1 bg-slate-100 dark:bg-zinc-800 py-3 rounded-xl font-bold text-slate-700 dark:text-zinc-200">{t('mgmt.t_115')}</button>
							<button type="submit" className="flex-1 bg-indigo-600 text-white py-3 rounded-xl font-bold">{t('mgmt.t_83')}</button>
						</div>
					</form>
				</div>
			</Modal>

			{/* === МОДАЛКА ЧЕТВЕРТИ === */}
			<Modal isOpen={isQuarterModalOpen} onClose={() => setIsQuarterModalOpen(false)}>
				<div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl w-full max-w-sm">
					<h3 className="font-black text-xl mb-1 dark:text-zinc-50">{editingQuarterId ? t('management.years.modal_edit_quarter') : t('management.years.modal_add_quarter')}</h3>
					<p className="text-xs text-slate-500 dark:text-zinc-400 font-medium mb-4">{t('mgmt.t_6')}</p>
					<form onSubmit={handleQuarterSubmit} className="space-y-4">
						<div>
							<div className="flex justify-between items-center mb-2">
								<label className="block text-xs font-bold text-slate-500 dark:text-zinc-500 uppercase tracking-wider">{t('mgmt.t_96')}</label>
								<div className="flex gap-1 bg-slate-100 dark:bg-zinc-800 p-0.5 rounded-lg">
									<button type="button" onClick={() => setActiveQuarterLang('ru')} className={`px-2 py-1 rounded-md text-[10px] font-bold transition-all ${activeQuarterLang === 'ru' ? 'bg-white dark:bg-zinc-700 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-zinc-400 hover:text-slate-700 dark:hover:text-zinc-200'}`}>RU</button>
									<button type="button" onClick={() => setActiveQuarterLang('tg')} className={`px-2 py-1 rounded-md text-[10px] font-bold transition-all ${activeQuarterLang === 'tg' ? 'bg-white dark:bg-zinc-700 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-zinc-400 hover:text-slate-700 dark:hover:text-zinc-200'}`}>TG</button>
									<button type="button" onClick={() => setActiveQuarterLang('en')} className={`px-2 py-1 rounded-md text-[10px] font-bold transition-all ${activeQuarterLang === 'en' ? 'bg-white dark:bg-zinc-700 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-zinc-400 hover:text-slate-700 dark:hover:text-zinc-200'}`}>EN</button>
								</div>
							</div>
							{activeQuarterLang === 'ru' && <input required placeholder={t('auto.t_70_naprimer_1_ya_chetvert')} value={quarterNameRu} onChange={e => setQuarterNameRu(e.target.value)} className="w-full bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700 dark:text-zinc-100 rounded-xl px-4 py-3 font-medium outline-none focus:border-indigo-400 dark:focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-100 dark:focus:ring-indigo-500/20 transition-all" />}
							{activeQuarterLang === 'tg' && <input placeholder={t('auto.t_9_naprimer_1_um_choryak')} value={quarterNameTg} onChange={e => setQuarterNameTg(e.target.value)} className="w-full bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700 dark:text-zinc-100 rounded-xl px-4 py-3 font-medium outline-none focus:border-indigo-400 dark:focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-100 dark:focus:ring-indigo-500/20 transition-all" />}
							{activeQuarterLang === 'en' && <input placeholder={t('auto.t_93_naprimer_1st_quarter')} value={quarterNameEn} onChange={e => setQuarterNameEn(e.target.value)} className="w-full bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700 dark:text-zinc-100 rounded-xl px-4 py-3 font-medium outline-none focus:border-indigo-400 dark:focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-100 dark:focus:ring-indigo-500/20 transition-all" />}
						</div>

						<div className="grid grid-cols-2 gap-3">
							<div>
								<label className="block text-xs font-bold text-slate-500 dark:text-zinc-500 uppercase tracking-wider mb-2">{t('mgmt.t_110')}</label>
								<input type="date" value={quarterStartDate} onChange={e => setQuarterStartDate(e.target.value)} className="w-full bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700 dark:text-zinc-100 rounded-xl px-3 py-3 text-sm font-medium outline-none focus:border-indigo-400 dark:focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-100 dark:focus:ring-indigo-500/20 transition-all" />
							</div>
							<div>
								<label className="block text-xs font-bold text-slate-500 dark:text-zinc-500 uppercase tracking-wider mb-2">{t('mgmt.t_125')}</label>
								<input type="date" value={quarterEndDate} onChange={e => setQuarterEndDate(e.target.value)} className="w-full bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700 dark:text-zinc-100 rounded-xl px-3 py-3 text-sm font-medium outline-none focus:border-indigo-400 dark:focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-100 dark:focus:ring-indigo-500/20 transition-all" />
							</div>
						</div>

						{/* Автоопределение учебного года — превью */}
						{quarterStartDate && (() => {
							const d = new Date(quarterStartDate);
							const m = d.getMonth() + 1;
							const y = d.getFullYear();
							const sy = m >= 9 ? y : y - 1;
							return (
								<div className="bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 rounded-xl px-4 py-2.5 flex items-center gap-2">
									<span className="text-[11px] font-bold text-indigo-500 dark:text-indigo-400 uppercase tracking-wider">{t('mgmt.t_70')}</span>
									<span className="text-sm font-black text-indigo-700 dark:text-indigo-300">{sy}-{sy + 1}</span>
									<span className="text-[10px] text-indigo-400 ml-1">{t('mgmt.t_53')}</span>
								</div>
							);
						})()}

						<label className="flex items-center gap-3 cursor-pointer p-3 border border-slate-100 dark:border-zinc-800 rounded-xl hover:bg-slate-50 dark:hover:bg-zinc-800/50">
							<input type="checkbox" checked={isQuarterActive} onChange={e => setIsQuarterActive(e.target.checked)} className="w-5 h-5 text-indigo-600 rounded-md" />
							<span className="text-sm font-bold text-slate-700 dark:text-zinc-300">{t('mgmt.t_18')}</span>
						</label>
						<div className="flex gap-3 pt-2">
							<button type="button" onClick={() => setIsQuarterModalOpen(false)} className="flex-1 bg-slate-100 dark:bg-zinc-800 py-3 rounded-xl font-bold text-slate-700 dark:text-zinc-200">{t('mgmt.t_115')}</button>
							<button type="submit" className="flex-1 bg-indigo-600 text-white py-3 rounded-xl font-bold">{t('mgmt.t_83')}</button>
						</div>
					</form>
				</div>
			</Modal>
		</div>
	);
}