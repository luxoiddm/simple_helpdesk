import React from 'react';
import { 
  LayoutDashboard, 
  Ticket as TicketIcon, 
  Users, 
  TrendingUp, 
  Database, 
  LogOut 
} from 'lucide-react';
import { cn } from '../lib/utils';

export function NavItem({ active, onClick, icon, label }: any) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-4 px-5 py-3.5 rounded-2xl transition-all duration-300",
        active ? "bg-white text-black shadow-[0_10px_30px_rgba(255,255,255,0.1)]" : "text-gray-500 hover:bg-white/5 hover:text-gray-300"
      )}
    >
      {icon}
      <span className="font-bold tracking-tight">{label}</span>
    </button>
  );
}

export function Sidebar({ user, view, setView, handleLogout, siteName }: any) {
  return (
    <aside className="w-72 bg-[#151619] border-r border-white/5 flex flex-col shrink-0">
      <div className="p-8 border-b border-white/5 flex items-center gap-4">
        <div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center text-black font-black text-xl italic">{siteName?.[0] || 'S'}</div>
        <h1 className="font-black text-2xl tracking-tighter italic">{siteName || 'SupportDesk'}</h1>
      </div>
      
      <nav className="flex-1 p-6 space-y-2">
        <NavItem active={view === 'dashboard'} onClick={() => setView('dashboard')} icon={<LayoutDashboard size={20}/>} label="Дашборд" />
        <NavItem active={view === 'tickets'} onClick={() => setView('tickets')} icon={<TicketIcon size={20}/>} label="Заявки" />
        {user.role === 'admin' && (
          <NavItem active={view === 'admin'} onClick={() => setView('admin')} icon={<Users size={20}/>} label="Администрирование" />
        )}
        {(user.role === 'admin' || user.role === 'support') && (
          <NavItem active={view === 'analytics'} onClick={() => setView('analytics')} icon={<TrendingUp size={20}/>} label="Аналитика" />
        )}
      </nav>

      <div className="p-6 border-t border-white/5">
        <div className="flex items-center gap-4 p-3 bg-white/5 rounded-3xl">
          <div className="w-10 h-10 rounded-2xl bg-white text-black flex items-center justify-center font-black">
            {user.name?.[0] || '?'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-black truncate">{user.name}</p>
            <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest">{user.role}</p>
          </div>
          <button onClick={handleLogout} className="p-2 text-gray-500 hover:text-white transition-colors">
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </aside>
  );
}
