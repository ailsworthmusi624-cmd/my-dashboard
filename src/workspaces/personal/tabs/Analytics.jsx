import React from 'react';
import { PieChart, Flame, Wallet, AlertCircle } from 'lucide-react';
import useAppStore from '../../../store/useAppStore';
import { fmt } from '../../../shared/utils/format';

export default function Analytics() {
  const debts = useAppStore(s => s.debts ?? []);
  const activeDebts = debts.filter(d => d.status !== 'archived');
  const totalDebt = activeDebts.reduce((sum, d) => sum + Number(d.balance), 0);

  // Сортируем долги по убыванию ставки (самые "дорогие" сверху)
  const sortedByRate = [...activeDebts].sort((a, b) => (b.rate || 0) - (a.rate || 0));
  
  // Сортируем для прогресс-бара по размеру долга
  const sortedByBalance = [...activeDebts].sort((a, b) => (b.balance || 0) - (a.balance || 0));

  // Палитра для прогресс-бара
  const colors = ['bg-emerald-500', 'bg-teal-400', 'bg-cyan-400', 'bg-sky-400', 'bg-blue-400', 'bg-indigo-400', 'bg-violet-400'];

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-300">
      
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-emerald-600 rounded-[16px] text-white flex items-center justify-center shadow-lg shadow-emerald-200">
          <PieChart size={24} />
        </div>
        <div>
          <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">Аналитика</h2>
          <p className="text-sm text-slate-500 font-medium">Структура и стоимость ваших долгов</p>
        </div>
      </div>

      {/* ─── СТРУКТУРА ДОЛГА (ТАЙЛВИНД БАР) ─── */}
      <div className="bg-white rounded-[24px] md:rounded-[40px] border border-slate-100 shadow-sm p-6 md:p-8">
        <h3 className="font-black text-xl text-slate-900 mb-6 flex items-center gap-2"><Wallet size={20} className="text-emerald-500"/> Структура долга</h3>
        
        {totalDebt === 0 ? (
          <p className="text-slate-400 text-sm font-medium">Нет активных долгов для анализа.</p>
        ) : (
          <>
            {/* Сам прогресс-бар */}
            <div className="w-full h-8 bg-slate-100 rounded-full overflow-hidden flex mb-6 shadow-inner">
              {sortedByBalance.map((d, i) => {
                const percent = (Number(d.balance) / totalDebt) * 100;
                return (
                  <div key={d.id} title={`${d.name} (${Math.round(percent)}%)`} className={`${colors[i % colors.length]} h-full transition-all hover:brightness-110 cursor-pointer`} style={{ width: `${percent}%` }} />
                );
              })}
            </div>
            
            {/* Легенда */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {sortedByBalance.map((d, i) => (
                <div key={d.id} className="flex items-center gap-3 bg-slate-50 p-3 rounded-2xl">
                  <div className={`w-3 h-3 rounded-full ${colors[i % colors.length]} shrink-0`} />
                  <div className="truncate">
                    <div className="text-xs font-bold text-slate-900 truncate">{d.name}</div>
                    <div className="text-[10px] text-slate-500 font-medium">{Math.round((Number(d.balance) / totalDebt) * 100)}% · {fmt(d.balance)}</div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* ─── АНТИ-РЕЙТИНГ ПО СТАВКАМ ─── */}
      <div className="bg-white rounded-[24px] md:rounded-[40px] border border-slate-100 shadow-sm p-6 md:p-8">
        <h3 className="font-black text-xl text-slate-900 mb-6 flex items-center gap-2"><Flame size={20} className="text-red-500"/> Токсичные долги (по ставке)</h3>
        <div className="space-y-3">
          {sortedByRate.map(d => (
            <div key={d.id} className={`p-4 rounded-[20px] flex justify-between items-center border ${d.rate > 20 ? 'bg-red-50/50 border-red-100' : 'bg-slate-50 border-slate-100'}`}>
              <div className="font-bold text-slate-900 text-sm">{d.name}</div>
              <div className={`text-lg font-black ${d.rate > 20 ? 'text-red-600' : 'text-slate-700'}`}>{d.rate}% <span className="text-[10px] font-medium text-slate-500">год.</span></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}