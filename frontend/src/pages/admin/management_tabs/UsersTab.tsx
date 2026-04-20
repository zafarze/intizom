import { useEffect, useState } from 'react';
import { Search, Plus, Key, X, ChevronLeft, ChevronRight, Shield, ClipboardCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import api from '../../../api/axios';
import { TableTemplate, ActionButtons, Modal } from './Shared';

interface SystemUser {
	id: number;
	username: string;
	first_name: string;
	last_name: string;
	email: string;
	role: 'admin' | 'secretary';
}

type Role = 'admin' | 'secretary';

const ROLE_OPTIONS: { value: Role; labelKey: string; icon: React.ReactNode; color: string }[] = [
	{ value: 'admin', labelKey: 'management.users.role_admin', icon: <Shield size={14} />, color: 'bg-indigo-50 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-400' },
	{ value: 'secretary', labelKey: 'management.users.role_secretary', icon: <ClipboardCheck size={14} />, color: 'bg-amber-50 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400' },
];

export default function UsersTab() {
	const { t } = useTranslation();
	const [data, setData] = useState<SystemUser[]>([]);
	const [loading, setLoading] = useState(true);
	const [searchQuery, setSearchQuery] = useState('');
	const [currentPage, setCurrentPage] = useState(1);
	const itemsPerPage = 100;

	const [isModalOpen, setIsModalOpen] = useState(false);
	const [editingId, setEditingId] = useState<number | null>(null);
	const [formData, setFormData] = useState({
		username: '',
		password: '',
		first_name: '',
		last_name: '',
		email: '',
		role: 'secretary' as Role,
	});

	const fetchData = async () => {
		try {
			setLoading(true);
			const response = await api.get('system-users/');
			setData(response.data.results || response.data);
		} catch (error) {
			console.error('Failed to fetch users:', error);
			toast.error(t('management.common.error'));
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchData();
	}, []);

	const openModal = (item?: SystemUser) => {
		setEditingId(item ? item.id : null);
		setFormData(item ? {
			username: item.username,
			password: '',
			first_name: item.first_name,
			last_name: item.last_name,
			email: item.email || '',
			role: item.role,
		} : {
			username: '',
			password: '',
			first_name: '',
			last_name: '',
			email: '',
			role: 'secretary',
		});
		setIsModalOpen(true);
	};

	const handleDelete = async (id: number) => {
		if (!window.confirm(t('management.common.confirm_delete'))) return;
		try {
			await api.delete(`system-users/${id}/`);
			toast.success(t('management.common.deleted'));
			fetchData();
		} catch {
			toast.error(t('management.common.error'));
		}
	};

	const handleResetPassword = async (id: number, name: string) => {
		if (!window.confirm(t('management.teachers.reset_password_confirm', { name }))) return;
		try {
			await api.patch(`system-users/${id}/`, { password: '123456' });
			toast.success(t('management.teachers.password_reset_success'));
		} catch {
			toast.error(t('management.common.error'));
		}
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		const payload: Record<string, unknown> = {
			username: formData.username,
			first_name: formData.first_name,
			last_name: formData.last_name,
			email: formData.email,
			role: formData.role,
		};
		if (formData.password) payload.password = formData.password;
		try {
			if (editingId) {
				await api.patch(`system-users/${editingId}/`, payload);
			} else {
				await api.post('system-users/', payload);
			}
			toast.success(t('management.common.saved'));
			setIsModalOpen(false);
			fetchData();
		} catch {
			toast.error(t('management.common.error'));
		}
	};

	const filtered = searchQuery
		? data.filter(u =>
			u.first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
			u.last_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
			u.username.toLowerCase().includes(searchQuery.toLowerCase()))
		: data;
	const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1;
	const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

	const roleBadge = (role: Role) => {
		const opt = ROLE_OPTIONS.find(r => r.value === role);
		if (!opt) return <span className="text-slate-400">—</span>;
		return (
			<span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold ${opt.color}`}>
				{opt.icon}
				{t(opt.labelKey)}
			</span>
		);
	};

	if (loading && data.length === 0) {
		return <div className="p-6 text-slate-400">{t('auto.t_38_borkun_zagruzka')}</div>;
	}

	return (
		<>
			<div className="bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl border border-white dark:border-zinc-800/60 rounded-[2rem] p-6 shadow-sm">
				<div className="flex justify-between mb-6 border-b border-white dark:border-zinc-800 pb-4">
					<div className="relative w-64">
						<Search size={18} className="absolute left-3 top-2.5 text-slate-400" />
						<input
							type="search"
							placeholder={t('management.common.search')}
							value={searchQuery}
							onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
							className="w-full pl-10 pr-4 py-2 bg-white/50 dark:bg-zinc-800/50 border border-white dark:border-zinc-700 dark:text-zinc-100 rounded-xl text-sm outline-none"
						/>
					</div>
					<button
						onClick={() => openModal()}
						className="flex items-center gap-2 bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-md transition-all active:scale-95"
					>
						<Plus size={16} /> {t('management.users.add')}
					</button>
				</div>

				<TableTemplate headers={[
					t('management.common.table_no'),
					t('management.teachers.table_fullname'),
					t('management.users.role'),
					t('management.students.table_login'),
					t('management.common.actions'),
				]}>
					{paginated.map((u, idx) => (
						<tr key={u.id} className="border-b border-slate-100 dark:border-zinc-800/60 hover:bg-slate-50 dark:hover:bg-zinc-800/30 transition-colors">
							<td className="py-4 px-4 text-slate-400 dark:text-zinc-500 text-xs">{idx + 1}</td>
							<td className="py-4 px-4 font-bold text-slate-800 dark:text-zinc-50">
								{u.first_name} {u.last_name}
								{!u.first_name && !u.last_name && <span className="text-slate-400 italic">—</span>}
							</td>
							<td className="py-4 px-4">{roleBadge(u.role)}</td>
							<td className="py-4 px-4 text-slate-500 dark:text-zinc-400 font-semibold">@{u.username}</td>
							<td className="py-4 px-4">
								<ActionButtons
									onEdit={() => openModal(u)}
									onDelete={() => handleDelete(u.id)}
									extraButton={
										<button
											onClick={() => handleResetPassword(u.id, u.first_name || u.username)}
											className="p-1.5 text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-500/10 rounded-lg"
										>
											<Key size={16} />
										</button>
									}
								/>
							</td>
						</tr>
					))}
				</TableTemplate>

				{totalPages > 1 && (
					<div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-100 dark:border-zinc-800/60">
						<span className="text-[13px] font-bold text-slate-400 dark:text-zinc-500">
							{t('management.students.page_of', { current: currentPage, total: totalPages })}
						</span>
						<div className="flex gap-2">
							<button
								onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
								disabled={currentPage === 1}
								className="p-2 rounded-xl bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 hover:bg-slate-50 dark:hover:bg-zinc-700 dark:text-zinc-100 disabled:opacity-50 transition-all"
							>
								<ChevronLeft size={18} />
							</button>
							<button
								onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
								disabled={currentPage === totalPages}
								className="p-2 rounded-xl bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 hover:bg-slate-50 dark:hover:bg-zinc-700 dark:text-zinc-100 disabled:opacity-50 transition-all"
							>
								<ChevronRight size={18} />
							</button>
						</div>
					</div>
				)}
			</div>

			<Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
				<div className="bg-white dark:bg-zinc-900 p-6 rounded-[2rem] w-full max-w-lg shadow-2xl">
					<div className="flex justify-between items-center mb-6">
						<h3 className="text-xl font-black text-slate-800 dark:text-zinc-50">
							{editingId ? t('management.users.edit') : t('management.users.add')}
						</h3>
						<button
							type="button"
							onClick={() => setIsModalOpen(false)}
							className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-rose-500/10 rounded-xl transition-all"
						>
							<X size={20} />
						</button>
					</div>

					<form onSubmit={handleSubmit} className="space-y-4">
						<div className="space-y-2">
							<label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{t('management.users.role')}</label>
							<div className="flex flex-wrap gap-2">
								{ROLE_OPTIONS.map(opt => (
									<label
										key={opt.value}
										className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold border cursor-pointer transition-all ${
											formData.role === opt.value
												? 'bg-indigo-50 dark:bg-indigo-500/20 border-indigo-300 dark:border-indigo-500/50 text-indigo-700 dark:text-indigo-400 shadow-sm'
												: 'bg-white dark:bg-zinc-800/50 border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-800'
										}`}
									>
										<input
											type="radio"
											className="hidden"
											checked={formData.role === opt.value}
											onChange={() => setFormData({ ...formData, role: opt.value })}
										/>
										{opt.icon}
										{t(opt.labelKey)}
									</label>
								))}
							</div>
						</div>

						<div className="grid grid-cols-2 gap-4">
							<input
								placeholder={t('management.students.placeholder_firstname')}
								required
								value={formData.first_name}
								onChange={e => setFormData({ ...formData, first_name: e.target.value })}
								className="w-full bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700 dark:text-zinc-100 rounded-xl px-4 py-3 text-sm focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 dark:focus:ring-indigo-500/20 outline-none transition-all font-medium"
							/>
							<input
								placeholder={t('management.students.placeholder_lastname')}
								required
								value={formData.last_name}
								onChange={e => setFormData({ ...formData, last_name: e.target.value })}
								className="w-full bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700 dark:text-zinc-100 rounded-xl px-4 py-3 text-sm focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 dark:focus:ring-indigo-500/20 outline-none transition-all font-medium"
							/>
						</div>

						<input
							type="email"
							placeholder={t('management.users.email_placeholder')}
							value={formData.email}
							onChange={e => setFormData({ ...formData, email: e.target.value })}
							className="w-full bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700 dark:text-zinc-100 rounded-xl px-4 py-3 text-sm focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 dark:focus:ring-indigo-500/20 outline-none transition-all font-medium"
						/>

						<div className="pt-2 mt-2 border-t border-slate-100 dark:border-zinc-800/60">
							<p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
								{t('management.students.login_data')}
							</p>
							<div className="space-y-2">
								<input
									placeholder={t('management.students.table_login')}
									required
									value={formData.username}
									onChange={e => setFormData({ ...formData, username: e.target.value })}
									className="w-full bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700 dark:text-zinc-100 rounded-xl px-4 py-2 text-sm focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 dark:focus:ring-indigo-500/20 outline-none transition-all font-medium"
								/>
								<input
									type="password"
									placeholder={editingId ? t('management.students.new_password_placeholder') : t('management.students.table_password')}
									required={!editingId}
									value={formData.password}
									onChange={e => setFormData({ ...formData, password: e.target.value })}
									className="w-full bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700 dark:text-zinc-100 rounded-xl px-4 py-2 text-sm focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 dark:focus:ring-indigo-500/20 outline-none transition-all font-medium"
								/>
							</div>
							<p className="text-[10px] text-slate-400 mt-2 leading-tight">
								{t('management.students.password_hint')}
							</p>
						</div>

						<div className="flex gap-3 mt-6 pt-2">
							<button
								type="button"
								onClick={() => setIsModalOpen(false)}
								className="flex-1 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 py-3 rounded-xl font-bold transition-all"
							>
								{t('management.common.cancel')}
							</button>
							<button
								type="submit"
								className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-bold shadow-md transition-all"
							>
								{t('management.common.save')}
							</button>
						</div>
					</form>
				</div>
			</Modal>
		</>
	);
}
