import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { Plus, Users, X } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../../api/axios';
import { TableTemplate, ActionButtons, Modal } from './Shared';

export default function SubjectsTab({ data, teachers = [], refresh }: { data: any[], teachers?: any[], refresh: () => void }) {
	const { t } = useTranslation();
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
		if (!window.confirm(t('mgmt.t_31'))) return;
		try {
			await api.delete(`subjects/${id}/`);
			refresh();
			toast.success(t('mgmt.t_60'));
		} catch (err: any) {
			toast.error(err.response?.data?.detail || t('mgmt.t_35'));
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
			toast.success(t('mgmt.t_45'));
		} catch (err: any) {
			toast.error(err.response?.data?.detail || t('mgmt.t_47'));
		}
	};

	return (
		<div className="bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl border border-white dark:border-zinc-800/60 rounded-[2rem] p-6 shadow-sm animate-in fade-in duration-300">
			<div className="flex justify-end mb-6">
				<button onClick={() => openModal()} className="flex items-center gap-2 bg-indigo-500 hover:bg-indigo-600 transition-colors text-white px-4 py-2.5 rounded-xl text-sm font-bold shadow-md">
					<Plus size={16} /> {t('management.subjects.create_subject')}
				</button>
			</div>

			<TableTemplate headers={['№', t('mgmt.t_50'), t('auto.t_175_uchitelya'), t('mgmt.t_94')]}>
				{data.map((s, idx) => {
					// Находим всех учителей, у которых в active_subject_ids есть s.id
					const attachedTeachers = teachers.filter(t => t.active_subject_ids && t.active_subject_ids.includes(s.id));
					return (
						<tr key={s.id} className="border-b border-slate-100 dark:border-zinc-800/60 hover:bg-slate-50 dark:hover:bg-zinc-800/30 transition-colors">
							<td className="py-4 px-4 font-bold text-xs text-slate-400 dark:text-zinc-500 w-12">{idx + 1}</td>
							<td className="py-4 px-4 font-bold text-lg text-indigo-700 dark:text-indigo-400">{s.name}</td>
							<td className="py-4 px-4 font-medium text-sm text-slate-600 dark:text-zinc-300">
								<button
									onClick={() => {
										setSelectedSubjectTeachers(attachedTeachers);
										setSubjectNameForTeachers(s.name);
									}}
									className="group flex items-center justify-center gap-1.5 bg-slate-100 dark:bg-zinc-800 hover:bg-indigo-50 dark:hover:bg-indigo-500/20 text-slate-600 dark:text-zinc-300 hover:text-indigo-600 dark:hover:text-indigo-300 px-3 py-1.5 rounded-lg transition-colors cursor-pointer outline-none focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-500/30"
								>
									<Users size={14} className="group-hover:text-indigo-500 dark:group-hover:text-indigo-400" />
									<span className="font-bold">{attachedTeachers.length}</span> {t('management.classes.count_people')}
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
				<div className="bg-white dark:bg-zinc-900 p-6 rounded-[2rem] w-full max-w-sm shadow-2xl dark:shadow-[0_0_40px_rgba(0,0,0,0.5)]">
					<div className="flex justify-between items-center mb-6">
						<div>
							<h3 className="text-xl font-black text-slate-800 dark:text-zinc-50">{t('auto.t_175_uchitelya')}</h3>
							<p className="text-xs text-slate-500 dark:text-zinc-400 font-medium mt-1">Предмет: <span className="text-indigo-600 dark:text-indigo-400 font-bold">{subjectNameForTeachers}</span></p>
						</div>
						<button type="button" onClick={() => setSelectedSubjectTeachers(null)} className="p-2 text-slate-400 dark:text-zinc-500 hover:text-red-500 dark:hover:text-rose-400 hover:bg-red-50 dark:hover:bg-rose-500/10 rounded-xl transition-all self-start"><X size={20} /></button>
					</div>

					<div className="max-h-[300px] overflow-y-auto custom-scrollbar pr-2 space-y-2">
						{selectedSubjectTeachers && selectedSubjectTeachers.length > 0 ? (
							selectedSubjectTeachers.map(t => (
								<div key={t.id} className="p-3 bg-slate-50 dark:bg-zinc-800/50 border border-slate-100 dark:border-zinc-700/50 rounded-xl flex items-center gap-3 transition-colors hover:bg-indigo-50/50 dark:hover:bg-indigo-500/10">
									<div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-400 flex items-center justify-center font-bold text-xs shrink-0">
										{t.last_name?.[0] || ''}{t.first_name?.[0] || ''}
									</div>
									<div>
										<p className="text-sm font-bold text-slate-800 dark:text-zinc-100 leading-tight">{t.last_name} {t.first_name}</p>
										<p className="text-[11px] font-medium text-slate-500 dark:text-zinc-400">Логин: {t.username}</p>
									</div>
								</div>
							))
						) : (
							<div className="text-center py-6 bg-slate-50 dark:bg-zinc-800/30 rounded-xl border border-dashed border-slate-200 dark:border-zinc-700">
								<p className="text-sm font-bold text-slate-500 dark:text-zinc-400">{t('mgmt.t_67')}</p>
								<p className="text-[11px] font-medium text-slate-400 dark:text-zinc-500 mt-1">{t('mgmt.t_4')}</p>
							</div>
						)}
					</div>

					<div className="mt-6 pt-4 border-t border-slate-100 dark:border-zinc-800">
						<button onClick={() => setSelectedSubjectTeachers(null)} className="w-full bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 py-3 rounded-xl font-bold transition-all active:scale-95">{t('mgmt.t_104')}</button>
					</div>
				</div>
			</Modal>

			<Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
				<div className="bg-white dark:bg-zinc-900 dark:text-zinc-50 p-6 rounded-3xl w-full max-w-sm">
					<h3 className="font-black text-xl mb-4">{editingId ? t('management.subjects.modal_edit_subject') : t('management.subjects.modal_add_subject')}</h3>
					<div className="flex gap-2 mb-4 bg-slate-100 dark:bg-zinc-800 p-1 rounded-xl">
						<button type="button" onClick={() => setActiveLang('ru')} className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${activeLang === 'ru' ? 'bg-white dark:bg-zinc-700 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-zinc-400 hover:text-slate-700 dark:hover:text-zinc-200'}`}>{t('mgmt.t_103')}</button>
						<button type="button" onClick={() => setActiveLang('tg')} className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${activeLang === 'tg' ? 'bg-white dark:bg-zinc-700 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-zinc-400 hover:text-slate-700 dark:hover:text-zinc-200'}`}>{t('mgmt.t_114')}</button>
						<button type="button" onClick={() => setActiveLang('en')} className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${activeLang === 'en' ? 'bg-white dark:bg-zinc-700 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-zinc-400 hover:text-slate-700 dark:hover:text-zinc-200'}`}>English</button>
					</div>
					<form onSubmit={handleSubmit} className="space-y-4">
						{activeLang === 'ru' && <input required placeholder={t('mgmt.t_33')} value={formData.name_ru} onChange={e => setFormData({ ...formData, name_ru: e.target.value })} className="w-full bg-slate-50 dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-700 dark:text-zinc-100 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 dark:focus:ring-indigo-500/20 outline-none rounded-xl px-4 py-3 font-medium transition-all" />}
						{activeLang === 'tg' && <input placeholder={t('mgmt.t_44')} value={formData.name_tg} onChange={e => setFormData({ ...formData, name_tg: e.target.value })} className="w-full bg-slate-50 dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-700 dark:text-zinc-100 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 dark:focus:ring-indigo-500/20 outline-none rounded-xl px-4 py-3 font-medium transition-all" />}
						{activeLang === 'en' && <input placeholder={t('mgmt.t_30')} value={formData.name_en} onChange={e => setFormData({ ...formData, name_en: e.target.value })} className="w-full bg-slate-50 dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-700 dark:text-zinc-100 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 dark:focus:ring-indigo-500/20 outline-none rounded-xl px-4 py-3 font-medium transition-all" />}

						<div className="flex gap-3 pt-2">
							<button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 transition-colors py-3 rounded-xl font-bold text-slate-700 dark:text-zinc-200">{t('mgmt.t_115')}</button>
							<button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-700 transition-colors text-white py-3 rounded-xl font-bold shadow-md">{t('mgmt.t_83')}</button>
						</div>
					</form>
				</div>
			</Modal>
		</div>
	);
}