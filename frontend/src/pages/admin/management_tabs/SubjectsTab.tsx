import { useState } from 'react';
import { Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../../api/axios';
import { TableTemplate, ActionButtons } from './Shared';

export default function SubjectsTab({ data, refresh }: { data: any[], refresh: () => void }) {
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [editingId, setEditingId] = useState<number | null>(null);
	const [name, setName] = useState('');

	const openModal = (item?: any) => {
		setEditingId(item?.id || null);
		setName(item?.name || '');
		setIsModalOpen(true);
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
			editingId ? await api.patch(`subjects/${editingId}/`, { name }) : await api.post(`subjects/`, { name });
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

			<TableTemplate headers={['ID', 'Название предмета', 'Действия']}>
				{data.map(s => (
					<tr key={s.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
						<td className="py-4 px-4 text-xs font-mono text-slate-400">{s.id}</td>
						<td className="py-4 px-4 font-bold text-lg text-indigo-700">{s.name}</td>
						<td className="py-4 px-4">
							<ActionButtons onEdit={() => openModal(s)} onDelete={() => handleDelete(s.id)} />
						</td>
					</tr>
				))}
			</TableTemplate>

			{isModalOpen && (
				<div className="fixed inset-0 flex items-center justify-center p-4 bg-slate-900/60 z-50 animate-in fade-in duration-200">
					<div className="bg-white p-6 rounded-3xl w-full max-w-sm animate-in zoom-in-95">
						<h3 className="font-black text-xl mb-4">{editingId ? 'Редактировать' : 'Добавить'} предмет</h3>
						<form onSubmit={handleSubmit} className="space-y-4">
							<input
								required
								placeholder="Например: Математика"
								value={name}
								onChange={e => setName(e.target.value)}
								className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 outline-none rounded-xl px-4 py-3 font-medium transition-all"
							/>
							<div className="flex gap-3 pt-2">
								<button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 bg-slate-100 hover:bg-slate-200 transition-colors py-3 rounded-xl font-bold text-slate-700">Отмена</button>
								<button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-700 transition-colors text-white py-3 rounded-xl font-bold shadow-md">Сохранить</button>
							</div>
						</form>
					</div>
				</div>
			)}
		</div>
	);
}