import { useState, useEffect } from 'react';
import { Save, Settings2, Globe, Shield, AlertTriangle, Bell, Smartphone, RotateCcw, Database, Loader2, ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import api from '../../api/axios';

export default function Settings() {
	const { t } = useTranslation();
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const [years, setYears] = useState<any[]>([]);
	const [selectedYear, setSelectedYear] = useState('');
	const [isLoading, setIsLoading] = useState(true);
	const [isSaving, setIsSaving] = useState(false);
	const [isYearDropdownOpen, setIsYearDropdownOpen] = useState(false);

	// Локальные настройки (UI)
	const [pushEnabled, setPushEnabled] = useState(true);
	const [soundEnabled, setSoundEnabled] = useState(true);
	const [strictMode, setStrictMode] = useState(false);

	useEffect(() => {
		// Загружаем учебные годы из БД
		api.get('years/').then(res => {
			const data = res.data.results || res.data;
			setYears(data);
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const active = data.find((y: any) => y.is_active);
			if (active) setSelectedYear(active.id.toString());
			setIsLoading(false);
		}).catch(() => {
			toast.error(t('settings.loadError'));
			setIsLoading(false);
		});
	}, [t]);

	// НАСТОЯЩЕЕ СОХРАНЕНИЕ
	const handleSave = async () => {
		if (!selectedYear) {
			toast.error(t('settings.selectYearPls'));
			return;
		}

		setIsSaving(true);
		try {
			// Дергаем наш новый эндпоинт в Django
			await api.post(`settings/set-year/${selectedYear}/`);
			toast.success(t('settings.yearChangedSuccess'));
		} catch (error) {
			console.error(error);
			toast.error(t('settings.saveError'));
		} finally {
			setIsSaving(false);
		}
	};

	// НАСТОЯЩИЙ СБРОС
	const handleResetPoints = async () => {
		if (window.confirm(t('settings.resetWarning'))) {
			try {
				// Дергаем эндпоинт опасной зоны
				const response = await api.post('settings/reset-points/');
				toast.success(response.data.detail || t('settings.resetSuccess'));
			} catch (error) {
				console.error(error);
				toast.error(t('settings.resetError'));
			}
		}
	};

	if (isLoading) {
		return (
			<div className="flex h-[80vh] items-center justify-center text-indigo-500 flex-col">
				<Loader2 className="animate-spin mb-4" size={48} />
				<p className="font-bold">{t('settings.loadingParams')}</p>
			</div>
		);
	}

	return (
		<div className="space-y-6 max-w-5xl mx-auto pb-8 animate-in slide-in-from-bottom-4 duration-500">
			{/* Заголовок */}
			<div className="bg-white/40 dark:bg-zinc-900/60 backdrop-blur-md border border-white dark:border-zinc-800/60 p-6 rounded-[2rem] shadow-sm flex justify-between items-center">
				<div>
					<h1 className="text-2xl font-black text-slate-800 dark:text-zinc-50 flex items-center gap-3">
						<Settings2 size={28} className="text-indigo-600 dark:text-indigo-400" /> {t('settings.pageTitle')}
					</h1>
					<p className="text-sm font-medium text-slate-500 dark:text-zinc-400 mt-1">{t('settings.pageSubtitle')}</p>
				</div>
				<button
					onClick={handleSave}
					disabled={isSaving}
					className="flex items-center gap-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white px-6 py-3 rounded-xl text-sm font-bold shadow-md hover:shadow-lg transition-all active:scale-95 disabled:opacity-70 dark:disabled:opacity-50"
				>
					{isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
					{isSaving ? t('settings.saving') : t('settings.saveChanges')}
				</button>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

				{/* Левая колонка */}
				<div className="space-y-6">

					{/* Базовые настройки */}
					<div className="bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl border border-white dark:border-zinc-800/60 rounded-[2rem] p-6 shadow-sm">
						<h2 className="text-lg font-bold text-slate-800 dark:text-zinc-50 mb-6 flex items-center gap-2 border-b border-white dark:border-zinc-800 pb-4">
							<Globe size={20} className="text-blue-500 dark:text-blue-400" /> {t('settings.globalPeriod')}
						</h2>
						<div className="space-y-4">
							<div>
								<label className="text-[12px] font-bold text-slate-500 dark:text-zinc-400 uppercase ml-1 mb-2 block">{t('settings.currentYear')}</label>
								<div className="relative group">
									<button
										type="button"
										onClick={() => setIsYearDropdownOpen(!isYearDropdownOpen)}
										onBlur={() => setTimeout(() => setIsYearDropdownOpen(false), 200)}
										className="w-full bg-white/80 dark:bg-zinc-900/80 border-2 border-transparent hover:border-indigo-100 dark:hover:border-indigo-500/50 rounded-xl px-4 py-3 text-left text-sm font-bold text-slate-700 dark:text-zinc-100 shadow-sm outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all box-border flex justify-between items-center"
									>
										<span className="truncate">
											{selectedYear ? years.find(y => y.id.toString() === selectedYear)?.year : t('settings.selectYearPlaceholder')}
										</span>
										<ChevronDown className={`text-slate-400 group-hover:text-indigo-500 transition-transform ${isYearDropdownOpen ? 'rotate-180' : ''}`} size={18} />
									</button>

									{/* Dropdown Menu */}
									{isYearDropdownOpen && (
										<div className="absolute z-50 w-full mt-2 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl border border-white/60 dark:border-zinc-800/60 shadow-xl rounded-2xl overflow-hidden max-h-60 overflow-y-auto animate-in slide-in-from-top-2 duration-200">
											{years.map(y => (
												<button
													key={y.id}
													type="button"
													onMouseDown={() => { setSelectedYear(y.id.toString()); setIsYearDropdownOpen(false); }}
													className={`w-full text-left px-5 py-3 hover:bg-slate-50/80 dark:hover:bg-zinc-800/80 transition-colors border-b border-slate-50 dark:border-zinc-800/80 last:border-0 ${selectedYear === y.id.toString() ? 'bg-indigo-50 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-400 font-bold' : 'text-slate-600 dark:text-zinc-300 font-medium text-sm'}`}
												>
													{y.year}
												</button>
											))}
										</div>
									)}
								</div>
								<p className="text-[11px] text-slate-400 dark:text-zinc-500 mt-2 ml-1 font-medium">{t('settings.yearChangeHint')}</p>
							</div>
						</div>
					</div>

					{/* Настройки интерфейса (PWA) */}
					<div className="bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl border border-white dark:border-zinc-800/60 rounded-[2rem] p-6 shadow-sm">
						<h2 className="text-lg font-bold text-slate-800 dark:text-zinc-50 mb-6 flex items-center gap-2 border-b border-white dark:border-zinc-800 pb-4">
							<Smartphone size={20} className="text-purple-500 dark:text-purple-400" /> {t('settings.notificationsPWA')}
						</h2>

						<div className="space-y-4">
							<div className="flex items-center justify-between p-4 bg-white/50 dark:bg-zinc-800/50 rounded-xl border border-slate-100 dark:border-zinc-700/50">
								<div className="flex gap-3 items-center">
									<div className={`p-2 rounded-lg ${pushEnabled ? 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400' : 'bg-slate-100 dark:bg-zinc-800 text-slate-400 dark:text-zinc-500'}`}>
										<Bell size={18} />
									</div>
									<div>
										<h4 className="font-bold text-slate-700 dark:text-zinc-100 text-sm">{t('settings.pushNotifications')}</h4>
										<p className="text-[11px] text-slate-500 dark:text-zinc-400 font-medium">{t('settings.receiveBrowserPush')}</p>
									</div>
								</div>
								<Toggle enabled={pushEnabled} setEnabled={setPushEnabled} />
							</div>

							<div className="flex items-center justify-between p-4 bg-white/50 dark:bg-zinc-800/50 rounded-xl border border-slate-100 dark:border-zinc-700/50">
								<div className="flex gap-3 items-center">
									<div className={`p-2 rounded-lg ${soundEnabled ? 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400' : 'bg-slate-100 dark:bg-zinc-800 text-slate-400 dark:text-zinc-500'}`}>
										<Database size={18} />
									</div>
									<div>
										<h4 className="font-bold text-slate-700 dark:text-zinc-100 text-sm">{t('settings.dataCaching')}</h4>
										<p className="text-[11px] text-slate-500 dark:text-zinc-400 font-medium">{t('settings.offlineMode')}</p>
									</div>
								</div>
								<Toggle enabled={soundEnabled} setEnabled={setSoundEnabled} />
							</div>
						</div>
					</div>
				</div>

				{/* Правая колонка */}
				<div className="space-y-6">

					{/* Правила СИН */}
					<div className="bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl border border-white dark:border-zinc-800/60 rounded-[2rem] p-6 shadow-sm">
						<h2 className="text-lg font-bold text-slate-800 dark:text-zinc-50 mb-6 flex items-center gap-2 border-b border-white dark:border-zinc-800 pb-4">
							<Shield size={20} className="text-emerald-500 dark:text-emerald-400" /> {t('settings.disciplineRules')}
						</h2>

						<div className="mb-6">
							<label className="text-[12px] font-bold text-slate-500 dark:text-zinc-400 uppercase ml-1 mb-2 block">{t('settings.initialStudentPoint')}</label>
							<div className="flex items-center gap-3">
								<input type="number" defaultValue={100} disabled className="w-24 bg-slate-100/50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700 rounded-xl px-4 py-3 text-sm font-black text-slate-400 dark:text-zinc-600 cursor-not-allowed text-center" />
								<span className="text-sm font-bold text-slate-500 dark:text-zinc-400 bg-slate-100 dark:bg-zinc-800 px-3 py-1 rounded-lg">{t('settings.systemFixed')}</span>
							</div>
						</div>

						<div className="flex items-center justify-between p-4 bg-orange-50/50 dark:bg-orange-950/20 rounded-xl border border-orange-100 dark:border-orange-900/30">
							<div>
								<h4 className="font-bold text-orange-800 dark:text-orange-400 text-sm">{t('settings.strictMode')}</h4>
								<p className="text-[11px] text-orange-600/80 dark:text-orange-500/80 font-medium mt-0.5">{t('settings.doublesDeductedPoints')}</p>
							</div>
							<Toggle enabled={strictMode} setEnabled={setStrictMode} color="bg-orange-500" />
						</div>
					</div>

					{/* ОПАСНАЯ ЗОНА */}
					<div className="bg-red-50/80 dark:bg-rose-950/10 backdrop-blur-xl border border-red-100 dark:border-rose-900/30 rounded-[2rem] p-6 shadow-sm relative overflow-hidden">
						<div className="absolute -right-6 -top-6 text-red-100/50 dark:text-rose-900/20 pointer-events-none">
							<AlertTriangle size={120} />
						</div>

						<h2 className="text-lg font-black text-red-600 dark:text-rose-500 mb-6 flex items-center gap-2 border-b border-red-200/50 dark:border-rose-900/30 pb-4 relative z-10">
							<AlertTriangle size={20} /> {t('settings.dangerZone')}
						</h2>

						<div className="space-y-4 relative z-10">
							<div className="bg-white/60 dark:bg-zinc-900/80 p-5 rounded-2xl border border-red-100 dark:border-rose-900/30">
								<h3 className="font-bold text-slate-800 dark:text-zinc-100 mb-1">{t('settings.globalPointReset')}</h3>
								<p className="text-xs text-slate-500 dark:text-zinc-400 font-medium mb-4 leading-relaxed">
									{t('settings.globalResetHint')}
								</p>
								<button
									onClick={handleResetPoints}
									className="flex items-center gap-2 bg-red-100 dark:bg-rose-950/30 text-red-600 dark:text-rose-500 hover:bg-red-600 dark:hover:bg-rose-600 hover:text-white dark:hover:text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all w-full justify-center group"
								>
									<RotateCcw size={16} className="group-hover:-rotate-180 transition-transform duration-500" /> {t('settings.resetTo100')}
								</button>
							</div>
						</div>
					</div>

				</div>
			</div>
		</div>
	);
}

// Утилита: Красивый переключатель (Toggle Switch)
function Toggle({ enabled, setEnabled, color = 'bg-indigo-500' }: { enabled: boolean, setEnabled: (val: boolean) => void, color?: string }) {
	return (
		<button
			onClick={() => setEnabled(!enabled)}
			className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300 focus:outline-none ${enabled ? color : 'bg-slate-200 dark:bg-zinc-700'}`}
		>
			<span
				className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-300 shadow-sm ${enabled ? 'translate-x-6' : 'translate-x-1'}`}
			/>
		</button>
	);
}