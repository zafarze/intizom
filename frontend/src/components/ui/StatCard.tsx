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
		indigo: 'bg-indigo-100 text-indigo-600',
		purple: 'bg-purple-100 text-purple-600',
		red: 'bg-red-100 text-red-600',
		orange: 'bg-orange-100 text-orange-600',
		green: 'bg-green-100 text-green-600',
	};

	return (
		<div className="bg-white/60 backdrop-blur-xl border border-white rounded-[1.5rem] p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300 group">
			<div className="flex justify-between items-start mb-4">
				<div>
					<p className="text-[13px] font-bold text-slate-500 mb-1">{title}</p>
					<h3 className="text-2xl font-black text-slate-800">{value}</h3>
				</div>
				{icon && (
					<div className={`p-3 rounded-2xl ${colorStyles[color]} group-hover:scale-110 transition-transform duration-300 shadow-sm border border-white`}>
						{icon}
					</div>
				)}
			</div>

			<div className="flex items-center gap-2 mt-4">
				{(trendUp || trendDown) && (
					<span className={`flex items-center text-[12px] font-bold px-2 py-1 rounded-lg border ${trendUp ? 'text-green-600 bg-green-50 border-green-100' : 'text-red-600 bg-red-50 border-red-100'
						}`}>
						{trendUp ? <ArrowUpRight size={14} className="mr-1" /> : <ArrowDownRight size={14} className="mr-1" />}
						{trend}
					</span>
				)}
				{(!trendUp && !trendDown && trend) && (
					<span className="text-[12px] font-medium text-slate-500 bg-slate-100/50 px-2 py-1 rounded-lg border border-slate-200/50">
						{trend}
					</span>
				)}
				<span className="text-[12px] font-medium text-slate-400 ml-auto">{subtitle}</span>
			</div>
		</div>
	);
}