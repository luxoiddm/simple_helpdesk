import React, { useState } from 'react';
import { Plus, Search, Ticket as TicketIcon, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn, getStatusColor, getStatusLabel, getPriorityColor } from '../lib/utils';
import { StatCard } from './StatCard';
import { TicketDetail } from './TicketDetail';

export function SupportDashboard({ tickets, stats, setSelectedTicketId, selectedTicketId, messages, token, user, onSendMessage, onUpdateStatus, onUpdatePriority, setIsNewTicketModalOpen, isChatExpanded, setIsChatExpanded }: any) {
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const priorityWeight: any = {
    'critical': 4,
    'high': 3,
    'medium': 2,
    'low': 1
  };

  const filteredTickets = tickets
    .filter((t: any) => {
      const status = (t.status || '').toUpperCase();
      const subject = (t.subject || '').toLowerCase();
      const id = (t.id || '').toLowerCase();
      const clientName = (t.client_name || '').toLowerCase();

      const matchesFilter = filter === 'all' ? status !== 'RESOLVED' : status === filter;
      const matchesSearch = subject.includes(searchTerm.toLowerCase()) || 
                            id.includes(searchTerm.toLowerCase()) ||
                            clientName.includes(searchTerm.toLowerCase());

      return matchesFilter && matchesSearch;
    })
    .sort((a: any, b: any) => {
      const weightA = priorityWeight[a.priority?.toLowerCase()] || 0;
      const weightB = priorityWeight[b.priority?.toLowerCase()] || 0;
      if (weightA !== weightB) return weightB - weightA;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  return (
    <div className="flex h-full">
      <div className={cn(
        "flex-1 flex flex-col min-w-0 transition-all duration-500", 
        (selectedTicketId && (isChatExpanded || window.innerWidth < 1024)) ? "hidden lg:hidden" : "flex",
        selectedTicketId && !isChatExpanded && "lg:flex"
      )}>
        <header className="h-20 px-8 flex items-center justify-between border-b border-white/5">
          <div>
            <h2 className="text-2xl font-black tracking-tight">Панель Управления</h2>
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-0.5">Центр обработки обращений</p>
          </div>
          <div className="flex items-center gap-4">
            {user.role === 'admin' && (
              <button 
                onClick={() => setIsNewTicketModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-white text-black rounded-xl text-xs font-bold uppercase tracking-widest hover:scale-105 transition-all"
              >
                <Plus size={16} />
                Создать заявку
              </button>
            )}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" size={16} />
              <input 
                type="text" 
                placeholder="Поиск по заявкам..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-11 pr-4 py-2.5 bg-[#151619] border border-white/5 rounded-xl text-sm w-64 focus:ring-1 focus:ring-white/20 transition-all"
              />
            </div>
          </div>
        </header>

        <div className="p-8 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 shrink-0">
          <StatCard 
            title="Всего заявок" 
            value={stats.total} 
            icon={<TicketIcon size={20}/>} 
            color={filter === 'all' ? "bg-white text-black" : "bg-white/5 text-gray-400"} 
            onClick={() => setFilter('all')}
            active={filter === 'all'}
          />
          <StatCard 
            title="В работе" 
            value={stats.open} 
            icon={<Clock size={20}/>} 
            color={filter === 'IN_PROGRESS' ? "bg-blue-600 text-white" : "bg-white/5 text-gray-400"} 
            onClick={() => setFilter('IN_PROGRESS')}
            active={filter === 'IN_PROGRESS'}
          />
          <StatCard 
            title="Решено" 
            value={stats.resolved} 
            icon={<CheckCircle2 size={20}/>} 
            color={filter === 'RESOLVED' ? "bg-green-600 text-white" : "bg-white/5 text-gray-400"} 
            onClick={() => setFilter('RESOLVED')}
            active={filter === 'RESOLVED'}
          />
          <StatCard 
            title="Критично" 
            value={stats.critical} 
            icon={<AlertCircle size={20}/>} 
            color={filter === 'CRITICAL' ? "bg-red-600 text-white" : "bg-white/5 text-gray-400"} 
            onClick={() => setFilter('CRITICAL')}
            active={filter === 'CRITICAL'}
          />
        </div>

        <div className="flex-1 px-8 pb-8 overflow-hidden">
          <div className="h-full flex flex-col bg-[#151619] rounded-2xl border border-white/5 overflow-hidden">
            <div className="p-6 border-b border-white/5 flex items-center justify-between">
              <h3 className="text-lg font-bold">
                {filter === 'all' ? 'Активные Заявки' : 
                 filter === 'IN_PROGRESS' ? 'Заявки в работе' :
                 filter === 'RESOLVED' ? 'Решенные заявки' : 'Критические заявки'}
              </h3>
              <div className="flex gap-2">
                <span className="px-3 py-1 bg-white/5 rounded-lg text-[9px] font-bold uppercase tracking-widest text-gray-400 border border-white/5">Сортировка: Приоритет</span>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-[#151619] z-10">
                  <tr className="text-[9px] font-bold text-gray-500 uppercase tracking-widest border-b border-white/5">
                    <th className="px-6 py-4">ID / Тема</th>
                    <th className="px-6 py-4">Клиент</th>
                    <th className="px-6 py-4">Статус</th>
                    <th className="px-6 py-4">Приоритет</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredTickets.map((ticket: any) => (
                    <tr 
                      key={ticket.id} 
                      onClick={() => setSelectedTicketId(ticket.id)}
                      className={cn(
                        "group cursor-pointer transition-all hover:bg-white/[0.02]",
                        selectedTicketId === ticket.id && "bg-white/[0.03]"
                      )}
                    >
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-[9px] font-mono font-medium text-gray-600 mb-0.5">{ticket.id}</span>
                          <span className="text-sm font-bold group-hover:text-white transition-colors">{ticket.subject}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center text-[9px] font-bold">
                            {ticket.client_name?.[0] || '?'}
                          </div>
                          <span className="text-xs font-medium text-gray-400">{ticket.client_name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn("px-2 py-0.5 rounded-md text-[9px] font-bold border tracking-wide", getStatusColor(ticket.status))}>
                          {getStatusLabel(ticket.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn("text-[10px] font-bold uppercase tracking-widest", getPriorityColor(ticket.priority))}>
                          {ticket.priority}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {selectedTicketId && (
          <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className={cn(
              "bg-[#151619] border-l border-white/5 flex flex-col shadow-2xl z-20 transition-all duration-500",
              isChatExpanded ? "w-full" : "w-full lg:w-[450px] xl:w-[550px]"
            )}
          >
            <TicketDetail 
              ticket={tickets.find((t: any) => t.id === selectedTicketId)} 
              messages={messages}
              onClose={() => {
                setSelectedTicketId(null);
                setIsChatExpanded(false);
              }}
              onSendMessage={onSendMessage}
              onUpdateStatus={onUpdateStatus}
              onUpdatePriority={onUpdatePriority}
              user={user}
              token={token}
              isChatExpanded={isChatExpanded}
              setIsChatExpanded={setIsChatExpanded}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
