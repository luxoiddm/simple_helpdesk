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
    <div className="p-10 space-y-10 overflow-y-auto h-full pb-20 bg-gray-50">
      <header className="flex items-center justify-between">
        <div>
          <h3 className="text-3xl font-black italic mb-2 text-gray-900">Настройки Системы</h3>
          <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">Конфигурация ядра и сервисов</p>
        </div>
        <button 
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-3 px-8 py-4 bg-blue-500 text-white rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-blue-500/20 hover:bg-blue-600 transition-all disabled:opacity-50"
        >
          <Save size={20} />
          {saving ? 'Сохранение...' : 'Сохранить изменения'}
        </button>
      </header>

      {message && (
        <div className="p-6 bg-blue-50 border border-blue-100 rounded-3xl text-blue-600 text-xs font-bold uppercase tracking-widest flex items-center gap-4">
          <Shield size={20} />
          {message}
        </div>
      )}

      <form onSubmit={handleSave} className="grid grid-cols-1 xl:grid-cols-2 gap-10">
        {/* Security / Admin Note */}
        <div className="col-span-1 xl:col-span-2 p-8 bg-white border border-gray-100 rounded-[40px] flex items-center gap-6 shadow-sm">
          <div className="w-16 h-16 rounded-3xl bg-blue-500 text-white flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Shield size={32} />
          </div>
          <div className="flex-1">
            <h4 className="text-lg font-black italic text-gray-900">Безопасность: Учетная запись администратора</h4>
            <p className="text-xs text-gray-500 mt-2 leading-relaxed">
              Рекомендуется создать персонального пользователя с ролью <strong>admin</strong> в разделе «Пользователи», после чего закомментировать параметры <code>ADMIN_USERNAME</code> и <code>ADMIN_PASSWORD</code> в файле <code>.env</code> для повышения безопасности.
            </p>
          </div>
        </div>

        {/* General Settings */}
        <div className="bg-white rounded-[40px] p-10 border border-gray-100 space-y-8 shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <Globe className="text-blue-500" size={24} />
            <h4 className="text-xl font-black italic text-gray-900">Общие</h4>
          </div>
          <div className="space-y-6">
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 ml-4">Название сайта</label>
              <input 
                value={settings.site_name} 
                onChange={(e) => handleChange('site_name', e.target.value)}
                className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 text-gray-900 focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none" 
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 ml-4">API Key (Внешний)</label>
              <input 
                value={settings.api_key} 
                onChange={(e) => handleChange('api_key', e.target.value)}
                className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 text-gray-900 font-mono focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none" 
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 ml-4">JWT Secret</label>
              <input 
                value={settings.jwt_secret} 
                onChange={(e) => handleChange('jwt_secret', e.target.value)}
                className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 text-gray-900 font-mono focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none" 
              />
            </div>
          </div>
        </div>

        {/* Email Settings */}
        <div className="bg-white rounded-[40px] p-10 border border-gray-100 space-y-8 shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <Mail className="text-indigo-500" size={24} />
            <h4 className="text-xl font-black italic text-gray-900">Почта (IMAP/SMTP)</h4>
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div className="col-span-2">
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 ml-4">Email поддержки</label>
              <input 
                value={settings.email_support_addr} 
                onChange={(e) => handleChange('email_support_addr', e.target.value)}
                className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 text-gray-900 focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none" 
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 ml-4">IMAP Хост</label>
              <input 
                value={settings.email_imap_host} 
                onChange={(e) => handleChange('email_imap_host', e.target.value)}
                className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 text-gray-900 focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none" 
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 ml-4">IMAP Порт</label>
              <input 
                value={settings.email_imap_port} 
                onChange={(e) => handleChange('email_imap_port', e.target.value)}
                className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 text-gray-900 focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none" 
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 ml-4">SMTP Хост</label>
              <input 
                value={settings.email_smtp_host} 
                onChange={(e) => handleChange('email_smtp_host', e.target.value)}
                className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 text-gray-900 focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none" 
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 ml-4">SMTP Порт</label>
              <input 
                value={settings.email_smtp_port} 
                onChange={(e) => handleChange('email_smtp_port', e.target.value)}
                className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 text-gray-900 focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none" 
              />
            </div>
            <div className="col-span-2">
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 ml-4">Пароль (IMAP/SMTP)</label>
              <input 
                type="password"
                value={settings.email_imap_pass} 
                onChange={(e) => {
                  handleChange('email_imap_pass', e.target.value);
                  handleChange('email_smtp_pass', e.target.value);
                }}
                className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 text-gray-900 focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none" 
              />
            </div>
          </div>
        </div>

        {/* Database Settings */}
        <div className="bg-white rounded-[40px] p-10 border border-gray-100 space-y-8 shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <Database className="text-rose-500" size={24} />
            <h4 className="text-xl font-black italic text-gray-900">База Данных</h4>
          </div>
          <div className="space-y-6">
            <div className="p-6 bg-rose-50 border border-rose-100 rounded-3xl flex items-start gap-4">
              <AlertTriangle className="text-rose-500 shrink-0" size={20} />
              <p className="text-[10px] text-rose-600 font-bold leading-relaxed uppercase tracking-widest">
                Внимание: Изменение имени базы данных создаст новый файл. Все текущие данные будут недоступны в новом файле.
              </p>
            </div>
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 ml-4">Путь к базе данных SQLite</label>
              <input 
                value={settings.db_path} 
                onChange={(e) => handleChange('db_path', e.target.value)}
                className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 text-gray-900 font-mono focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none" 
              />
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
