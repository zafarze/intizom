import { useEffect, useState, useMemo } from 'react';
import axios from '../../api/axios';
import { Users, AlertTriangle, UserCheck, ShieldAlert } from 'lucide-react';
import StatCard from '../../components/ui/StatCard';

interface Student {
	id: number;
	first_name: string;
	last_name: string;
	points: number;
}

interface ClassData {
	class_id: number;
	class_name: string;
	students: Student[];
}

export default function TeacherMyClass() {
	const [classes, setClasses] = useState<ClassData[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		fetchMyClasses();
	}, []);

	const fetchMyClasses = async () => {
		try {
			setLoading(true);
			const response = await axios.get('/teacher/my-class/');
			setClasses(response.data);
		} catch (error) {
			console.error('Failed to fetch my classes:', error);
		} finally {
			setLoading(false);
		}
	};

	const getStudentColor = (points: number) => {
		if (points >= 70) return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
		if (points >= 45) return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
		return 'bg-red-500/10 text-red-500 border-red-500/20';
	};

	const getStudentStatus = (points: number) => {
		if (points >= 70) return 'Хуб';
		if (points >= 45) return 'Сӯҳбат лозим';
		return 'Ба директор';
	};

	// Aggregated stats
	const allStudents = useMemo(() => classes.flatMap(c => c.students), [classes]);
	const greenCount = allStudents.filter(s => s.points >= 70).length;
	const yellowCount = allStudents.filter(s => s.points >= 45 && s.points < 70).length;
	const redCount = allStudents.filter(s => s.points < 45).length;

	if (loading) {
		return <div className="p-6 text-slate-400">Боркунӣ (Загрузка)...</div>;
	}

	if (classes.length === 0) {
		return (
			<div className="p-6 space-y-6">
				<h1 className="text-2xl font-bold text-slate-800">Синфи ман (Мой класс)</h1>
				<div className="bg-white/60 backdrop-blur-md rounded-3xl p-8 border border-white text-center shadow-sm">
					<p className="text-slate-500">Шумо роҳбари синф нестед (Вы не являетесь классным руководителем)</p>
				</div>
			</div>
		);
	}

	return (
		<div className="p-6 space-y-6">
			<div className="flex justify-between items-end">
				<div>
					<h1 className="text-2xl font-bold text-slate-800">Синфи ман (Мой класс)</h1>
					<p className="text-slate-500 mt-1">Идоракунии хонандагони синф</p>
				</div>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
				<StatCard
					icon={<Users size={24} className="text-indigo-500" />}
					title="Ҳамаи хонандагон"
					value={allStudents.length}
					trend=""
				/>
				<StatCard
					icon={<UserCheck size={24} className="text-emerald-500" />}
					title="Хуб (Зеленые)"
					value={greenCount}
					trend=""
				/>
				<StatCard
					icon={<AlertTriangle size={24} className="text-amber-500" />}
					title="Сӯҳбат (Желтые)"
					value={yellowCount}
					trend=""
				/>
				<StatCard
					icon={<ShieldAlert size={24} className="text-red-500" />}
					title="Ба директор (Красные)"
					value={redCount}
					trend=""
				/>
			</div>

			{classes.map((cls) => (
				<div key={cls.class_id} className="bg-white/60 backdrop-blur-md rounded-3xl p-6 border border-white shadow-sm">
					<h2 className="text-xl font-bold text-slate-800 mb-4">Синфи {cls.class_name}</h2>

					<div className="overflow-x-auto">
						<table className="w-full text-left border-collapse">
							<thead>
								<tr className="border-b border-slate-200">
									<th className="pb-3 text-sm font-semibold text-slate-500">Хонанда (Ученик)</th>
									<th className="pb-3 text-sm font-semibold text-slate-500 text-center">Балл</th>
									<th className="pb-3 text-sm font-semibold text-slate-500 text-center">Ҳолат (Статус)</th>
									<th className="pb-3 text-sm font-semibold text-slate-500 text-right">Амал (Действие)</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-slate-100">
								{cls.students.map(student => (
									<tr key={student.id} className="hover:bg-slate-50/50 transition-colors">
										<td className="py-4 text-sm font-medium text-slate-700">
											{student.last_name} {student.first_name}
										</td>
										<td className="py-4 text-center">
											<span className="text-sm font-bold text-slate-700">{student.points}</span>
										</td>
										<td className="py-4 text-center">
											<span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStudentColor(student.points)}`}>
												{getStudentStatus(student.points)}
											</span>
										</td>
										<td className="py-4 text-right text-sm">
											{student.points < 45 && (
												<span className="text-red-500 font-medium">Вызвать к директору</span>
											)}
											{student.points >= 45 && student.points < 70 && (
												<span className="text-amber-500 font-medium">Провести беседу</span>
											)}
											{student.points >= 70 && (
												<span className="text-emerald-500 font-medium">Всё в порядке</span>
											)}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</div>
			))}
		</div>
	);
}
