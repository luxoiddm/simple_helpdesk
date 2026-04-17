import React, { useState } from 'react';
import { motion } from 'motion/react';

export function NewTicketModal({ onClose, token }: any) {
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ subject, description, priority })
      });
      if (res.ok) {
        onClose();
      } else {
        const data = await res.json();
        alert(data.error || 'Ошибка при создании заявки');
      }
    } catch (err) {
      console.error('Failed to create ticket:', err);
      alert('Ошибка подключения к серверу');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} className="bg-white w-full max-w-lg rounded-3xl p-10 relative border border-gray-100 shadow-2xl">
        <h3 className="text-3xl font-black mb-2 text-gray-900">Создать Заявку</h3>
        <p className="text-gray-500 mb-8 font-medium">Опишите вашу проблему, и наши специалисты придут на помощь.</p>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest ml-4 mb-2 block">Тема обращения</label>
            <input required value={subject} onChange={(e) => setSubject(e.target.value)} type="text" placeholder="Напр: Проблема с доступом к системе" className="w-full bg-gray-50 border border-gray-100 rounded-xl px-6 py-4 text-gray-900 focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none" />
          </div>
          <div>
            <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest ml-4 mb-2 block">Описание</label>
            <textarea required value={description} onChange={(e) => setDescription(e.target.value)} rows={4} placeholder="Опишите детали вашего обращения..." className="w-full bg-gray-50 border border-gray-100 rounded-xl px-6 py-4 text-gray-900 focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none resize-none" />
          </div>
          <div>
            <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest ml-4 mb-2 block">Приоритет</label>
            <div className="flex gap-2 px-4">
              {['low', 'medium', 'high', 'critical'].map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPriority(p)}
                  className={`flex-1 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest border transition-all ${
                    priority === p 
                      ? 'bg-blue-500 text-white border-blue-500 shadow-md' 
                      : 'bg-white text-gray-400 border-gray-100 hover:border-gray-200'
                  }`}
                >
                  {p === 'low' ? 'Низкий' : p === 'medium' ? 'Средний' : p === 'high' ? 'Высокий' : 'Критично'}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-4 pt-4">
            <button type="button" onClick={onClose} className="flex-1 py-4 rounded-xl font-bold uppercase tracking-widest text-gray-400 hover:bg-gray-50 transition-all">Отмена</button>
            <button type="submit" className="flex-1 py-4 bg-blue-500 text-white rounded-xl font-bold uppercase tracking-widest shadow-lg shadow-blue-500/20 hover:bg-blue-600 transition-all active:scale-95">Отправить</button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
