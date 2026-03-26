import { useState, useEffect } from 'react';
import { Save, Settings2, Globe, Shield, AlertTriangle, Bell, Smartphone, RotateCcw, Database, Loader2 } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import api from '../../api/axios';

export default function Settings() {
	const [years, setYears] = useState<any[]>([]);
	const [selectedYear, setSelectedYear] = useState('');
	const [isLoading, setIsLoading] = useState(true);
	const [isSaving, setIsSaving] = useState(false);

	// Локальные настройки (UI)
	const [pushEnabled, setPushEnabled] = useState(true);
	const [soundEnabled, setSoundEnabled] = useState(true);
	const [strictMode, setStrictMode] = useState(false);

	useEffect(() => {
		// Загружаем учебные годы из БД
		api.get('years/').then(res => {
			const data = res.data.results || res.data;
			setYears(data);
			const active = data.find((y: any) => y.is_active);
			if (active) setSelectedYear(active.id.toString());
			setIsLoading(false);
		}).catch(() => {
			toast.error('Ошибка загрузки данных');
			setIsLoading(false);
		});
	}, []);

	// НАСТОЯЩЕЕ СОХРАНЕНИЕ
	const handleSave = async () => {
		if (!selectedYear) {
			toast.error('Выберите учебный год');
			return;
		}

		setIsSaving(true);
		try {
			// Дергаем наш новый эндпоинт в Django
			await api.post(`settings/set-year/${selectedYear}/`);
			toast.success('Учебный год успешно изменен!');
		} catch (error) {
			console.error(error);
			toast.error('Ошибка при сохранении настроек');
		} finally {
			setIsSaving(false);
		}
	};

	// НАСТОЯЩИЙ СБРОС
	const handleResetPoints = async () => {
		if (window.confirm('ВНИМАНИЕ! Это действие моментально сбросит баллы всех учеников школы до 100. Это действие нельзя отменить. Вы уверены?')) {
			try {
				// Дергаем эндпоинт опасной зоны
				const response = await api.post('settings/reset-points/');
				toast.success(response.data.detail || 'Баллы успешно сброшены до 100');
			} catch (error) {
				console.error(error);
				toast.error('Ошибка при сбросе баллов');
			}
		}
	};

	if (isLoading) {
		return (
			<div className="flex h-[80vh] items-center justify-center text-indigo-500 flex-col">
				<Loader2 className="animate-spin mb-4" size={48} />
				<p className="font-bold">Загрузка параметров...</p>
			</div>
		);
	}

	return (
		<div className="space-y-6 max-w-5xl mx-auto pb-8 animate-in slide-in-from-bottom-4 duration-500">
			<Toaster position="top-right" />

			{/* Заголовок */}
			<div className="bg-white/40 backdrop-blur-md border border-white p-6 rounded-[2rem] shadow-sm flex justify-between items-center">
				<div>
					<h1 className="text-2xl font-black text-slate-800 flex items-center gap-3">
						<Settings2 size={28} className="text-indigo-600" /> Настройки системы
					</h1>
					<p className="text-sm font-medium text-slate-500 mt-1">Глобальные параметры и безопасность СИН</p>
				</div>
				<button
					onClick={handleSave}
					disabled={isSaving}
					className="flex items-center gap-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white px-6 py-3 rounded-xl text-sm font-bold shadow-md hover:shadow-lg transition-all active:scale-95 disabled:opacity-70"
				>
					{isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
					{isSaving ? 'Сохранение...' : 'Сохранить изменения'}
				</button>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

				{/* Левая колонка */}
				<div className="space-y-6">

					{/* Базовые настройки */}
					<div className="bg-white/60 backdrop-blur-xl border border-white rounded-[2rem] p-6 shadow-sm">
						<h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2 border-b border-white pb-4">
							<Globe size={20} className="text-blue-500" /> Глобальный период
						</h2>
						<div className="space-y-4">
							<div>
								<label className="text-[12px] font-bold text-slate-500 uppercase ml-1 mb-2 block">Текущий учебный год</label>
								<select
									value={selectedYear}
									onChange={e => setSelectedYear(e.target.value)}
									className="w-full bg-white/80 border border-slate-200 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 outline-none shadow-sm transition-all"
								>
									<option value="" disabled>Выберите год...</option>
									{years.map(y => (
										<option key={y.id} value={y.id}>{y.year}</option>
									))}
								</select>
								<p className="text-[11px] text-slate-400 mt-2 ml-1 font-medium">Смена года автоматически изменит отображение статистики на дашбордах.</p>
							</div>
						</div>
					</div>

					{/* Настройки интерфейса (PWA) */}
					<div className="bg-white/60 backdrop-blur-xl border border-white rounded-[2rem] p-6 shadow-sm">
						<h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2 border-b border-white pb-4">
							<Smartphone size={20} className="text-purple-500" /> Уведомления и PWA
						</h2>

						<div className="space-y-4">
							<div className="flex items-center justify-between p-4 bg-white/50 rounded-xl border border-slate-100">
								<div className="flex gap-3 items-center">
									<div className={`p-2 rounded-lg ${pushEnabled ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-400'}`}>
										<Bell size={18} />
									</div>
									<div>
										<h4 className="font-bold text-slate-700 text-sm">Push-уведомления</h4>
										<p className="text-[11px] text-slate-500 font-medium">Получать браузерные уведомления</p>
									</div>
								</div>
								<Toggle enabled={pushEnabled} setEnabled={setPushEnabled} />
							</div>

							<div className="flex items-center justify-between p-4 bg-white/50 rounded-xl border border-slate-100">
								<div className="flex gap-3 items-center">
									<div className={`p-2 rounded-lg ${soundEnabled ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-400'}`}>
										<Database size={18} />
									</div>
									<div>
										<h4 className="font-bold text-slate-700 text-sm">Кэширование данных</h4>
										<p className="text-[11px] text-slate-500 font-medium">Работа в оффлайн-режиме (PWA)</p>
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
					<div className="bg-white/60 backdrop-blur-xl border border-white rounded-[2rem] p-6 shadow-sm">
						<h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2 border-b border-white pb-4">
							<Shield size={20} className="text-emerald-500" /> Правила дисциплины (СИН)
						</h2>

						<div className="mb-6">
							<label className="text-[12px] font-bold text-slate-500 uppercase ml-1 mb-2 block">Начальный балл ученика</label>
							<div className="flex items-center gap-3">
								<input type="number" defaultValue={100} disabled className="w-24 bg-slate-100/50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-black text-slate-400 cursor-not-allowed text-center" />
								<span className="text-sm font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-lg">Зафиксировано системой</span>
							</div>
						</div>

						<div className="flex items-center justify-between p-4 bg-orange-50/50 rounded-xl border border-orange-100">
							<div>
								<h4 className="font-bold text-orange-800 text-sm">Строгий режим</h4>
								<p className="text-[11px] text-orange-600/80 font-medium mt-0.5">Удваивает снимаемые баллы за нарушения</p>
							</div>
							<Toggle enabled={strictMode} setEnabled={setStrictMode} color="bg-orange-500" />
						</div>
					</div>

					{/* ОПАСНАЯ ЗОНА */}
					<div className="bg-red-50/80 backdrop-blur-xl border border-red-100 rounded-[2rem] p-6 shadow-sm relative overflow-hidden">
						<div className="absolute -right-6 -top-6 text-red-100/50 pointer-events-none">
							<AlertTriangle size={120} />
						</div>

						<h2 className="text-lg font-black text-red-600 mb-6 flex items-center gap-2 border-b border-red-200/50 pb-4 relative z-10">
							<AlertTriangle size={20} /> Опасная зона
						</h2>

						<div className="space-y-4 relative z-10">
							<div className="bg-white/60 p-5 rounded-2xl border border-red-100">
								<h3 className="font-bold text-slate-800 mb-1">Глобальный сброс баллов</h3>
								<p className="text-xs text-slate-500 font-medium mb-4 leading-relaxed">
									Это действие сбросит баллы абсолютно всех учеников школы до 100. Обычно используется в начале новой четверти.
								</p>
								<button
									onClick={handleResetPoints}
									className="flex items-center gap-2 bg-red-100 text-red-600 hover:bg-red-600 hover:text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all w-full justify-center group"
								>
									<RotateCcw size={16} className="group-hover:-rotate-180 transition-transform duration-500" /> Сбросить до 100
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
			className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300 focus:outline-none ${enabled ? color : 'bg-slate-200'}`}
		>
			<span
				className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-300 shadow-sm ${enabled ? 'translate-x-6' : 'translate-x-1'}`}
			/>
		</button>
	);
}