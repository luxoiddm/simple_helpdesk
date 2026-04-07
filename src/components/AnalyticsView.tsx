import React from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';

export function AnalyticsView({ stats }: any) {
  return (
    <div className="p-8 flex flex-col h-full overflow-y-auto">
      <header className="mb-10">
        <h2 className="text-4xl font-black tracking-tight">Аналитика</h2>
        <p className="text-gray-500 mt-1 font-bold uppercase tracking-widest text-[10px]">Статистика и показатели эффективности</p>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 mb-8">
        <div className="xl:col-span-2 bg-[#151619] p-8 rounded-2xl border border-white/5">
          <h3 className="text-lg font-bold mb-8">Активность за последние 7 дней</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#4B5563'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#4B5563'}} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1C1D21', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }}
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                />
                <Bar dataKey="count" fill="#FFF" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-[#151619] p-8 rounded-2xl border border-white/5">
          <h3 className="text-lg font-bold mb-8">Распределение по статусам</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.statusData}
                  innerRadius={80}
                  outerRadius={100}
                  paddingAngle={8}
                  dataKey="value"
                >
                  {stats.statusData.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1C1D21', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-4 mt-4">
            {stats.statusData.map((s: any) => (
              <div key={s.name} className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                <span className="text-[10px] font-bold text-gray-400 tracking-wide">{s.name}: {s.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
