import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import React from 'react';

interface StatCardProps {
	title: string;
	value: string | number;
	subtitle?: string;
	trend?: string;
	trendUp?: boolean;
	trendDown?: boolean;
	icon?: React.ReactNode;
	color?: 'indigo' | 'purple' | 'red' | 'orange' | 'green';
}

export default function StatCard({ title, value, subtitle, trend, trendUp, trendDown, icon, color = 'indigo' }: StatCardProps) {
	// Цветовые схемы для иконок
	const colorStyles = {
		indigo: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400',
		purple: 'bg-purple-100 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400',
		red: 'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400',
		orange: 'bg-orange-100 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400',
		green: 'bg-green-100 text-green-600 dark:bg-green-500/20 dark:text-green-400',
	};

	return (
		<div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl border border-white dark:border-slate-700/60 rounded-[1.5rem] p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300 group">
			<div className="flex justify-between items-start mb-4">
				<div>
					<p className="text-[13px] font-bold text-slate-500 dark:text-slate-400 mb-1">{title}</p>
					<h3 className="text-2xl font-black text-slate-800 dark:text-slate-100">{value}</h3>
				</div>
				{icon && (
					<div className={`p-3 rounded-2xl ${colorStyles[color]} group-hover:scale-110 transition-transform duration-300 shadow-sm border border-white dark:border-white/10`}>
						{icon}
					</div>
				)}
			</div>

			<div className="flex items-center gap-2 mt-4">
				{(trendUp || trendDown) && (
					<span className={`flex items-center text-[12px] font-bold px-2 py-1 rounded-lg border ${trendUp ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-500/10 border-green-100 dark:border-green-500/20' : 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border-red-100 dark:border-red-500/20'
						}`}>
						{trendUp ? <ArrowUpRight size={14} className="mr-1" /> : <ArrowDownRight size={14} className="mr-1" />}
						{trend}
					</span>
				)}
				{(!trendUp && !trendDown && trend) && (
					<span className="text-[12px] font-medium text-slate-500 dark:text-slate-400 bg-slate-100/50 dark:bg-slate-700/50 px-2 py-1 rounded-lg border border-slate-200/50 dark:border-slate-600/50">
						{trend}
					</span>
				)}
				<span className="text-[12px] font-medium text-slate-400 dark:text-slate-500 ml-auto">{subtitle}</span>
			</div>
		</div>
	);
}