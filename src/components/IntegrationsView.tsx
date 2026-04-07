import React from 'react';
import { Terminal, Globe, MessageSquare, Zap, Copy, Check } from 'lucide-react';
import { useState } from 'react';

export function IntegrationsView() {
  const [copied, setCopied] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="p-8 space-y-8 overflow-y-auto h-full pb-20">
      <div>
        <h3 className="text-2xl font-black italic mb-2">API & Интеграции</h3>
        <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">Документация и внешние модули</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* API Documentation Card */}
        <div className="bg-[#1C1D21] rounded-[32px] p-8 border border-white/5 space-y-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500">
              <Terminal size={24} />
            </div>
            <div>
              <h4 className="text-lg font-black">REST API</h4>
              <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest">Взаимодействие через HTTP</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-black/40 rounded-2xl p-6 border border-white/5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">GET /api/external/tickets</span>
                <button onClick={() => copyToClipboard('GET /api/external/tickets', 'api1')} className="text-gray-500 hover:text-white transition-colors">
                  {copied === 'api1' ? <Check size={14} /> : <Zap size={14} />}
                </button>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">Получение списка всех заявок. Требует заголовок <code>X-API-Key</code>.</p>
            </div>

            <div className="bg-black/40 rounded-2xl p-6 border border-white/5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-black text-green-400 uppercase tracking-widest">POST /api/external/tickets</span>
                <button onClick={() => copyToClipboard('POST /api/external/tickets', 'api2')} className="text-gray-500 hover:text-white transition-colors">
                  {copied === 'api2' ? <Check size={14} /> : <Zap size={14} />}
                </button>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">Создание новой заявки от имени клиента. Параметры: subject, description, clientUsername.</p>
            </div>
          </div>

          <button className="w-full py-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border border-white/5">
            Открыть полную документацию (api_help.md)
          </button>
        </div>

        {/* Webhooks Card */}
        <div className="bg-[#1C1D21] rounded-[32px] p-8 border border-white/5 space-y-6 opacity-50 grayscale cursor-not-allowed">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-500">
              <Globe size={24} />
            </div>
            <div>
              <h4 className="text-lg font-black">Webhooks</h4>
              <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest">Уведомления в реальном времени</p>
            </div>
          </div>
          <p className="text-xs text-gray-500 italic">Модуль в разработке. Позволит отправлять данные о новых тикетах на ваш URL.</p>
        </div>

        {/* Telegram Bot Card */}
        <div className="bg-[#1C1D21] rounded-[32px] p-8 border border-white/5 space-y-6 opacity-50 grayscale cursor-not-allowed">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-sky-500/10 flex items-center justify-center text-sky-500">
              <MessageSquare size={24} />
            </div>
            <div>
              <h4 className="text-lg font-black">Telegram Bot</h4>
              <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest">Поддержка в мессенджере</p>
            </div>
          </div>
          <p className="text-xs text-gray-500 italic">Модуль в разработке. Позволит клиентам создавать заявки через Telegram.</p>
        </div>
      </div>
    </div>
  );
}
