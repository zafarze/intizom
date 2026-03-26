import { useState } from 'react';
import { Search, ChevronLeft, ChevronRight, Plus, FileUp, Filter, X, Save, AlertCircle, Key, Download, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import api from '../../../api/axios';
import { TableTemplate, ActionButtons } from './Shared';

export default function StudentsTab({ data, classes, refresh }: { data: any[], classes: any[], refresh: () => void }) {
	const [searchQuery, setSearchQuery] = useState('');
	const [currentPage, setCurrentPage] = useState(1);
	const itemsPerPage = 10;

	// Фильтры
	const [selectedGrade, setSelectedGrade] = useState<string | null>(null);
	const [selectedLetter, setSelectedLetter] = useState<string | null>(null);

	// Массовые действия
	const [selectedStudents, setSelectedStudents] = useState<number[]>([]);
	const [showBulkModal, setShowBulkModal] = useState(false);
	const [bulkClassId, setBulkClassId] = useState('');

	// Модалка добавления / редактирования
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [editingId, setEditingId] = useState<number | null>(null);
	const [error, setError] = useState('');

	// 👇 ДОБАВИЛИ new_username И new_password В ФОРМУ
	const [formData, setFormData] = useState({
		first_name: '', last_name: '', school_class: '',
		new_username: '', new_password: ''
	});

	// Состояния для генерации аккаунтов
	const [isGenerating, setIsGenerating] = useState(false);
	const [generatedAccounts, setGeneratedAccounts] = useState<any[] | null>(null);

	// ==========================================
	// ГЕНЕРАЦИЯ АККАУНТОВ, EXCEL И PDF
	// ==========================================
	const handleGenerateAccounts = async () => {
		setIsGenerating(true);
		try {
			const res = await api.post('students/generate_accounts/');
			if (res.data.accounts && res.data.accounts.length > 0) {
				setGeneratedAccounts(res.data.accounts);
				toast.success(res.data.detail);
				refresh();
			} else {
				toast.success(res.data.detail || "У всех учеников уже есть аккаунты!");
			}
		} catch (err) {
			toast.error("Ошибка при генерации аккаунтов");
		} finally {
			setIsGenerating(false);
		}
	};

	const downloadPasswordsExcel = () => {
		if (!generatedAccounts) return;
		const wsData = generatedAccounts.map(acc => ({
			'Имя': acc.first_name, 'Фамилия': acc.last_name, 'Класс': acc.class_name,
			'Логин': acc.username, 'Пароль': acc.password
		}));
		const ws = XLSX.utils.json_to_sheet(wsData);
		const wb = XLSX.utils.book_new();
		XLSX.utils.book_append_sheet(wb, ws, "Пароли");
		XLSX.writeFile(wb, "Пароли_Учеников.xlsx");
		toast.success("Excel файл успешно скачан!");
	};

	// 👇 НОВАЯ ФУНКЦИЯ: ИДЕАЛЬНЫЙ ЭКСПОРТ В PDF (С поддержкой любых шрифтов)
	const downloadPasswordsPDF = () => {
		if (!generatedAccounts) return;
		const printWindow = window.open('', '', 'height=800,width=800');
		if (!printWindow) { toast.error("Разрешите всплывающие окна для печати!"); return; }

		const html = `
			<html>
			<head>
				<title>Доступы учеников - Интизом</title>
				<style>
					body { font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; color: #333; }
					h2 { text-align: center; color: #4f46e5; margin-bottom: 30px; }
					table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 14px; }
					th, td { border: 1px solid #e2e8f0; padding: 12px; text-align: left; }
					th { background-color: #f8fafc; color: #64748b; font-weight: bold; text-transform: uppercase; font-size: 12px;}
					td.mono { font-family: monospace; font-weight: bold; font-size: 15px; color: #4f46e5; }
					.footer { margin-top: 30px; text-align: center; font-size: 12px; color: #94a3b8; }
				</style>
			</head>
			<body>
				<h2>Система "Интизом" - Доступы учеников</h2>
				<table>
					<tr><th>ФИО Ученика</th><th>Класс</th><th>Логин</th><th>Пароль</th></tr>
					${generatedAccounts.map(acc => `
						<tr>
							<td>${acc.first_name} ${acc.last_name}</td>
							<td>${acc.class_name || '—'}</td>
							<td class="mono">${acc.username}</td>
							<td class="mono" style="color: #000;">${acc.password}</td>
						</tr>
					`).join('')}
				</table>
				<div class="footer">Распечатано из системы управления дисциплиной. Храните пароли в безопасности.</div>
				<script>
					window.onload = function() { window.print(); window.close(); }
				</script>
			</body>
			</html>
		`;
		printWindow.document.write(html);
		printWindow.document.close();
	};

	// ИМПОРТ EXCEL
	const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;
		const reader = new FileReader();
		reader.onload = async (evt) => {
			try {
				const wb = XLSX.read(evt.target?.result, { type: 'binary' });
				const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
				const formattedData = data.map((row: any) => ({
					first_name: row['Имя'] || row['first_name'] || '',
					last_name: row['Фамилия'] || row['last_name'] || '',
					class_name: String(row['Класс'] || row['class_name'] || '').trim()
				})).filter(item => item.first_name && item.last_name);

				if (formattedData.length === 0) { toast.error("Файл пуст или неверный формат"); return; }
				toast.loading(`Загружаем ${formattedData.length} учеников...`, { id: 'import' });
				const res = await api.post('students/bulk_create_students/', { students: formattedData });
				toast.success(res.data.detail, { id: 'import' });
				refresh();
			} catch (err) { toast.error('Ошибка импорта', { id: 'import' }); }
			e.target.value = '';
		};
		reader.readAsBinaryString(file);
	};

	const handleBulkUpdateClass = async () => {
		if (!bulkClassId) return;
		try {
			setIsSubmitting(true);
			const res = await api.post('students/bulk_update_class/', { student_ids: selectedStudents, new_class_id: bulkClassId });
			toast.success(res.data.detail);
			setShowBulkModal(false); setSelectedStudents([]); refresh();
		} catch (err) { toast.error("Ошибка перевода"); }
		finally { setIsSubmitting(false); }
	};

	const handleDelete = async (id: number) => {
		if (!window.confirm('Удалить ученика?')) return;
		try { await api.delete(`students/${id}/`); toast.success('Удалено'); refresh(); }
		catch (err) { toast.error('Ошибка при удалении'); }
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault(); setError(''); setIsSubmitting(true);

		// Отфильтруем пустые поля логина/пароля, чтобы не сломать бэкенд
		const payload: any = {
			first_name: formData.first_name,
			last_name: formData.last_name,
			school_class: formData.school_class
		};
		if (formData.new_username) payload.new_username = formData.new_username;
		if (formData.new_password) payload.new_password = formData.new_password;

		try {
			if (editingId) { await api.patch(`students/${editingId}/`, payload); toast.success('Сохранено'); }
			else { await api.post(`students/`, payload); toast.success('Добавлено'); }
			setIsModalOpen(false); refresh();
		} catch (err: any) {
			setError(err.response?.data?.username ? 'Такой логин уже занят!' : 'Ошибка сохранения');
		}
		finally { setIsSubmitting(false); }
	};

	const openModal = (item?: any) => {
		setEditingId(item ? item.id : null); setError('');
		setFormData(item
			? { first_name: item.first_name, last_name: item.last_name, school_class: item.school_class, new_username: item.username || '', new_password: '' }
			: { first_name: '', last_name: '', school_class: '', new_username: '', new_password: '' }
		);
		setIsModalOpen(true);
	};

	// --- ЛОГИКА УМНОГО ФИЛЬТРА ---
	const uniqueGrades = Array.from(new Set(classes.map(c => { const match = c.name.match(/\d+/); return match ? match[0] : null; }).filter(Boolean))).sort((a, b) => Number(a) - Number(b));
	const availableExactClasses = selectedGrade ? classes.filter(c => { const match = c.name.match(/\d+/); return match && match[0] === selectedGrade; }).map(c => c.name) : [];

	let filtered = data;
	if (searchQuery) {
		const q = searchQuery.toLowerCase();
		filtered = filtered.filter(s => s.first_name.toLowerCase().includes(q) || s.last_name.toLowerCase().includes(q) || (s.class_name && s.class_name.toLowerCase().includes(q)));
	}

	if (selectedGrade) {
		if (selectedLetter) {
			filtered = filtered.filter(s => s.class_name === selectedLetter);
		} else {
			filtered = filtered.filter(s => {
				const match = s.class_name?.match(/\d+/);
				return match && match[0] === selectedGrade;
			});
		}
	}

	const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1;
	const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

	return (
		<div className="flex flex-col lg:flex-row gap-6 items-start animate-in fade-in duration-300">
			<div className="flex-1 w-full bg-white/60 backdrop-blur-xl border border-white rounded-[2rem] p-6 shadow-sm">
				<div className="flex flex-col sm:flex-row justify-between gap-4 mb-6 border-b border-white pb-4">
					<div className="relative w-full sm:w-64">
						<Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
						<input type="search" placeholder={`Поиск (${filtered.length})...`} value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }} className="w-full pl-10 pr-4 py-2 bg-white/50 border border-white focus:border-indigo-300 rounded-xl text-sm outline-none transition-all" />
					</div>

					{/* ПАНЕЛЬ КНОПОК */}
					<div className="flex flex-wrap gap-2">
						<button
							onClick={handleGenerateAccounts}
							disabled={isGenerating}
							className="flex items-center gap-2 bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-md transition-all active:scale-95 disabled:opacity-70"
						>
							<Key size={16} /> {isGenerating ? 'Генерация...' : 'Выдать доступы'}
						</button>
						<label className="cursor-pointer flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-xl text-sm font-bold shadow-sm border border-slate-200 transition-all active:scale-95">
							<FileUp size={16} /> Импорт
							<input type="file" accept=".xlsx, .xls, .csv" onChange={handleExcelUpload} className="hidden" />
						</label>
						<button onClick={() => openModal()} className="flex items-center gap-2 bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-md transition-all active:scale-95">
							<Plus size={16} /> Добавить
						</button>
					</div>
				</div>

				<div className="overflow-x-auto min-h-[300px]">
					{paginated.length === 0 ? (
						<div className="flex items-center justify-center h-full text-slate-400 font-medium py-10">Ученики не найдены</div>
					) : (
						<TableTemplate headers={[
							<input type="checkbox" onChange={e => setSelectedStudents(e.target.checked ? paginated.map(s => s.id) : [])} checked={paginated.length > 0 && paginated.every(s => selectedStudents.includes(s.id))} className="w-4 h-4 text-indigo-600 rounded cursor-pointer" />,
							// 👇 ДОБАВЛЕНЫ КОЛОНКИ ЛОГИН И ПАРОЛЬ
							'ФИО ученика', 'Класс', 'Балл СИН', 'Статус', 'Логин', 'Пароль', 'Действия'
						]}>
							{paginated.map(row => {
								const lvl = row.status_info.level;
								const statusColor = lvl === 'excellent' ? 'text-green-700 bg-green-50 border-green-200' : lvl === 'warning' ? 'text-yellow-700 bg-yellow-50 border-yellow-200' : 'text-red-700 bg-red-50 border-red-200';
								const barColor = lvl === 'excellent' ? 'bg-green-500' : lvl === 'warning' ? 'bg-yellow-500' : 'bg-red-500';

								return (
									<tr key={row.id} className={`border-b border-slate-100 transition-colors ${selectedStudents.includes(row.id) ? 'bg-indigo-50/50' : 'hover:bg-slate-50'}`}>
										<td className="py-4 px-4"><input type="checkbox" checked={selectedStudents.includes(row.id)} onChange={e => setSelectedStudents(e.target.checked ? [...selectedStudents, row.id] : selectedStudents.filter(id => id !== row.id))} className="w-4 h-4 text-indigo-600 rounded cursor-pointer" /></td>
										<td className="py-4 px-4 font-bold text-slate-800">{row.first_name} {row.last_name}</td>
										<td className="py-4 px-4 text-[13px] font-medium"><span className="bg-white border border-slate-200 shadow-sm text-slate-700 px-2 py-1 rounded-md font-bold">{row.class_name || '—'}</span></td>
										<td className="py-4 px-4"><div className="flex items-center gap-2"><div className="w-full bg-slate-200 rounded-full h-2 max-w-[60px]"><div className={`h-2 rounded-full ${barColor} transition-all`} style={{ width: `${Math.max(0, row.points)}%` }}></div></div><span className="text-[13px] font-bold text-slate-700">{row.points}</span></div></td>
										<td className="py-4 px-4"><span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border ${statusColor}`}>{row.status_info.text}</span></td>

										{/* 👇 ВЫВОД ЛОГИНА И СКРЫТОГО ПАРОЛЯ */}
										<td className="py-4 px-4 font-mono text-sm font-bold text-indigo-600">{row.username || '—'}</td>
										<td className="py-4 px-4 font-mono text-[10px] text-slate-400 tracking-[0.2em]">{row.username ? '••••••' : '—'}</td>

										<td className="py-4 px-4"><ActionButtons onEdit={() => openModal(row)} onDelete={() => handleDelete(row.id)} /></td>
									</tr>
								);
							})}
						</TableTemplate>
					)}
				</div>

				{totalPages > 1 && (
					<div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-100">
						<span className="text-[13px] font-bold text-slate-400">Стр. {currentPage} из {totalPages}</span>
						<div className="flex gap-2">
							<button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-50 transition-all"><ChevronLeft size={18} /></button>
							<button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-50 transition-all"><ChevronRight size={18} /></button>
						</div>
					</div>
				)}
			</div>

			{/* БОКОВАЯ ПАНЕЛЬ: УМНЫЕ ФИЛЬТРЫ */}
			<div className="w-full lg:w-[280px] shrink-0 bg-white/60 backdrop-blur-xl border border-white rounded-[2rem] p-6 shadow-sm sticky top-6">
				<div className="flex items-center gap-2 border-b border-white pb-4 mb-4">
					<Filter size={20} className="text-indigo-600" />
					<h3 className="font-bold text-slate-800">Фильтр классов</h3>
				</div>

				<div className="space-y-5">
					<div>
						<p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2.5">Параллель</p>
						<div className="flex flex-wrap gap-2">
							{uniqueGrades.length > 0 ? uniqueGrades.map((grade) => (
								<button
									key={grade}
									onClick={() => {
										setSelectedGrade(selectedGrade === grade ? null : grade);
										setSelectedLetter(null);
										setCurrentPage(1);
									}}
									className={`w-12 h-10 rounded-xl font-bold text-sm transition-all border ${selectedGrade === grade ? 'bg-indigo-600 text-white shadow-md scale-105' : 'bg-white/50 text-slate-600 border-white hover:bg-white'}`}
								>
									{grade}
								</button>
							)) : <span className="text-sm text-slate-400">Нет данных</span>}
						</div>
					</div>

					{selectedGrade && availableExactClasses.length > 0 && (
						<div className="animate-in fade-in slide-in-from-top-2 duration-300">
							<p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2.5">Буква класса</p>
							<div className="flex flex-wrap gap-2">
								{availableExactClasses.map((exactClass) => (
									<button
										key={exactClass}
										onClick={() => {
											setSelectedLetter(selectedLetter === exactClass ? null : exactClass);
											setCurrentPage(1);
										}}
										className={`px-3 h-10 min-w-[3rem] rounded-xl font-bold text-sm transition-all border ${selectedLetter === exactClass ? 'bg-indigo-100 text-indigo-700 border-indigo-300 shadow-sm scale-105' : 'bg-white/50 text-slate-600 border-white hover:bg-white'}`}
									>
										{exactClass}
									</button>
								))}
							</div>
						</div>
					)}
				</div>

				{(selectedGrade || selectedLetter) && (
					<button onClick={() => { setSelectedGrade(null); setSelectedLetter(null); setCurrentPage(1); }} className="mt-5 text-[12px] font-bold text-red-500 py-2.5 w-full bg-red-50/50 hover:bg-red-50 border border-red-100 rounded-xl transition-all">
						Сбросить фильтры
					</button>
				)}
			</div>

			{/* === ПЛАВАЮЩАЯ ПАНЕЛЬ МАССОВЫХ ДЕЙСТВИЙ === */}
			{selectedStudents.length > 0 && (
				<div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-slate-800/95 backdrop-blur-xl border border-slate-700 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-5 z-40 animate-in slide-in-from-bottom-10">
					<div className="flex flex-col">
						<span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Выбрано</span>
						<span className="text-xl font-black leading-none">{selectedStudents.length}</span>
					</div>
					<div className="h-8 w-[1px] bg-slate-600 mx-2"></div>
					<button onClick={() => setShowBulkModal(true)} className="bg-indigo-500 hover:bg-indigo-600 px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-md active:scale-95">Перевести в другой класс</button>
					<button onClick={() => setSelectedStudents([])} className="text-slate-300 hover:text-white hover:bg-slate-700 p-2.5 rounded-xl transition-colors"><X size={20} /></button>
				</div>
			)}

			{/* === МОДАЛКА ВЫБОРА КЛАССА ДЛЯ МАССОВОГО ПЕРЕВОДА === */}
			{showBulkModal && (
				<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
					<div className="bg-white w-full max-w-sm rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 p-6">
						<h3 className="text-lg font-black text-slate-800 mb-4">Выберите новый класс</h3>
						<select value={bulkClassId} onChange={(e) => setBulkClassId(e.target.value)} className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 rounded-xl px-4 py-3 text-sm font-medium outline-none mb-6">
							<option value="" disabled>Выберите класс из списка</option>
							{classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
						</select>
						<div className="flex gap-3">
							<button onClick={() => setShowBulkModal(false)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-xl transition-all">Отмена</button>
							<button onClick={handleBulkUpdateClass} disabled={isSubmitting || !bulkClassId} className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl shadow-md transition-all">Перевести</button>
						</div>
					</div>
				</div>
			)}

			{/* === МОДАЛКА ДОБАВЛЕНИЯ / РЕДАКТИРОВАНИЯ === */}
			{isModalOpen && (
				<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
					<div className="bg-white p-6 rounded-[2rem] w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200">
						<div className="flex justify-between items-center mb-6">
							<h3 className="text-xl font-black text-slate-800">{editingId ? 'Редактировать' : 'Добавить'} ученика</h3>
							<button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"><X size={20} /></button>
						</div>

						{error && (<div className="mb-4 p-3 bg-red-50 text-red-600 border border-red-200 rounded-xl text-xs font-bold flex items-center gap-2"><AlertCircle size={16} /> {error}</div>)}

						<form onSubmit={handleSubmit} className="space-y-3">
							<input placeholder="Имя" required value={formData.first_name} onChange={e => setFormData({ ...formData, first_name: e.target.value })} className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 outline-none rounded-xl px-4 py-3 text-sm font-medium transition-all" />
							<input placeholder="Фамилия" required value={formData.last_name} onChange={e => setFormData({ ...formData, last_name: e.target.value })} className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 outline-none rounded-xl px-4 py-3 text-sm font-medium transition-all" />
							<select required value={formData.school_class} onChange={e => setFormData({ ...formData, school_class: e.target.value })} className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 outline-none rounded-xl px-4 py-3 text-sm font-medium transition-all">
								<option value="" disabled>Выберите класс</option>
								{classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
							</select>

							{/* ПОЛЯ ДЛЯ ЛОГИНА И ПАРОЛЯ */}
							<div className="pt-2 mt-2 border-t border-slate-100">
								<p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Данные для входа (Опционально)</p>
								<div className="space-y-2">
									<input placeholder="Логин (например: a.ivanov)" value={formData.new_username} onChange={e => setFormData({ ...formData, new_username: e.target.value })} className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-400 outline-none rounded-xl px-4 py-2 text-sm font-medium transition-all" />
									<input placeholder="Новый пароль" type="text" value={formData.new_password} onChange={e => setFormData({ ...formData, new_password: e.target.value })} className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-400 outline-none rounded-xl px-4 py-2 text-sm font-medium transition-all" />
								</div>
								<p className="text-[10px] text-slate-400 mt-2 leading-tight">Оставьте пустым, если не хотите менять пароль.</p>
							</div>

							<div className="flex gap-3 mt-6 pt-2">
								<button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-xl font-bold transition-all">Отмена</button>
								<button type="submit" disabled={isSubmitting} className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white py-3 rounded-xl font-bold shadow-md transition-all">
									{isSubmitting ? 'Сохранение...' : 'Сохранить'}
								</button>
							</div>
						</form>
					</div>
				</div>
			)}

			{/* === МОДАЛКА: СГЕНЕРИРОВАННЫЕ ПАРОЛИ === */}
			{generatedAccounts && (
				<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200">
					<div className="bg-white w-full max-w-2xl rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
						<div className="p-6 border-b border-slate-100 flex justify-between items-center bg-indigo-50/50">
							<div>
								<h3 className="text-xl font-black text-slate-800">Доступы учеников ({generatedAccounts.length})</h3>
								<p className="text-sm text-slate-500 font-medium mt-1">Обязательно сохраните их, пароли больше нигде не отобразятся!</p>
							</div>
							<button onClick={() => setGeneratedAccounts(null)} className="p-2 text-slate-400 hover:text-red-500 bg-white shadow-sm rounded-xl transition-all"><X size={20} /></button>
						</div>

						<div className="overflow-y-auto p-6 bg-slate-50/50">
							<div className="border border-slate-200 rounded-2xl overflow-hidden bg-white">
								<table className="w-full text-left border-collapse">
									<thead>
										<tr className="bg-slate-50 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-200">
											<th className="p-4">ФИО</th>
											<th className="p-4">Класс</th>
											<th className="p-4">Логин</th>
											<th className="p-4">Пароль</th>
										</tr>
									</thead>
									<tbody>
										{generatedAccounts.map((acc, idx) => (
											<tr key={idx} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
												<td className="p-4 font-bold text-slate-800">{acc.first_name} {acc.last_name}</td>
												<td className="p-4 font-medium text-slate-500">{acc.class_name}</td>
												<td className="p-4 font-mono text-sm text-indigo-600">{acc.username}</td>
												<td className="p-4 font-mono text-sm text-slate-800">{acc.password}</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						</div>

						<div className="p-6 border-t border-slate-100 bg-white flex flex-wrap gap-3 justify-end">
							<button
								onClick={downloadPasswordsExcel}
								className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold shadow-md transition-all active:scale-95"
							>
								<Download size={18} /> Excel
							</button>
							{/* 👇 НОВАЯ КНОПКА PDF */}
							<button
								onClick={downloadPasswordsPDF}
								className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-bold shadow-md transition-all active:scale-95"
							>
								<FileText size={18} /> Скачать в PDF
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}