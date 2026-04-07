import React, { useState, useRef } from 'react';
import { 
  ArrowLeft, 
  Trash2, 
  ShieldCheck, 
  Image as ImageIcon, 
  Paperclip, 
  Send,
  X,
  ChevronLeft,
  ChevronRight
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

export function TicketDetail({ ticket, messages, onClose, onSendMessage, onUpdateStatus, onUpdatePriority, user, token, isChatExpanded, setIsChatExpanded }: any) {
  const [inputText, setInputText] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    if (!inputText.trim()) return;
    onSendMessage(inputText, isInternal);
    setInputText('');
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
        "border-b border-white/5 flex flex-col px-6 shrink-0 py-4 gap-4",
        isChatExpanded ? "min-h-[5rem] h-auto flex-row items-center justify-between" : "h-auto"
      )}>
        <div className={cn("flex items-center gap-4", !isChatExpanded && "w-full justify-between")}>
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-xl transition-all" title="Закрыть">
              <ArrowLeft size={20} />
            </button>
            <button 
              onClick={() => setIsChatExpanded(!isChatExpanded)} 
              className="hidden lg:flex p-2 hover:bg-white/5 rounded-xl transition-all text-gray-400 hover:text-white"
              title={isChatExpanded ? "Свернуть" : "Развернуть"}
            >
              {isChatExpanded ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
            </button>
          </div>
          
          {!isChatExpanded && (
            <div className="flex items-center gap-2 overflow-hidden">
              <span className="text-[9px] font-mono font-medium text-gray-600 shrink-0">{ticket.id}</span>
              <span className={cn("px-2 py-0.5 rounded-md text-[8px] font-bold border tracking-wide shrink-0", getStatusColor(ticket.status))}>
                {getStatusLabel(ticket.status)}
              </span>
              {user.role === 'admin' && (
                <button 
                  onClick={handleDeleteTicket}
                  className="p-2 text-gray-500 hover:text-red-500 transition-colors ml-1 shrink-0"
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
                <span className="text-[9px] font-mono font-medium text-gray-600">{ticket.id}</span>
                <span className={cn("px-2 py-0.5 rounded-md text-[8px] font-bold border tracking-wide", getStatusColor(ticket.status))}>
                  {getStatusLabel(ticket.status)}
                </span>
                {user.role !== 'client' && (
                  <div className="flex flex-wrap items-center gap-1 ml-2">
                    <button 
                      onClick={() => onUpdateStatus('IN_PROGRESS')}
                      className={cn(
                        "px-2 py-0.5 rounded text-[7px] font-bold uppercase tracking-widest border transition-all",
                        ticket.status === 'IN_PROGRESS' ? "bg-blue-600 border-blue-600 text-white" : "border-white/10 text-gray-500 hover:border-white/20"
                      )}
                    >
                      В работе
                    </button>
                    <button 
                      onClick={() => onUpdateStatus('RESOLVED')}
                      className={cn(
                        "px-2 py-0.5 rounded text-[7px] font-bold uppercase tracking-widest border transition-all",
                        ticket.status === 'RESOLVED' ? "bg-green-600 border-green-600 text-white" : "border-white/10 text-gray-500 hover:border-white/20"
                      )}
                    >
                      Решено
                    </button>
                    <button 
                      onClick={() => onUpdateStatus('CRITICAL')}
                      className={cn(
                        "px-2 py-0.5 rounded text-[7px] font-bold uppercase tracking-widest border transition-all",
                        ticket.status === 'CRITICAL' ? "bg-red-600 border-red-600 text-white" : "border-white/10 text-gray-500 hover:border-white/20"
                      )}
                    >
                      Критично
                    </button>
                  </div>
                )}
                {user.role !== 'client' && (
                  <div className="flex flex-wrap items-center gap-1 ml-2 border-l border-white/5 pl-2">
                    {['low', 'medium', 'high', 'critical'].map((p) => (
                      <button
                        key={p}
                        onClick={() => onUpdatePriority(p)}
                        className={cn(
                          "px-2 py-0.5 rounded text-[7px] font-bold uppercase tracking-widest border transition-all",
                          ticket.priority === p ? "bg-white text-black border-white" : "border-white/10 text-gray-500 hover:border-white/20"
                        )}
                      >
                        {p === 'low' ? 'Низкий' : p === 'medium' ? 'Средний' : p === 'high' ? 'Высокий' : 'Критично'}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <h3 className="font-bold text-base truncate">{ticket.subject}</h3>
            </div>
          )}
        </div>

        {!isChatExpanded && (
          <div className="space-y-3">
            <h3 className="font-bold text-base truncate w-full px-1">{ticket.subject}</h3>
            {user.role !== 'client' && (
              <div className="flex flex-wrap items-center gap-y-2 gap-x-3 px-1">
                <div className="flex items-center gap-1">
                  <button 
                    onClick={() => onUpdateStatus('IN_PROGRESS')}
                    className={cn(
                      "px-2 py-1 rounded text-[8px] font-bold uppercase tracking-widest border transition-all",
                      ticket.status === 'IN_PROGRESS' ? "bg-blue-600 border-blue-600 text-white" : "border-white/10 text-gray-500 hover:border-white/20"
                    )}
                  >
                    В работе
                  </button>
                  <button 
                    onClick={() => onUpdateStatus('RESOLVED')}
                    className={cn(
                      "px-2 py-1 rounded text-[8px] font-bold uppercase tracking-widest border transition-all",
                      ticket.status === 'RESOLVED' ? "bg-green-600 border-green-600 text-white" : "border-white/10 text-gray-500 hover:border-white/20"
                    )}
                  >
                    Решено
                  </button>
                  <button 
                    onClick={() => onUpdateStatus('CRITICAL')}
                    className={cn(
                      "px-2 py-1 rounded text-[8px] font-bold uppercase tracking-widest border transition-all",
                      ticket.status === 'CRITICAL' ? "bg-red-600 border-red-600 text-white" : "border-white/10 text-gray-500 hover:border-white/20"
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
                        ticket.priority === p ? "bg-white text-black border-white" : "border-white/10 text-gray-500 hover:border-white/20"
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
            className="p-2 text-gray-500 hover:text-red-500 transition-colors shrink-0"
            title="Удалить заявку"
          >
            <Trash2 size={20} />
          </button>
        )}
      </header>

      <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-[#0D0E11]">
        <div className="bg-[#151619] p-6 rounded-2xl border border-white/5 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-white text-black flex items-center justify-center font-bold text-lg">
              {ticket.client_name?.[0] || '?'}
            </div>
            <div>
              <p className="text-sm font-bold">{ticket.client_name}</p>
              <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">{formatDateTime(new Date(ticket.created_at).getTime())}</p>
            </div>
          </div>
          <p className="text-sm text-gray-400 leading-relaxed font-medium">{ticket.description}</p>
        </div>

        <div className="space-y-6">
          {messages.map((msg: any) => {
            const isOwn = msg.sender_id === user.id;
            if (msg.is_internal && user.role === 'client') return null;

            const renderMessageText = (text: string) => {
              if (!text) return null;
              
              const lines = text.split('\n');
              const headers: string[] = [];
              let bodyLines: string[] = [];
              let inBody = false;

              for (const line of lines) {
                if (!inBody && (line.startsWith('**ОТ:**') || line.startsWith('**ТЕМА:**'))) {
                  headers.push(line);
                } else if (!inBody && line.trim() === '' && headers.length > 0) {
                  inBody = true;
                } else {
                  bodyLines.push(line);
                }
              }

              if (headers.length === 0) return <p className="whitespace-pre-wrap leading-relaxed">{text}</p>;

              return (
                <div className="space-y-4">
                  <div className="bg-black/30 p-4 rounded-xl border border-white/5 space-y-1.5">
                    {headers.map((h, i) => {
                      const [label, ...rest] = h.split(':');
                      return (
                        <div key={i} className="flex gap-2 text-[10px] items-baseline">
                          <span className="text-gray-500 font-bold uppercase tracking-widest min-w-[50px]">{label.replace(/\*/g, '')}:</span>
                          <span className="text-gray-300 font-medium break-all">{rest.join(':').trim()}</span>
                        </div>
                      );
                    })}
                  </div>
                  <p className="whitespace-pre-wrap leading-relaxed px-1">{bodyLines.join('\n').trim()}</p>
                </div>
              );
            };

            return (
              <div key={msg.id} className={cn("flex flex-col", isOwn ? "items-end" : "items-start")}>
                <div className="flex items-center gap-2 mb-1.5 px-1">
                  {!isOwn && <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">{msg.sender_name}</span>}
                  {isOwn && <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Вы</span>}
                </div>
                <div className={cn(
                  "max-w-[90%] p-5 rounded-3xl text-sm relative shadow-lg",
                  isOwn ? "bg-white text-black font-medium" : "bg-[#1C1D21] border border-white/5 text-gray-300",
                  msg.is_internal && "bg-yellow-500/10 border-yellow-500/20 text-yellow-500 border"
                )}>
                  {!!msg.is_internal && (
                    <div className="flex items-center gap-2 mb-3 text-[8px] font-bold uppercase tracking-widest text-yellow-500">
                      <ShieldCheck size={10} />
                      Внутренняя заметка
                    </div>
                  )}
                  {renderMessageText(msg.text)}
                  {msg.media_url && (
                    <div 
                      className={cn("mt-4 rounded-2xl overflow-hidden cursor-pointer border border-white/10 group/img relative", msg.text ? "mt-5" : "")} 
                      onClick={() => setSelectedImage(msg.media_url)}
                    >
                      <img src={msg.media_url} alt="Attachment" className="max-w-full h-auto max-h-[400px] w-full object-cover transition-transform duration-500 group-hover/img:scale-105" referrerPolicy="no-referrer" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-all duration-300 flex items-center justify-center backdrop-blur-[2px]">
                        <div className="bg-white/10 p-3 rounded-full backdrop-blur-md border border-white/20">
                          <ImageIcon size={24} className="text-white" />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <span className="text-[8px] text-gray-600 mt-2 font-bold uppercase tracking-widest px-2">{formatDateTime(new Date(msg.created_at).getTime())}</span>
              </div>
            );
          })}
        </div>
      </div>

      <footer className="p-6 bg-[#151619] border-t border-white/5 shrink-0">
        <form onSubmit={handleSend} className="flex flex-col gap-3">
          {user.role !== 'client' && (
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => setIsInternal(false)} className={cn("text-[9px] font-bold uppercase tracking-widest px-3 py-1 rounded-lg transition-all", !isInternal ? "bg-white text-black" : "bg-white/5 text-gray-500")}>Ответ клиенту</button>
              <button type="button" onClick={() => setIsInternal(true)} className={cn("text-[9px] font-bold uppercase tracking-widest px-3 py-1 rounded-lg transition-all", isInternal ? "bg-yellow-500 text-black" : "bg-white/5 text-gray-500")}>Внутренняя заметка</button>
            </div>
          )}
          <div className="flex items-center gap-3">
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
                "p-3 bg-white/5 text-gray-400 rounded-xl hover:text-white transition-all disabled:opacity-50",
                isUploading && "animate-pulse"
              )}
              title="Прикрепить изображение"
            >
              <Paperclip size={20} />
            </button>
            <input 
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={isInternal ? "Внутренний комментарий..." : "Ваше сообщение..."}
              className="flex-1 bg-[#1C1D21] border border-white/5 rounded-xl px-5 py-3 text-sm focus:ring-1 focus:ring-white/20 transition-all"
            />
            <button type="submit" className="p-3 bg-white text-black rounded-xl shadow-lg hover:scale-105 active:scale-95 transition-all">
              <Send size={20} />
            </button>
          </div>
        </form>
      </footer>
    </>
  );
}
