import { useState } from 'react';
import { Plus, Users, X } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../../api/axios';
import { TableTemplate, ActionButtons, Modal } from './Shared';

export default function SubjectsTab({ data, teachers = [], refresh }: { data: any[], teachers?: any[], refresh: () => void }) {
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [editingId, setEditingId] = useState<number | null>(null);
	const [formData, setFormData] = useState({ name_ru: '', name_tg: '', name_en: '' });
	const [activeLang, setActiveLang] = useState<'ru' | 'tg' | 'en'>('ru');

	// Состояние для модалки списка учителей
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const [selectedSubjectTeachers, setSelectedSubjectTeachers] = useState<any[] | null>(null);
	const [subjectNameForTeachers, setSubjectNameForTeachers] = useState<string>('');

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const openModal = (item?: any) => {
		setEditingId(item?.id || null);
		setFormData(item ? {
			name_ru: item.name_ru || '',
			name_tg: item.name_tg || '',
			name_en: item.name_en || ''
		} : { name_ru: '', name_tg: '', name_en: '' });
		setIsModalOpen(true);
		setActiveLang('ru');
	};

	const handleDelete = async (id: number) => {
		if (!window.confirm('Удалить этот предмет?')) return;
		try {
			await api.delete(`subjects/${id}/`);
			refresh();
			toast.success('Предмет удален');
		} catch (err: any) {
			toast.error(err.response?.data?.detail || 'Ошибка при удалении');
		}
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		try {
			if (editingId) {
				await api.patch(`subjects/${editingId}/`, formData);
			} else {
				await api.post(`subjects/`, formData);
			}
			setIsModalOpen(false);
			refresh();
			toast.success('Сохранено успешно');
		} catch (err: any) {
			toast.error(err.response?.data?.detail || 'Ошибка сохранения');
		}
	};

	return (
		<div className="bg-white/60 backdrop-blur-xl border border-white rounded-[2rem] p-6 shadow-sm animate-in fade-in duration-300">
			<div className="flex justify-end mb-6">
				<button onClick={() => openModal()} className="flex items-center gap-2 bg-indigo-500 hover:bg-indigo-600 transition-colors text-white px-4 py-2.5 rounded-xl text-sm font-bold shadow-md">
					<Plus size={16} /> Создать предмет
				</button>
			</div>

			<TableTemplate headers={['№', 'Название предмета', 'Учителя', 'Действия']}>
				{data.map((s, idx) => {
					// Находим всех учителей, у которых в active_subject_ids есть s.id
					const attachedTeachers = teachers.filter(t => t.active_subject_ids && t.active_subject_ids.includes(s.id));
					return (
						<tr key={s.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
							<td className="py-4 px-4 font-bold text-xs text-slate-400 w-12">{idx + 1}</td>
							<td className="py-4 px-4 font-bold text-lg text-indigo-700">{s.name}</td>
							<td className="py-4 px-4 font-medium text-sm text-slate-600">
								<button
									onClick={() => {
										setSelectedSubjectTeachers(attachedTeachers);
										setSubjectNameForTeachers(s.name);
									}}
									className="group flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 px-3 py-1.5 rounded-lg transition-colors cursor-pointer outline-none focus:ring-2 focus:ring-indigo-100"
								>
									<Users size={14} className="group-hover:text-indigo-500" />
									<span className="font-bold">{attachedTeachers.length}</span> чел.
								</button>
							</td>
							<td className="py-4 px-4">
								<ActionButtons onEdit={() => openModal(s)} onDelete={() => handleDelete(s.id)} />
							</td>
						</tr>
					);
				})}
			</TableTemplate>

			{/* МОДАЛКА СО СПИСКОМ УЧИТЕЛЕЙ ПО ПРЕДМЕТУ */}
			<Modal isOpen={!!selectedSubjectTeachers} onClose={() => setSelectedSubjectTeachers(null)}>
				<div className="bg-white p-6 rounded-[2rem] w-full max-w-sm shadow-2xl">
					<div className="flex justify-between items-center mb-6">
						<div>
							<h3 className="text-xl font-black text-slate-800">Учителя</h3>
							<p className="text-xs text-slate-500 font-medium mt-1">Предмет: <span className="text-indigo-600 font-bold">{subjectNameForTeachers}</span></p>
						</div>
						<button type="button" onClick={() => setSelectedSubjectTeachers(null)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all self-start"><X size={20} /></button>
					</div>

					<div className="max-h-[300px] overflow-y-auto custom-scrollbar pr-2 space-y-2">
						{selectedSubjectTeachers && selectedSubjectTeachers.length > 0 ? (
							selectedSubjectTeachers.map(t => (
								<div key={t.id} className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex items-center gap-3 transition-colors hover:bg-indigo-50/50">
									<div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs shrink-0">
										{t.last_name?.[0] || ''}{t.first_name?.[0] || ''}
									</div>
									<div>
										<p className="text-sm font-bold text-slate-800 leading-tight">{t.last_name} {t.first_name}</p>
										<p className="text-[11px] font-medium text-slate-500">Логин: {t.username}</p>
									</div>
								</div>
							))
						) : (
							<div className="text-center py-6 bg-slate-50 rounded-xl border border-dashed border-slate-200">
								<p className="text-sm font-bold text-slate-500">Нет учителей</p>
								<p className="text-[11px] font-medium text-slate-400 mt-1">К этому предмету еще не привязан ни один учитель</p>
							</div>
						)}
					</div>

					<div className="mt-6 pt-4 border-t border-slate-100">
						<button onClick={() => setSelectedSubjectTeachers(null)} className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-xl font-bold transition-all active:scale-95">Закрыть</button>
					</div>
				</div>
			</Modal>

			<Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
				<div className="bg-white p-6 rounded-3xl w-full max-w-sm">
					<h3 className="font-black text-xl mb-4">{editingId ? 'Редактировать' : 'Добавить'} предмет</h3>
					<div className="flex gap-2 mb-4 bg-slate-100 p-1 rounded-xl">
						<button type="button" onClick={() => setActiveLang('ru')} className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${activeLang === 'ru' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}>Русский</button>
						<button type="button" onClick={() => setActiveLang('tg')} className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${activeLang === 'tg' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}>Тоҷикӣ</button>
						<button type="button" onClick={() => setActiveLang('en')} className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${activeLang === 'en' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}>English</button>
					</div>
					<form onSubmit={handleSubmit} className="space-y-4">
						{activeLang === 'ru' && <input required placeholder="Например: Математика" value={formData.name_ru} onChange={e => setFormData({ ...formData, name_ru: e.target.value })} className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 outline-none rounded-xl px-4 py-3 font-medium transition-all" />}
						{activeLang === 'tg' && <input placeholder="Например: Риёзиёт" value={formData.name_tg} onChange={e => setFormData({ ...formData, name_tg: e.target.value })} className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 outline-none rounded-xl px-4 py-3 font-medium transition-all" />}
						{activeLang === 'en' && <input placeholder="Например: Mathematics" value={formData.name_en} onChange={e => setFormData({ ...formData, name_en: e.target.value })} className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 outline-none rounded-xl px-4 py-3 font-medium transition-all" />}

						<div className="flex gap-3 pt-2">
							<button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 bg-slate-100 hover:bg-slate-200 transition-colors py-3 rounded-xl font-bold text-slate-700">Отмена</button>
							<button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-700 transition-colors text-white py-3 rounded-xl font-bold shadow-md">Сохранить</button>
						</div>
					</form>
				</div>
			</Modal>
		</div>
	);
}