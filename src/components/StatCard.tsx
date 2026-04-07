import React from 'react';
import { cn } from '../lib/utils';

export function StatCard({ title, value, icon, color, onClick, active }: any) {
  return (
    <div 
      onClick={onClick}
      className={cn(
        "p-6 rounded-2xl border shadow-sm flex items-center gap-4 group transition-all cursor-pointer",
        active ? "border-white/20 bg-white/5" : "bg-[#151619] border-white/5 hover:border-white/10"
      )}
    >
      <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center shadow-lg transition-transform group-hover:scale-110", color)}>
        {icon}
      </div>
      <div>
        <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-0.5">{title}</p>
        <p className="text-2xl font-bold tracking-tight">{value}</p>
      </div>
    </div>
  );
}
