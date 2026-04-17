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
    <div className="flex h-full">
      <div className={cn(
        "flex-1 flex flex-col min-w-0 transition-all duration-500", 
        (selectedTicketId && (isChatExpanded || window.innerWidth < 1024)) ? "hidden lg:hidden" : "flex",
        selectedTicketId && !isChatExpanded && "lg:flex"
      )}>
        <header className="h-20 px-8 flex items-center justify-between border-b border-gray-100 bg-white/50 backdrop-blur-md sticky top-0 z-10">
          <div>
            <h2 className="text-2xl font-black tracking-tight text-gray-900">Панель Управления</h2>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">Центр обработки обращений</p>
          </div>
          <div className="flex items-center gap-4">
            {user.role === 'admin' && (
              <button 
                onClick={() => setIsNewTicketModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-blue-600 transition-all shadow-lg shadow-blue-500/20"
              >
                <Plus size={16} />
                Создать заявку
              </button>
            )}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input 
                type="text" 
                placeholder="Поиск по заявкам..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-11 pr-4 py-2.5 bg-white border border-gray-100 rounded-xl text-sm w-64 focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none"
              />
            </div>
          </div>
        </header>

        <div className="p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6 shrink-0">
          <StatCard 
            title="Всего заявок" 
            value={derivedStats.total} 
            icon={<TicketIcon size={20}/>} 
            color={filter === 'all' ? "bg-gray-900 text-white" : "bg-white text-gray-400"} 
            onClick={() => setFilter('all')}
            active={filter === 'all'}
          />
          <StatCard 
            title="Новые" 
            value={derivedStats.isNew} 
            icon={<Plus size={20}/>} 
            color={filter === 'NEW' ? "bg-blue-500 text-white" : "bg-white text-gray-400"} 
            onClick={() => setFilter('NEW')}
            active={filter === 'NEW'}
          />
          <StatCard 
            title="В работе" 
            value={derivedStats.open} 
            icon={<Clock size={20}/>} 
            color={filter === 'IN_PROGRESS' ? "bg-indigo-500 text-white" : "bg-white text-gray-400"} 
            onClick={() => setFilter('IN_PROGRESS')}
            active={filter === 'IN_PROGRESS'}
          />
          <StatCard 
            title="Решено" 
            value={derivedStats.resolved} 
            icon={<CheckCircle2 size={20}/>} 
            color={filter === 'RESOLVED' ? "bg-emerald-500 text-white" : "bg-white text-gray-400"} 
            onClick={() => setFilter('RESOLVED')}
            active={filter === 'RESOLVED'}
          />
          <StatCard 
            title="Критично" 
            value={derivedStats.critical} 
            icon={<AlertCircle size={20}/>} 
            color={filter === 'CRITICAL' ? "bg-rose-500 text-white" : "bg-white text-gray-400"} 
            onClick={() => setFilter('CRITICAL')}
            active={filter === 'CRITICAL'}
          />
          <StatCard 
            title="Архив" 
            value={derivedStats.archived} 
            icon={<X size={20}/>} 
            color={filter === 'ARCHIVED' ? "bg-slate-500 text-white" : "bg-white text-gray-400"} 
            onClick={() => setFilter('ARCHIVED')}
            active={filter === 'ARCHIVED'}
          />
        </div>

        <div className="flex-1 px-8 pb-8 overflow-hidden">
          <div className="h-full flex flex-col bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <h3 className="text-lg font-bold text-gray-900">
                {filter === 'all' ? 'Активные Заявки' : 
                 filter === 'NEW' ? 'Новые заявки' :
                 filter === 'IN_PROGRESS' ? 'Заявки в работе' :
                 filter === 'RESOLVED' ? 'Решенные заявки' : 
                 filter === 'ARCHIVED' ? 'Архив заявок' : 'Критические заявки'}
              </h3>
              <div className="flex gap-2">
                <span className="px-3 py-1 bg-white border border-gray-100 rounded-lg text-[9px] font-bold uppercase tracking-widest text-gray-400">Сортировка: Приоритет</span>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              <table className="w-full text-left border-collapse">
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
              "bg-white border-l border-gray-100 flex flex-col shadow-2xl z-20 transition-all duration-500",
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
            className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-6 z-[60] border border-white/10"
          >
            <div className="flex items-center gap-3 pr-6 border-r border-white/10">
              <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center font-bold">{selectedIds.length}</div>
              <span className="text-[10px] font-bold uppercase tracking-widest whitespace-nowrap">Выбрано заявок</span>
            </div>
            
            <div className="flex items-center gap-2">
              <select 
                onChange={(e) => handleBulkAction('update', e.target.value)}
                className="bg-transparent text-[10px] font-bold uppercase tracking-widest outline-none border border-white/10 rounded-lg px-3 py-2 cursor-pointer hover:bg-white/5"
              >
                <option className="bg-gray-900" value="">Сменить статус...</option>
                <option className="bg-gray-900" value="NEW">Новая</option>
                <option className="bg-gray-900" value="IN_PROGRESS">В работе</option>
                <option className="bg-gray-900" value="RESOLVED">Решено</option>
                <option className="bg-gray-900" value="ARCHIVED">В архив</option>
              </select>

              <div className="relative">
                <select 
                  onChange={(e) => handleBulkAction('update', Number(e.target.value))}
                  className="bg-transparent text-[10px] font-bold uppercase tracking-widest outline-none border border-white/10 rounded-lg px-3 py-2 cursor-pointer hover:bg-white/5"
                >
                  <option className="bg-gray-900" value="">Назначить...</option>
                  {supportUsers.map((su: any) => (
                    <option key={su.id} className="bg-gray-900" value={su.id}>{su.full_name}</option>
                  ))}
                </select>
              </div>

              {user.role === 'admin' && (
                <button 
                  onClick={() => handleBulkAction('delete')}
                  className="p-2 hover:bg-rose-500/20 text-rose-400 rounded-lg transition-all"
                  title="Удалить выбранные"
                >
                  <Trash size={18} />
                </button>
              )}
            </div>

            <button 
              onClick={() => setSelectedIds([])}
              className="ml-6 p-2 hover:bg-white/10 rounded-lg transition-all"
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
