import React, { useState, useEffect } from 'react';
import { Save, AlertTriangle, Shield, Mail, Database, Globe } from 'lucide-react';
import { cn } from '../lib/utils';

export function SettingsView({ token }: { token: string }) {
  const [settings, setSettings] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/admin/settings', { headers: { 'Authorization': `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => {
        setSettings(data);
        setLoading(false);
      });
  }, [token]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ settings })
      });
      const data = await res.json();
      setMessage(data.message);
    } catch (err) {
      setMessage('Ошибка при сохранении настроек');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (key: string, value: string) => {
    setSettings((prev: any) => ({ ...prev, [key]: value }));
  };

  if (loading) return <div className="p-10 text-gray-500 font-bold uppercase tracking-widest text-xs">Загрузка настроек...</div>;

  return (
    <div className="p-10 space-y-10 overflow-y-auto h-full pb-20">
      <header className="flex items-center justify-between">
        <div>
          <h3 className="text-3xl font-black italic mb-2">Настройки Системы</h3>
          <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest">Конфигурация ядра и сервисов</p>
        </div>
        <button 
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-3 px-8 py-4 bg-white text-black rounded-2xl font-black uppercase tracking-widest shadow-xl hover:scale-105 transition-all disabled:opacity-50"
        >
          <Save size={20} />
          {saving ? 'Сохранение...' : 'Сохранить изменения'}
        </button>
      </header>

      {message && (
        <div className="p-6 bg-blue-500/10 border border-blue-500/20 rounded-3xl text-blue-400 text-xs font-bold uppercase tracking-widest flex items-center gap-4">
          <Shield size={20} />
          {message}
        </div>
      )}

      <form onSubmit={handleSave} className="grid grid-cols-1 xl:grid-cols-2 gap-10">
        {/* Security / Admin Note */}
        <div className="col-span-1 xl:col-span-2 p-8 bg-white/5 border border-white/10 rounded-[40px] flex items-center gap-6">
          <div className="w-16 h-16 rounded-3xl bg-white text-black flex items-center justify-center">
            <Shield size={32} />
          </div>
          <div className="flex-1">
            <h4 className="text-lg font-black italic">Безопасность: Учетная запись администратора</h4>
            <p className="text-xs text-gray-400 mt-2 leading-relaxed">
              Рекомендуется создать персонального пользователя с ролью <strong>admin</strong> в разделе «Пользователи», после чего закомментировать параметры <code>ADMIN_USERNAME</code> и <code>ADMIN_PASSWORD</code> в файле <code>.env</code> для повышения безопасности.
            </p>
          </div>
        </div>

        {/* General Settings */}
        <div className="bg-[#1C1D21] rounded-[40px] p-10 border border-white/5 space-y-8">
          <div className="flex items-center gap-4 mb-4">
            <Globe className="text-blue-500" size={24} />
            <h4 className="text-xl font-black italic">Общие</h4>
          </div>
          <div className="space-y-6">
            <div>
              <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3">Название сайта</label>
              <input 
                value={settings.site_name} 
                onChange={(e) => handleChange('site_name', e.target.value)}
                className="w-full bg-black/40 border-none rounded-2xl px-6 py-4 text-white focus:ring-2 focus:ring-white/20" 
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3">API Key (Внешний)</label>
              <input 
                value={settings.api_key} 
                onChange={(e) => handleChange('api_key', e.target.value)}
                className="w-full bg-black/40 border-none rounded-2xl px-6 py-4 text-white font-mono focus:ring-2 focus:ring-white/20" 
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3">JWT Secret</label>
              <input 
                value={settings.jwt_secret} 
                onChange={(e) => handleChange('jwt_secret', e.target.value)}
                className="w-full bg-black/40 border-none rounded-2xl px-6 py-4 text-white font-mono focus:ring-2 focus:ring-white/20" 
              />
            </div>
          </div>
        </div>

        {/* Email Settings */}
        <div className="bg-[#1C1D21] rounded-[40px] p-10 border border-white/5 space-y-8">
          <div className="flex items-center gap-4 mb-4">
            <Mail className="text-purple-500" size={24} />
            <h4 className="text-xl font-black italic">Почта (IMAP/SMTP)</h4>
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div className="col-span-2">
              <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3">Email поддержки</label>
              <input 
                value={settings.email_support_addr} 
                onChange={(e) => handleChange('email_support_addr', e.target.value)}
                className="w-full bg-black/40 border-none rounded-2xl px-6 py-4 text-white focus:ring-2 focus:ring-white/20" 
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3">IMAP Хост</label>
              <input 
                value={settings.email_imap_host} 
                onChange={(e) => handleChange('email_imap_host', e.target.value)}
                className="w-full bg-black/40 border-none rounded-2xl px-6 py-4 text-white focus:ring-2 focus:ring-white/20" 
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3">IMAP Порт</label>
              <input 
                value={settings.email_imap_port} 
                onChange={(e) => handleChange('email_imap_port', e.target.value)}
                className="w-full bg-black/40 border-none rounded-2xl px-6 py-4 text-white focus:ring-2 focus:ring-white/20" 
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3">SMTP Хост</label>
              <input 
                value={settings.email_smtp_host} 
                onChange={(e) => handleChange('email_smtp_host', e.target.value)}
                className="w-full bg-black/40 border-none rounded-2xl px-6 py-4 text-white focus:ring-2 focus:ring-white/20" 
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3">SMTP Порт</label>
              <input 
                value={settings.email_smtp_port} 
                onChange={(e) => handleChange('email_smtp_port', e.target.value)}
                className="w-full bg-black/40 border-none rounded-2xl px-6 py-4 text-white focus:ring-2 focus:ring-white/20" 
              />
            </div>
            <div className="col-span-2">
              <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3">Пароль (IMAP/SMTP)</label>
              <input 
                type="password"
                value={settings.email_imap_pass} 
                onChange={(e) => {
                  handleChange('email_imap_pass', e.target.value);
                  handleChange('email_smtp_pass', e.target.value);
                }}
                className="w-full bg-black/40 border-none rounded-2xl px-6 py-4 text-white focus:ring-2 focus:ring-white/20" 
              />
            </div>
          </div>
        </div>

        {/* Database Settings */}
        <div className="bg-[#1C1D21] rounded-[40px] p-10 border border-white/5 space-y-8">
          <div className="flex items-center gap-4 mb-4">
            <Database className="text-red-500" size={24} />
            <h4 className="text-xl font-black italic">База Данных</h4>
          </div>
          <div className="space-y-6">
            <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-3xl flex items-start gap-4">
              <AlertTriangle className="text-red-500 shrink-0" size={20} />
              <p className="text-[10px] text-red-400 font-bold leading-relaxed uppercase tracking-widest">
                Внимание: Изменение имени базы данных создаст новый файл. Все текущие данные будут недоступны в новом файле.
              </p>
            </div>
            <div>
              <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3">Путь к базе данных SQLite</label>
              <input 
                value={settings.db_path} 
                onChange={(e) => handleChange('db_path', e.target.value)}
                className="w-full bg-black/40 border-none rounded-2xl px-6 py-4 text-white font-mono focus:ring-2 focus:ring-white/20" 
              />
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
