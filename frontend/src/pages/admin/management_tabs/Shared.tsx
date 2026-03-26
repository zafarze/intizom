import { Edit, Trash2 } from 'lucide-react';

export function TableTemplate({ headers, children }: { headers: (string | React.ReactNode)[], children: React.ReactNode }) {
	return (
		<table className="w-full text-left border-collapse">
			<thead>
				<tr className="border-b border-slate-200/60">
					{headers.map((h, i) => (
						<th key={i} className={`pb-3 text-[12px] font-bold text-slate-400 uppercase tracking-wider px-4 ${i === headers.length - 1 ? 'w-24' : ''}`}>
							{h}
						</th>
					))}
				</tr>
			</thead>
			<tbody>{children}</tbody>
		</table>
	);
}

export function ActionButtons({ onEdit, onDelete, extraButton }: { onEdit: () => void, onDelete: () => void, extraButton?: React.ReactNode }) {
	return (
		<div className="flex items-center gap-1.5">
			{extraButton}
			<button onClick={onEdit} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"><Edit size={16} /></button>
			<button onClick={onDelete} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={16} /></button>
		</div>
	);
}