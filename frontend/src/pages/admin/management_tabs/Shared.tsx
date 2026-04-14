import { Edit, Trash2 } from 'lucide-react';
import { useEffect } from 'react';
import { createPortal } from 'react-dom';

export function TableTemplate({ headers, children }: { headers: (string | React.ReactNode)[], children: React.ReactNode }) {
	return (
		<table className="w-full text-left border-collapse">
			<thead>
				<tr className="border-b border-slate-200/60 dark:border-zinc-800/60">
					{headers.map((h, i) => (
						<th key={i} className={`pb-3 text-[12px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider px-4 ${i === headers.length - 1 ? 'w-24' : ''}`}>
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
			<button onClick={onEdit} className="p-1.5 text-slate-400 dark:text-zinc-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/20 rounded-lg transition-colors"><Edit size={16} /></button>
			<button onClick={onDelete} className="p-1.5 text-slate-400 dark:text-zinc-500 hover:text-red-600 dark:hover:text-rose-400 hover:bg-red-50 dark:hover:bg-rose-500/20 rounded-lg transition-colors"><Trash2 size={16} /></button>
		</div>
	);
}

export function Modal({ isOpen, onClose, children }: { isOpen: boolean, onClose: () => void, children: React.ReactNode }) {
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === 'Escape' && isOpen) {
				onClose();
			}
		};
		if (isOpen) {
			window.addEventListener('keydown', handleKeyDown);
			document.body.style.overflow = 'hidden';
		}
		return () => {
			window.removeEventListener('keydown', handleKeyDown);
			document.body.style.overflow = 'auto';
		};
	}, [isOpen, onClose]);

	if (!isOpen) return null;

	return createPortal(
		<div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 dark:bg-zinc-950/80 backdrop-blur-sm animate-in fade-in duration-200" onMouseDown={onClose}>
			<div className="relative animate-in zoom-in-95 duration-200" onMouseDown={e => e.stopPropagation()} style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
				{children}
			</div>
		</div>,
		document.body
	);
}