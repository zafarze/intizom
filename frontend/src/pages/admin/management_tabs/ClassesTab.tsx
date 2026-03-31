import { useState } from 'react';
import { Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../../api/axios';
import { TableTemplate, ActionButtons } from './Shared';

export default function ClassesTab({ data, students, refresh }: { data: any[], students: any[], refresh: () => void }) {
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [editingId, setEditingId] = useState<number | null>(null);
	const [name, setName] = useState('');

	const openModal = (item?: any) => { setEditingId(item?.id || null); setName(item?.name || ''); setIsModalOpen(true); };
	const handleDelete = async (id: number) => {
		if (!window.confirm('Удалить?')) return;
		try { await api.delete(`classes/${id}/`); refresh(); }
		catch (err: any) { toast.error(err.response?.data?.detail || 'Ошибка'); }
	};
	const handleSubmit = async (e: React.FormEvent) => { e.preventDefault(); editingId ? await api.patch(`classes/${editingId}/`, { name }) : await api.post(`classes/`, { name }); setIsModalOpen(false); refresh(); };

	const parseClass = (name: string) => {
		const match = name.match(/(\d+)(.*)/);
		if (!match) return { grade: 0, letter: name };
		return { grade: parseInt(match[1], 10), letter: match[2].trim().toLowerCase() };
	};

	const sortedClasses = [...data].sort((a, b) => {
		const classA = parseClass(a.name);
		const classB = parseClass(b.name);
		if (classA.grade !== classB.grade) return classA.grade - classB.grade;
		return classA.letter.localeCompare(classB.letter, 'ru');
	});

	return (
		<div className="bg-white/60 backdrop-blur-xl border border-white rounded-[2rem] p-6 shadow-sm">
			<div className="flex justify-end mb-6"><button onClick={() => openModal()} className="flex gap-2 bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-md transition-all active:scale-95"><Plus size={16} /> Создать класс</button></div>
			<TableTemplate headers={['№', 'Название', 'Кол-во учеников', 'Действия']}>
				{sortedClasses.map((c, idx) => {
					const count = students ? students.filter(s => s.school_class === c.id).length : 0;
					return (
						<tr key={c.id} className="border-b border-slate-100/50 hover:bg-slate-50/50 transition-colors">
							<td className="py-4 px-4 font-bold text-xs text-slate-400 w-12">{idx + 1}</td>
							<td className="py-4 px-4 font-black text-lg text-indigo-700">{c.name}</td>
							<td className="py-4 px-4 font-bold text-[13px] text-slate-600">
								<span className="bg-slate-100 text-slate-500 px-2 py-1 rounded-md">{count} чел.</span>
							</td>
							<td className="py-4 px-4"><ActionButtons onEdit={() => openModal(c)} onDelete={() => handleDelete(c.id)} /></td>
						</tr>
					);
				})}
			</TableTemplate>
			{isModalOpen && (<div className="fixed inset-0 flex items-center justify-center p-4 bg-slate-900/60 z-50"><div className="bg-white p-6 rounded-3xl w-full max-w-sm"><h3 className="font-black text-xl mb-4">Класс</h3><form onSubmit={handleSubmit} className="space-y-4"><input required placeholder="Например: 10 А" value={name} onChange={e => setName(e.target.value)} className="w-full bg-slate-50 border rounded-xl px-4 py-3" /><div className="flex gap-2"><button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 bg-slate-100 py-3 rounded-xl font-bold">Отмена</button><button type="submit" className="flex-1 bg-indigo-600 text-white py-3 rounded-xl font-bold">Сохранить</button></div></form></div></div>)}
		</div>
	);
}