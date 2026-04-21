import React, { useState, useMemo } from 'react';
import { Plus, Search, Ticket as TicketIcon, Clock, CheckCircle2, AlertCircle, X, CheckSquare, Square, User, Trash, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn, getStatusColor, getStatusLabel, getPriorityColor, formatDateTime } from '../lib/utils';
import { StatCard } from './StatCard';
import { TicketDetail } from './TicketDetail';

export function SupportDashboard({ tickets, stats, setSelectedTicketId, selectedTicketId, messages, token, user, onSendMessage, onUpdateStatus, onUpdatePriority, onUpdateAssignment, setIsNewTicketModalOpen, isChatExpanded, setIsChatExpanded, refreshTickets }: any) {
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkMenuOpen, setIsBulkMenuOpen] = useState(false);
  const [supportUsers, setSupportUsers] = useState<any[]>([]);

  useMemo(() => {
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

  const priorityWeight: any = {
    'critical': 4,
    'high': 3,
    'medium': 2,
    'low': 1
  };

  const derivedStats = useMemo(() => {
    const total = tickets.filter((t: any) => {
      const status = (t.status || '').toUpperCase();
      return status !== 'RESOLVED' && status !== 'ARCHIVED';
    }).length;
    const open = tickets.filter((t: any) => (t.status || '').toUpperCase() === 'IN_PROGRESS').length;
    const resolved = tickets.filter((t: any) => (t.status || '').toUpperCase() === 'RESOLVED').length;
    const critical = tickets.filter((t: any) => (t.status || '').toUpperCase() === 'CRITICAL').length;
    const archived = tickets.filter((t: any) => (t.status || '').toUpperCase() === 'ARCHIVED').length;
    const isNew = tickets.filter((t: any) => (t.status || '').toUpperCase() === 'NEW').length;
    
    return { total, open, resolved, critical, isNew, archived };
  }, [tickets]);

  const filteredTickets = tickets
    .filter((t: any) => {
      const status = (t.status || '').toUpperCase();
      const subject = (t.subject || '').toLowerCase();
      const id = (t.id || '').toLowerCase();
      const clientName = (t.client_name || '').toLowerCase();

      let matchesFilter = false;
      if (filter === 'all') {
        matchesFilter = status !== 'RESOLVED' && status !== 'ARCHIVED';
      } else if (filter === 'NEW') {
        matchesFilter = status === 'NEW';
      } else {
        matchesFilter = status === filter;
      }

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
    <div className="flex h-full flex-col lg:flex-row overflow-hidden">
      <div className={cn(
        "flex-1 flex flex-col min-w-0 transition-all duration-500 overflow-hidden", 
        (selectedTicketId && (isChatExpanded || window.innerWidth < 1024)) ? "hidden lg:hidden" : "flex",
        selectedTicketId && !isChatExpanded && "lg:flex"
      )}>
        <header className="p-4 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0 border-b border-gray-100 bg-white/50 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center justify-between md:block">
            <div>
              <h2 className="text-xl md:text-2xl font-black tracking-tight text-gray-900">Панель Управления</h2>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">Центр обработки обращений</p>
            </div>
            {user.role === 'admin' && (
              <button 
                onClick={() => setIsNewTicketModalOpen(true)}
                className="md:hidden w-10 h-10 flex items-center justify-center bg-blue-500 text-white rounded-xl shadow-lg shadow-blue-500/20 hover:bg-blue-600 transition-all shrink-0"
              >
                <Plus size={20} />
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            {user.role === 'admin' && (
              <button 
                onClick={() => setIsNewTicketModalOpen(true)}
                className="hidden md:flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-500 text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-blue-600 transition-all shadow-lg shadow-blue-500/20"
              >
                <Plus size={16} />
                Создать заявку
              </button>
            )}
            <div className="relative flex-1 md:flex-initial">
              <Search className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
              <input 
                type="text" 
                placeholder="Поиск..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full md:w-64 pl-9 md:pl-11 pr-4 py-2 md:py-2.5 bg-white border border-gray-100 rounded-xl text-xs md:text-sm focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none"
              />
            </div>
          </div>
        </header>

        {/* Ultra-compact Filter Bar */}
        <div className="px-4 md:px-8 pt-2 md:pt-4 pb-2 shrink-0 overflow-x-auto no-scrollbar">
          <div className="inline-flex items-center gap-1 p-0.5 md:p-1 bg-white/60 backdrop-blur-xl rounded-xl md:rounded-2xl border border-white/80 shadow-sm min-w-max">
            {[
              { id: 'all', title: 'Все', count: derivedStats.total, icon: <TicketIcon size={14}/>, color: 'bg-gray-900' },
              { id: 'NEW', title: 'Новые', count: derivedStats.isNew, icon: <Plus size={14}/>, color: 'bg-blue-500' },
              { id: 'IN_PROGRESS', title: 'В работе', count: derivedStats.open, icon: <Clock size={14}/>, color: 'bg-indigo-500' },
              { id: 'RESOLVED', title: 'Решено', count: derivedStats.resolved, icon: <CheckCircle2 size={14}/>, color: 'bg-emerald-500' },
              { id: 'CRITICAL', title: 'Критично', count: derivedStats.critical, icon: <AlertCircle size={14}/>, color: 'bg-rose-500' },
              { id: 'ARCHIVED', title: 'Архив', count: derivedStats.archived, icon: <X size={14}/>, color: 'bg-slate-500' },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setFilter(item.id)}
                className={cn(
                  "relative flex items-center gap-2 px-3 md:px-4 py-1.5 rounded-xl transition-all duration-300 group shrink-0",
                  filter === item.id ? "text-white" : "text-gray-500 hover:text-gray-900 hover:bg-white/50"
                )}
              >
                {/* Active Highlight */}
                {filter === item.id && (
                  <motion.div
                    layoutId="compactFilter"
                    className={cn("absolute inset-0 z-0", item.color)}
                    transition={{ type: "spring", bounce: 0.15, duration: 0.5 }}
                  />
                )}

                {/* Content */}
                <div className="relative z-10 flex items-center gap-2 pointer-events-none">
                  {item.icon}
                  <span className="text-[10px] font-bold uppercase tracking-wider hidden sm:inline">{item.title}</span>
                  <span className={cn(
                    "min-w-[1.25rem] h-5 px-1 rounded-md flex items-center justify-center text-[10px] font-black tabular-nums transition-colors",
                    filter === item.id ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500 group-hover:bg-gray-200"
                  )}>
                    {item.count}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 px-4 md:px-8 pb-4 md:pb-8 overflow-hidden">
          <div className="h-full flex flex-col bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm">
            <div className="p-4 md:p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <h3 className="text-base md:text-lg font-bold text-gray-900 truncate mr-4">
                {filter === 'all' ? 'Активные Заявки' : 
                 filter === 'NEW' ? 'Новые заявки' :
                 filter === 'IN_PROGRESS' ? 'Заявки в работе' :
                 filter === 'RESOLVED' ? 'Решенные заявки' : 
                 filter === 'ARCHIVED' ? 'Архив заявок' : 'Критические заявки'}
              </h3>
              <div className="flex gap-2 shrink-0">
                <span className="hidden sm:inline px-3 py-1 bg-white border border-gray-100 rounded-lg text-[9px] font-bold uppercase tracking-widest text-gray-400">Сортировка: Приоритет</span>
              </div>
            </div>
            <div className="flex-1 overflow-auto">
              {/* Desktop Table View */}
              <table className="hidden md:table w-full text-left border-collapse">
                <thead className="sticky top-0 bg-white z-10 shadow-sm shadow-black/5">
                  <tr className="text-[9px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100">
                    <th className="px-6 py-4 w-10">
                      <button 
                        onClick={() => setSelectedIds(selectedIds.length === filteredTickets.length ? [] : filteredTickets.map((t: any) => t.id))}
                        className="p-1 hover:bg-gray-100 rounded transition-colors"
                      >
                        {selectedIds.length === filteredTickets.length && filteredTickets.length > 0 ? <CheckSquare size={14} className="text-blue-500" /> : <Square size={14} />}
                      </button>
                    </th>
                    <th className="px-6 py-4 text-center w-12"><Users size={14} /></th>
                    <th className="px-6 py-4">ID / Тема</th>
                    <th className="px-6 py-4">Клиент</th>
                    <th className="px-6 py-4">Статус</th>
                    <th className="px-6 py-4">Приоритет</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredTickets.map((ticket: any) => {
                    const isUpdated = new Date(ticket.updated_at).getTime() > new Date(ticket.created_at).getTime() + 1000;
                    return (
                      <tr 
                        key={ticket.id} 
                        onClick={() => setSelectedTicketId(ticket.id)}
                        className={cn(
                          "group cursor-pointer transition-all hover:bg-gray-50",
                          selectedTicketId === ticket.id ? "bg-blue-50/50" : isUpdated ? "bg-yellow-50/30" : "",
                          selectedIds.includes(ticket.id) && "bg-blue-50/30"
                        )}
                      >
                        <td className="px-6 py-4" onClick={(e) => toggleSelect(ticket.id, e)}>
                          <div className={cn("p-1 transition-colors", selectedIds.includes(ticket.id) ? "text-blue-500" : "text-gray-300")}>
                            {selectedIds.includes(ticket.id) ? <CheckSquare size={14} /> : <Square size={14} />}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          {ticket.assigned_to ? (
                            <div className="w-6 h-6 rounded-full bg-indigo-50 text-indigo-500 flex items-center justify-center text-[8px] font-bold mx-auto border border-indigo-100" title={`Ответственный: ${ticket.assigned_name}`}>
                              {ticket.assigned_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                            </div>
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-gray-50 text-gray-300 flex items-center justify-center mx-auto border border-gray-100 border-dashed">
                              <User size={10} />
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col relative">
                            {isUpdated && <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-1 h-8 bg-blue-500 rounded-full" />}
                            <span className="text-[9px] font-mono font-medium text-gray-400 mb-0.5">{ticket.id} · {formatDateTime(new Date(ticket.updated_at).getTime())}</span>
                            <span className="text-sm font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{ticket.subject}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center text-[9px] font-bold text-gray-600">
                              {ticket.client_name?.[0] || '?'}
                            </div>
                            <span className="text-xs font-medium text-gray-500">{ticket.client_name}</span>
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
                    );
                  })}
                </tbody>
              </table>

              {/* Mobile Card View */}
              <div className="md:hidden divide-y divide-gray-50">
                {filteredTickets.map((ticket: any) => (
                  <div 
                    key={ticket.id}
                    onClick={() => setSelectedTicketId(ticket.id)}
                    className={cn(
                      "p-4 flex items-start gap-4 transition-all active:bg-gray-50",
                      selectedTicketId === ticket.id ? "bg-blue-50/50" : ""
                    )}
                  >
                    <div 
                      onClick={(e) => toggleSelect(ticket.id, e)}
                      className={cn("mt-1 shrink-0 transition-colors", selectedIds.includes(ticket.id) ? "text-blue-500" : "text-gray-300")}
                    >
                      {selectedIds.includes(ticket.id) ? <CheckSquare size={16} /> : <Square size={16} />}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[9px] font-mono font-bold text-gray-400">{ticket.id}</span>
                        <div className="flex items-center gap-2">
                          <span className={cn("px-1.5 py-0.5 rounded text-[8px] font-bold border uppercase tracking-wider", getStatusColor(ticket.status))}>
                            {getStatusLabel(ticket.status)}
                          </span>
                          <span className={cn("text-[8px] font-bold uppercase tracking-tight", getPriorityColor(ticket.priority))}>
                            {ticket.priority}
                          </span>
                        </div>
                      </div>
                      <h4 className="text-xs font-bold text-gray-900 truncate mb-1">{ticket.subject}</h4>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded bg-gray-100 flex items-center justify-center text-[8px] font-bold text-gray-500">
                            {ticket.client_name?.[0] || '?'}
                          </div>
                          <span className="text-[10px] text-gray-400 truncate max-w-[100px]">{ticket.client_name}</span>
                        </div>
                        <span className="text-[9px] text-gray-300 font-medium">{formatDateTime(new Date(ticket.updated_at).getTime())}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
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
              "bg-white border-l border-gray-100 flex flex-col shadow-2xl z-20 transition-all duration-500",
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
