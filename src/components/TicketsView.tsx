import React, { useState } from 'react';
import { Plus, Clock, ChevronRight, Search, Filter, X, CheckSquare, Square, Trash, Users, User } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn, getStatusColor, getStatusLabel, formatDateTime, getPriorityColor } from '../lib/utils';
import { TicketDetail } from './TicketDetail';

export function TicketsView({ tickets, setSelectedTicketId, selectedTicketId, messages, token, user, onSendMessage, onUpdateStatus, onUpdatePriority, onUpdateAssignment, setIsNewTicketModalOpen, isChatExpanded, setIsChatExpanded, refreshTickets }: any) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [showResolved, setShowResolved] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [supportUsers, setSupportUsers] = useState<any[]>([]);

  React.useMemo(() => {
    if (user.role !== 'client') {
      fetch('/api/admin/support-users', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(res => res.json())
      .then(data => setSupportUsers(data));
    }
  }, [token, user.role]);

  const toggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleBulkAction = async (action: string, value?: any) => {
    if (!confirm(`Применить действие "${action}" к ${selectedIds.length} заявкам?`)) return;
    
    try {
      const res = await fetch('/api/admin/tickets/bulk', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({
          ticketIds: selectedIds,
          action,
          status: action === 'update' && typeof value === 'string' ? value : undefined,
          assigned_to: action === 'update' && typeof value === 'number' ? value : undefined
        })
      });

      if (res.ok) {
        setSelectedIds([]);
        refreshTickets();
      } else {
        const data = await res.json();
        alert(data.error || 'Ошибка при массовой операции');
      }
    } catch (err) {
      console.error('Bulk action failed:', err);
    }
  };

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
    
    const matchesStatus = statusFilter === 'all' 
      ? (status !== 'ARCHIVED' && (showResolved ? true : status !== 'RESOLVED'))
      : status === statusFilter;
    const matchesPriority = priorityFilter === 'all' ? true : priority === priorityFilter;
    const matchesResolved = showResolved ? true : status !== 'RESOLVED';
    const matchesUser = user.role === 'client' ? t.client_id === user.id : true;

    return matchesSearch && matchesStatus && matchesPriority && matchesResolved && matchesUser;
  });

  return (
    <div className="flex h-full flex-col lg:flex-row overflow-hidden">
      <div className={cn(
        "flex-1 flex flex-col h-full overflow-hidden transition-all duration-500", 
        (selectedTicketId && (isChatExpanded || window.innerWidth < 1024)) ? "hidden lg:hidden" : "flex",
        selectedTicketId && !isChatExpanded && "lg:flex"
      )}>
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <header className="flex items-center justify-between gap-4 mb-6 md:mb-10">
            <div>
              <h2 className="text-2xl md:text-4xl font-black tracking-tight text-gray-900">Заявки</h2>
              <p className="text-gray-400 mt-0.5 font-bold uppercase tracking-widest text-[8px] md:text-[10px]">
                {user.role === 'client' ? 'История ваших обращений' : 'Все обращения в системе'}
              </p>
            </div>
            {(user.role === 'client' || user.role === 'admin') && (
              <button 
                onClick={() => setIsNewTicketModalOpen(true)}
                className="flex items-center justify-center gap-2 px-3 md:px-6 py-2.5 md:py-3.5 bg-blue-500 text-white rounded-xl font-bold uppercase tracking-widest shadow-lg shadow-blue-500/20 hover:bg-blue-600 transition-all shrink-0"
              >
                <Plus size={18} />
                <span className="hidden md:inline">Новая Заявка</span>
              </button>
            )}
          </header>

          {/* Filter Bar */}
          <div className="bg-white p-3 md:p-6 rounded-2xl border border-gray-100 mb-6 md:mb-8 flex flex-col md:flex-row md:items-center gap-3 md:gap-6 sticky top-0 z-10 shadow-sm">
            <div className="w-full md:flex-1 relative">
              <Search className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
              <input 
                type="text" 
                placeholder="Поиск..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 md:pl-12 pr-4 py-2 md:py-3 bg-gray-50 border border-gray-100 rounded-xl text-xs md:text-sm focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none"
              />
            </div>

            <div className="flex items-center gap-2 md:gap-4 w-full md:w-auto">
              <div className="flex-1 md:flex-none flex items-center gap-1.5 px-2 py-1.5 md:py-0 bg-gray-50 md:bg-transparent rounded-lg md:rounded-none">
                <Filter size={12} className="text-gray-400 shrink-0" />
                <select 
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-transparent text-[8px] md:text-[10px] font-bold uppercase tracking-widest text-gray-500 focus:outline-none cursor-pointer w-full"
                >
                  <option value="all">Статусы</option>
                  <option value="NEW">Новые</option>
                  <option value="IN_PROGRESS">В работе</option>
                  <option value="CRITICAL">Критично</option>
                  <option value="RESOLVED">Решено</option>
                  <option value="ARCHIVED">Архив</option>
                </select>
              </div>

              <div className="flex-1 md:flex-none flex items-center gap-1.5 px-2 py-1.5 md:py-0 bg-gray-50 md:bg-transparent rounded-lg md:rounded-none md:border-l md:border-gray-100 md:pl-4">
                <select 
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  className="bg-transparent text-[8px] md:text-[10px] font-bold uppercase tracking-widest text-gray-500 focus:outline-none cursor-pointer w-full"
                >
                  <option value="all">Приоритеты</option>
                  <option value="low">Низкий</option>
                  <option value="medium">Средний</option>
                  <option value="high">Высокий</option>
                  <option value="critical">Критично</option>
                </select>
              </div>

              <button 
                onClick={() => setShowResolved(!showResolved)}
                className={cn(
                  "px-3 py-2 rounded-lg text-[8px] md:text-[10px] font-bold uppercase tracking-widest border transition-all flex-1 md:flex-none",
                  showResolved ? "bg-emerald-500 border-emerald-500 text-white shadow-md" : "bg-white border-gray-100 text-gray-400 hover:border-gray-200"
                )}
              >
                Решенные
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-3 md:gap-6">
            {filteredTickets.map((ticket: any) => {
              const isUpdated = new Date(ticket.updated_at).getTime() > new Date(ticket.created_at).getTime() + 1000;
              return (
                <motion.div 
                  key={ticket.id}
                  whileHover={{ y: -4 }}
                  onClick={() => setSelectedTicketId(ticket.id)}
                  className={cn(
                    "bg-white p-3 md:p-6 rounded-xl md:rounded-2xl border shadow-sm cursor-pointer group transition-all relative overflow-hidden",
                    selectedTicketId === ticket.id ? "border-blue-500 ring-1 ring-blue-500/10" : isUpdated ? "border-blue-200 bg-blue-50/20" : "border-gray-100 hover:border-gray-200",
                    selectedIds.includes(ticket.id) && "border-blue-500 ring-2 ring-blue-500/10"
                  )}
                >
                  {user.role !== 'client' && (
                    <button 
                      onClick={(e) => toggleSelect(ticket.id, e)}
                      className="absolute top-3 left-3 md:top-6 md:left-6 z-10 p-1 bg-white/80 backdrop-blur-sm rounded-lg border border-gray-100 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      {selectedIds.includes(ticket.id) ? <CheckSquare size={14} className="text-blue-500" /> : <Square size={14} className="text-gray-400" />}
                    </button>
                  )}

                  {isUpdated && (
                    <div className="absolute top-0 right-0 w-8 h-8 md:w-12 md:h-12 overflow-hidden">
                      <div className="absolute top-1 right-[-15px] md:top-2 md:right-[-20px] bg-blue-500 text-white text-[6px] md:text-[8px] font-black uppercase py-0.5 px-6 md:px-8 rotate-45 shadow-sm">
                        NEW
                      </div>
                    </div>
                  )}
                  <div className="flex items-center justify-between mb-2 md:mb-4">
                    <span className={cn("px-1.5 md:px-3 py-0.5 rounded md:rounded-md text-[7px] md:text-[9px] font-bold border tracking-wide", getStatusColor(ticket.status))}>
                      {getStatusLabel(ticket.status)}
                    </span>
                    <span className="text-[7px] md:text-[9px] font-mono font-medium text-gray-400">{ticket.id}</span>
                  </div>
                  <h3 className={cn("text-xs md:text-lg font-bold mb-1 md:mb-2 text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-1", (user.role !== 'client' && window.innerWidth >= 768) && "pl-10")}>{ticket.subject}</h3>
                  <p className={cn("text-[10px] md:text-xs text-gray-500 line-clamp-2 md:line-clamp-2 mb-3 md:mb-6 font-medium leading-tight", (user.role !== 'client' && window.innerWidth >= 768) && "pl-10")}>{ticket.description}</p>
                  
                  <div className="flex items-center justify-between pt-2 md:pt-4 border-t border-gray-50">
                    <div className="flex items-center gap-2 md:gap-4 overflow-hidden">
                      <div className="flex items-center gap-1 text-gray-300">
                        <Clock size={10} className="md:size-[14px]" />
                        <span className="text-[8px] md:text-[10px] font-bold uppercase tracking-widest whitespace-nowrap">{formatDateTime(new Date(ticket.created_at).getTime()).split(',')[0]}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={cn("text-[7px] md:text-[8px] font-bold uppercase tracking-widest whitespace-nowrap", getPriorityColor(ticket.priority))}>
                        {ticket.priority === 'low' ? 'Низкий' : ticket.priority === 'medium' ? 'Средний' : ticket.priority === 'high' ? 'Высокий' : 'Критично'}
                      </span>
                      <ChevronRight size={14} className="text-gray-300 hidden md:block group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
                    </div>
                  </div>
                </motion.div>
              );
            })}
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
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.7}
            onDragEnd={(_, info) => {
              if (info.offset.x > 100 || info.velocity.x > 500) {
                setSelectedTicketId(null);
                setIsChatExpanded(false);
              }
            }}
            className={cn(
              "bg-[#151619] border-l border-white/5 flex flex-col shadow-2xl z-20 transition-all duration-500",
              isChatExpanded ? "w-full" : "w-full lg:w-[450px] xl:w-[550px]",
              "fixed inset-0 lg:relative lg:inset-auto"
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
              onUpdateAssignment={(id: number | null) => onUpdateAssignment(selectedTicketId, id)}
              user={user}
              token={token}
              isChatExpanded={isChatExpanded}
              setIsChatExpanded={setIsChatExpanded}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedIds.length > 0 && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-6 md:bottom-10 left-4 right-4 md:left-1/2 md:-translate-x-1/2 bg-gray-900 text-white px-4 md:px-6 py-4 rounded-2xl shadow-2xl flex flex-col md:flex-row items-center gap-4 md:gap-6 z-[60] border border-white/10"
          >
            <div className="flex items-center justify-between w-full md:w-auto md:pr-6 md:border-r md:border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center font-bold">{selectedIds.length}</div>
                <span className="text-[10px] font-bold uppercase tracking-widest whitespace-nowrap">Выбрано заявок</span>
              </div>
              <button 
                onClick={() => setSelectedIds([])}
                className="md:hidden p-2 hover:bg-white/10 rounded-lg transition-all"
              >
                <X size={18} />
              </button>
            </div>
            
            <div className="flex flex-wrap items-center justify-center gap-2 w-full md:w-auto">
              <select 
                onChange={(e) => handleBulkAction('update', e.target.value)}
                className="flex-1 md:flex-none bg-gray-800 text-[10px] font-bold uppercase tracking-widest outline-none border border-white/10 rounded-lg px-3 py-2 cursor-pointer hover:bg-white/5"
              >
                <option value="">Статус...</option>
                <option value="NEW">Новая</option>
                <option value="IN_PROGRESS">В работе</option>
                <option value="RESOLVED">Решено</option>
                <option value="ARCHIVED">В архив</option>
              </select>

              <div className="flex-1 md:flex-none">
                <select 
                  onChange={(e) => handleBulkAction('update', Number(e.target.value))}
                  className="w-full bg-gray-800 text-[10px] font-bold uppercase tracking-widest outline-none border border-white/10 rounded-lg px-3 py-2 cursor-pointer hover:bg-white/5"
                >
                  <option value="">Назначить...</option>
                  {supportUsers.map((su: any) => (
                    <option key={su.id} value={su.id}>{su.full_name}</option>
                  ))}
                </select>
              </div>

              {user.role === 'admin' && (
                <button 
                  onClick={() => handleBulkAction('delete')}
                  className="p-2.5 bg-rose-500/20 text-rose-400 rounded-lg transition-all"
                  title="Удалить выбранные"
                >
                  <Trash size={18} />
                </button>
              )}
            </div>

            <button 
              onClick={() => setSelectedIds([])}
              className="hidden md:block ml-0 md:ml-6 p-2 hover:bg-white/10 rounded-lg transition-all"
              title="Отменить выделение"
            >
              <X size={18} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
