import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Sparkles, AlertCircle } from 'lucide-react';
import api from '../../api/axios';
import logoUrl from '../../assets/logo.png';

export default function LoginPage() {
  const { t } = useTranslation();

	const [username, setUsername] = useState('');
	const [password, setPassword] = useState('');
	const [showPassword, setShowPassword] = useState(false);
	const [error, setError] = useState('');
	const [isLoading, setIsLoading] = useState(false);

	// Состояние для галочки t('auto.t_164_zapomnit_menya')
	const [rememberMe, setRememberMe] = useState(false);

	const navigate = useNavigate();

	// При загрузке страницы проверяем, сохранял ли пользователь логин
	useEffect(() => {
		const savedUsername = localStorage.getItem('saved_username');
		if (savedUsername) {
			setUsername(savedUsername);
			setRememberMe(true);
		}
	}, []);

	const handleLogin = async (e: React.FormEvent) => {
		e.preventDefault();
		setError('');
		setIsLoading(true);

		try {
			// 1. Отправляем запрос на Django бэкенд
			const response = await api.post('login/', {
				username,
				password
			});

			// 2. Сохраняем токены в браузер
			localStorage.setItem('access_token', response.data.access);
			localStorage.setItem('refresh_token', response.data.refresh);

			// Если стоит галочка t('auto.t_164_zapomnit_menya'), сохраняем логин
			if (rememberMe) {
				localStorage.setItem('saved_username', username);
			} else {
				localStorage.removeItem('saved_username');
			}

			// 3. Читаем данные пользователя из ответа бэкенда
			const userData = response.data.user;

			if (userData) {
				// Безопасно формируем имя и инициалы
				const fName = userData.first_name || '';
				const lName = userData.last_name || '';
				const uName = userData.username || 'U';

				const firstLetter = fName ? fName[0].toUpperCase() : uName[0].toUpperCase();
				const lastLetter = lName ? lName[0].toUpperCase() : '';

				const userToSave = {
					id: userData.id,
					name: fName ? `${fName} ${lName}`.trim() : uName,
					initials: `${firstLetter}${lastLetter}`,
					role: userData.role,
					email: userData.email || ''
				};

				// Сохраняем профиль в память, чтобы шапка его видела!
				localStorage.setItem('user', JSON.stringify(userToSave));
				localStorage.setItem('user_role', userToSave.role);

				// 4. ДИНАМИЧЕСКИЙ РЕДИРЕКТ ПО РОЛЯМ
				if (userToSave.role === 'admin') {
					navigate('/admin');
				} else if (userToSave.role === 'teacher') {
					navigate('/teacher');
				} else if (userToSave.role === 'student') {
					navigate('/student');
				} else if (userToSave.role === 'secretary') {
					navigate('/secretary');
				} else {
					navigate('/dashboard');
				}
			} else {
				navigate('/admin');
			}

		} catch (err: any) {
			console.error(t('auto.t_188_oshibka_avtorizatsii'), err);

			// 👈 ИЗМЕНЕНО: Только русский язык. Таймер убран!
			if (err.response && err.response.status === 401) {
				setError(t('auto.t_65_nevernyy_login_ili_parol'));
			} else {
				setError(t('auto.t_3_oshibka_servera_proverte_rabotaet'));
			}
			// Таймер удален. Ошибка исчезнет только когда пользователь начнет печатать.

		} finally {
			setIsLoading(false);
		}
	};

	return (
		<div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden bg-slate-50 font-sans p-4">
			{/* Декоративные фоновые круги */}
			<div className="absolute top-[-10%] left-[-5%] w-[500px] h-[500px] bg-indigo-300/40 rounded-full blur-[100px] pointer-events-none"></div>
			<div className="absolute bottom-[-10%] right-[-5%] w-[400px] h-[400px] bg-purple-300/30 rounded-full blur-[100px] pointer-events-none"></div>

			<div className="relative z-10 w-full max-w-[420px] bg-white/70 backdrop-blur-3xl border border-white shadow-[0_20px_60px_rgba(0,0,0,0.08)] rounded-[2.5rem] p-8 sm:p-10">

				<div className="flex flex-col items-center mt-2 mb-8">
					<div className="w-20 h-20 mb-4 bg-white/40 p-2 rounded-3xl backdrop-blur-md border border-white shadow-sm flex items-center justify-center">
						<img src={logoUrl} alt="Logo" className="w-full h-full object-contain" />
					</div>
					<h1 className="text-3xl font-bold text-slate-800 tracking-tight">{t('auto.t_151_intizom')}</h1>
					<p className="text-sm text-slate-500 mt-2 text-center font-medium">{t('auto.t_141_sistema_upravleniya_shkoloy')}</p>
				</div>

				{/* Блок вывода ошибки */}
				{error && (
					<div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
						<AlertCircle size={18} className="text-red-500 shrink-0" />
						<p className="text-[12px] font-bold text-red-700 leading-tight">{error}</p>
					</div>
				)}

				<form onSubmit={handleLogin} className="space-y-5">
					<div className="space-y-1.5">
						<label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{t('auto.t_98_login')}</label>
						<input
							type="text"
							value={username}
							onChange={(e) => {
								setUsername(e.target.value);
								setError(''); // Скрываем ошибку, когда пользователь начал печатать заново
							}}
							placeholder="admin"
							className="w-full bg-indigo-50/50 border border-white focus:bg-white focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100/50 rounded-2xl px-4 py-3.5 text-[15px] font-medium outline-none transition-all shadow-inner"
							required
						/>
					</div>

					<div className="space-y-1.5">
						<label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{t('auto.t_195_parol')}</label>
						<div className="relative">
							<input
								type={showPassword ? 'text' : 'password'}
								value={password}
								onChange={(e) => {
									setPassword(e.target.value);
									setError(''); // Скрываем ошибку, когда пользователь начал печатать заново
								}}
								placeholder="••••••••"
								className="w-full bg-indigo-50/50 border border-white focus:bg-white focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100/50 rounded-2xl px-4 py-3.5 pr-12 text-[15px] font-medium outline-none transition-all shadow-inner"
								required
							/>
							<button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-indigo-600 transition-colors">
								{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
							</button>
						</div>
					</div>

					{/* Чекбокс t('auto.t_164_zapomnit_menya') */}
					<div className="flex items-center justify-between pt-1">
						<label className="flex items-center gap-2 cursor-pointer group">
							<div className="relative flex items-center justify-center">
								<input
									type="checkbox"
									checked={rememberMe}
									onChange={(e) => setRememberMe(e.target.checked)}
									className="peer appearance-none w-5 h-5 border-2 border-slate-300 rounded-md checked:bg-indigo-500 checked:border-indigo-500 transition-colors cursor-pointer"
								/>
								<div className="absolute text-white opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity">
									<svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
										<path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
									</svg>
								</div>
							</div>
							<span className="text-[13px] font-medium text-slate-500 group-hover:text-slate-700 transition-colors">
								Запомнить меня
							</span>
						</label>
					</div>

					<button
						type="submit"
						disabled={isLoading}
						className="group w-full mt-8 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 disabled:opacity-70 text-white font-bold text-[14px] py-4 rounded-2xl shadow-md transition-all flex items-center justify-center gap-2"
					>
						{isLoading ? 'Подождите...' : 'ВОЙТИ'}
						{!isLoading && <Sparkles size={16} className="opacity-70 group-hover:animate-pulse" />}
					</button>
				</form>
			</div>
		</div>
	);
}