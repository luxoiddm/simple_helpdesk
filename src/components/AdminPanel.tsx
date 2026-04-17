import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Users, Zap, Settings as SettingsIcon, Archive, RotateCcw, ShieldAlert, FileJson, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { IntegrationsView } from './IntegrationsView';
import { SettingsView } from './SettingsView';

export function AdminPanel({ token }: { token: string }) {
  const [activeTab, setActiveTab] = useState<'users' | 'backups' | 'integrations' | 'settings'>('users');
  const [users, setUsers] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean, user: any | null }>({ isOpen: false, user: null });
  const [backups, setBackups] = useState<any[]>([]);
  const [restoreModal, setRestoreModal] = useState<{ isOpen: boolean, backup: any | null, report: any | null }>({ isOpen: false, backup: null, report: null });

  const fetchUsers = () => {
    fetch('/api/admin/users', { headers: { 'Authorization': `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => setUsers(data));
  };

  const fetchBackups = () => {
    fetch('/api/admin/backups', { headers: { 'Authorization': `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => setBackups(data));
  };

  useEffect(() => {
    fetchUsers();
    fetchBackups();
  }, [token]);

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

  const handleDeleteUser = async (mode: 'soft' | 'hard') => {
    if (!deleteModal.user) return;
    try {
      const res = await fetch(`/api/admin/users/${deleteModal.user.id}?mode=${mode}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        fetchUsers();
        fetchBackups();
        setDeleteModal({ isOpen: false, user: null });
        const data = await res.json();
        alert(data.message);
      } else {
        const data = await res.json();
        alert(data.error || 'Ошибка при удалении пользователя');
      }
    } catch (err) {
      console.error('Failed to delete user:', err);
      alert('Ошибка подключения к серверу');
    }
  };

  const handleRestore = async (filename: string) => {
    try {
      const res = await fetch('/api/admin/backups/restore', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ filename })
      });
      if (res.ok) {
        const data = await res.json();
        setRestoreModal(prev => ({ ...prev, report: data.report }));
        fetchUsers();
      } else {
        const data = await res.json();
        alert(data.error || 'Ошибка при восстановлении');
      }
    } catch (err) {
      console.error('Failed to restore:', err);
    }
  };

  return (
    <div className="flex h-full overflow-hidden bg-[#f0f2f5]">
      {/* Admin Sidebar Tabs */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col p-8">
        <div className="mb-12">
          <h2 className="text-2xl font-black tracking-tight text-gray-900 italic">Админ-центр</h2>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Управление системой</p>
        </div>

        <nav className="space-y-2">
          {[
            { id: 'users', label: 'Пользователи', icon: Users },
            { id: 'backups', label: 'Бэкапы', icon: Archive },
            { id: 'integrations', label: 'Интеграции', icon: Zap },
            { id: 'settings', label: 'Настройки', icon: SettingsIcon },
          ].map((tab: any) => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all",
                activeTab === tab.id 
                  ? "bg-blue-500 text-white shadow-lg shadow-blue-500/20" 
                  : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
              )}
            >
              <tab.icon size={18} />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {activeTab === 'users' && (
          <div className="p-10 flex flex-col h-full overflow-hidden">
            <header className="flex items-center justify-between mb-12">
              <div>
                <h2 className="text-4xl font-black tracking-tighter text-gray-900 italic">Пользователи</h2>
                <p className="text-gray-500 mt-2 font-bold uppercase tracking-widest text-xs">Управление доступом и ролями</p>
              </div>
              <button 
                onClick={() => setIsModalOpen(true)}
                className="flex items-center gap-3 px-8 py-4 bg-blue-500 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-blue-500/20 hover:bg-blue-600 transition-all"
              >
                <Plus size={20} />
                Добавить
              </button>
            </header>

            <div className="flex-1 bg-white rounded-[40px] border border-gray-200 overflow-hidden flex flex-col shadow-sm">
              <div className="overflow-y-auto h-full">
                <table className="w-full text-left">
                  <thead className="sticky top-0 bg-white z-10">
                    <tr className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] border-b border-gray-100">
                      <th className="px-10 py-8">Имя</th>
                      <th className="px-10 py-8">Логин</th>
                      <th className="px-10 py-8">Роль</th>
                      <th className="px-10 py-8">Статус</th>
                      <th className="px-10 py-8 text-right">Действия</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {users.map(u => (
                      <tr key={u.id} className={cn("hover:bg-gray-50/50 transition-colors", u.deleted_at && "bg-gray-50 italic opacity-60")}>
                        <td className="px-10 py-6">
                          <div className="flex flex-col">
                            <span className="font-bold text-gray-900">{u.full_name}</span>
                            <span className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">
                              {u.deleted_at ? 'Удален из системы' : `Регистрация: ${new Date(u.created_at).toLocaleDateString()}`}
                            </span>
                          </div>
                        </td>
                        <td className="px-10 py-6 text-gray-500 font-mono text-xs">{u.username}</td>
                        <td className="px-10 py-6">
                          <span className={cn(
                            "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border",
                            u.role === 'admin' ? "border-red-500/30 text-red-500 bg-red-50" : 
                            u.role === 'support' ? "border-blue-500/30 text-blue-500 bg-blue-50" : 
                            "border-gray-500/30 text-gray-500 bg-gray-50"
                          )}>
                            {u.role}
                          </span>
                        </td>
                        <td className="px-10 py-6">
                          {u.deleted_at ? (
                            <span className="flex items-center gap-1.5 text-xs text-amber-500 font-bold">
                              <Archive size={14} /> Архив
                            </span>
                          ) : (
                            <span className="flex items-center gap-1.5 text-xs text-emerald-500 font-bold">
                              <CheckCircle2 size={14} /> Активен
                            </span>
                          )}
                        </td>
                        <td className="px-10 py-6 text-right">
                          <button 
                            onClick={() => setDeleteModal({ isOpen: true, user: u })}
                            className="p-3 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                            disabled={u.deleted_at}
                            title="Удалить пользователя"
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
          </div>
        )}

        {activeTab === 'backups' && (
          <div className="p-10 flex flex-col h-full overflow-hidden">
            <header className="mb-12">
              <h2 className="text-4xl font-black tracking-tighter text-gray-900 italic">Резервные копии</h2>
              <p className="text-gray-500 mt-2 font-bold uppercase tracking-widest text-xs">Восстановление удаленных данных</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto">
              {backups.map((b, i) => (
                <div key={i} className="bg-white p-8 rounded-[32px] border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-6">
                    <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center text-gray-500">
                      <FileJson size={24} />
                    </div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                      {new Date(b.date).toLocaleDateString()}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-1">{b.fullName}</h3>
                  <p className="text-xs text-gray-500 font-mono mb-4">@{b.username}</p>
                  
                  <div className="flex items-center gap-4 mb-8">
                    <div className="flex flex-col">
                      <span className="text-lg font-black text-gray-900">{b.ticketCount}</span>
                      <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Тикетов</span>
                    </div>
                  </div>

                  <button 
                    onClick={() => setRestoreModal({ isOpen: true, backup: b, report: null })}
                    className="w-full py-4 bg-gray-900 text-white rounded-2xl text-[10px] font-bold uppercase tracking-widest hover:bg-black transition-all flex items-center justify-center gap-2"
                  >
                    <RotateCcw size={16} />
                    Восстановить
                  </button>
                </div>
              ))}
              {backups.length === 0 && (
                <div className="col-span-full py-20 bg-gray-50 rounded-[40px] border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-400">
                  <Archive size={48} className="mb-4 opacity-20" />
                  <p className="font-bold uppercase tracking-widest text-sm">Бэкапов пока нет</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'integrations' && <IntegrationsView />}
        {activeTab === 'settings' && <SettingsView token={token} />}
      </div>

      <AnimatePresence>
        {/* Create User Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-black/20 backdrop-blur-md" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white w-full max-w-md rounded-[40px] p-12 relative border border-gray-200 shadow-2xl">
              <h3 className="text-2xl font-black italic mb-8 text-gray-900 leading-tight">Создать нового пользователя</h3>
              <form onSubmit={handleAddUser} className="space-y-6">
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-4 mb-2 block">Личные данные</label>
                  <input name="fullName" required placeholder="Полное имя" className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 text-gray-900 focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all outline-none" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <input name="username" required placeholder="Логин" className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 text-gray-900 focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all outline-none" />
                  <input name="password" required type="password" placeholder="Пароль" className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 text-gray-900 focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all outline-none" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-4 mb-2 block">Роль в системе</label>
                  <select name="role" className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 text-gray-900 focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all outline-none appearance-none">
                    <option value="client">Клиент</option>
                    <option value="support">Поддержка</option>
                    <option value="admin">Администратор</option>
                  </select>
                </div>
                <button className="w-full py-5 bg-blue-500 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-blue-500/20 hover:bg-blue-600 transition-all">Создать аккаунт</button>
              </form>
            </motion.div>
          </div>
        )}

        {/* Delete Options Modal */}
        {deleteModal.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDeleteModal({ isOpen: false, user: null })} className="absolute inset-0 bg-red-950/20 backdrop-blur-md" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white w-full max-w-xl rounded-[40px] p-12 relative border border-gray-200 shadow-2xl">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-14 h-14 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center shadow-lg shadow-red-500/10">
                  <ShieldAlert size={32} />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-gray-900 italic">Удаление пользователя</h3>
                  <p className="text-gray-500 text-sm font-medium">Выберите метод удаления для <span className="text-gray-900 font-bold">{deleteModal.user?.full_name}</span></p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
                <button 
                  onClick={() => handleDeleteUser('soft')}
                  className="p-8 bg-gray-50 rounded-[32px] border border-gray-100 text-left hover:border-blue-200 hover:bg-blue-50/30 transition-all group"
                >
                  <div className="w-10 h-10 bg-white border border-gray-200 rounded-xl flex items-center justify-center mb-6 group-hover:border-blue-200">
                    <Users size={20} className="text-blue-500" />
                  </div>
                  <h4 className="text-lg font-bold text-gray-900 mb-2">Только профиль</h4>
                  <p className="text-xs text-gray-500 leading-relaxed">Пользователь будет отключен, но его заявки и история сообщений останутся в системе как «Призрак».</p>
                </button>

                <button 
                  onClick={() => {
                    if(confirm(`ВНИМАНИЕ: Все данные пользователя ${deleteModal.user?.username} (заявки, сообщения, файлы) будут удалены из базы. Будет создан бэкап-файл. Продолжить?`)) {
                      handleDeleteUser('hard');
                    }
                  }}
                  className="p-8 bg-gray-50 rounded-[32px] border border-gray-100 text-left hover:border-red-200 hover:bg-red-50/30 transition-all group"
                >
                  <div className="w-10 h-10 bg-white border border-gray-200 rounded-xl flex items-center justify-center mb-6 group-hover:border-red-200">
                    <Trash2 size={20} className="text-red-500" />
                  </div>
                  <h4 className="text-lg font-bold text-gray-900 mb-2">Полное удаление</h4>
                  <p className="text-xs text-gray-500 leading-relaxed">Все заявки, сообщения и папки пользователя будут удалены. Автоматически создается резервная копия.</p>
                </button>
              </div>

              <button 
                onClick={() => setDeleteModal({ isOpen: false, user: null })}
                className="w-full py-4 text-gray-400 font-bold uppercase tracking-widest text-[10px] hover:text-gray-600 transition-colors"
              >
                Отмена
              </button>
            </motion.div>
          </div>
        )}

        {/* Restore Report Modal */}
        {restoreModal.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setRestoreModal({ isOpen: false, backup: null, report: null })} className="absolute inset-0 bg-blue-950/20 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white w-full max-w-lg rounded-[40px] p-12 relative border border-gray-200 shadow-2xl">
              <h3 className="text-2xl font-black text-gray-900 italic mb-4">Восстановление данных</h3>
              
              {!restoreModal.report ? (
                <>
                  <p className="text-gray-500 mb-8 leading-relaxed">
                    Вы собираетесь восстановить данные пользователя <span className="text-gray-900 font-bold">{restoreModal.backup?.fullName}</span>.
                    Существующие данные не будут затронуты, будут добавлены только отсутствующие заявки и сообщения.
                  </p>
                  <div className="bg-blue-50 rounded-2xl p-6 mb-10 border border-blue-100">
                    <div className="flex items-center gap-3 text-blue-700 font-bold text-sm mb-2">
                      <ShieldAlert size={18} /> Отчет о восстановлении
                    </div>
                    <ul className="space-y-2 text-xs text-blue-800/80 font-medium">
                      <li>• Проверка существования пользователя: {restoreModal.backup?.username}</li>
                      <li>• Оценка тикетов для восстановления: {restoreModal.backup?.ticketCount} шт.</li>
                      <li>• Восстановление медиафайлов: Не поддерживается в текущей версии (только база)</li>
                    </ul>
                  </div>
                  <div className="flex gap-4">
                    <button 
                      onClick={() => setRestoreModal({ isOpen: false, backup: null, report: null })}
                      className="flex-1 py-4 text-gray-400 font-bold uppercase tracking-widest text-[10px]"
                    >
                      Отмена
                    </button>
                    <button 
                      onClick={() => handleRestore(restoreModal.backup?.filename)}
                      className="flex-1 py-4 bg-blue-500 text-white rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-blue-500/20"
                    >
                      Начать
                    </button>
                  </div>
                </>
              ) : (
                <div className="text-center">
                  <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle2 size={32} />
                  </div>
                  <h4 className="text-xl font-bold text-gray-900 mb-2">Готово!</h4>
                  <p className="text-gray-500 text-sm mb-8">Восстановление успешно завершено</p>
                  
                  <div className="bg-gray-50 rounded-2xl p-6 mb-10 text-left border border-gray-100">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-white rounded-xl border border-gray-100">
                        <span className="block text-2xl font-black text-gray-900">{restoreModal.report?.ticketsRestored}</span>
                        <span className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">Тикетов</span>
                      </div>
                      <div className="p-4 bg-white rounded-xl border border-gray-100">
                        <span className="block text-2xl font-black text-gray-900">{restoreModal.report?.messagesRestored}</span>
                        <span className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">Сообщений</span>
                      </div>
                    </div>
                  </div>

                  <button 
                    onClick={() => setRestoreModal({ isOpen: false, backup: null, report: null })}
                    className="w-full py-5 bg-gray-900 text-white rounded-2xl font-black uppercase tracking-widest"
                  >
                    Закрыть
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
