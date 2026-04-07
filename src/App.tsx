import React, { useState, useEffect, useMemo, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { 
  User, 
  Lock,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Ticket, Role } from './types';

// Components
import { Sidebar } from './components/Sidebar';
import { SupportDashboard } from './components/SupportDashboard';
import { AdminPanel } from './components/AdminPanel';
import { AnalyticsView } from './components/AnalyticsView';
import { TicketsView } from './components/TicketsView';
import { NewTicketModal } from './components/NewTicketModal';

// --- Types ---
interface AuthUser {
  id: number;
  username: string;
  role: Role | 'admin';
  name: string;
}

export default function App() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('viking_token'));
  const [isAuthLoading, setIsAuthLoading] = useState(!!localStorage.getItem('viking_token'));
  const [siteName, setSiteName] = useState('VikingDesk');
  const [view, setView] = useState<'dashboard' | 'tickets' | 'admin' | 'analytics'>('dashboard');
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [isChatExpanded, setIsChatExpanded] = useState(false);
  const selectedTicketIdRef = useRef<string | null>(null);

  useEffect(() => {
    selectedTicketIdRef.current = selectedTicketId;
  }, [selectedTicketId]);

  const [messages, setMessages] = useState<any[]>([]);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isNewTicketModalOpen, setIsNewTicketModalOpen] = useState(false);
  const [loginError, setLoginError] = useState('');

  // --- Auth Logic ---
  useEffect(() => {
    fetch('/api/config').then(res => res.json()).then(data => {
      if (data.siteName) {
        setSiteName(data.siteName);
        document.title = data.siteName;
      }
    });

    const checkAuth = async () => {
      if (!token) {
        setIsAuthLoading(false);
        return;
      }
      try {
        const res = await fetch('/api/auth/me', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
        } else {
          handleLogout();
        }
      } catch (err) {
        console.error('Auth check failed:', err);
      } finally {
        setIsAuthLoading(false);
      }
    };
    checkAuth();
  }, [token]);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const username = formData.get('username');
    const password = formData.get('password');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (res.ok) {
        setToken(data.token);
        setUser(data.user);
        localStorage.setItem('viking_token', data.token);
        setLoginError('');
      } else {
        setLoginError(data.error);
      }
    } catch (err) {
      setLoginError('Ошибка подключения к серверу');
    }
  };

  const handleLogout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('viking_token');
    if (socket) socket.close();
  };

  // --- Data Fetching ---
  useEffect(() => {
    if (token) {
      const newSocket = io({
        transports: ['websocket', 'polling']
      });
      setSocket(newSocket);

      fetch('/api/tickets', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => setTickets(Array.isArray(data) ? data : []));

      newSocket.on('ticket:created', (newTicket: Ticket) => {
        setTickets(prev => [newTicket, ...prev]);
      });

      newSocket.on('ticket:updated', (updatedTicket: Ticket) => {
        setTickets(prev => prev.map(t => t.id === updatedTicket.id ? updatedTicket : t));
      });

      newSocket.on('ticket:deleted', (ticketId: string) => {
        setTickets(prev => prev.filter(t => t.id !== ticketId));
        if (selectedTicketIdRef.current === ticketId) {
          setSelectedTicketId(null);
        }
      });

      newSocket.on('message:received', (msg: any) => {
        setMessages(prev => {
          if (msg.ticket_id === selectedTicketIdRef.current && !prev.find(m => m.id === msg.id)) {
            return [...prev, msg];
          }
          return prev;
        });
      });

      return () => { newSocket.close(); };
    }
  }, [token]);

  useEffect(() => {
    if (selectedTicketId && socket && token) {
      socket.emit('join:ticket', selectedTicketId);
      fetch(`/api/tickets/${selectedTicketId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => {
          setMessages(data.messages || []);
        });
    }
  }, [selectedTicketId, socket, token]);

  const stats = useMemo(() => {
    const total = tickets.filter(t => (t.status || '').toUpperCase() !== 'RESOLVED').length;
    const open = tickets.filter(t => (t.status || '').toUpperCase() === 'IN_PROGRESS' || (t.status || '').toUpperCase() === 'NEW').length;
    const resolved = tickets.filter(t => (t.status || '').toUpperCase() === 'RESOLVED').length;
    const critical = tickets.filter(t => (t.status || '').toUpperCase() === 'CRITICAL').length;
    
    const days = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return {
        name: days[d.getDay()],
        date: d.toISOString().split('T')[0],
        count: 0
      };
    });

    tickets.forEach(t => {
      const ticketDate = new Date(t.created_at).toISOString().split('T')[0];
      const day = last7Days.find(d => d.date === ticketDate);
      if (day) day.count++;
    });

    const statusData = [
      { name: 'Новые', value: tickets.filter(t => (t.status || '').toUpperCase() === 'NEW').length, color: '#3b82f6' },
      { name: 'В работе', value: tickets.filter(t => (t.status || '').toUpperCase() === 'IN_PROGRESS').length, color: '#10b981' },
      { name: 'Критично', value: tickets.filter(t => (t.status || '').toUpperCase() === 'CRITICAL').length, color: '#ef4444' },
      { name: 'Решены', value: tickets.filter(t => (t.status || '').toUpperCase() === 'RESOLVED').length, color: '#6b7280' },
    ];

    return { total, open, resolved, critical, chartData: last7Days, statusData };
  }, [tickets]);

  if (isAuthLoading) {
    return (
      <div className="h-screen bg-[#0A0A0B] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-white/10 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (!token || !user) {
    return (
      <div className="h-screen bg-[#0A0A0B] flex items-center justify-center p-6 font-sans">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-[#151619] rounded-[40px] p-12 border border-white/5 shadow-2xl"
        >
          <div className="flex items-center gap-4 mb-12">
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-black font-black text-2xl">{siteName[0]}</div>
            <h1 className="text-3xl font-black text-white tracking-tighter italic">{siteName}</h1>
          </div>

          <h2 className="text-xl font-bold text-white mb-2">Авторизация</h2>
          <p className="text-gray-500 text-sm mb-8">Войдите в систему для работы с заявками</p>

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-4 mb-2 block">Логин</label>
              <div className="relative">
                <User className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-600" size={18} />
                <input 
                  name="username"
                  required
                  type="text" 
                  className="w-full bg-[#1C1D21] border-none rounded-2xl pl-14 pr-6 py-4 text-white focus:ring-2 focus:ring-white/20 transition-all"
                  placeholder="admin"
                />
              </div>
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-4 mb-2 block">Пароль</label>
              <div className="relative">
                <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-600" size={18} />
                <input 
                  name="password"
                  required
                  type="password" 
                  className="w-full bg-[#1C1D21] border-none rounded-2xl pl-14 pr-6 py-4 text-white focus:ring-2 focus:ring-white/20 transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>
            {loginError && <p className="text-red-500 text-xs font-bold ml-4">{loginError}</p>}
            <button className="w-full py-5 bg-white text-black rounded-2xl font-black uppercase tracking-widest hover:scale-[1.02] transition-transform active:scale-95 shadow-xl">
              Войти в систему
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  const onSendMessage = (text: string, isInternal: boolean, media_url?: string) => {
    socket?.emit('message:send', { ticketId: selectedTicketId, senderId: user.id, text, isInternal, media_url });
  };

  const onUpdateStatus = (status: string) => {
    fetch(`/api/tickets/${selectedTicketId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ status })
    });
  };

  const onUpdatePriority = (priority: string) => {
    fetch(`/api/tickets/${selectedTicketId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ priority })
    });
  };

  return (
    <div className="flex h-screen bg-[#0A0A0B] text-white font-sans overflow-hidden">
      <Sidebar user={user} view={view} setView={setView} handleLogout={handleLogout} siteName={siteName} />

      <main className="flex-1 flex flex-col min-w-0 relative bg-[#0A0A0B]">
        {view === 'dashboard' && (
          <SupportDashboard 
            tickets={tickets} 
            stats={stats} 
            setSelectedTicketId={setSelectedTicketId} 
            selectedTicketId={selectedTicketId}
            messages={messages}
            token={token}
            user={user}
            onSendMessage={onSendMessage}
            onUpdateStatus={onUpdateStatus}
            onUpdatePriority={onUpdatePriority}
            setIsNewTicketModalOpen={setIsNewTicketModalOpen}
            isChatExpanded={isChatExpanded}
            setIsChatExpanded={setIsChatExpanded}
          />
        )}
        {view === 'admin' && <AdminPanel token={token} />}
        {view === 'analytics' && <AnalyticsView stats={stats} />}
        {view === 'tickets' && (
          <TicketsView 
            tickets={tickets} 
            setSelectedTicketId={setSelectedTicketId} 
            selectedTicketId={selectedTicketId}
            messages={messages}
            token={token}
            user={user}
            onSendMessage={onSendMessage}
            onUpdateStatus={onUpdateStatus}
            onUpdatePriority={onUpdatePriority}
            setIsNewTicketModalOpen={setIsNewTicketModalOpen}
            isChatExpanded={isChatExpanded}
            setIsChatExpanded={setIsChatExpanded}
          />
        )}

        <AnimatePresence>
          {isNewTicketModalOpen && (
            <NewTicketModal 
              onClose={() => setIsNewTicketModalOpen(false)} 
              token={token}
            />
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
