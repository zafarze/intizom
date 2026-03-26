import { useState, useEffect } from 'react';
import { Users, Calendar, GraduationCap, BookOpen, ClipboardList, Library, Loader2 } from 'lucide-react';
import { Toaster } from 'react-hot-toast';
import api from '../../api/axios';

import StudentsTab from './management_tabs/StudentsTab';
import TeachersTab from './management_tabs/TeachersTab';
import RulesTab from './management_tabs/RulesTab';
import ClassesTab from './management_tabs/ClassesTab';
import SubjectsTab from './management_tabs/SubjectsTab';
import YearsTab from './management_tabs/YearsTab';

export default function Management() {
	const [activeTab, setActiveTab] = useState('Ученики');
	const [data, setData] = useState<any>({ students: [], rules: [], classes: [], years: [], teachers: [], subjects: [] });
	const [isLoading, setIsLoading] = useState(true);

	const tabs = [
		{ name: 'Учебный год', icon: <Calendar size={18} /> },
		{ name: 'Предметы', icon: <Library size={18} /> },
		{ name: 'Классы', icon: <BookOpen size={18} /> },
		{ name: 'Учителя', icon: <Users size={18} /> },
		{ name: 'Ученики', icon: <GraduationCap size={18} /> },
		{ name: 'Правила (СИН)', icon: <ClipboardList size={18} /> },
	];

	const fetchData = async () => {
		setIsLoading(true);
		try {
			const [s, r, c, y, t, sub] = await Promise.all([
				api.get('students/'), api.get('rules/'), api.get('classes/'),
				api.get('years/'), api.get('teachers/'), api.get('subjects/')
			]);
			setData({
				students: s.data.results || s.data, rules: r.data.results || r.data, classes: c.data.results || c.data,
				years: y.data.results || y.data, teachers: t.data.results || t.data, subjects: sub.data.results || sub.data
			});
		} catch (error) {
			console.error("Ошибка загрузки данных");
		} finally {
			setIsLoading(false);
		}
	};

	useEffect(() => { fetchData(); }, []);

	return (
		<div className="space-y-6 max-w-7xl mx-auto pb-8 animate-in fade-in duration-500">
			<Toaster position="top-right" toastOptions={{ style: { borderRadius: '16px', background: '#334155', color: '#fff', fontSize: '14px', fontWeight: 'bold' } }} />

			<div className="bg-white/40 backdrop-blur-md border border-white p-6 rounded-[2rem] shadow-sm">
				<h1 className="text-2xl font-black text-slate-800">Управление школой</h1>
				<p className="text-sm font-medium text-slate-500 mt-1">Все вкладки синхронизированы с Django API</p>
			</div>

			<div className="bg-white/60 backdrop-blur-xl border border-white rounded-[2rem] p-2 shadow-sm flex overflow-x-auto hide-scrollbar">
				{tabs.map((tab, idx) => (
					<button key={idx} onClick={() => setActiveTab(tab.name)} className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${activeTab === tab.name ? 'bg-white shadow-sm text-indigo-600 border border-white/50' : 'text-slate-500 hover:text-slate-700 hover:bg-white/40'}`}>
						{tab.icon} {tab.name}
					</button>
				))}
			</div>

			{isLoading ? (
				<div className="flex flex-col items-center justify-center py-20 text-indigo-500"><Loader2 className="animate-spin mb-4" size={40} /><p className="font-bold">Загрузка данных...</p></div>
			) : (
				<div>
					{activeTab === 'Ученики' && <StudentsTab data={data.students} classes={data.classes} refresh={fetchData} />}
					{activeTab === 'Учителя' && <TeachersTab data={data.teachers} classes={data.classes} subjects={data.subjects} refresh={fetchData} />}
					{activeTab === 'Правила (СИН)' && <RulesTab data={data.rules} refresh={fetchData} />}
					{activeTab === 'Классы' && <ClassesTab data={data.classes} refresh={fetchData} />}
					{activeTab === 'Предметы' && <SubjectsTab data={data.subjects} refresh={fetchData} />}
					{activeTab === 'Учебный год' && <YearsTab data={data.years} refresh={fetchData} />}
				</div>
			)}
		</div>
	);
}