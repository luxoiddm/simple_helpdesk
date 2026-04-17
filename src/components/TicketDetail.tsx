import React, { useState, useRef, useEffect } from 'react';
import ReactQuill from 'react-quill-new';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import rehypeRaw from 'rehype-raw';
import { 
  ArrowLeft, 
  Trash2, 
  ShieldCheck, 
  Image as ImageIcon, 
  Paperclip, 
  Send,
  X,
  ChevronLeft,
  ChevronRight,
  Pencil,
  ShieldAlert,
  User
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn, getStatusColor, getStatusLabel, formatDateTime } from '../lib/utils';

export function Lightbox({ url, onClose }: { url: string, onClose: () => void }) {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm"
      onClick={onClose}
    >
      <button 
        onClick={onClose}
        className="absolute top-6 right-6 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all"
      >
        <X size={24} />
      </button>
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="max-w-7xl max-h-[90vh] rounded-3xl overflow-hidden shadow-2xl border border-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        <img 
          src={url} 
          alt="Enlarged view" 
          className="w-full h-full object-contain"
          referrerPolicy="no-referrer"
        />
      </motion.div>
    </motion.div>
  );
}

export function TicketDetail({ ticket, messages, onClose, onSendMessage, onUpdateStatus, onUpdatePriority, onUpdateAssignment, user, token, isChatExpanded, setIsChatExpanded }: any) {
  const [inputText, setInputText] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [supportUsers, setSupportUsers] = useState<any[]>([]);
  const [isSupportMenuOpen, setIsSupportMenuOpen] = useState(false);
  
  const [editingMessageId, setEditingMessageId] = useState<number | null>(null);
  const [editingText, setEditingText] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user.role !== 'client') {
      fetch('/api/admin/support-users', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(res => res.json())
      .then(data => setSupportUsers(data))
      .catch(err => console.error('Failed to fetch support users:', err));
    }
  }, [token, user.role]);

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, ticket.id]);

  const handleDeleteTicket = async () => {
    try {
      const res = await fetch(`/api/tickets/${ticket.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        onClose();
      } else {
        const data = await res.json();
        alert(data.error || 'Ошибка при удалении заявки');
      }
    } catch (err) {
      console.error('Failed to delete ticket:', err);
      alert('Ошибка подключения к серверу');
    }
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanText = inputText.replace(/<(.|\n)*?>/g, '').trim();
    if (!cleanText && !inputText.includes('<img')) return;
    onSendMessage(inputText, isInternal);
    setInputText('');
  };

  const handleDeleteMessage = async (id: number) => {
    try {
      const res = await fetch(`/api/messages/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'Ошибка при удалении сообщения');
      }
    } catch (err) {
      console.error('Failed to delete message:', err);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingMessageId) return;
    try {
      const res = await fetch(`/api/messages/${editingMessageId}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ text: editingText })
      });
      if (res.ok) {
        setEditingMessageId(null);
        setEditingText('');
      } else {
        const data = await res.json();
        alert(data.error || 'Ошибка при сохранении сообщения');
      }
    } catch (err) {
      console.error('Failed to edit message:', err);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    setIsUploading(true);
    try {
      const res = await fetch(`/api/upload?ticketId=${ticket.id}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      const data = await res.json();
      if (data.url) {
        onSendMessage('', isInternal, data.url);
      }
    } catch (err) {
      console.error('Upload failed:', err);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <>
      <AnimatePresence>
        {selectedImage && (
          <Lightbox url={selectedImage} onClose={() => setSelectedImage(null)} />
        )}
      </AnimatePresence>
      <header className={cn(
        "border-b border-gray-100 flex flex-col px-6 shrink-0 py-4 gap-4 bg-white/80 backdrop-blur-md sticky top-0 z-10",
        isChatExpanded ? "min-h-[5rem] h-auto flex-row items-center justify-between" : "h-auto"
      )}>
        <div className={cn("flex items-center gap-4", !isChatExpanded && "w-full justify-between")}>
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-all text-gray-600" title="Закрыть">
              <X size={20} />
            </button>
            <button 
              onClick={() => setIsChatExpanded(!isChatExpanded)} 
              className="hidden lg:flex p-2 hover:bg-gray-100 rounded-xl transition-all text-gray-400 hover:text-gray-600"
              title={isChatExpanded ? "Свернуть" : "Развернуть"}
            >
              {isChatExpanded ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
            </button>
          </div>
          
          {!isChatExpanded && (
            <div className="flex items-center gap-2 overflow-hidden">
              <span className="text-[9px] font-mono font-medium text-gray-400 shrink-0">{ticket.id}</span>
              <span className={cn("px-2 py-0.5 rounded-md text-[8px] font-bold border tracking-wide shrink-0", getStatusColor(ticket.status))}>
                {getStatusLabel(ticket.status)}
              </span>
              {user.role === 'admin' && (
                <button 
                  onClick={handleDeleteTicket}
                  className="p-2 text-gray-400 hover:text-rose-500 transition-colors ml-1 shrink-0"
                  title="Удалить заявку"
                >
                  <Trash2 size={18} />
                </button>
              )}
            </div>
          )}

          {isChatExpanded && (
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="text-[9px] font-mono font-medium text-gray-400">{ticket.id}</span>
                <span className={cn("px-2 py-0.5 rounded-md text-[8px] font-bold border tracking-wide", getStatusColor(ticket.status))}>
                  {getStatusLabel(ticket.status)}
                </span>
                {user.role !== 'client' && (
                  <div className="flex flex-wrap items-center gap-1 ml-2">
                    <button 
                      onClick={() => onUpdateStatus('IN_PROGRESS')}
                      className={cn(
                        "px-2 py-0.5 rounded text-[7px] font-bold uppercase tracking-widest border transition-all",
                        ticket.status === 'IN_PROGRESS' ? "bg-blue-500 border-blue-500 text-white" : "bg-white border-gray-100 text-gray-400 hover:border-gray-200"
                      )}
                    >
                      В работе
                    </button>
                    <button 
                      onClick={() => onUpdateStatus('RESOLVED')}
                      className={cn(
                        "px-2 py-0.5 rounded text-[7px] font-bold uppercase tracking-widest border transition-all",
                        ticket.status === 'RESOLVED' ? "bg-emerald-500 border-emerald-500 text-white" : "bg-white border-gray-100 text-gray-400 hover:border-gray-200"
                      )}
                    >
                      Решено
                    </button>
                    <button 
                      onClick={() => onUpdateStatus('CRITICAL')}
                      className={cn(
                        "px-2 py-0.5 rounded text-[7px] font-bold uppercase tracking-widest border transition-all",
                        ticket.status === 'CRITICAL' ? "bg-rose-500 border-rose-500 text-white" : "bg-white border-gray-100 text-gray-400 hover:border-gray-200"
                      )}
                    >
                      Критично
                    </button>
                    <button 
                      onClick={() => onUpdateStatus('ARCHIVED')}
                      className={cn(
                        "px-2 py-0.5 rounded text-[7px] font-bold uppercase tracking-widest border transition-all",
                        ticket.status === 'ARCHIVED' ? "bg-gray-500 border-gray-500 text-white" : "bg-white border-gray-100 text-gray-400 hover:border-gray-200"
                      )}
                    >
                      В архив
                    </button>
                  </div>
                )}

                {user.role !== 'client' && (
                  <div className="flex flex-wrap items-center gap-1 ml-2 border-l border-gray-100 pl-2">
                    <div className="relative">
                      <button 
                        onClick={() => setIsSupportMenuOpen(!isSupportMenuOpen)}
                        className={cn(
                          "flex items-center gap-1.5 px-2 py-0.5 rounded text-[7px] font-bold uppercase tracking-widest border transition-all",
                          ticket.assigned_to ? "bg-indigo-50 border-indigo-200 text-indigo-600" : "bg-white border-gray-100 text-gray-400 hover:border-gray-200"
                        )}
                      >
                        <User size={10} />
                        {ticket.assigned_name || 'Назначить'}
                      </button>
                      
                      <AnimatePresence>
                        {isSupportMenuOpen && (
                          <motion.div 
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 5 }}
                            className="absolute top-full left-0 mt-1 min-w-[150px] bg-white border border-gray-100 rounded-xl shadow-xl z-50 overflow-hidden py-1"
                          >
                            <button 
                              onClick={() => {
                                onUpdateAssignment(null);
                                setIsSupportMenuOpen(false);
                              }}
                              className="w-full text-left px-3 py-2 hover:bg-gray-50 text-[9px] font-bold uppercase tracking-widest text-gray-400"
                            >
                              Без ответственного
                            </button>
                            {user.role !== 'client' && ticket.assigned_to !== user.id && (
                              <button 
                                onClick={() => {
                                  onUpdateAssignment(user.id);
                                  setIsSupportMenuOpen(false);
                                }}
                                className="w-full text-left px-3 py-2 hover:bg-blue-50 text-[9px] font-bold uppercase tracking-widest text-blue-600 border-b border-gray-50 bg-blue-50/10"
                              >
                                Назначить на меня
                              </button>
                            )}
                            {supportUsers.map((su: any) => (
                              <button 
                                key={su.id}
                                onClick={() => {
                                  onUpdateAssignment(su.id);
                                  setIsSupportMenuOpen(false);
                                }}
                                className="w-full text-left px-3 py-2 hover:bg-gray-50 text-[9px] font-bold uppercase tracking-widest text-gray-700"
                              >
                                {su.full_name}
                              </button>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                )}
                
                {user.role !== 'client' && (
                  <div className="flex flex-wrap items-center gap-1 ml-2 border-l border-gray-100 pl-2">
                    {['low', 'medium', 'high', 'critical'].map((p) => (
                      <button
                        key={p}
                        onClick={() => onUpdatePriority(p)}
                        className={cn(
                          "px-2 py-0.5 rounded text-[7px] font-bold uppercase tracking-widest border transition-all",
                          ticket.priority === p ? "bg-gray-900 text-white border-gray-900" : "bg-white border-gray-100 text-gray-400 hover:border-gray-200"
                        )}
                      >
                        {p === 'low' ? 'Низкий' : p === 'medium' ? 'Средний' : p === 'high' ? 'Высокий' : 'Критично'}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <h3 className="font-bold text-base truncate text-gray-900">{ticket.subject}</h3>
            </div>
          )}
        </div>

        {!isChatExpanded && (
          <div className="space-y-3">
            <h3 className="font-bold text-base truncate w-full px-1 text-gray-900">{ticket.subject}</h3>
            {user.role !== 'client' && (
              <div className="flex flex-wrap items-center gap-y-2 gap-x-3 px-1">
                <div className="flex items-center gap-1">
                  <div className="relative">
                    <button 
                      onClick={() => setIsSupportMenuOpen(!isSupportMenuOpen)}
                      className={cn(
                        "px-2 py-1 rounded text-[8px] font-bold uppercase tracking-widest border transition-all flex items-center gap-1",
                        ticket.assigned_to ? "bg-indigo-50 border-indigo-200 text-indigo-600" : "bg-white border-gray-100 text-gray-400 hover:border-gray-200"
                      )}
                    >
                      <User size={10} />
                      {ticket.assigned_name || 'Назначить'}
                    </button>
                    <AnimatePresence>
                      {isSupportMenuOpen && (
                        <motion.div 
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 5 }}
                          className="absolute bottom-full left-0 mb-1 min-w-[150px] bg-white border border-gray-100 rounded-xl shadow-xl z-50 overflow-hidden py-1"
                        >
                          <button 
                            onClick={() => {
                              onUpdateAssignment(null);
                              setIsSupportMenuOpen(false);
                            }}
                            className="w-full text-left px-3 py-2 hover:bg-gray-50 text-[9px] font-bold uppercase tracking-widest text-gray-400"
                          >
                            Без ответственного
                          </button>
                          {supportUsers.map((su: any) => (
                            <button 
                              key={su.id}
                              onClick={() => {
                                onUpdateAssignment(su.id);
                                setIsSupportMenuOpen(false);
                              }}
                              className="w-full text-left px-3 py-2 hover:bg-gray-50 text-[9px] font-bold uppercase tracking-widest text-gray-700"
                            >
                              {su.full_name}
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <button 
                    onClick={() => onUpdateStatus('IN_PROGRESS')}
                    className={cn(
                      "px-2 py-1 rounded text-[8px] font-bold uppercase tracking-widest border transition-all",
                      ticket.status === 'IN_PROGRESS' ? "bg-blue-500 border-blue-500 text-white" : "bg-white border-gray-100 text-gray-400 hover:border-gray-200"
                    )}
                  >
                    В работе
                  </button>
                  <button 
                    onClick={() => onUpdateStatus('RESOLVED')}
                    className={cn(
                      "px-2 py-1 rounded text-[8px] font-bold uppercase tracking-widest border transition-all",
                      ticket.status === 'RESOLVED' ? "bg-emerald-500 border-emerald-500 text-white" : "bg-white border-gray-100 text-gray-400 hover:border-gray-200"
                    )}
                  >
                    Решено
                  </button>
                  <button 
                    onClick={() => onUpdateStatus('CRITICAL')}
                    className={cn(
                      "px-2 py-1 rounded text-[8px] font-bold uppercase tracking-widest border transition-all",
                      ticket.status === 'CRITICAL' ? "bg-rose-500 border-rose-500 text-white" : "bg-white border-gray-100 text-gray-400 hover:border-gray-200"
                    )}
                  >
                    Критично
                  </button>
                </div>
                <div className="flex items-center gap-1">
                  {['low', 'medium', 'high', 'critical'].map((p) => (
                    <button
                      key={p}
                      onClick={() => onUpdatePriority(p)}
                      className={cn(
                        "px-2 py-1 rounded text-[8px] font-bold uppercase tracking-widest border transition-all",
                        ticket.priority === p ? "bg-gray-900 text-white border-gray-900" : "bg-white border-gray-100 text-gray-400 hover:border-gray-200"
                      )}
                    >
                      {p === 'low' ? 'Низкий' : p === 'medium' ? 'Средний' : p === 'high' ? 'Высокий' : 'Критично'}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {isChatExpanded && user.role === 'admin' && (
          <button 
            onClick={handleDeleteTicket}
            className="p-2 text-gray-400 hover:text-rose-500 transition-colors shrink-0"
            title="Удалить заявку"
          >
            <Trash2 size={20} />
          </button>
        )}
      </header>

      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-6 space-y-8 bg-[#f0f2f5] scroll-smooth"
      >
        {ticket.client_deleted_at && (
          <div className="max-w-3xl mx-auto -mb-4">
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3 text-amber-800 text-xs font-medium">
              <ShieldAlert size={16} className="shrink-0" />
              Пользователь был удален из системы. История сохранена, но сообщения не будут доставлены адресату.
            </div>
          </div>
        )}

        {(!ticket.description || !ticket.description.startsWith('Email Ticket:')) && (
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm max-w-3xl mx-auto">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-blue-500 text-white flex items-center justify-center font-bold text-lg shadow-md">
                {ticket.client_name?.[0] || '?'}
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900">{ticket.client_name}</p>
                <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">{formatDateTime(new Date(ticket.created_at).getTime())}</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed font-medium">{ticket.description}</p>
          </div>
        )}

        <div className="space-y-6 max-w-4xl mx-auto">
          {messages.map((msg: any) => {
            const isOwn = msg.sender_id === user.id;
            const isEditing = editingMessageId === msg.id;
            const canManage = user.role === 'admin' && msg.sender_role !== 'client';

            if (msg.is_internal && user.role === 'client') return null;

            const renderMessageText = (text: string) => {
              if (!text) return null;
              
              const lines = text.split('\n');
              const headers: string[] = [];
              let bodyLines: string[] = [];
              let inBody = false;

              const headerPrefixes = ['**КЛИЕНТ:**', '**ДАТА:**', '**ОТ:**', '**ТЕМА:**'];

              for (const line of lines) {
                const isHeader = headerPrefixes.some(p => line.startsWith(p));
                if (!inBody && isHeader) {
                  headers.push(line);
                } else if (!inBody && line.trim() === '' && headers.length > 0) {
                  inBody = true;
                } else {
                  bodyLines.push(line);
                }
              }

              const content = headers.length > 0 ? bodyLines.join('\n').trim() : text;

              const markdownContent = (
                <div className={cn(
                  "markdown-body prose prose-sm max-w-none",
                  isOwn 
                    ? "prose-p:text-gray-800 prose-strong:text-gray-900 prose-li:text-gray-800 prose-code:bg-black/5 prose-code:text-gray-900 prose-pre:bg-black/5 prose-pre:text-gray-800 shadow-none" 
                    : "prose-p:text-gray-800 prose-li:text-gray-800"
                )}>
                  <ReactMarkdown 
                    remarkPlugins={[remarkGfm, remarkBreaks]} 
                    rehypePlugins={[rehypeRaw]}
                  >
                    {content}
                  </ReactMarkdown>
                </div>
              );

              if (headers.length === 0) {
                return markdownContent;
              }

              return (
                <div className="space-y-4">
                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-1.5">
                    {headers.map((h, i) => {
                      const [label, ...rest] = h.split(':');
                      return (
                        <div key={i} className="flex gap-2 text-[10px] items-baseline">
                          <span className="text-gray-400 font-bold uppercase tracking-widest min-w-[60px]">{label.replace(/\*/g, '')}:</span>
                          <span className="text-gray-600 font-medium break-all">{rest.join(':').trim()}</span>
                        </div>
                      );
                    })}
                  </div>
                  {markdownContent}
                </div>
              );
            };

            return (
              <div key={msg.id} className={cn("flex flex-col group/msg", isOwn ? "items-end" : "items-start")}>
                <div className="flex items-center gap-2 mb-1 px-2">
                  {!isOwn && (
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{msg.sender_name}</span>
                      {msg.sender_deleted_at && (
                        <span className="text-[8px] px-1.5 py-0.5 bg-gray-100 text-gray-400 rounded-md font-bold border border-gray-200">
                          Удален
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <div className={cn(
                  "max-w-[85%] p-4 rounded-2xl text-sm relative shadow-sm break-words",
                  isOwn 
                    ? "bg-[#effdde] text-gray-800 rounded-tr-none" 
                    : "bg-white border border-gray-100 text-gray-800 rounded-tl-none",
                  msg.is_internal && "bg-amber-50 border-amber-100 text-amber-700 border"
                )}>
                  {canManage && (
                    <div className="absolute top-2 right-2 opacity-0 group-hover/msg:opacity-100 transition-opacity flex items-center gap-1 bg-white/80 backdrop-blur-sm rounded-lg p-1 border border-gray-100">
                      <button 
                        onClick={() => {
                          setEditingMessageId(msg.id);
                          setEditingText(msg.text);
                        }}
                        className="p-1 text-gray-400 hover:text-blue-500 transition-colors"
                        title="Редактировать"
                      >
                        <Pencil size={12} />
                      </button>
                      <button 
                        onClick={() => handleDeleteMessage(msg.id)}
                        className="p-1 text-gray-400 hover:text-rose-500 transition-colors"
                        title="Удалить"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  )}

                  {!!msg.is_internal && (
                    <div className="flex items-center gap-2 mb-2 text-[8px] font-bold uppercase tracking-widest text-amber-600">
                      <ShieldCheck size={10} />
                      Внутренняя заметка
                    </div>
                  )}

                  {isEditing ? (
                    <div className="space-y-3 min-w-[300px]">
                      <textarea
                        value={editingText}
                        onChange={(e) => setEditingText(e.target.value)}
                        className="w-full bg-white border border-gray-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none min-h-[100px]"
                        autoFocus
                      />
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => {
                            setEditingMessageId(null);
                            setEditingText('');
                          }}
                          className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          Отмена
                        </button>
                        <button 
                          onClick={handleSaveEdit}
                          className="px-3 py-1.5 bg-blue-500 text-white rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-blue-600 transition-all shadow-sm"
                        >
                          Сохранить
                        </button>
                      </div>
                    </div>
                  ) : (
                    renderMessageText(msg.text)
                  )}

                  {msg.media_url && !isEditing && (
                    <div 
                      className={cn("mt-3 rounded-xl overflow-hidden cursor-pointer border border-gray-100 group/img relative", msg.text ? "mt-4" : "")} 
                      onClick={() => setSelectedImage(msg.media_url)}
                    >
                      <img src={msg.media_url} alt="Attachment" className="max-w-full h-auto max-h-[400px] w-full object-cover transition-transform duration-500 group-hover/img:scale-105" referrerPolicy="no-referrer" />
                      <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/img:opacity-100 transition-all duration-300 flex items-center justify-center backdrop-blur-[1px]">
                        <div className="bg-white/20 p-2 rounded-full backdrop-blur-md border border-white/30">
                          <ImageIcon size={20} className="text-white" />
                        </div>
                      </div>
                    </div>
                  )}
                  <div className={cn(
                    "text-[8px] mt-1 font-bold uppercase tracking-widest text-right",
                    isOwn ? "text-emerald-600/60" : "text-gray-400"
                  )}>
                    {new Date(msg.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <footer className="p-6 bg-white border-t border-gray-100 shrink-0">
        <form onSubmit={handleSend} className="flex flex-col gap-3 max-w-4xl mx-auto">
          {user.role !== 'client' && (
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setIsInternal(false)} className={cn("text-[9px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-lg transition-all border", !isInternal ? "bg-blue-500 border-blue-500 text-white shadow-sm" : "bg-white border-gray-100 text-gray-400 hover:border-gray-200")}>Ответ клиенту</button>
              <button type="button" onClick={() => setIsInternal(true)} className={cn("text-[9px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-lg transition-all border", isInternal ? "bg-amber-500 border-amber-500 text-white shadow-sm" : "bg-white border-gray-100 text-gray-400 hover:border-gray-200")}>Внутренняя заметка</button>
            </div>
          )}
          <div className="flex items-end gap-3">
            <input 
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept="image/png, image/jpeg, image/jpg"
              className="hidden"
            />
            <button 
              type="button" 
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className={cn(
                "p-3 bg-gray-50 text-gray-400 rounded-xl hover:text-blue-500 hover:bg-blue-50 transition-all disabled:opacity-50",
                isUploading && "animate-pulse"
              )}
              title="Прикрепить изображение"
            >
              <Paperclip size={20} />
            </button>
            <div className="flex-1 min-w-0 bg-gray-50 rounded-2xl border border-gray-100 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/10 transition-all overflow-hidden">
              <ReactQuill 
                theme="snow"
                value={inputText}
                onChange={setInputText}
                placeholder={isInternal ? "Внутренний комментарий..." : "Ваше сообщение..."}
                className="quill-light"
                modules={{
                  toolbar: [
                    ['bold', 'italic', 'underline', 'strike'],
                    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                    ['code-block', 'code'],
                    ['link'],
                    ['clean']
                  ]
                }}
              />
            </div>
            <button type="submit" className="p-3 bg-blue-500 text-white rounded-xl shadow-lg shadow-blue-500/20 hover:bg-blue-600 active:scale-95 transition-all">
              <Send size={20} />
            </button>
          </div>
        </form>
      </footer>
    </>
  );
}
