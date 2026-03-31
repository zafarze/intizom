import { useState, useEffect } from 'react';
import { GitCompare, Users, GraduationCap, ChevronDown, Activity, Check, Plus, Minus, TrendingUp, TrendingDown, LayoutGrid, Medal, Search } from 'lucide-react';
import api from '../../api/axios';

// --- TYPES ---
interface Quarter { id: number; name: string; is_active: boolean; }
interface SClass { id: number; name: string; }
interface Student { id: number; name: string; class_name: string; }

interface CompareData {
    name: string;
    subtitle: string;
    points: number;
    bonuses: number;
    violations: number;
}

export default function Comparison() {
    const [activeTab, setActiveTab] = useState<'classes' | 'students'>('classes');
    const [quarters, setQuarters] = useState<Quarter[]>([]);
    const [classes, setClasses] = useState<SClass[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        api.get('comparison-metadata/')
            .then(res => {
                // Сортируем четверти по имени (Чоряки 1, Чоряки 2 и тд) чтобы они шли по хронологии
                const sortedQuarters = [...res.data.quarters].sort((a, b) => a.name.localeCompare(b.name));
                setQuarters(sortedQuarters);
                setClasses(res.data.classes);
                setStudents(res.data.students);
                setIsLoading(false);
            })
            .catch(err => {
                console.error("Error loading metadata", err);
                setIsLoading(false);
            });
    }, []);

    if (isLoading) {
        return (
            <div className="h-[60vh] flex flex-col items-center justify-center text-indigo-500 animate-pulse">
                <GitCompare size={48} className="mb-4 animate-spin-slow" />
                <p className="font-bold">Загрузка данных для сравнения...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-8 animate-in fade-in duration-500">
            {/* ШАПКА РАЗДЕЛА СРАВНЕНИЙ */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/60 p-5 rounded-[2rem] border border-white/60 shadow-sm backdrop-blur-md">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-2xl shadow-md">
                        <GitCompare size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-slate-800 tracking-tight">Муқоиса (Сравнение)</h1>
                        <p className="text-sm text-slate-500 font-medium mt-0.5">
                            Сравнение успеваемости классов и прогресса учеников
                        </p>
                    </div>
                </div>
            </div>

            {/* КОНТЕНТ ВКЛАДОК */}
            <div className="animate-in slide-in-from-bottom-4 duration-500">
                {activeTab === 'classes' ? (
                     <ClassesComparison classes={classes} quarters={quarters} activeTab={activeTab} setActiveTab={setActiveTab} />
                ) : (
                     <StudentsComparison classes={classes} students={students} quarters={quarters} activeTab={activeTab} setActiveTab={setActiveTab} />
                )}
            </div>
        </div>
    );
}

// ==========================================
// 1. КОМПОНЕНТ СРАВНЕНИЯ КЛАССОВ
// ==========================================
function ClassesComparison({ classes, quarters, activeTab, setActiveTab }: { classes: SClass[], quarters: Quarter[], activeTab: string, setActiveTab: any }) {
    const activeQuarterId = quarters.find(q => q.is_active)?.id || quarters[quarters.length - 1]?.id;
    const [selectedQuarter, setSelectedQuarter] = useState<number>(activeQuarterId);
    
    // Default select up to 3 classes
    const [selectedClasses, setSelectedClasses] = useState<number[]>(classes.slice(0, 3).map(c => c.id));
    const [data, setData] = useState<CompareData[]>([]);
    const [loading, setLoading] = useState(false);

    const toggleClass = (id: number) => {
        if (selectedClasses.includes(id)) {
            // Unselect
            if (selectedClasses.length > 1) setSelectedClasses(selectedClasses.filter(c => c !== id));
        } else {
            // Select (max 5)
            if (selectedClasses.length < 5) setSelectedClasses([...selectedClasses, id]);
        }
    };

    useEffect(() => {
        if (selectedClasses.length === 0 || !selectedQuarter) return;
        setLoading(true);
        // Запускаем параллельные запросы
        Promise.all(
            selectedClasses.map(id => api.get(`compare/?type=class&id=${id}&quarter_id=${selectedQuarter}`))
        ).then(responses => {
            setData(responses.map(res => res.data));
            setLoading(false);
        }).catch(err => {
            console.error(err);
            setLoading(false);
        });
    }, [selectedClasses, selectedQuarter]);

    // Для построения шкал: находим максимум
    const maxPoints = Math.max(100, ...data.map(d => d.points));
    const maxBonuses = Math.max(1, ...data.map(d => d.bonuses));
    const maxPenalties = Math.max(1, ...data.map(d => d.violations));

    return (
        <div className="flex flex-col xl:flex-row gap-6 items-start">
            
            {/* ЛЕВАЯ ЧАСТЬ - РЕЗУЛЬТАТЫ СРАВНЕНИЯ */}
            <div className="flex-1 w-full order-2 xl:order-1 space-y-6">
                {loading ? (
                    <div className="bg-white/40 h-64 rounded-[2rem] flex items-center justify-center border border-white">
                        <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-200 border-t-indigo-600"></div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* График баллов */}
                        <div className="bg-white/60 p-6 rounded-[2rem] border border-white/60 shadow-sm backdrop-blur-md">
                            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-6">
                                <Activity className="text-indigo-500" size={20} />
                                Рейтинг баллов
                            </h3>
                            <div className="space-y-6">
                                {data.map((d, i) => (
                                    <div key={i} className="group cursor-default">
                                        <div className="flex justify-between items-end mb-2">
                                            <div>
                                                <span className="font-bold text-slate-700">{d.name}</span>
                                                <span className="text-xs text-slate-400 ml-2">({d.subtitle})</span>
                                            </div>
                                            <div className="font-black text-xl text-indigo-600">{d.points}</div>
                                        </div>
                                        <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden shadow-inner flex">
                                            <div 
                                                className="h-full bg-gradient-to-r from-indigo-400 to-indigo-600 rounded-full transition-all duration-1000 ease-out relative group-hover:brightness-110"
                                                style={{ width: `${(d.points / maxPoints) * 100}%` }}
                                            >
                                                <div className="absolute inset-0 bg-white/20 w-full h-full skew-x-12 animate-[shimmer_2s_infinite]"></div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Сравнение плюсов и минусов */}
                        <div className="bg-white/60 p-6 rounded-[2rem] border border-white/60 shadow-sm backdrop-blur-md">
                            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-6">
                                <LayoutGrid className="text-slate-500" size={20} />
                                Поощрения и Нарушения
                            </h3>
                            <div className="space-y-8">
                                {/* Блок нарушений */}
                                <div>
                                    <h4 className="text-sm font-bold text-slate-500 mb-4 flex items-center gap-2">
                                        <Minus className="text-red-500 bg-red-100 p-1 rounded-md" size={18} /> 
                                        Отрицательные поступки
                                    </h4>
                                    <div className="space-y-3">
                                        {data.map((d, i) => (
                                            <div key={i} className="flex items-center gap-3">
                                                <div className="w-10 font-bold text-slate-600 text-right text-sm">{d.name}</div>
                                                <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden relative">
                                                    <div 
                                                        className="h-full bg-red-500 rounded-full transition-all duration-1000 ease-out"
                                                        style={{ width: `${d.violations > 0 ? (d.violations / maxPenalties) * 100 : 2}%` }}
                                                    />
                                                </div>
                                                <div className="w-8 font-bold text-red-600 text-sm">{d.violations}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Блок поощрений */}
                                <div className="pt-2">
                                    <h4 className="text-sm font-bold text-slate-500 mb-4 flex items-center gap-2">
                                        <Plus className="text-emerald-500 bg-emerald-100 p-1 rounded-md" size={18} /> 
                                        Положительные (Бонусы)
                                    </h4>
                                    <div className="space-y-3">
                                        {data.map((d, i) => (
                                            <div key={i} className="flex items-center gap-3">
                                                <div className="w-10 font-bold text-slate-600 text-right text-sm">{d.name}</div>
                                                <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden relative">
                                                    <div 
                                                        className="h-full bg-emerald-400 rounded-full transition-all duration-1000 ease-out"
                                                        style={{ width: `${d.bonuses > 0 ? (d.bonuses / maxBonuses) * 100 : 2}%` }}
                                                    />
                                                </div>
                                                <div className="w-8 font-bold text-emerald-600 text-sm">{d.bonuses}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div className="w-full xl:w-80 shrink-0 sticky top-6 order-1 xl:order-2 space-y-6">
                <div className="bg-white/60 p-6 rounded-[2rem] border border-white/60 shadow-sm backdrop-blur-md">
                    <h3 className="text-xl font-black text-slate-800 tracking-tight mb-6">Настройки</h3>
                    
                    {/* ТАБ МЕНЮ */}
                    <div className="flex bg-slate-100/80 p-1 rounded-xl shadow-inner overflow-hidden border border-white mb-8">
                        <button
                            onClick={() => setActiveTab('classes')}
                            className={`flex flex-1 items-center justify-center gap-2 py-2.5 text-xs font-bold rounded-lg transition-all duration-300
                            ${activeTab === 'classes'
                                ? 'bg-white text-indigo-600 shadow-sm scale-100'
                                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50 scale-95'}`}
                        >
                            <Users size={16} />
                            Классы
                        </button>
                        <button
                            onClick={() => setActiveTab('students')}
                            className={`flex flex-1 items-center justify-center gap-2 py-2.5 text-xs font-bold rounded-lg transition-all duration-300
                            ${activeTab === 'students'
                                ? 'bg-white text-indigo-600 shadow-sm scale-100'
                                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50 scale-95'}`}
                        >
                            <GraduationCap size={16} />
                            Ученики
                        </button>
                    </div>
                    
                    {/* Выбор Четверти */}
                    <div className="mb-8">
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">
                            Чоряк (Четверть)
                        </label>
                        <div className="relative group">
                            <select
                                value={selectedQuarter}
                                onChange={e => setSelectedQuarter(Number(e.target.value))}
                                className="w-full appearance-none bg-white/80 border-2 border-transparent hover:border-indigo-100 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 shadow-sm outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all cursor-pointer box-border"
                            >
                                {quarters.map(q => (
                                    <option key={q.id} value={q.id}>{q.name} {q.is_active ? '(Активная)' : ''}</option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-4 top-3.5 text-slate-400 group-hover:text-indigo-500 pointer-events-none transition-colors" size={18} />
                        </div>
                    </div>
                    
                    {/* Выбор классов */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center justify-between">
                            <span>Классы</span>
                            <span className="bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full text-[10px]">{selectedClasses.length}/5 max</span>
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {classes.map(c => {
                                const isSelected = selectedClasses.includes(c.id);
                                return (
                                    <button
                                        key={c.id}
                                        onClick={() => toggleClass(c.id)}
                                        className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${isSelected ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20 scale-105' : 'bg-white/50 text-slate-500 hover:bg-slate-200 hover:text-slate-700 border border-transparent'}`}
                                    >
                                        {c.name}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

        </div>
    );
}

// ==========================================
// 2. КОМПОНЕНТ СРАВНЕНИЯ УЧЕНИКОВ (TIMELINE)
// ==========================================
function StudentsComparison({ classes, students, quarters, activeTab, setActiveTab }: { classes: SClass[], students: Student[], quarters: Quarter[], activeTab: string, setActiveTab: any }) {
    const [selectedClassId, setSelectedClassId] = useState<number | ''>('');
    const [selectedStudentId, setSelectedStudentId] = useState<number | ''>('');
    const [studentSearch, setStudentSearch] = useState('');
    const [isClassDropdownOpen, setIsClassDropdownOpen] = useState(false);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    
    const [timeline, setTimeline] = useState<(CompareData & { quarter: Quarter })[]>([]);
    const [loading, setLoading] = useState(false);

    // Сбрасываем выбранного ученика и поиск, если меняется класс
    useEffect(() => {
        setSelectedStudentId('');
        setStudentSearch('');
    }, [selectedClassId]);

    useEffect(() => {
        if (!selectedStudentId) {
            setTimeline([]);
            return;
        }

        setLoading(true);
        // Запускаем запросы для данного ученика по ВСЕМ четвертям
        Promise.all(
            quarters.map(q => 
                api.get(`compare/?type=student&id=${selectedStudentId}&quarter_id=${q.id}`)
                   .then(res => ({ ...res.data, quarter: q }))
            )
        ).then(responses => {
            // responses уже отсортированы по quarters (хронологически)
            setTimeline(responses);
            setLoading(false);
        }).catch(err => {
            console.error(err);
            setLoading(false);
        });
    }, [selectedStudentId, quarters]);

    const activeStudent = students.find(s => s.id === selectedStudentId);

    return (
        <div className="flex flex-col xl:flex-row gap-6 items-start">
            
            {/* ЛЕВАЯ ЧАСТЬ - ТАЙМЛАЙН ПРОГРЕССА */}
            <div className="flex-1 w-full order-2 xl:order-1 min-h-[400px]">
                {loading ? (
                    <div className="bg-white/40 h-full rounded-[2rem] flex flex-col items-center justify-center border border-white py-20">
                        <span className="flex items-center gap-3 text-indigo-500 font-bold animate-pulse text-lg">
                            <Activity className="animate-spin-slow" /> Анализ данных...
                        </span>
                    </div>
                ) : timeline.length > 0 ? (
                    <div className="bg-white/30 p-8 rounded-[3rem] border border-white/60 shadow-sm relative overflow-hidden backdrop-blur-xl">
                        
                        {/* Водяной знак на фоне для красоты */}
                        <GraduationCap className="absolute -right-20 -bottom-20 text-white/40 rotate-12" size={300} strokeWidth={1} />

                        <div className="text-center relative z-10 mb-12">
                            <h2 className="text-3xl font-black text-slate-800 tracking-tight">{activeStudent?.name}</h2>
                            <p className="text-indigo-600 font-bold mt-2 bg-indigo-50 inline-block px-4 py-1.5 rounded-full shadow-sm">Синфи {activeStudent?.class_name}</p>
                            <p className="text-slate-500 font-medium mt-4 max-w-lg mx-auto">История успеваемости, анализ изменений баллов и активности по четвертям.</p>
                        </div>

                        <div className="relative max-w-4xl mx-auto z-10 w-full pl-4 md:pl-0">
                            {/* Линия связи таймалайна */}
                            <div className="absolute left-[36px] md:left-1/2 top-4 bottom-4 w-1.5 bg-gradient-to-b from-indigo-200 via-indigo-500 to-indigo-200 rounded-full transform md:-translate-x-1/2 shadow-[0_0_15px_rgba(99,102,241,0.5)]"></div>

                            <div className="space-y-12 relative py-8 w-full">
                                {timeline.map((data, idx) => {
                                    // Вычисляем тренд (разницу с предыдущей четвертью)
                                    const prevPoints = idx > 0 ? timeline[idx - 1].points : 100;
                                    const diff = data.points - prevPoints;
                                    const isPositive = diff >= 0;

                                    return (
                                        <div key={idx} className={`flex flex-row items-center gap-6 w-full ${idx % 2 === 0 ? 'md:flex-row-reverse' : ''}`}>
                                            
                                            {/* Карточка */}
                                            <div className="w-full md:w-1/2 flex justify-start md:px-8">
                                                <div className="w-full max-w-[360px] bg-white border-2 border-white p-6 rounded-3xl shadow-xl hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 relative group">
                                                    
                                                    {/* Декоративный блик */}
                                                    <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-3xl pointer-events-none"></div>

                                                    <div className="flex justify-between items-start mb-6">
                                                        <div>
                                                            <span className="inline-block px-3 py-1 bg-gradient-to-r from-slate-800 to-slate-700 text-white text-xs font-black rounded-lg mb-2 tracking-wider uppercase shadow-md">
                                                                {data.quarter.name}
                                                            </span>
                                                            <div className="font-bold text-slate-500 flex items-center gap-2 mt-1 text-[13px]">
                                                                {data.quarter.is_active ? <span className="flex items-center gap-1 text-green-600"><span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>Текущая</span> : <span className="text-slate-400">Архив</span>}
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <div className="text-4xl font-black bg-clip-text text-transparent bg-gradient-to-br from-indigo-600 to-purple-800">{data.points}</div>
                                                            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">баллов</div>
                                                        </div>
                                                    </div>

                                                    {/* Stats */}
                                                    <div className="flex gap-3">
                                                        <div className="flex-1 bg-red-50/80 p-3 rounded-2xl flex items-center justify-between border border-red-100 hover:bg-red-100 transition-colors">
                                                            <div className="flex items-center gap-2 font-black text-red-600 text-xs uppercase tracking-wider">
                                                                <Activity size={14} /> Нарушения
                                                            </div>
                                                            <span className="font-black text-red-700 text-lg">{data.violations}</span>
                                                        </div>
                                                        <div className="flex-1 bg-emerald-50/80 p-3 rounded-2xl flex items-center justify-between border border-emerald-100 hover:bg-emerald-100 transition-colors">
                                                            <div className="flex items-center gap-2 font-black text-emerald-600 text-xs uppercase tracking-wider">
                                                                <Medal size={14} /> Бонусы
                                                            </div>
                                                            <span className="font-black text-emerald-700 text-lg">{data.bonuses}</span>
                                                        </div>
                                                    </div>

                                                    {/* Тренд */}
                                                    {idx > 0 && (
                                                        <div className={`mt-5 flex items-center justify-center gap-2 text-sm font-black p-3 rounded-2xl ${isPositive ? 'bg-green-100/50 text-green-700' : 'bg-red-100/50 text-red-600'}`}>
                                                            {isPositive ? <TrendingUp size={18} strokeWidth={3} /> : <TrendingDown size={18} strokeWidth={3} />}
                                                            {isPositive ? '+' : ''}{diff} баллов
                                                        </div>
                                                    )}

                                                </div>
                                            </div>

                                            {/* Маркер на таймлайне */}
                                            <div className="w-[72px] h-[72px] rounded-full bg-white border-[6px] border-indigo-50 shadow-[0_0_20px_rgba(99,102,241,0.3)] flex items-center justify-center z-10 flex-shrink-0 absolute left-0 md:static transform transition-transform hover:scale-110">
                                                {data.points >= 100 ? (
                                                    <div className="text-emerald-500 bg-emerald-50 p-2.5 rounded-full"><TrendingUp size={28} strokeWidth={3} /></div>
                                                ) : data.points >= 70 ? (
                                                    <div className="text-yellow-500 bg-yellow-50 p-2.5 rounded-full"><Minus size={28} strokeWidth={3} /></div>
                                                ) : (
                                                    <div className="text-red-500 bg-red-50 p-2.5 rounded-full"><TrendingDown size={28} strokeWidth={3} /></div>
                                                )}
                                            </div>
                                            
                                            {/* Противоположная пустая сторона для баланса (в десктопе) */}
                                            <div className="hidden md:block w-1/2"></div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="bg-white/40 h-full rounded-[2rem] flex flex-col items-center justify-center border border-white py-32 text-center px-6">
                        <Users size={64} className="text-indigo-200 mb-6" />
                        <h3 className="text-2xl font-black text-slate-700 mb-2">Выберите ученика</h3>
                        <p className="text-slate-500 font-medium">Для отображения детальной аналитики воспользуйтесь фильтром справа.</p>
                    </div>
                )}
            </div>

            <div className="w-full xl:w-80 shrink-0 sticky top-6 order-1 xl:order-2 space-y-6">
                <div className="bg-white/60 p-6 rounded-[2rem] border border-white/60 shadow-sm backdrop-blur-md">
                    <h3 className="text-xl font-black text-slate-800 tracking-tight mb-6">Настройки</h3>
                    
                    {/* ТАБ МЕНЮ */}
                    <div className="flex bg-slate-100/80 p-1 rounded-xl shadow-inner overflow-hidden border border-white mb-8">
                        <button
                            onClick={() => setActiveTab('classes')}
                            className={`flex flex-1 items-center justify-center gap-2 py-2.5 text-xs font-bold rounded-lg transition-all duration-300
                            ${activeTab === 'classes'
                                ? 'bg-white text-indigo-600 shadow-sm scale-100'
                                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50 scale-95'}`}
                        >
                            <Users size={16} />
                            Классы
                        </button>
                        <button
                            onClick={() => setActiveTab('students')}
                            className={`flex flex-1 items-center justify-center gap-2 py-2.5 text-xs font-bold rounded-lg transition-all duration-300
                            ${activeTab === 'students'
                                ? 'bg-white text-indigo-600 shadow-sm scale-100'
                                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50 scale-95'}`}
                        >
                            <GraduationCap size={16} />
                            Ученики
                        </button>
                    </div>
                    
                    <div>
                        {/* Выбор Класса */}
                        <div className="mb-6">
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">
                                1. Выберите класс
                            </label>
                            <div className="relative group">
                                <button 
                                    type="button" 
                                    onClick={() => setIsClassDropdownOpen(!isClassDropdownOpen)} 
                                    onBlur={() => setTimeout(() => setIsClassDropdownOpen(false), 200)}
                                    className="w-full bg-white/80 border-2 border-transparent hover:border-indigo-100 rounded-xl px-4 py-3 text-left text-sm font-bold text-slate-700 shadow-sm outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all box-border flex justify-between items-center"
                                >
                                    <span className="truncate">{selectedClassId ? classes.find(c => c.id === selectedClassId)?.name : '-- Все классы --'}</span>
                                    <ChevronDown className={`text-slate-400 group-hover:text-indigo-500 transition-transform ${isClassDropdownOpen ? 'rotate-180' : ''}`} size={18} />
                                </button>
                                
                                {/* Dropdown Menu */}
                                {isClassDropdownOpen && (
                                    <div className="absolute z-50 w-full mt-2 bg-white/95 backdrop-blur-xl border border-white/60 shadow-xl rounded-2xl overflow-hidden max-h-60 overflow-y-auto animate-in slide-in-from-top-2 duration-200">
                                        <button 
                                            type="button" 
                                            onMouseDown={() => { setSelectedClassId(''); setIsClassDropdownOpen(false); }} 
                                            className="w-full text-left px-5 py-3 hover:bg-slate-50/80 transition-colors border-b border-slate-50 text-slate-500 text-sm font-medium"
                                        >
                                            -- Отменить выбор --
                                        </button>
                                        {classes.map(c => (
                                            <button
                                                key={c.id}
                                                type="button"
                                                onMouseDown={() => { setSelectedClassId(c.id); setIsClassDropdownOpen(false); }}
                                                className={`w-full text-left px-5 py-3 hover:bg-slate-50/80 transition-colors border-b border-slate-50 last:border-0 ${selectedClassId === c.id ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-600 font-medium text-sm'}`}
                                            >
                                                {c.name}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                        
                        {/* Поиск ученика */}
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">
                            2. Поиск ученика
                        </label>
                        {selectedClassId ? (
                            <div className="relative">
                                {/* Search Input */}
                                <div className="relative">
                                    <input 
                                        type="text"
                                        placeholder="Фамилия Имя..."
                                        value={studentSearch}
                                        onChange={e => { setStudentSearch(e.target.value); setIsDropdownOpen(true); }}
                                        onFocus={() => setIsDropdownOpen(true)}
                                        onBlur={() => setTimeout(() => setIsDropdownOpen(false), 200)}
                                        className="w-full bg-white/80 border-2 border-transparent hover:border-indigo-100 focus:border-indigo-500 rounded-xl px-4 py-3 pl-11 text-sm font-bold text-slate-700 shadow-sm outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all box-border"
                                    />
                                    <Search className="absolute left-3.5 top-3.5 text-slate-400" size={18} />
                                    {selectedStudentId && !isDropdownOpen && (
                                        <div className="absolute right-3.5 top-3.5 text-emerald-500 bg-emerald-50 p-0.5 rounded-full">
                                            <Check size={14} strokeWidth={3} />
                                        </div>
                                    )}
                                </div>
                                
                                {/* Dropdown Menu */}
                                {isDropdownOpen && (
                                    <div className="absolute z-50 w-full mt-2 bg-white/95 backdrop-blur-xl border border-white/60 shadow-xl rounded-2xl overflow-hidden max-h-64 overflow-y-auto">
                                        {(() => {
                                            const selectedClassName = classes.find(c => c.id === selectedClassId)?.name;
                                            const filtered = students.filter(s => s.class_name === selectedClassName && s.name.toLowerCase().includes(studentSearch.toLowerCase()));
                                            return filtered.length > 0 ? (
                                                filtered.map(s => (
                                                    <button
                                                        key={s.id}
                                                        type="button"
                                                        onMouseDown={() => {
                                                            setSelectedStudentId(s.id);
                                                            setStudentSearch(s.name);
                                                            setIsDropdownOpen(false);
                                                        }}
                                                        className={`w-full text-left px-5 py-3 hover:bg-slate-50/80 transition-colors border-b border-slate-50 last:border-0 ${selectedStudentId === s.id ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-600 font-medium text-sm'}`}
                                                    >
                                                        {s.name}
                                                    </button>
                                                ))
                                            ) : (
                                                <div className="px-5 py-6 text-sm text-slate-500 text-center font-medium">Ничего не найдено</div>
                                            );
                                        })()}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="w-full bg-slate-100/50 border-2 border-dashed border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-400 text-center cursor-not-allowed">
                                Сначала выберите класс
                            </div>
                        )}
                    </div>
                </div>
            </div>

        </div>
    );
}

