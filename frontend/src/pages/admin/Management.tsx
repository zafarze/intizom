import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { Users, Calendar, GraduationCap, BookOpen, ClipboardList, Library, Loader2, Clock } from 'lucide-react';
import api from '../../api/axios';

import StudentsTab from './management_tabs/StudentsTab';
import TeachersTab from './management_tabs/TeachersTab';
import RulesTab from './management_tabs/RulesTab';
import ClassesTab from './management_tabs/ClassesTab';
import SubjectsTab from './management_tabs/SubjectsTab';
import YearsTab from './management_tabs/YearsTab';
import TimeTableTab from './management_tabs/TimeTableTab';

export default function Management() {
	const { t } = useTranslation();

	const validTabs = ['years', 'timetable', 'subjects', 'classes', 'teachers', 'students', 'rules'];
	const [activeTab, setActiveTab] = useState(() => {
		const saved = localStorage.getItem('management_active_tab');
		return saved && validTabs.includes(saved) ? saved : 'students';
	});
	const [data, setData] = useState<any>({ students: [], rules: [], classes: [], years: [], teachers: [], subjects: [], timetable: [] });
	const [isLoading, setIsLoading] = useState(true);

	const handleTabChange = (tabId: string) => {
		setActiveTab(tabId);
		localStorage.setItem('management_active_tab', tabId);
	};

	const tabs = [
		{ id: 'years', name: t('management.tabs.years'), icon: <Calendar size={18} /> },
		{ id: 'timetable', name: t('management.tabs.timetable'), icon: <Clock size={18} /> },
		{ id: 'subjects', name: t('management.tabs.subjects'), icon: <Library size={18} /> },
		{ id: 'classes', name: t('management.tabs.classes'), icon: <BookOpen size={18} /> },
		{ id: 'teachers', name: t('management.tabs.teachers'), icon: <Users size={18} /> },
		{ id: 'students', name: t('management.tabs.students'), icon: <GraduationCap size={18} /> },
		{ id: 'rules', name: t('management.tabs.rules'), icon: <ClipboardList size={18} /> },
	];

	const fetchData = async () => {
		setIsLoading(true);
		try {
			const [s, r, c, y, tReq, sub, tt] = await Promise.all([
				api.get('students/'), api.get('rules/'), api.get('classes/'),
				api.get('years/'), api.get('teachers/'), api.get('subjects/'),
				api.get('timetable/')
			]);
			setData({
				students: s.data.results || s.data,
				rules: r.data.results || r.data,
				classes: c.data.results || c.data,
				years: y.data.results || y.data,
				teachers: tReq.data.results || tReq.data,
				subjects: sub.data.results || sub.data,
				timetable: tt.data.results || tt.data,
			});
		} catch (error) {
			console.error(t('auto.t_192_oshibka_zagruzki_dannyh'));
		} finally {
			setIsLoading(false);
		}
	};

	useEffect(() => { fetchData(); }, []);

	return (
		<div className="space-y-6 max-w-7xl mx-auto pb-8 animate-in fade-in duration-500">
			<div className="bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl border border-white dark:border-zinc-800/60 rounded-[2rem] p-2 shadow-sm flex overflow-x-auto hide-scrollbar">
				{tabs.map((tab) => (
					<button key={tab.id} onClick={() => handleTabChange(tab.id)} className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-white dark:bg-zinc-800 shadow-sm text-indigo-600 dark:text-indigo-400 border border-white/50 dark:border-zinc-700/50' : 'text-slate-500 dark:text-zinc-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-white/40 dark:hover:bg-zinc-800/40'}`}>
						{tab.icon} {tab.name}
					</button>
				))}
			</div>

			{isLoading ? (
				<div className="flex flex-col items-center justify-center py-20 text-indigo-500">
					<Loader2 className="animate-spin mb-4" size={40} />
					<p className="font-bold">{t('mgmt.t_40')}</p>
				</div>
			) : (
				<div>
					{activeTab === 'students' && <StudentsTab data={data.students} classes={data.classes} refresh={fetchData} />}
					{activeTab === 'teachers' && <TeachersTab data={data.teachers} classes={data.classes} subjects={data.subjects} refresh={fetchData} />}
					{activeTab === 'rules' && <RulesTab data={data.rules} refresh={fetchData} />}
					{activeTab === 'classes' && <ClassesTab data={data.classes} students={data.students} teachers={data.teachers} refresh={fetchData} />}
					{activeTab === 'subjects' && <SubjectsTab data={data.subjects} teachers={data.teachers} refresh={fetchData} />}
					{activeTab === 'years' && <YearsTab data={data.years} refresh={fetchData} />}
					{activeTab === 'timetable' && <TimeTableTab data={data.timetable} refresh={fetchData} />}
				</div>
			)}
		</div>
	);
}