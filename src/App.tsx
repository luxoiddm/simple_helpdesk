import React, { useState, useEffect, useMemo, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { 
  User, 
  Lock,
  Menu
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
  const [token, setToken] = useState<string | null>(localStorage.getItem('auth_token'));
  const [isAuthLoading, setIsAuthLoading] = useState(!!localStorage.getItem('auth_token'));
  const [siteName, setSiteName] = useState('SupportDesk');
  const [view, setView] = useState<'dashboard' | 'tickets' | 'admin' | 'analytics'>('dashboard');
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
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
        localStorage.setItem('auth_token', data.token);
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
    localStorage.removeItem('auth_token');
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

      newSocket.on('ticket:deleted', ({ id }: { id: string }) => {
        setTickets(prev => prev.filter(t => t.id !== id));
        if (selectedTicketIdRef.current === id) {
          setSelectedTicketId(null);
        }
      });

      newSocket.on('ticket:bulk_updated', ({ tickets: updatedTickets }: { tickets: Ticket[] }) => {
        setTickets(prev => prev.map(t => {
          const match = updatedTickets.find(ut => ut.id === t.id);
          return match ? match : t;
        }));
      });

      newSocket.on('ticket:bulk_deleted', ({ ticketIds }: { ticketIds: string[] }) => {
        setTickets(prev => prev.filter(t => !ticketIds.includes(t.id)));
        if (selectedTicketIdRef.current && ticketIds.includes(selectedTicketIdRef.current)) {
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

      newSocket.on('message:updated', (updatedMsg: any) => {
        setMessages(prev => prev.map(m => m.id === updatedMsg.id ? updatedMsg : m));
      });

      newSocket.on('message:deleted', ({ id, ticket_id }: any) => {
        if (ticket_id === selectedTicketIdRef.current) {
          setMessages(prev => prev.filter(m => m.id !== id));
        }
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
    const total = tickets.filter(t => {
      const status = (t.status || '').toUpperCase();
      return status !== 'RESOLVED' && status !== 'ARCHIVED';
    }).length;
    const open = tickets.filter(t => {
      const status = (t.status || '').toUpperCase();
      return status === 'IN_PROGRESS' || status === 'NEW';
    }).length;
    const resolved = tickets.filter(t => (t.status || '').toUpperCase() === 'RESOLVED').length;
    const critical = tickets.filter(t => (t.status || '').toUpperCase() === 'CRITICAL').length;
    const archived = tickets.filter(t => (t.status || '').toUpperCase() === 'ARCHIVED').length;
    
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
      <div className="h-screen bg-[#f0f2f5] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-black/5 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!token || !user) {
    return (
      <div className="h-screen bg-[#f0f2f5] flex items-center justify-center p-6 font-sans">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-white rounded-[32px] p-10 border border-black/5 shadow-xl"
        >
          <div className="flex items-center gap-4 mb-10">
            <div className="w-12 h-12 bg-blue-500 rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-lg shadow-blue-500/20">{siteName[0]}</div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">{siteName}</h1>
          </div>

          <h2 className="text-xl font-bold text-gray-900 mb-2">Авторизация <span className="text-[10px] bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full uppercase ml-1">beta v0.1.0</span></h2>
          <p className="text-gray-500 text-sm mb-8">Войдите в систему для работы с заявками</p>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-4 mb-2 block">Логин</label>
              <div className="relative">
                <User className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                  name="username"
                  required
                  type="text" 
                  className="w-full bg-gray-50 border border-gray-100 rounded-2xl pl-14 pr-6 py-4 text-gray-900 focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all outline-none"
                  placeholder="admin"
                />
              </div>
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-4 mb-2 block">Пароль</label>
              <div className="relative">
                <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                  name="password"
                  required
                  type="password" 
                  className="w-full bg-gray-50 border border-gray-100 rounded-2xl pl-14 pr-6 py-4 text-gray-900 focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all outline-none"
                  placeholder="••••••••"
                />
              </div>
            </div>
            {loginError && <p className="text-red-500 text-xs font-bold ml-4">{loginError}</p>}
            <button className="w-full py-4 bg-blue-500 text-white rounded-2xl font-bold uppercase tracking-widest hover:bg-blue-600 transition-all active:scale-[0.98] shadow-lg shadow-blue-500/20">
              Войти в систему
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-[10px] font-bold text-gray-300 uppercase tracking-tighter">&copy; {new Date().getFullYear()} LUXOID</p>
          </div>
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

  const onUpdateAssignment = (id: string, assigned_to: number | null) => {
    fetch(`/api/tickets/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ assigned_to })
    });
  };

  const refreshTickets = () => {
    fetch('/api/tickets', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => setTickets(data));
  };

  return (
    <div className="flex flex-col lg:flex-row h-screen bg-[#f0f2f5] text-gray-900 font-sans overflow-hidden">
      {/* Mobile Header */}
      <header className="lg:hidden h-16 bg-white border-b border-gray-100 flex items-center justify-between px-6 shrink-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-500 rounded-xl flex items-center justify-center text-white font-black text-sm">{siteName[0]}</div>
          <h1 className="font-black text-lg tracking-tight">{siteName}</h1>
        </div>
        <button 
          onClick={() => setIsSidebarOpen(true)}
          className="p-2 -mr-2 text-gray-500 hover:text-gray-900"
        >
          <Menu size={24} />
        </button>
      </header>

      <Sidebar 
        user={user} 
        view={view} 
        setView={setView} 
        handleLogout={handleLogout} 
        siteName={siteName} 
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      <main className="flex-1 flex flex-col min-w-0 relative bg-[#f0f2f5] overflow-hidden">
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
            onUpdateAssignment={onUpdateAssignment}
            setIsNewTicketModalOpen={setIsNewTicketModalOpen}
            isChatExpanded={isChatExpanded}
            setIsChatExpanded={setIsChatExpanded}
            refreshTickets={refreshTickets}
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
            onUpdateAssignment={onUpdateAssignment}
            setIsNewTicketModalOpen={setIsNewTicketModalOpen}
            isChatExpanded={isChatExpanded}
            setIsChatExpanded={setIsChatExpanded}
            refreshTickets={refreshTickets}
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
