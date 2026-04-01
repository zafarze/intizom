import { useState } from 'react';
import { Search, Plus, Key, X } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../../api/axios';
import { TableTemplate, ActionButtons, Modal } from './Shared';

export default function TeachersTab({ data, classes, subjects, refresh }: { data: any[], classes: any[], subjects: any[], refresh: () => void }) {
	const [searchQuery, setSearchQuery] = useState('');
	const [currentPage] = useState(1);
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [editingId, setEditingId] = useState<number | null>(null);
	const [formData, setFormData] = useState({ username: '', password: '', t_first_name: '', t_last_name: '', subject_ids: [] as number[], led_class_ids: [] as number[] });

	const openModal = (item?: any) => {
		setEditingId(item ? item.id : null);
		setFormData(item ? {
			username: item.username, password: '', t_first_name: item.first_name, t_last_name: item.last_name,
			subject_ids: item.active_subject_ids || [],
			led_class_ids: item.active_class_ids || []
		} : { username: '', password: '', t_first_name: '', t_last_name: '', subject_ids: [], led_class_ids: [] });
		setIsModalOpen(true);
	};

	const handleDelete = async (id: number) => {
		if (!window.confirm('Удалить?')) return;
		try { await api.delete(`teachers/${id}/`); toast.success('Удалено'); refresh(); } catch { toast.error('Ошибка'); }
	};

	const handleResetPassword = async (id: number, name: string) => {
		if (!window.confirm(`Сбросить пароль для ${name} на "123456"?`)) return;
		try { await api.patch(`teachers/${id}/`, { password: '123456' }); toast.success('Пароль сброшен 🔑'); } catch { toast.error('Ошибка'); }
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		const payload: any = { username: formData.username, first_name: formData.t_first_name, last_name: formData.t_last_name, subject_ids: formData.subject_ids, led_class_ids: formData.led_class_ids };
		if (formData.password) payload.password = formData.password;
		try {
			if (editingId) await api.patch(`teachers/${editingId}/`, payload);
			else await api.post(`teachers/`, payload);
			toast.success('Сохранено'); setIsModalOpen(false); refresh();
		} catch { toast.error('Ошибка сохранения'); }
	};

	const filtered = searchQuery ? data.filter(t => t.first_name.toLowerCase().includes(searchQuery.toLowerCase()) || t.last_name.toLowerCase().includes(searchQuery.toLowerCase())) : data;
	const paginated = filtered.slice((currentPage - 1) * 10, currentPage * 10);

	return (
		<>
			<div className="bg-white/60 backdrop-blur-xl border border-white rounded-[2rem] p-6 shadow-sm">
				<div className="flex justify-between mb-6 border-b border-white pb-4">
					<div className="relative w-64"><Search size={18} className="absolute left-3 top-2.5 text-slate-400" /><input type="search" placeholder="Поиск..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-white/50 border border-white rounded-xl text-sm outline-none" /></div>
					<button onClick={() => openModal()} className="flex items-center gap-2 bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-md transition-all active:scale-95"><Plus size={16} /> Добавить учителя</button>
				</div>

			<TableTemplate headers={['№', 'ФИО Учителя', 'Предметы', 'Кл. Рук.', 'Логин', 'Действия']}>
				{paginated.map((t, idx) => (
					<tr key={t.id} className="border-b border-slate-100 hover:bg-slate-50">
						<td className="py-4 px-4 text-slate-400 text-xs">{idx + 1}</td>
						<td className="py-4 px-4 font-bold text-slate-800">{t.first_name} {t.last_name}</td>
						<td className="py-4 px-4 text-[11px] text-slate-600">{t.taught_subjects ? t.taught_subjects.split(', ').map((s: string) => <span key={s} className="bg-slate-100 px-2 py-1 rounded-md mr-1">{s}</span>) : '—'}</td>
						<td className="py-4 px-4 font-bold text-[12px]">{t.led_class_name ? <span className="bg-indigo-50 text-indigo-700 px-2 py-1 rounded-md">{t.led_class_name}</span> : '—'}</td>
						<td className="py-4 px-4 text-slate-500 font-semibold">@{t.username}</td>
						<td className="py-4 px-4"><ActionButtons onEdit={() => openModal(t)} onDelete={() => handleDelete(t.id)} extraButton={<button onClick={() => handleResetPassword(t.id, t.first_name)} className="p-1.5 text-amber-500 hover:bg-amber-50 rounded-lg"><Key size={16} /></button>} /></td>
					</tr>
				))}
			</TableTemplate>

			</div>

			<Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
					<div className="bg-white p-6 rounded-[2rem] w-full max-w-lg shadow-2xl">
						<div className="flex justify-between items-center mb-6">
							<h3 className="text-xl font-black text-slate-800">{editingId ? 'Редактировать' : 'Добавить'} учителя</h3>
							<button type="button" onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"><X size={20} /></button>
						</div>
						<form onSubmit={handleSubmit} className="space-y-4">
							<div className="grid grid-cols-2 gap-4">
								<input placeholder="Имя" required value={formData.t_first_name} onChange={e => setFormData({ ...formData, t_first_name: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 outline-none transition-all font-medium" />
								<input placeholder="Фамилия" required value={formData.t_last_name} onChange={e => setFormData({ ...formData, t_last_name: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 outline-none transition-all font-medium" />
							</div>
							
							<div className="space-y-2">
								<label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">ПРЕДМЕТЫ</label>
								<div className="flex flex-wrap gap-2 max-h-[140px] overflow-y-auto custom-scrollbar p-1">
									{subjects.map((sub: any) => (
										<label key={sub.id} className={`px-3 py-2 rounded-xl text-[13px] font-bold border cursor-pointer transition-all ${formData.subject_ids.includes(sub.id) ? 'bg-indigo-50 border-indigo-300 text-indigo-700 shadow-sm scale-105' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'} `}>
											<input type="checkbox" className="hidden" checked={formData.subject_ids.includes(sub.id)} onChange={e => setFormData({ ...formData, subject_ids: e.target.checked ? [...formData.subject_ids, sub.id] : formData.subject_ids.filter(id => id !== sub.id) })} />
											{sub.name}
										</label>
									))}
								</div>
							</div>

							<div className="space-y-2">
								<label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">КЛАССНОЕ РУКОВОДСТВО</label>
								<div className="flex flex-wrap gap-2 max-h-[140px] overflow-y-auto custom-scrollbar p-1">
									{classes.map((c: any) => (
										<label key={c.id} className={`px-3 py-2 rounded-xl text-[13px] font-bold border cursor-pointer transition-all ${formData.led_class_ids.includes(c.id) ? 'bg-indigo-50 border-indigo-300 text-indigo-700 shadow-sm scale-105' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'} `}>
											<input type="checkbox" className="hidden" checked={formData.led_class_ids.includes(c.id)} onChange={e => setFormData({ ...formData, led_class_ids: e.target.checked ? [...formData.led_class_ids, c.id] : formData.led_class_ids.filter(id => id !== c.id) })} />
											{c.name}
										</label>
									))}
								</div>
							</div>

							<div className="pt-2 mt-2 border-t border-slate-100">
								<p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Данные для входа (Опционально)</p>
								<div className="space-y-2">
									<input placeholder="Логин" required value={formData.username} onChange={e => setFormData({ ...formData, username: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 outline-none transition-all font-medium" />
									<input type="password" placeholder={editingId ? 'Новый пароль (оставьте пустым)' : 'Пароль'} required={!editingId} value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 outline-none transition-all font-medium" />
								</div>
								<p className="text-[10px] text-slate-400 mt-2 leading-tight">Оставьте пустым, если не хотите менять пароль.</p>
							</div>
							
							<div className="flex gap-3 mt-6 pt-2">
								<button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-xl font-bold transition-all">Отмена</button>
								<button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-bold shadow-md transition-all">Сохранить</button>
							</div>
						</form>
					</div>
			</Modal>
		</>
	);
}