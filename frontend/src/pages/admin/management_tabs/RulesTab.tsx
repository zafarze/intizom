import { useState, useEffect, useRef } from 'react';
import { Plus, Sparkles, Loader2 } from 'lucide-react';
import api from '../../../api/axios';
import { TableTemplate, ActionButtons, Modal } from './Shared';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function RulesTab({ data, refresh }: { data: any[], refresh: () => void }) {
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [editingId, setEditingId] = useState<number | null>(null);
	const [formData, setFormData] = useState({ title_ru: '', title_tg: '', title_en: '', category: 'A', points_impact: -5, is_multiple: false });
	const [activeLang, setActiveLang] = useState<'ru' | 'tg' | 'en'>('ru');
	const [isTranslating, setIsTranslating] = useState(false);

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const openModal = (item?: any) => {
		setEditingId(item?.id || null);
		setFormData(item ? {
			title_ru: item.title_ru || '',
			title_tg: item.title_tg || '',
			title_en: item.title_en || '',
			category: item.category,
			points_impact: item.points_impact,
			is_multiple: item.is_multiple || false
		} : { title_ru: '', title_tg: '', title_en: '', category: 'A', points_impact: -5, is_multiple: false });
		setIsModalOpen(true);
		setActiveLang('ru');
	};

	const handleDelete = async (id: number) => {
		if (window.confirm('Удалить?')) {
			await api.delete(`rules/${id}/`);
			refresh();
		}
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (editingId) {
			await api.patch(`rules/${editingId}/`, formData);
		} else {
			await api.post(`rules/`, formData);
		}
		setIsModalOpen(false);
		refresh();
	};

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const updateInline = async (id: number, field: string, value: any) => {
		try {
			await api.patch(`rules/${id}/`, { [field]: value });
			refresh();
		} catch (error) {
			console.error("Ошибка при сохранении", error);
		}
	};

	const handleAITranslate = async () => {
		const currentText = formData[`title_${activeLang}`];
		if (!currentText) return;

		setIsTranslating(true);
		try {
			const res = await api.post('ai/translate/', {
				text: currentText,
				source_lang: activeLang
			});
			if (res.data) {
				setFormData(prev => ({
					...prev,
					title_ru: res.data.ru || prev.title_ru,
					title_tg: res.data.tg || prev.title_tg,
					title_en: res.data.en || prev.title_en,
				}));
			}
		} catch (error) {
			console.error('Ошибка перевода:', error);
			alert('Ошибка при переводе. Проверьте настройки AI.');
		} finally {
			setIsTranslating(false);
		}
	};

	return (
		<div className="bg-white/60 backdrop-blur-xl border border-white rounded-[2rem] p-6 shadow-sm">
			<div className="flex justify-end mb-6">
				<button onClick={() => openModal()} className="flex gap-2 bg-indigo-500 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-md">
					<Plus size={16} /> Добавить правило
				</button>
			</div>
			<TableTemplate headers={['№', 'Категория', 'Название правила', 'Баллы', 'Тип (Wiegt)', 'Действия']}>
				{[...data].sort((a, b) => a.id - b.id).map((r, index) => (
					<RuleRow key={r.id} index={index + 1} r={r} updateInline={updateInline} openModal={openModal} handleDelete={handleDelete} />
				))}
			</TableTemplate>
			<Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
				<div className="bg-white p-6 rounded-3xl w-full max-w-sm">
					<h3 className="font-black text-xl mb-4">Правило</h3>
					<div className="flex gap-2 mb-4 bg-slate-100 p-1 rounded-xl">
						<button type="button" onClick={() => setActiveLang('ru')} className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${activeLang === 'ru' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}>Русский</button>
						<button type="button" onClick={() => setActiveLang('tg')} className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${activeLang === 'tg' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}>Тоҷикӣ</button>
						<button type="button" onClick={() => setActiveLang('en')} className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${activeLang === 'en' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}>English</button>
					</div>
					<form onSubmit={handleSubmit} className="space-y-4">
						<div className="relative">
							{activeLang === 'ru' && <input required placeholder="Описание (напр. Опоздание)" value={formData.title_ru} onChange={e => setFormData({ ...formData, title_ru: e.target.value })} className="w-full bg-slate-50 border rounded-xl px-4 py-3 pr-12" />}
							{activeLang === 'tg' && <input placeholder="Описание (на таджикском)" value={formData.title_tg} onChange={e => setFormData({ ...formData, title_tg: e.target.value })} className="w-full bg-slate-50 border rounded-xl px-4 py-3 pr-12" />}
							{activeLang === 'en' && <input placeholder="Описание (на английском)" value={formData.title_en} onChange={e => setFormData({ ...formData, title_en: e.target.value })} className="w-full bg-slate-50 border rounded-xl px-4 py-3 pr-12" />}

							<button
								type="button"
								onClick={handleAITranslate}
								disabled={isTranslating}
								className={`absolute right-3 top-1/2 -translate-y-1/2 transition-colors ${isTranslating ? 'text-indigo-300' : 'text-indigo-500 hover:text-indigo-700'} ${!formData[`title_${activeLang}`] && 'opacity-50 cursor-not-allowed'}`}
								title="Авто-перевод (AI)"
							>
								{isTranslating ? <Loader2 size={20} className="animate-spin" /> : <Sparkles size={20} />}
							</button>
						</div>

						<select value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })} className="w-full bg-slate-50 border rounded-xl px-4 py-3"><option value="A">Мелкие</option><option value="B">Средние</option><option value="C">Тяжкие</option><option value="D">Особо тяжкие</option><option value="BONUS">Бонус</option></select>
						<input type="number" required placeholder="-5" value={formData.points_impact} onChange={e => setFormData({ ...formData, points_impact: Number(e.target.value) })} className="w-full bg-slate-50 border rounded-xl px-4 py-3" />
						<select value={formData.is_multiple ? 'true' : 'false'} onChange={e => setFormData({ ...formData, is_multiple: e.target.value === 'true' })} className="w-full bg-slate-50 border rounded-xl px-4 py-3"><option value="false">Одиночное (Single)</option><option value="true">Многократное (Multiple)</option></select>
						<div className="flex gap-2"><button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 bg-slate-100 py-3 rounded-xl font-bold">Отмена</button><button type="submit" className="flex-1 bg-indigo-600 text-white py-3 rounded-xl font-bold">Сохранить</button></div>
					</form>
				</div>
			</Modal>
		</div>
	);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function RuleRow({ r, index, updateInline, openModal, handleDelete }: any) {
	const [isMultiple, setIsMultiple] = useState(r.is_multiple);
	const [isOpen, setIsOpen] = useState(false);
	const tdRef = useRef<HTMLTableDataCellElement>(null);

	useEffect(() => {
		setIsMultiple(r.is_multiple);
	}, [r.is_multiple]);

	useEffect(() => {
		const handleClick = (e: MouseEvent) => { if (tdRef.current && !tdRef.current.contains(e.target as Node)) setIsOpen(false); };
		document.addEventListener('mousedown', handleClick);
		return () => document.removeEventListener('mousedown', handleClick);
	}, []);

	const handleSelect = (val: boolean) => {
		setIsMultiple(val);
		setIsOpen(false);
		updateInline(r.id, 'is_multiple', val);
	};

	return (
		<tr className="border-b border-slate-100 hover:bg-slate-50">
			<td className="py-4 px-4 font-bold text-[12px] text-slate-400 w-12 text-center">{index}</td>
			<td className="py-4 px-4 font-bold text-[11px] text-slate-500">{r.category_display.split(':')[0]}</td>
			<td className="py-4 px-4 font-bold text-slate-800">{r.title}</td>
			<td className="py-2 px-4">
				<input
					type="number"
					defaultValue={r.points_impact}
					onBlur={(e) => updateInline(r.id, 'points_impact', Number(e.target.value))}
					className={`w-16 bg-white/40 border border-slate-200/50 focus:bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 shadow-sm rounded-xl outline-none px-2 py-1.5 font-black text-center transition-all cursor-text ${r.points_impact > 0 ? 'text-green-600' : 'text-red-500'}`}
				/>
			</td>
			<td className="py-2 px-4 relative" ref={tdRef}>
				<button
					onClick={() => setIsOpen(!isOpen)}
					className={`flex items-center justify-between w-[90px] rounded-xl pl-3 pr-2 py-1.5 font-black text-[11px] outline-none shadow-sm border focus:ring-2 active:scale-95 transition-all ${isMultiple ? 'bg-purple-100 text-purple-700 border-purple-200' : 'bg-indigo-50 text-indigo-700 border-indigo-100'}`}
				>
					{isMultiple ? 'Multiple' : 'Single'}
					<svg className={`shrink-0 w-3 h-3 text-${isMultiple ? 'purple' : 'indigo'}-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" /></svg>
				</button>

				{isOpen && (
					<div className="absolute top-[calc(100%+4px)] left-4 w-28 bg-white border border-slate-100 shadow-xl rounded-xl p-1.5 z-50 animate-in fade-in zoom-in-95 origin-top-left">
						<button onClick={() => handleSelect(false)} className={`block w-full text-left px-3 py-2 rounded-lg text-[11px] font-bold transition-colors mb-1 ${!isMultiple ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}>Single</button>
						<button onClick={() => handleSelect(true)} className={`block w-full text-left px-3 py-2 rounded-lg text-[11px] font-bold transition-colors ${isMultiple ? 'bg-purple-100 text-purple-700' : 'text-slate-600 hover:bg-slate-50'}`}>Multiple</button>
					</div>
				)}
			</td>
			<td className="py-4 px-4"><ActionButtons onEdit={() => openModal(r)} onDelete={() => handleDelete(r.id)} /></td>
		</tr>
	);
}
