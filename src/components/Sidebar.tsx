import React from 'react';
import { 
  BarChart, // This was just a placeholder check, let me use the real imports
  LayoutDashboard, 
  Ticket as TicketIcon, 
  Users, 
  TrendingUp, 
  Database, 
  LogOut 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

export function NavItem({ active, onClick, icon, label }: any) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-4 px-5 py-3.5 rounded-2xl transition-all duration-300",
        active ? "bg-blue-500 text-white shadow-lg shadow-blue-500/20" : "text-gray-500 hover:bg-gray-100 hover:text-gray-900"
      )}
    >
      {icon}
      <span className="font-bold tracking-tight">{label}</span>
    </button>
  );
}

export function Sidebar({ user, view, setView, handleLogout, siteName, isOpen, onClose }: any) {
  return (
    <>
      {/* Mobile Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[90] lg:hidden"
          />
        )}
      </AnimatePresence>

      <aside className={cn(
        "fixed inset-y-0 left-0 z-[100] w-72 bg-white border-r border-gray-100 flex flex-col shrink-0 transition-transform duration-500 lg:relative lg:translate-x-0 lg:z-0",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-8 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-blue-500 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-lg shadow-blue-500/20">{siteName?.[0] || 'S'}</div>
            <h1 className="font-black text-2xl tracking-tighter text-gray-900">{siteName || 'SupportDesk'}</h1>
          </div>
          <button onClick={onClose} className="lg:hidden p-2 text-gray-400 hover:text-gray-900">
            <LogOut size={20} className="rotate-180" />
          </button>
        </div>
        
        <nav className="flex-1 p-6 space-y-2">
          <NavItem active={view === 'dashboard'} onClick={() => { setView('dashboard'); onClose(); }} icon={<LayoutDashboard size={20}/>} label="Дашборд" />
          <NavItem active={view === 'tickets'} onClick={() => { setView('tickets'); onClose(); }} icon={<TicketIcon size={20}/>} label="Заявки" />
          {user.role === 'admin' && (
            <NavItem active={view === 'admin'} onClick={() => { setView('admin'); onClose(); }} icon={<Users size={20}/>} label="Администрирование" />
          )}
          {(user.role === 'admin' || user.role === 'support') && (
            <NavItem active={view === 'analytics'} onClick={() => { setView('analytics'); onClose(); }} icon={<TrendingUp size={20}/>} label="Аналитика" />
          )}
        </nav>

      <div className="p-6 border-t border-gray-100">
        <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-3xl border border-gray-100 mb-4">
          <div className="w-10 h-10 rounded-2xl bg-blue-500 text-white flex items-center justify-center font-black shadow-md">
            {user.name?.[0] || '?'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-black truncate text-gray-900">{user.name}</p>
            <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest">{user.role}</p>
          </div>
          <button onClick={handleLogout} className="p-2 text-gray-400 hover:text-red-500 transition-colors">
            <LogOut size={18} />
          </button>
        </div>
        <div className="flex items-center justify-between px-2">
          <p className="text-[9px] font-bold text-gray-300 uppercase tracking-tighter">&copy; LUXOID</p>
          <span className="text-[9px] font-bold text-blue-400 uppercase tracking-widest">BETA v0.2.1</span>
        </div>
      </div>
    </aside>
    </>
  );
}
