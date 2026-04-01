import { useState, useRef, useEffect } from 'react';
import { Plus, ChevronDown, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../../api/axios';
import { TableTemplate, ActionButtons, Modal } from './Shared';

export default function ClassesTab({ data, students, teachers, refresh }: { data: any[], students: any[], teachers: any[], refresh: () => void }) {
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [editingId, setEditingId] = useState<number | null>(null);
	const [name, setName] = useState('');
	const [classTeacherIds, setClassTeacherIds] = useState<number[]>([]);
	const [isDropdownOpen, setIsDropdownOpen] = useState(false);
	const dropdownRef = useRef<HTMLDivElement>(null);

	// Закрытие при клике снаружи
	useEffect(() => {
		function handleClickOutside(event: MouseEvent) {
			if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
				setIsDropdownOpen(false);
			}
		}
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, []);

	const openModal = (item?: any) => { 
		setEditingId(item?.id || null); 
		setName(item?.name || ''); 
		setClassTeacherIds(item?.class_teacher_ids || []);
		setIsDropdownOpen(false);
		setIsModalOpen(true); 
	};
	const handleDelete = async (id: number) => {
		if (!window.confirm('Удалить?')) return;
		try { await api.delete(`classes/${id}/`); refresh(); }
		catch (err: any) { toast.error(err.response?.data?.detail || 'Ошибка'); }
	};
	const handleSubmit = async (e: React.FormEvent) => { 
		e.preventDefault(); 
		const payload = { 
			name, 
			class_teacher_ids: classTeacherIds 
		};
		try {
			if (editingId) {
				await api.patch(`classes/${editingId}/`, payload);
			} else {
				await api.post(`classes/`, payload);
			}
			setIsModalOpen(false); 
			refresh(); 
		} catch (err: any) { 
			toast.error(err.response?.data?.detail || 'Ошибка'); 
		}
	};

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
			<TableTemplate headers={['№', 'Название', 'Кол-во учеников', 'Классный руководитель', 'Действия']}>
				{sortedClasses.map((c, idx) => {
					const count = students ? students.filter(s => s.school_class === c.id).length : 0;
					return (
						<tr key={c.id} className="border-b border-slate-100/50 hover:bg-slate-50/50 transition-colors">
							<td className="py-4 px-4 font-bold text-xs text-slate-400 w-12">{idx + 1}</td>
							<td className="py-4 px-4 font-black text-lg text-indigo-700">{c.name}</td>
							<td className="py-4 px-4 font-bold text-[13px] text-slate-600">
								<span className="bg-slate-100 text-slate-500 px-2 py-1 rounded-md">{count} чел.</span>
							</td>
							<td className="py-4 px-4 font-medium text-[13px] text-slate-600">
								{c.class_teacher_names && c.class_teacher_names.length > 0 ? c.class_teacher_names.join(', ') : '—'}
							</td>
							<td className="py-4 px-4"><ActionButtons onEdit={() => openModal(c)} onDelete={() => handleDelete(c.id)} /></td>
						</tr>
					);
				})}
			</TableTemplate>
			<Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
				<div className="bg-white p-6 rounded-3xl w-full max-w-sm"><h3 className="font-black text-xl mb-4">Класс</h3><form onSubmit={handleSubmit} className="space-y-4">
					<input required placeholder="Например: 10 А" value={name} onChange={e => setName(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 outline-none transition-all font-medium text-slate-700" />
					
					{/* Кастомный дропдаун классруков (Multi-select) */}
					<div className="relative" ref={dropdownRef}>
						<div 
							onClick={() => setIsDropdownOpen(!isDropdownOpen)}
							className={`w-full bg-slate-50 border ${isDropdownOpen ? 'border-indigo-400 ring-4 ring-indigo-100' : 'border-slate-200'} rounded-xl px-4 py-3 text-sm transition-all font-medium text-slate-700 cursor-pointer flex justify-between items-center min-h-[46px]`}
						>
							<div className="flex flex-wrap gap-1">
								{classTeacherIds.length === 0 ? (
									<span className="text-slate-500">Без классного руководителя</span>
								) : (
									classTeacherIds.map(id => {
										const t = teachers.find((t: any) => t.id === id);
										if (!t) return null;
										return (
											<span key={id} className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-md text-[12px] font-bold">
												{t.first_name} {t.last_name}
											</span>
										);
									})
								)}
							</div>
							<ChevronDown size={18} className={`text-slate-400 shrink-0 transition-transform duration-300 ${isDropdownOpen ? 'rotate-180 text-indigo-500' : ''}`} />
						</div>

						{isDropdownOpen && (
							<div className="absolute z-50 w-full mt-2 bg-white/80 backdrop-blur-xl border border-slate-100 rounded-2xl shadow-xl max-h-48 overflow-y-auto custom-scrollbar overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
								<div 
									onClick={() => setClassTeacherIds([])}
									className={`px-4 py-3 text-sm cursor-pointer transition-colors flex justify-between items-center ${classTeacherIds.length === 0 ? 'bg-indigo-50/50 text-indigo-700 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}
								>
									<span>Без классного руководителя</span>
									{classTeacherIds.length === 0 && <Check size={16} className="text-indigo-500" />}
								</div>
								{teachers.map((t: any) => (
									<div 
										key={t.id}
										onClick={() => {
											if (classTeacherIds.includes(t.id)) {
												setClassTeacherIds(classTeacherIds.filter(id => id !== t.id));
											} else {
												setClassTeacherIds([...classTeacherIds, t.id]);
											}
										}}
										className={`px-4 py-3 text-sm cursor-pointer transition-colors border-t border-slate-50 flex justify-between items-center ${classTeacherIds.includes(t.id) ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-700 font-medium hover:bg-slate-50'}`}
									>
										<span>{t.first_name} {t.last_name}</span>
										{classTeacherIds.includes(t.id) && <Check size={16} className="text-indigo-500" />}
									</div>
								))}
							</div>
						)}
					</div>

					<div className="flex gap-2 pt-2"><button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 bg-slate-100 py-3 rounded-xl font-bold">Отмена</button><button type="submit" className="flex-1 bg-indigo-600 text-white py-3 rounded-xl font-bold">Сохранить</button></div></form></div>
			</Modal>
		</div>
	);
}