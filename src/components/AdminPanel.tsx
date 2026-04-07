import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Users, Zap, Settings as SettingsIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { IntegrationsView } from './IntegrationsView';
import { SettingsView } from './SettingsView';

export function AdminPanel({ token }: { token: string }) {
  const [activeTab, setActiveTab] = useState<'users' | 'integrations' | 'settings'>('users');
  const [users, setUsers] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchUsers = () => {
    fetch('/api/admin/users', { headers: { 'Authorization': `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => setUsers(data));
  };

  useEffect(fetchUsers, [token]);

  const handleAddUser = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const payload = Object.fromEntries(formData);
    
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      fetchUsers();
      setIsModalOpen(false);
    }
  };

  const handleDeleteUser = async (id: number) => {
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        fetchUsers();
      } else {
        const data = await res.json();
        alert(data.error || 'Ошибка при удалении пользователя');
      }
    } catch (err) {
      console.error('Failed to delete user:', err);
      alert('Ошибка подключения к серверу');
    }
  };

  return (
    <div className="flex h-full overflow-hidden">
      {/* Admin Sidebar Tabs */}
      <div className="w-80 border-r border-white/5 bg-[#0D0E10] flex flex-col p-8">
        <div className="mb-12">
          <h2 className="text-2xl font-black tracking-tighter italic">Админ-центр</h2>
          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">Управление системой</p>
        </div>

        <nav className="space-y-2">
          <button 
            onClick={() => setActiveTab('users')}
            className={cn(
              "w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all",
              activeTab === 'users' ? "bg-white text-black shadow-xl scale-105" : "text-gray-500 hover:text-white hover:bg-white/5"
            )}
          >
            <Users size={18} />
            Пользователи
          </button>
          <button 
            onClick={() => setActiveTab('integrations')}
            className={cn(
              "w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all",
              activeTab === 'integrations' ? "bg-white text-black shadow-xl scale-105" : "text-gray-500 hover:text-white hover:bg-white/5"
            )}
          >
            <Zap size={18} />
            Интеграции
          </button>
          <button 
            onClick={() => setActiveTab('settings')}
            className={cn(
              "w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all",
              activeTab === 'settings' ? "bg-white text-black shadow-xl scale-105" : "text-gray-500 hover:text-white hover:bg-white/5"
            )}
          >
            <SettingsIcon size={18} />
            Настройки
          </button>
        </nav>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden bg-[#0A0B0D]">
        {activeTab === 'users' && (
          <div className="p-10 flex flex-col h-full overflow-hidden">
            <header className="flex items-center justify-between mb-12">
              <div>
                <h2 className="text-4xl font-black tracking-tighter italic">Пользователи</h2>
                <p className="text-gray-500 mt-2 font-bold uppercase tracking-widest text-xs">Управление доступом и ролями</p>
              </div>
              <button 
                onClick={() => setIsModalOpen(true)}
                className="flex items-center gap-3 px-8 py-4 bg-white text-black rounded-2xl font-black uppercase tracking-widest shadow-xl hover:scale-105 transition-all"
              >
                <Plus size={20} />
                Добавить
              </button>
            </header>

            <div className="flex-1 bg-[#151619] rounded-[40px] border border-white/5 overflow-y-auto">
              <table className="w-full text-left">
                <thead className="sticky top-0 bg-[#151619] z-10">
                  <tr className="text-[10px] font-black text-gray-600 uppercase tracking-[0.2em] border-b border-white/5">
                    <th className="px-8 py-6">Имя</th>
                    <th className="px-8 py-6">Логин</th>
                    <th className="px-8 py-6">Роль</th>
                    <th className="px-8 py-6">Регистрация</th>
                    <th className="px-8 py-6 text-right">Действия</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {users.map(u => (
                    <tr key={u.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-8 py-6 font-black">{u.full_name}</td>
                      <td className="px-8 py-6 text-gray-400 font-mono">{u.username}</td>
                      <td className="px-8 py-6">
                        <span className={cn(
                          "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border",
                          u.role === 'admin' ? "border-red-500/50 text-red-500" : u.role === 'support' ? "border-blue-500/50 text-blue-500" : "border-gray-500/50 text-gray-500"
                        )}>
                          {u.role}
                        </span>
                      </td>
                      <td className="px-8 py-6 text-xs text-gray-500">{new Date(u.created_at).toLocaleDateString()}</td>
                      <td className="px-8 py-6 text-right">
                        <button 
                          onClick={() => handleDeleteUser(u.id)}
                          className="p-2 text-gray-500 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'integrations' && <IntegrationsView />}
        {activeTab === 'settings' && <SettingsView token={token} />}
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-black/80 backdrop-blur-md" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-[#151619] w-full max-w-md rounded-[40px] p-12 relative border border-white/10 shadow-2xl">
              <h3 className="text-2xl font-black italic mb-8">Создать нового пользователя</h3>
              <form onSubmit={handleAddUser} className="space-y-6">
                <input name="fullName" required placeholder="Полное имя" className="w-full bg-[#1C1D21] border-none rounded-2xl px-6 py-4 text-white focus:ring-2 focus:ring-white/20" />
                <input name="username" required placeholder="Логин" className="w-full bg-[#1C1D21] border-none rounded-2xl px-6 py-4 text-white focus:ring-2 focus:ring-white/20" />
                <input name="password" required type="password" placeholder="Пароль" className="w-full bg-[#1C1D21] border-none rounded-2xl px-6 py-4 text-white focus:ring-2 focus:ring-white/20" />
                <select name="role" className="w-full bg-[#1C1D21] border-none rounded-2xl px-6 py-4 text-white focus:ring-2 focus:ring-white/20">
                  <option value="client">Клиент</option>
                  <option value="support">Поддержка</option>
                  <option value="admin">Администратор</option>
                </select>
                <button className="w-full py-5 bg-white text-black rounded-2xl font-black uppercase tracking-widest shadow-xl">Создать</button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
