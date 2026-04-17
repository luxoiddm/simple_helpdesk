import React from 'react';
import { cn } from '../lib/utils';

export function StatCard({ title, value, icon, color, onClick, active }: any) {
  return (
    <div 
      onClick={onClick}
      className={cn(
        "p-6 rounded-2xl border shadow-sm flex items-center gap-4 group transition-all cursor-pointer",
        active ? "border-blue-200 bg-blue-50/50" : "bg-white border-gray-100 hover:border-gray-200"
      )}
    >
      <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center shadow-md transition-transform group-hover:scale-110", color)}>
        {icon}
      </div>
      <div>
        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">{title}</p>
        <p className="text-2xl font-bold tracking-tight text-gray-900">{value}</p>
      </div>
    </div>
  );
}
