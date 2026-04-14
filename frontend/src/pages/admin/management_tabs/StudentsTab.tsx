import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { Search, ChevronLeft, ChevronRight, Plus, FileUp, Filter, X, AlertCircle, Key, Download, FileText, Eye, Activity, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import api from '../../../api/axios';
import { TableTemplate, ActionButtons, Modal } from './Shared';

export default function StudentsTab({ data, classes, refresh }: { data: any[], classes: any[], refresh: () => void }) {
	const { t } = useTranslation();
	const [searchQuery, setSearchQuery] = useState('');
	const [currentPage, setCurrentPage] = useState(1);
	const itemsPerPage = 100;

	// Фильтры
	const [selectedGrade, setSelectedGrade] = useState<string | null>(null);
	const [selectedLetters, setSelectedLetters] = useState<string[]>([]);

	// Массовые действия
	const [selectedStudents, setSelectedStudents] = useState<number[]>([]);
	const [showBulkModal, setShowBulkModal] = useState(false);
	const [bulkClassId, setBulkClassId] = useState('');

	// Модалка добавления / редактирования
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [editingId, setEditingId] = useState<number | null>(null);
	const [error, setError] = useState('');

	// Модалка истории ученика
	const [selectedStudentHistory, setSelectedStudentHistory] = useState<any>(null);
	const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
	const [loadingHistoryId, setLoadingHistoryId] = useState<number | null>(null);

	const formatTime = (dateString: string) => {
		const date = new Date(dateString);
		return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
	};

	// Модалка импорта
	const [isImportModalOpen, setIsImportModalOpen] = useState(false);
	const [selectedImportFile, setSelectedImportFile] = useState<File | null>(null);

	// Кастомный Alert-модал для подтверждений
	const [confirmDialog, setConfirmDialog] = useState<{message: string, onConfirm: () => void} | null>(null);

	// Функция печати без блокирующих всплывающих окон (создает невидимый iframe)
	const printHtml = (html: string) => {
		const iframe = document.createElement('iframe');
		iframe.style.display = 'none';
		document.body.appendChild(iframe);
		setTimeout(() => {
			const doc = iframe.contentWindow?.document;
			if (doc) {
				doc.open();
				doc.write(html);
				doc.close();
				setTimeout(() => {
					iframe.contentWindow?.focus();
					iframe.contentWindow?.print();
					setTimeout(() => document.body.removeChild(iframe), 1000);
				}, 500);
			}
		}, 50);
	};

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
				toast.success(res.data.detail || t('mgmt.t_10'));
			}
		} catch (err) {
			toast.error(t('mgmt.t_13'));
		} finally {
			setIsGenerating(false);
		}
	};

	const downloadPasswordsExcel = () => {
		if (!generatedAccounts) return;
		const wsData = generatedAccounts.map(acc => ({
			[t('auto.t_172_imya')]: acc.first_name, [t('auto.t_131_familiya')]: acc.last_name, [t('auto.t_10_klass')]: acc.class_name,
			[t('auto.t_98_login')]: acc.username, [t('auto.t_195_parol')]: acc.password
		}));
		const ws = XLSX.utils.json_to_sheet(wsData);
		const wb = XLSX.utils.book_new();
		XLSX.utils.book_append_sheet(wb, ws, t('auto.t_57_paroli'));
		XLSX.writeFile(wb, t('auto.t_214_paroli_uchenikov_xlsx'));
		toast.success(t('auto.t_16_excel_fayl_uspeshno_skachan'));
	};

	// 👇 НОВАЯ ФУНКЦИЯ: ИДЕАЛЬНЫЙ ЭКСПОРТ В PDF (С поддержкой любых шрифтов)
	const downloadPasswordsPDF = () => {
		if (!generatedAccounts) return;

		const html = `
			<html>
			<head>
				<title>{t('auto.t_69_dostupy_uchenikov_intizom')}</title>
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
				<h2>{t('auto.t_137_sistema_intizom_dostupy_uchenikov')}</h2>
				<table>
					<tr><th>{t('auto.t_29_fio_uchenika')}</th><th>{t('auto.t_10_klass')}</th><th>{t('auto.t_98_login')}</th><th>{t('auto.t_195_parol')}</th></tr>
					${generatedAccounts.map(acc => `
						<tr>
							<td>${acc.first_name} ${acc.last_name}</td>
							<td>${acc.class_name || '—'}</td>
							<td class="mono">${acc.username}</td>
							<td class="mono" style="color: #000;">${acc.password}</td>
						</tr>
					`).join('')}
				</table>
				<div class="footer">{t('auto.t_78_raspechatano_iz_sistemy_upravleniya')}</div>
			</body>
			</html>
		`;
		printHtml(html);
	};

	// ИМПОРТ EXCEL
	const downloadTemplate = () => {
		const wsData = [
			{ [t('auto.t_172_imya')]: t('auto.t_168_ivan'), [t('auto.t_131_familiya')]: t('auto.t_181_ivanov'), [t('auto.t_10_klass')]: t('auto.t_209_10a') },
			{ [t('auto.t_172_imya')]: t('auto.t_54_anna'), [t('auto.t_131_familiya')]: t('auto.t_111_smirnova'), [t('auto.t_10_klass')]: t('auto.t_209_10a') }
		];
		const ws = XLSX.utils.json_to_sheet(wsData);
		const wb = XLSX.utils.book_new();
		XLSX.utils.book_append_sheet(wb, ws, t('auto.t_62_shablon'));
		XLSX.writeFile(wb, t('auto.t_17_shablon_importa_uchenikov_xlsx'));
		toast.success(t('auto.t_148_shablon_skachan'));
	};

	const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
		if (e.target.files && e.target.files.length > 0) {
			setSelectedImportFile(e.target.files[0]);
		}
	};

	const handleConfirmImport = () => {
		if (!selectedImportFile) return;
		const reader = new FileReader();
		reader.onload = async (evt) => {
			try {
				const wb = XLSX.read(evt.target?.result, { type: 'binary' });
				const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
				const formattedData = data.map((row: any) => ({
					first_name: row[t('auto.t_172_imya')] || row['first_name'] || '',
					last_name: row[t('auto.t_131_familiya')] || row['last_name'] || '',
					class_name: String(row[t('auto.t_10_klass')] || row['class_name'] || '').trim()
				})).filter(item => item.first_name && item.last_name);

				if (formattedData.length === 0) { toast.error(t('mgmt.t_14')); return; }
				toast.loading(`Загружаем ${formattedData.length} учеников...`, { id: 'import' });
				const res = await api.post('students/bulk_create_students/', { students: formattedData });
				toast.dismiss('import');

				// Добавляем красивое информационное окно, если есть детальная информация
				if (res.data.detail) {
					toast.success(res.data.detail, { duration: 8000, style: { maxWidth: '500px' } });
				} else {
					toast.success(t('mgmt.t_57'));
				}

				setIsImportModalOpen(false);
				setSelectedImportFile(null);
				refresh();
			} catch (err) {
				toast.dismiss('import');
				toast.error(t('mgmt.t_59'));
			}
		};
		reader.readAsBinaryString(selectedImportFile);
	};

	const handleBulkUpdateClass = async () => {
		if (!bulkClassId) return;
		try {
			setIsSubmitting(true);
			const res = await api.post('students/bulk_update_class/', { student_ids: selectedStudents, new_class_id: bulkClassId });
			toast.success(res.data.detail);
			setShowBulkModal(false); setSelectedStudents([]); refresh();
		} catch (err) { toast.error(t('mgmt.t_56')); }
		finally { setIsSubmitting(false); }
	};

	const handleDelete = async (id: number) => {
		setConfirmDialog({
			message: t('mgmt.t_7'),
			onConfirm: async () => {
				try { await api.delete(`students/${id}/`); toast.success(t('mgmt.t_105')); refresh(); }
				catch (err) { toast.error(t('mgmt.t_35')); }
			}
		});
	};

	const handleBulkDelete = async () => {
		setConfirmDialog({
			message: `Вы уверены, что хотите безвозвратно удалить ${selectedStudents.length} учеников? Экспорт паролей не удалит, а только стерёт их из базы!`,
			onConfirm: async () => {
				try {
					setIsSubmitting(true);
					await Promise.all(selectedStudents.map(id => api.delete(`students/${id}/`)));
					toast.success(t('mgmt.t_55'));
					setSelectedStudents([]); refresh();
				} catch (err) { toast.error(t('mgmt.t_52')); }
				finally { setIsSubmitting(false); }
			}
		});
	};

	const openStudentHistory = async (studentId: number) => {
		setLoadingHistoryId(studentId);
		try {
			const res = await api.get(`students/${studentId}/history/`);
			setSelectedStudentHistory(res.data);
			setIsHistoryModalOpen(true);
		} catch (err) {
			toast.error(t('mgmt.t_26'));
		} finally {
			setLoadingHistoryId(null);
		}
	};

	const handleDeleteLog = async (logId: number) => {
		setConfirmDialog({
			message: t('mgmt.t_1'),
			onConfirm: async () => {
				try {
					await api.delete(`logs/${logId}/`);
					if (selectedStudentHistory) {
						const res = await api.get(`students/${selectedStudentHistory.id}/history/`);
						setSelectedStudentHistory(res.data);
						refresh(); // Обновляем основную таблицу
					}
					toast.success(t('mgmt.t_48'));
				} catch (error) {
					toast.error(t('mgmt.t_49'));
				}
			}
		});
	};

	const handleBulkResetPasswords = async () => {
		setConfirmDialog({
			message: `ВНИМАНИЕ! Вы сбросите текущие пароли у ${selectedStudents.length} учеников и сгенерируете новые. Старые пароли будут потеряны навсегда. Продолжить?`,
			onConfirm: async () => {
				try {
					setIsSubmitting(true);
					const res = await api.post('students/bulk_reset_passwords/', { student_ids: selectedStudents });
					
					const html = `
						<html>
						<head>
							<title>{t('auto.t_222_sbroshennye_dostupy_uchenikov_intizom')}</title>
							<style>
								@page { margin: 15mm; }
								body { font-family: 'Segoe UI', Arial, sans-serif; color: #333; }
								h2 { text-align: center; color: #4f46e5; margin-bottom: 20px; font-size: 24px; }
								.subtitle { text-align: center; color: #64748b; font-size: 14px; margin-bottom: 30px; }
								table { width: 100%; border-collapse: collapse; font-size: 14px; }
								th, td { border: 1px solid #e2e8f0; padding: 10px 12px; text-align: left; }
								th { background-color: #f8fafc; color: #475569; font-weight: bold; text-transform: uppercase; font-size: 12px;}
								td.mono { font-family: monospace; font-weight: bold; font-size: 16px; color: #4f46e5; }
								.footer { margin-top: 30px; text-align: center; font-size: 12px; color: #94a3b8; }
								.highlight { color: #dc2626; font-weight: bold; }
							</style>
						</head>
						<body>
							<h2>{t('auto.t_0_sistema_intizom')}</h2>
							<div class="subtitle">Новые доступы для входа в кабинет учеников (${res.data.accounts.length} шт.)</div>
							<table>
								<thead>
									<tr>
										<th style="width: 40px; text-align: center;">№</th>
										<th>{t('auto.t_29_fio_uchenika')}</th>
										<th style="width: 80px;">{t('auto.t_10_klass')}</th>
										<th>{t('auto.t_98_login')}</th>
										<th>{t('auto.t_184_novyy_parol')}</th>
									</tr>
								</thead>
								<tbody>
									${res.data.accounts.map((acc: any, idx: number) => `
										<tr>
											<td style="text-align: center; color: #94a3b8;">${idx + 1}</td>
											<td style="font-weight: bold;">${acc.first_name} ${acc.last_name}</td>
											<td style="font-weight: bold; color: #64748b;">${acc.class_name || '—'}</td>
											<td class="mono">${acc.username}</td>
											<td class="mono highlight">${acc.password}</td>
										</tr>
									`).join('')}
								</tbody>
							</table>
							<div class="footer">{t('auto.t_216_raspechatano_administratorom_shkoly_hranite')}</div>
						</body>
						</html>
					`;
					printHtml(html);

					toast.success(res.data.detail);
					setSelectedStudents([]); refresh();
				} catch (err) { toast.error(t('auto.t_80_oshibka_pri_generatsii_paroley')); }
				finally { setIsSubmitting(false); }
			}
		});
	};

	const exportSelectedToExcel = () => {
		const selectedData = data.filter(s => selectedStudents.includes(s.id));
		const wsData = selectedData.map(acc => ({
			[t('auto.t_172_imya')]: acc.first_name, [t('auto.t_131_familiya')]: acc.last_name, [t('auto.t_10_klass')]: acc.class_name || '—',
			[t('auto.t_98_login')]: acc.username || '—', [t('auto.t_195_parol')]: t('auto.t_113_skryt_nastroykami_bezopasnosti_django')
		}));
		const ws = XLSX.utils.json_to_sheet(wsData);
		const wb = XLSX.utils.book_new();
		XLSX.utils.book_append_sheet(wb, ws, t('auto.t_89_ucheniki'));
		XLSX.writeFile(wb, t('auto.t_147_spisok_vybrannyh_uchenikov_xlsx'));
		toast.success(t('auto.t_95_excel_skachan'));
	};

	const exportSelectedToPDF = () => {
		const selectedData = data.filter(s => selectedStudents.includes(s.id));

		const html = `
			<html>
			<head>
				<title>{t('auto.t_49_vybrannye_ucheniki_intizom')}</title>
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
				<h2>{t('auto.t_109_sistema_intizom_vybrannye_ucheniki')}</h2>
				<table>
					<tr><th>{t('auto.t_29_fio_uchenika')}</th><th>{t('auto.t_10_klass')}</th><th>{t('auto.t_98_login')}</th><th>{t('auto.t_195_parol')}</th></tr>
					${selectedData.map(acc => `
						<tr>
							<td>${acc.first_name} ${acc.last_name}</td>
							<td>${acc.class_name || '—'}</td>
							<td class="mono">${acc.username || '—'}</td>
							<td class="mono" style="color: #94a3b8; font-size: 11px;">{t('auto.t_212_skryto_bd')}</td>
						</tr>
					`).join('')}
				</table>
				<div class="footer">{t('auto.t_124_raspechatano_iz_sistemy_upravleniya')}</div>
			</body>
			</html>
		`;
		printHtml(html);
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
			if (editingId) { await api.patch(`students/${editingId}/`, payload); toast.success(t('mgmt.t_85')); }
			else { await api.post(`students/`, payload); toast.success(t('mgmt.t_84')); }
			setIsModalOpen(false); refresh();
		} catch (err: any) {
			setError(err.response?.data?.username ? t('mgmt.t_27') : t('mgmt.t_47'));
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
	} else if (!selectedGrade) {
		filtered = []; // Не показывать учеников, пока не выбран класс или не введен поиск
	}


	if (selectedGrade) {
		if (selectedLetters.length > 0) {
			filtered = filtered.filter(s => s.class_name && selectedLetters.includes(s.class_name));
		} else {
			filtered = filtered.filter(s => {
				const match = s.class_name?.match(/\d+/);
				return match && match[0] === selectedGrade;
			});
		}
	}

	let statsCount = data.length;
	let statsLabel = t('mgmt.t_66');
	if (selectedGrade) {
		if (selectedLetters.length > 0) {
			statsCount = data.filter(s => s.class_name && selectedLetters.includes(s.class_name)).length;
			statsLabel = selectedLetters.length === 1 ? `В ${selectedLetters[0]} классе` : `Выбрано классов: ${selectedLetters.length}`;
		} else {
			statsCount = data.filter(s => {
				const match = s.class_name?.match(/\d+/);
				return match && match[0] === selectedGrade;
			}).length;
			statsLabel = `В ${selectedGrade}-х классах`;
		}
	}

	const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1;
	const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

	return (
		<div className="flex flex-col lg:flex-row gap-6 items-start animate-in fade-in duration-300">
			<div className="flex-1 w-full bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl border border-white dark:border-zinc-800/60 rounded-[2rem] p-6 shadow-sm">
				<div className="flex flex-col sm:flex-row justify-between gap-4 mb-6 border-b border-white dark:border-zinc-800 pb-4">
					<div className="relative w-full sm:w-64">
						<Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
						<input type="search" placeholder={`Поиск (${filtered.length})...`} value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }} className="w-full pl-10 pr-4 py-2 bg-white/50 dark:bg-zinc-800/50 border border-white dark:border-zinc-700 dark:text-zinc-100 focus:border-indigo-300 dark:focus:border-indigo-500/50 rounded-xl text-sm outline-none transition-all" />
					</div>

					{/* ПАНЕЛЬ КНОПОК */}
					<div className="flex flex-wrap gap-2">
						<button
							onClick={handleGenerateAccounts}
							disabled={isGenerating}
							className="flex items-center gap-2 bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-md transition-all active:scale-95 disabled:opacity-70"
						>
							<Key size={16} /> {isGenerating ? t('mgmt.t_71') : t('mgmt.t_61')}
						</button>
						<button
							onClick={() => setIsImportModalOpen(true)}
							className="flex items-center gap-2 bg-white dark:bg-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 px-4 py-2 rounded-xl text-sm font-bold shadow-sm border border-slate-200 dark:border-zinc-700 transition-all active:scale-95"
						>
							<FileUp size={16} /> Импорт
						</button>
						<button onClick={() => openModal()} className="flex items-center gap-2 bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-md transition-all active:scale-95">
							<Plus size={16} /> Добавить
						</button>
					</div>
				</div>

				<div className="overflow-x-auto min-h-[400px]">
					{paginated.length === 0 ? (
						<div className="flex flex-col items-center justify-center min-h-[350px] text-center px-4 w-full h-full">
							<div className="w-20 h-20 bg-slate-50 dark:bg-zinc-800 border border-slate-100 dark:border-zinc-700 text-slate-300 dark:text-zinc-600 rounded-full flex items-center justify-center mb-4">
								<Filter size={36} strokeWidth={1.5} />
							</div>
							<h3 className="text-xl font-black text-slate-800 dark:text-zinc-50">{t('mgmt.t_32')}</h3>
							<p className="text-slate-500 font-medium text-sm mt-3 max-w-xs leading-relaxed">
								{searchQuery ? t('mgmt.t_5') : t('mgmt.t_2')}
							</p>
						</div>
					) : (
						<TableTemplate headers={[
							<input type="checkbox" onChange={e => setSelectedStudents(e.target.checked ? paginated.map(s => s.id) : [])} checked={paginated.length > 0 && paginated.every(s => selectedStudents.includes(s.id))} className="w-4 h-4 text-indigo-600 rounded cursor-pointer" />,
							'№', t('mgmt.t_75'), t('auto.t_10_klass'), t('mgmt.t_98'), t('mgmt.t_112'), t('auto.t_98_login'), t('auto.t_195_parol'), t('mgmt.t_94')
						]}>
							{paginated.map((row, idx) => {
								const lvl = row.status_info.level;
								const statusColor = lvl === 'excellent' ? 'text-green-700 dark:text-emerald-400 bg-green-50 dark:bg-emerald-500/10 border-green-200 dark:border-emerald-500/20' : lvl === 'warning' ? 'text-yellow-700 dark:text-amber-400 bg-yellow-50 dark:bg-amber-500/10 border-yellow-200 dark:border-amber-500/20' : 'text-red-700 dark:text-rose-400 bg-red-50 dark:bg-rose-500/10 border-red-200 dark:border-rose-500/20';
								const barColor = lvl === 'excellent' ? 'bg-green-500' : lvl === 'warning' ? 'bg-yellow-500' : 'bg-red-500';

								return (
									<tr key={row.id} className={`border-b border-slate-100 dark:border-zinc-800/60 transition-colors ${selectedStudents.includes(row.id) ? 'bg-indigo-50/50 dark:bg-indigo-500/10' : 'hover:bg-slate-50 dark:hover:bg-zinc-800/30'}`}>
										<td className="py-4 px-4"><input type="checkbox" checked={selectedStudents.includes(row.id)} onChange={e => setSelectedStudents(e.target.checked ? [...selectedStudents, row.id] : selectedStudents.filter(id => id !== row.id))} className="w-4 h-4 text-indigo-600 rounded cursor-pointer" /></td>
										<td className="py-4 px-4 font-bold text-[12px] text-slate-400 dark:text-zinc-500 w-12 text-center">{(currentPage - 1) * itemsPerPage + idx + 1}</td>
										<td className="py-4 px-4 font-bold text-slate-800 dark:text-zinc-50">{row.first_name} {row.last_name}</td>
										<td className="py-4 px-4 text-[13px] font-medium"><span className="bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 shadow-sm text-slate-700 dark:text-zinc-300 px-2 py-1 rounded-md font-bold">{row.class_name || '—'}</span></td>
										<td className="py-4 px-4"><div className="flex items-center gap-2"><div className="w-full bg-slate-200 dark:bg-zinc-700 rounded-full h-2 max-w-[60px]"><div className={`h-2 rounded-full ${barColor} transition-all`} style={{ width: `${Math.max(0, row.points)}%` }}></div></div><span className="text-[13px] font-bold text-slate-700 dark:text-zinc-200">{row.points}</span></div></td>
										<td className="py-4 px-4"><span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border ${statusColor}`}>{row.status_info.text}</span></td>

										{/* 👇 ВЫВОД ЛОГИНА И СКРЫТОГО ПАРОЛЯ */}
										<td className="py-4 px-4 font-mono text-sm font-bold text-indigo-600 dark:text-indigo-400">{row.username || '—'}</td>
										<td className="py-4 px-4 font-mono text-[10px] text-slate-400 dark:text-zinc-500 tracking-[0.2em]">{row.username ? '••••••' : '—'}</td>

										<td className="py-4 px-4">
											<ActionButtons 
												onEdit={() => openModal(row)} 
												onDelete={() => handleDelete(row.id)} 
												extraButton={
													<button onClick={() => openStudentHistory(row.id)} disabled={loadingHistoryId === row.id} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/20 dark:hover:text-indigo-300 rounded-lg transition-colors disabled:opacity-50" title={t('auto.t_123_posmotret_istoriyu')}>
														{loadingHistoryId === row.id ? <Loader2 size={16} className="animate-spin text-indigo-500" /> : <Eye size={16} />}
													</button>
												}
											/>
										</td>
									</tr>
								);
							})}
						</TableTemplate>
					)}
				</div>

				{totalPages > 1 && (
					<div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-100 dark:border-zinc-800/60">
						<span className="text-[13px] font-bold text-slate-400 dark:text-zinc-500">Стр. {currentPage} из {totalPages}</span>
						<div className="flex gap-2">
							<button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-2 rounded-xl bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 hover:bg-slate-50 dark:hover:bg-zinc-700 dark:text-zinc-100 disabled:opacity-50 transition-all"><ChevronLeft size={18} /></button>
							<button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-2 rounded-xl bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 hover:bg-slate-50 dark:hover:bg-zinc-700 dark:text-zinc-100 disabled:opacity-50 transition-all"><ChevronRight size={18} /></button>
						</div>
					</div>
				)}
			</div>

			{/* БОКОВАЯ ПАНЕЛЬ: УМНЫЕ ФИЛЬТРЫ */}
			<div className="w-full lg:w-[280px] shrink-0 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl border border-white dark:border-zinc-800/60 rounded-[2rem] p-6 shadow-sm sticky top-6">
				<div className="flex items-center gap-2 border-b border-indigo-100/50 dark:border-zinc-800 pb-4 mb-5">
					<Filter size={20} className="text-indigo-600 dark:text-indigo-400" />
					<h3 className="font-bold text-slate-800 dark:text-zinc-50">{t('mgmt.t_119')}</h3>
				</div>

				{/* БЛОК СТАТИСТИКИ КАК ЗАГОЛОВОК */}
				<div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-2xl p-4 text-white shadow-sm mb-6 relative overflow-hidden group transition-all duration-300 hover:shadow-md hover:-translate-y-0.5">
					<div className="absolute -right-4 -top-4 w-16 h-16 bg-white/10 rounded-full group-hover:scale-[2.5] transition-transform duration-500 ease-out"></div>
					<div className="relative z-10">
						<p className="text-[10px] font-black uppercase tracking-widest text-indigo-100 mb-1 leading-none">{statsLabel}</p>
						<div className="flex items-end gap-1.5 mt-2">
							<span className="text-4xl font-black leading-none">{statsCount}</span>
							<span className="text-xs font-bold text-indigo-100 mb-1 tracking-wide">{t('auto.t_13_uchenikov')}</span>
						</div>
					</div>
				</div>

				<div className="space-y-5">
					<div>
						<p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2.5">{t('mgmt.t_87')}</p>
						<div className="flex flex-wrap gap-2">
							{uniqueGrades.length > 0 ? uniqueGrades.map((grade) => (
								<button
									key={grade}
									onClick={() => {
										setSelectedGrade(selectedGrade === grade ? null : grade);
										setSelectedLetters([]);
										setCurrentPage(1);
									}}
									className={`w-12 h-10 rounded-xl font-bold text-sm transition-all border ${selectedGrade === grade ? 'bg-indigo-600 text-white shadow-md scale-105' : 'bg-white/50 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 border-white dark:border-zinc-700 hover:bg-white dark:hover:bg-zinc-700 dark:hover:text-zinc-100'}`}
								>
									{grade}
								</button>
							)) : <span className="text-sm text-slate-400">{t('mgmt.t_80')}</span>}
						</div>
					</div>

					{selectedGrade && availableExactClasses.length > 0 && (
						<div className="animate-in fade-in slide-in-from-top-2 duration-300">
							<p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2.5">{t('mgmt.t_73')}</p>
							<div className="flex flex-wrap gap-2">
								{availableExactClasses.map((exactClass) => (
									<button
										key={exactClass}
										onClick={() => {
											if (selectedLetters.includes(exactClass)) {
												setSelectedLetters(selectedLetters.filter(l => l !== exactClass));
											} else {
												setSelectedLetters([...selectedLetters, exactClass]);
											}
											setCurrentPage(1);
										}}
										className={`px-3 h-10 min-w-[3rem] rounded-xl font-bold text-sm transition-all border ${selectedLetters.includes(exactClass) ? 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-400 border-indigo-300 dark:border-indigo-500/50 shadow-sm scale-105' : 'bg-white/50 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 border-white dark:border-zinc-700 hover:bg-white dark:hover:bg-zinc-700 dark:hover:text-zinc-100'}`}
									>
										{exactClass}
									</button>
								))}
							</div>
						</div>
					)}
				</div>

				{(selectedGrade || selectedLetters.length > 0) && (
					<button onClick={() => { setSelectedGrade(null); setSelectedLetters([]); setCurrentPage(1); }} className="mt-5 text-[12px] font-bold text-red-500 dark:text-rose-500 py-2.5 w-full bg-red-50/50 dark:bg-rose-500/10 hover:bg-red-50 dark:hover:bg-rose-500/20 border border-red-100 dark:border-rose-500/20 rounded-xl transition-all">
						Сбросить фильтры
					</button>
				)}
			</div>

			{/* === ПЛАВАЮЩАЯ ПАНЕЛЬ МАССОВЫХ ДЕЙСТВИЙ === */}
			{selectedStudents.length > 0 && (
				<div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-800/95 backdrop-blur-xl border border-slate-700 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-4 z-40 animate-in slide-in-from-bottom-10 w-max max-w-[95%] overflow-x-auto scrollbar-hide">
					<div className="flex items-center gap-4 shrink-0">
						<div className="flex flex-col items-center">
							<span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{t('mgmt.t_101')}</span>
							<span className="text-xl font-black leading-none">{selectedStudents.length}</span>
						</div>
						<div className="h-8 w-[1px] bg-slate-600"></div>
					</div>
					
					<div className="flex items-center gap-2 shrink-0">
						<button onClick={handleBulkResetPasswords} disabled={isSubmitting} className="bg-indigo-500 hover:bg-indigo-600 px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-md active:scale-95 disabled:opacity-50 text-white cursor-pointer group">
							<Key size={14} className="group-hover:rotate-12 transition-transform" /> Сбросить доступы (PDF)
						</button>
						<button onClick={exportSelectedToPDF} className="bg-slate-700 hover:bg-slate-600 px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-md active:scale-95 text-white">
							<FileText size={14} /> PDF логины
						</button>
						<button onClick={exportSelectedToExcel} className="bg-emerald-600 hover:bg-emerald-500 px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-md active:scale-95 text-white">
							<Download size={14} /> Excel
						</button>
						<button onClick={() => setShowBulkModal(true)} className="bg-amber-500 hover:bg-amber-600 px-3 py-2 rounded-lg text-xs font-bold transition-all shadow-md active:scale-95 text-white">{t('mgmt.t_64')}</button>
						<button onClick={handleBulkDelete} disabled={isSubmitting} className="bg-red-500 hover:bg-red-600 px-3 py-2 rounded-lg text-xs font-bold transition-all shadow-md active:scale-95 disabled:opacity-50 text-white">{t('auto.t_165_udalit')}</button>
					</div>
					
					<button onClick={() => setSelectedStudents([])} className="text-slate-400 hover:text-white hover:bg-slate-700 p-2 rounded-lg transition-colors shrink-0 ml-2"><X size={18} /></button>
				</div>
			)}

			{/* === МОДАЛКА ВЫБОРА КЛАССА ДЛЯ МАССОВОГО ПЕРЕВОДА === */}
			<Modal isOpen={showBulkModal} onClose={() => setShowBulkModal(false)}>
					<div className="bg-white dark:bg-zinc-900 w-full max-w-sm rounded-[2rem] shadow-2xl overflow-hidden p-6">
						<h3 className="text-lg font-black text-slate-800 dark:text-zinc-50 mb-4">{t('mgmt.t_34')}</h3>
						<select value={bulkClassId} onChange={(e) => setBulkClassId(e.target.value)} className="w-full bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700 dark:text-zinc-100 focus:border-indigo-500 dark:focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-100 dark:focus:ring-indigo-500/20 rounded-xl px-4 py-3 text-sm font-medium outline-none mb-6">
							<option value="" disabled>{t('mgmt.t_23')}</option>
							{classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
						</select>
						<div className="flex gap-3">
							<button onClick={() => setShowBulkModal(false)} className="flex-1 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 font-bold py-3 rounded-xl transition-all">{t('mgmt.t_115')}</button>
							<button onClick={handleBulkUpdateClass} disabled={isSubmitting || !bulkClassId} className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl shadow-md transition-all">{t('mgmt.t_89')}</button>
						</div>
					</div>
			</Modal>

			{/* === МОДАЛКА ДОБАВЛЕНИЯ / РЕДАКТИРОВАНИЯ === */}
			<Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
					<div className="bg-white dark:bg-zinc-900 p-6 rounded-[2rem] w-full max-w-sm shadow-2xl">
						<div className="flex justify-between items-center mb-6">
							<h3 className="text-xl font-black text-slate-800 dark:text-zinc-50">{editingId ? t('mgmt.t_62') : t('mgmt.t_91')} ученика</h3>
							<button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-rose-500/10 rounded-xl transition-all"><X size={20} /></button>
						</div>

						{error && (<div className="mb-4 p-3 bg-red-50 text-red-600 border border-red-200 rounded-xl text-xs font-bold flex items-center gap-2"><AlertCircle size={16} /> {error}</div>)}

						<form onSubmit={handleSubmit} className="space-y-3">
							<input placeholder={t('auto.t_172_imya')} required value={formData.first_name} onChange={e => setFormData({ ...formData, first_name: e.target.value })} className="w-full bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700 dark:text-zinc-100 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 dark:focus:ring-indigo-500/20 outline-none rounded-xl px-4 py-3 text-sm font-medium transition-all" />
							<input placeholder={t('auto.t_131_familiya')} required value={formData.last_name} onChange={e => setFormData({ ...formData, last_name: e.target.value })} className="w-full bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700 dark:text-zinc-100 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 dark:focus:ring-indigo-500/20 outline-none rounded-xl px-4 py-3 text-sm font-medium transition-all" />
							<select required value={formData.school_class} onChange={e => setFormData({ ...formData, school_class: e.target.value })} className="w-full bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700 dark:text-zinc-100 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 dark:focus:ring-indigo-500/20 outline-none rounded-xl px-4 py-3 text-sm font-medium transition-all">
								<option value="" disabled>{t('mgmt.t_58')}</option>
								{classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
							</select>

							{/* ПОЛЯ ДЛЯ ЛОГИНА И ПАРОЛЯ */}
							<div className="pt-2 mt-2 border-t border-slate-100 dark:border-zinc-800/60">
								<p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">{t('auto.t_107_dannye_dlya_vhoda_optsionalno')}</p>
								<div className="space-y-2">
									<input placeholder={t('auto.t_208_login_naprimer_a_ivanov')} value={formData.new_username} onChange={e => setFormData({ ...formData, new_username: e.target.value })} className="w-full bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700 dark:text-zinc-100 focus:border-indigo-400 outline-none rounded-xl px-4 py-2 text-sm font-medium transition-all" />
									<input placeholder={t('auto.t_8_novyy_parol')} type="text" value={formData.new_password} onChange={e => setFormData({ ...formData, new_password: e.target.value })} className="w-full bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700 dark:text-zinc-100 focus:border-indigo-400 outline-none rounded-xl px-4 py-2 text-sm font-medium transition-all" />
								</div>
								<p className="text-[10px] text-slate-400 mt-2 leading-tight">{t('auto.t_105_ostavte_pustym_esli_ne')}</p>
							</div>

							<div className="flex gap-3 mt-6 pt-2">
								<button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 py-3 rounded-xl font-bold transition-all">{t('mgmt.t_115')}</button>
								<button type="submit" disabled={isSubmitting} className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white py-3 rounded-xl font-bold shadow-md transition-all">
									{isSubmitting ? t('mgmt.t_65') : t('mgmt.t_83')}
								</button>
							</div>
						</form>
					</div>
			</Modal>

			{/* === МОДАЛКА ИМПОРТА === */}
			<Modal isOpen={isImportModalOpen} onClose={() => { setIsImportModalOpen(false); setSelectedImportFile(null); }}>
					<div className="bg-white dark:bg-zinc-900 p-6 rounded-[2rem] w-full max-w-md shadow-2xl">
						<div className="flex justify-between items-center mb-6">
							<h3 className="text-xl font-black text-slate-800 dark:text-zinc-50">{t('mgmt.t_54')}</h3>
							<button onClick={() => { setIsImportModalOpen(false); setSelectedImportFile(null); }} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-rose-500/10 rounded-xl transition-all"><X size={20} /></button>
						</div>

						<div className="space-y-6">
							{/* Выбор файла */}
							<div className="border-2 border-dashed border-slate-200 dark:border-zinc-700 rounded-2xl p-6 text-center hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors relative">
								<input
									type="file"
									accept=".xlsx, .xls, .csv"
									onChange={handleFileSelect}
									className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
								/>
								<div className="flex flex-col items-center gap-2 pointer-events-none">
									<div className="p-3 bg-indigo-50 dark:bg-indigo-500/20 text-indigo-500 dark:text-indigo-400 rounded-full">
										<FileUp size={24} />
									</div>
									{selectedImportFile ? (
										<div>
											<p className="font-bold text-slate-700 dark:text-zinc-300">{selectedImportFile.name}</p>
											<p className="text-xs text-slate-400 dark:text-zinc-500">{t('mgmt.t_28')}</p>
										</div>
									) : (
										<div>
											<p className="font-bold text-slate-700 dark:text-zinc-300">{t('mgmt.t_17')}</p>
											<p className="text-xs text-slate-400 dark:text-zinc-500">{t('mgmt.t_11')}</p>
										</div>
									)}
								</div>
							</div>

							<div className="flex gap-3 pt-2 border-t border-slate-100 dark:border-zinc-800/60">
								<button
									onClick={downloadTemplate}
									className="flex-1 flex items-center justify-center gap-2 bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 py-3 rounded-xl font-bold transition-all"
								>
									<Download size={18} /> Шаблон
								</button>
								<button
									onClick={handleConfirmImport}
									disabled={!selectedImportFile}
									className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white py-3 rounded-xl font-bold shadow-md transition-all"
								>
									Загрузить
								</button>
							</div>
						</div>
					</div>
			</Modal>

			{/* === МОДАЛКА: СГЕНЕРИРОВАННЫЕ ПАРОЛИ === */}
			<Modal isOpen={!!generatedAccounts} onClose={() => setGeneratedAccounts(null)}>
					<div className="bg-white dark:bg-zinc-900 w-full max-w-2xl rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
						<div className="p-6 border-b border-slate-100 dark:border-zinc-800/60 flex justify-between items-center bg-indigo-50/50 dark:bg-indigo-500/5">
							<div>
								<h3 className="text-xl font-black text-slate-800 dark:text-zinc-50">Доступы учеников ({generatedAccounts?.length || 0})</h3>
								<p className="text-sm text-slate-500 dark:text-zinc-400 font-medium mt-1">{t('mgmt.t_3')}</p>
							</div>
							<button onClick={() => setGeneratedAccounts(null)} className="p-2 text-slate-400 hover:text-red-500 bg-white dark:bg-zinc-800 dark:hover:bg-rose-500/10 shadow-sm rounded-xl transition-all"><X size={20} /></button>
						</div>

						<div className="overflow-y-auto p-6 bg-slate-50/50 dark:bg-zinc-900/50">
							<div className="border border-slate-200 dark:border-zinc-700 rounded-2xl overflow-hidden bg-white dark:bg-zinc-800">
								<table className="w-full text-left border-collapse">
									<thead>
										<tr className="bg-slate-50 dark:bg-zinc-800/50 text-[11px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider border-b border-slate-200 dark:border-zinc-700">
											<th className="p-4">{t('auto.t_58_fio')}</th>
											<th className="p-4">{t('auto.t_10_klass')}</th>
											<th className="p-4">{t('auto.t_98_login')}</th>
											<th className="p-4">{t('auto.t_195_parol')}</th>
										</tr>
									</thead>
									<tbody>
										{generatedAccounts?.map((acc: any, idx: number) => (
											<tr key={idx} className="border-b border-slate-100 dark:border-zinc-700/50 last:border-0 hover:bg-slate-50 dark:hover:bg-zinc-800/50">
												<td className="p-4 font-bold text-slate-800 dark:text-zinc-100">{acc.first_name} {acc.last_name}</td>
												<td className="p-4 font-medium text-slate-500 dark:text-zinc-400">{acc.class_name}</td>
												<td className="p-4 font-mono text-sm text-indigo-600 dark:text-indigo-400">{acc.username}</td>
												<td className="p-4 font-mono text-sm text-slate-800 dark:text-zinc-300">{acc.password}</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						</div>

						<div className="p-6 border-t border-slate-100 dark:border-zinc-800/60 bg-white dark:bg-zinc-900 flex flex-wrap gap-3 justify-end">
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
			</Modal>
			{/* === КАСТОМНЫЙ АЛЕРТ ПОДТВЕРЖДЕНИЯ === */}
			<Modal isOpen={!!confirmDialog} onClose={() => setConfirmDialog(null)}>
					<div className="bg-white dark:bg-zinc-900 p-6 rounded-[2rem] w-full max-w-sm shadow-2xl text-center">
						<div className="w-16 h-16 bg-red-100 dark:bg-rose-500/20 text-red-500 dark:text-rose-400 rounded-full flex items-center justify-center mx-auto mb-4 scale-110">
							<AlertCircle size={32} />
						</div>
						<h3 className="text-xl font-black text-slate-800 dark:text-zinc-50 mb-2">{t('mgmt.t_90')}</h3>
						<p className="text-sm font-medium text-slate-500 dark:text-zinc-400 mb-6 px-2">{confirmDialog?.message}</p>
						<div className="flex gap-3">
							<button onClick={() => setConfirmDialog(null)} className="flex-1 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 py-3 rounded-xl font-bold transition-all">{t('mgmt.t_115')}</button>
							<button onClick={() => { confirmDialog?.onConfirm(); setConfirmDialog(null); }} className="flex-1 bg-red-500 hover:bg-red-600 text-white py-3 rounded-xl font-bold shadow-md transition-all active:scale-95">{t('mgmt.t_77')}</button>
						</div>
					</div>
			</Modal>
			
			{/* МОДАЛКА ИСТОРИИ УЧЕНИКА */}
			<Modal isOpen={isHistoryModalOpen && !!selectedStudentHistory} onClose={() => setIsHistoryModalOpen(false)}>
				{selectedStudentHistory && (
					<div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl w-full max-w-lg max-h-[80vh] flex flex-col relative shadow-2xl">
						<button onClick={() => setIsHistoryModalOpen(false)} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-rose-500/10 rounded-xl transition-all">
							<X size={20} />
						</button>
						<h3 className="text-xl font-black text-slate-800 dark:text-zinc-50 mb-1">{selectedStudentHistory.first_name} {selectedStudentHistory.last_name}</h3>
						<div className="text-sm text-slate-500 dark:text-zinc-400 font-medium mb-4 flex items-center flex-wrap gap-2">
							<span>Класс: <span className="font-bold text-slate-700 dark:text-zinc-200">{selectedStudentHistory.class_name}</span></span>
							<span className="text-slate-300 dark:text-zinc-600">•</span>
							<span>Баллы: <span className={`font-bold ${selectedStudentHistory.points >= 80 ? 'text-green-600 dark:text-emerald-400' : selectedStudentHistory.points >= 50 ? 'text-yellow-600 dark:text-amber-400' : 'text-red-600 dark:text-rose-400'}`}>{selectedStudentHistory.points}</span></span>
							{selectedStudentHistory.status_info && (
								<>
									<span className="text-slate-300 dark:text-zinc-600">•</span>
									<span>Статус: <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold border ${selectedStudentHistory.status_info.level === 'excellent' ? 'text-green-700 dark:text-emerald-400 bg-green-50 dark:bg-emerald-500/10 border-green-200 dark:border-emerald-500/20' : selectedStudentHistory.status_info.level === 'warning' ? 'text-yellow-700 dark:text-amber-400 bg-yellow-50 dark:bg-amber-500/10 border-yellow-200 dark:border-amber-500/20' : 'text-red-700 dark:text-rose-400 bg-red-50 dark:bg-rose-500/10 border-red-200 dark:border-rose-500/20'}`}>{selectedStudentHistory.status_info.text}</span></span>
								</>
							)}
						</div>

						<div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-2 mt-2">
							<h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">{t('auto.t_126_istoriya_izmeneniy')}</h4>
							{selectedStudentHistory.recent_logs?.length > 0 ? (
								selectedStudentHistory.recent_logs.map((log: any) => (
									<div key={log.id} className="p-3 bg-slate-50 dark:bg-zinc-800/50 rounded-2xl flex gap-3 items-start border border-slate-100 dark:border-zinc-700 transition-all hover:bg-slate-100 dark:hover:bg-zinc-800">
										<div className={`mt-1 flex items-center justify-center w-9 h-9 rounded-xl font-black text-sm shrink-0 shadow-sm ${log.is_positive ? 'bg-green-100 dark:bg-emerald-500/10 text-green-700 dark:text-emerald-400 border border-green-200 dark:border-emerald-500/20' : 'bg-red-100 dark:bg-rose-500/10 text-red-700 dark:text-rose-400 border border-red-200 dark:border-rose-500/20'}`}>
											{log.is_positive ? '+' : ''}{log.points_impact}
										</div>
										<div className="flex-1">
											<div className="flex justify-between items-start">
												<p className="text-[13px] font-bold text-slate-800 dark:text-zinc-100 leading-tight pr-2">{log.rule_title}</p>
												<button
													onClick={() => handleDeleteLog(log.id)}
													className="text-slate-400 hover:text-red-500 transition-colors shrink-0"
													title={t('auto.t_215_otmenit')}
												>
													<X size={16} />
												</button>
											</div>
											<p className="text-[11px] font-medium text-slate-500 dark:text-zinc-400 mt-1.5 flex items-center gap-1.5">
												<span className="inline-flex items-center justify-center w-4 h-4 bg-white dark:bg-zinc-800 rounded-full border border-slate-200 dark:border-zinc-700 text-[8px] font-bold text-slate-600 dark:text-zinc-300 shadow-sm">
													{log.teacher_name[0]}
												</span>
												{log.teacher_name} • {formatTime(log.created_at)}
											</p>
										</div>
									</div>
								))
							) : (
								<div className="p-8 text-center bg-slate-50 dark:bg-zinc-800/50 rounded-2xl border border-dashed border-slate-200 dark:border-zinc-700">
									<Activity size={32} className="mx-auto text-slate-300 dark:text-zinc-600 mb-3" />
									<p className="text-sm font-bold text-slate-500 dark:text-zinc-400">{t('auto.t_205_istoriya_pusta')}</p>
									<p className="text-xs font-medium text-slate-400 dark:text-zinc-500 mt-1">{t('auto.t_108_nikakih_sobytiy_ne_zafiksirovano')}</p>
								</div>
							)}
						</div>

						<div className="mt-5 pt-4 border-t border-slate-100 dark:border-zinc-800/60">
							<button onClick={() => setIsHistoryModalOpen(false)} className="w-full bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 py-3 rounded-xl font-bold transition-all active:scale-95">{t('mgmt.t_104')}</button>
						</div>
					</div>
				)}
			</Modal>
		</div>
	);
}