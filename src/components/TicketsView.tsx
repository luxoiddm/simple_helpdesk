import React, { useState } from 'react';
import { Plus, Clock, ChevronRight, Search, Filter, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn, getStatusColor, getStatusLabel, formatDateTime, getPriorityColor } from '../lib/utils';
import { TicketDetail } from './TicketDetail';

export function TicketsView({ tickets, setSelectedTicketId, selectedTicketId, messages, token, user, onSendMessage, onUpdateStatus, onUpdatePriority, setIsNewTicketModalOpen, isChatExpanded, setIsChatExpanded }: any) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [showResolved, setShowResolved] = useState(false);

  const filteredTickets = tickets.filter((t: any) => {
    const status = (t.status || '').toUpperCase();
    const priority = (t.priority || '').toLowerCase();
    const subject = (t.subject || '').toLowerCase();
    const description = (t.description || '').toLowerCase();
    const id = (t.id || '').toLowerCase();
    const clientName = (t.client_name || '').toLowerCase();

    const matchesSearch = subject.includes(searchTerm.toLowerCase()) || 
                          description.includes(searchTerm.toLowerCase()) || 
                          id.includes(searchTerm.toLowerCase()) ||
                          clientName.includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' ? true : status === statusFilter;
    const matchesPriority = priorityFilter === 'all' ? true : priority === priorityFilter;
    const matchesResolved = showResolved ? true : status !== 'RESOLVED';
    const matchesUser = user.role === 'client' ? t.client_id === user.id : true;

    return matchesSearch && matchesStatus && matchesPriority && matchesResolved && matchesUser;
  });

  return (
    <div className="flex h-full">
      <div className={cn(
        "flex-1 flex flex-col h-full overflow-hidden transition-all duration-500", 
        (selectedTicketId && (isChatExpanded || window.innerWidth < 1024)) ? "hidden lg:hidden" : "flex",
        selectedTicketId && !isChatExpanded && "lg:flex"
      )}>
        <div className="flex-1 overflow-y-auto p-8">
          <header className="flex items-center justify-between mb-10">
          <div>
            <h2 className="text-4xl font-black tracking-tight">Заявки</h2>
            <p className="text-gray-500 mt-1 font-bold uppercase tracking-widest text-[10px]">
              {user.role === 'client' ? 'История ваших обращений' : 'Все обращения в системе'}
            </p>
          </div>
          {(user.role === 'client' || user.role === 'admin') && (
            <button 
              onClick={() => setIsNewTicketModalOpen(true)}
              className="flex items-center gap-2.5 px-6 py-3.5 bg-white text-black rounded-xl font-bold uppercase tracking-widest shadow-xl hover:scale-105 transition-all"
            >
              <Plus size={20} />
              Новая Заявка
            </button>
          )}
        </header>

        {/* Filter Bar */}
        <div className="bg-[#151619] p-6 rounded-2xl border border-white/5 mb-8 flex flex-wrap items-center gap-6 sticky top-0 z-10 shadow-lg">
          <div className="flex-1 min-w-[200px] relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" size={18} />
            <input 
              type="text" 
              placeholder="Поиск по теме, ID или клиенту..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-[#1C1D21] border border-white/5 rounded-xl text-sm focus:ring-1 focus:ring-white/20 transition-all"
            />
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter size={14} className="text-gray-500" />
              <select 
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-transparent text-[10px] font-bold uppercase tracking-widest text-gray-400 focus:outline-none cursor-pointer"
              >
                <option value="all">Все статусы</option>
                <option value="NEW">Новые</option>
                <option value="IN_PROGRESS">В работе</option>
                <option value="CRITICAL">Критично</option>
                <option value="RESOLVED">Решено</option>
              </select>
            </div>

            <div className="flex items-center gap-2 border-l border-white/5 pl-4">
              <select 
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="bg-transparent text-[10px] font-bold uppercase tracking-widest text-gray-400 focus:outline-none cursor-pointer"
              >
                <option value="all">Все приоритеты</option>
                <option value="low">Низкий</option>
                <option value="medium">Средний</option>
                <option value="high">Высокий</option>
                <option value="critical">Критично</option>
              </select>
            </div>

            <button 
              onClick={() => setShowResolved(!showResolved)}
              className={cn(
                "px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest border transition-all",
                showResolved ? "bg-white/10 border-white/20 text-white" : "border-white/5 text-gray-500 hover:border-white/10"
              )}
            >
              Архив
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredTickets.map((ticket: any) => (
            <motion.div 
              key={ticket.id}
              whileHover={{ y: -4 }}
              onClick={() => setSelectedTicketId(ticket.id)}
              className="bg-[#151619] p-6 rounded-2xl border border-white/5 shadow-sm cursor-pointer group hover:border-white/10 transition-all"
            >
              <div className="flex items-center justify-between mb-4">
                <span className={cn("px-3 py-0.5 rounded-md text-[9px] font-bold border tracking-wide", getStatusColor(ticket.status))}>
                  {getStatusLabel(ticket.status)}
                </span>
                <span className="text-[9px] font-mono font-medium text-gray-700">{ticket.id}</span>
              </div>
              <h3 className="text-lg font-bold mb-2 group-hover:text-white transition-colors">{ticket.subject}</h3>
              <p className="text-xs text-gray-500 line-clamp-2 mb-6 font-medium">{ticket.description}</p>
              
              <div className="flex items-center justify-between pt-4 border-t border-white/5">
                <div className="flex items-center gap-2 text-gray-600">
                  <Clock size={14} />
                  <span className="text-[10px] font-bold uppercase tracking-widest">{formatDateTime(new Date(ticket.created_at).getTime())}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn("text-[8px] font-bold uppercase tracking-widest", getPriorityColor(ticket.priority))}>
                    {ticket.priority === 'low' ? 'Низкий' : ticket.priority === 'medium' ? 'Средний' : ticket.priority === 'high' ? 'Высокий' : 'Критично'}
                  </span>
                  <ChevronRight size={18} className="text-gray-700 group-hover:text-white group-hover:translate-x-1 transition-all" />
                </div>
              </div>
            </motion.div>
          ))}
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
