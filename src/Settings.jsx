import React from 'react';
import { Settings as SettingsIcon, Target, Save } from 'lucide-react';
import useAppStore from '../../../store/useAppStore';

export default function Settings() {
  const plans = useAppStore(s => s.salon?.plans ?? {});
  const updateSalonPlans = useAppStore(s => s.updateSalonPlans);

  const handleChange = (field, value) => {
    updateSalonPlans({ [field]: Number(value) });
  };

  const inCls = "w-full bg-slate-50 border border-slate-100 text-slate-900 font-mono font-bold rounded-2xl px-4 py-3.5 focus:outline-none focus:ring-2 ring-purple-300 transition-colors";

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-300">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-purple-600 rounded-[16px] text-white flex items-center justify-center shadow-lg shadow-purple-200">
          <SettingsIcon size={24} />
        </div>
        <div>
          <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">Глобальные планы</h2>
          <p className="text-sm text-slate-500 font-medium">Управление KPI салона</p>
        </div>
      </div>

      <div className="bg-white rounded-[24px] md:rounded-[40px] border border-slate-100 shadow-sm p-6 md:p-8">
        <h3 className="font-black text-xl text-slate-900 mb-6 flex items-center gap-2">
          <Target size={20} className="text-purple-500" /> Целевые показатели (Месяц)
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">План по выручке ₽</label>
            <input type="number" value={plans.totalRevenue || ''} onChange={e => handleChange('totalRevenue', e.target.value)} className={inCls} />
          </div>
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Количество клиентов</label>
            <input type="number" value={plans.totalClients || ''} onChange={e => handleChange('totalClients', e.target.value)} className={inCls} />
          </div>
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Средний чек ₽</label>
            <input type="number" value={plans.avgCheck || ''} onChange={e => handleChange('avgCheck', e.target.value)} className={inCls} />
          </div>
        </div>

        <div className="mt-8 p-6 bg-slate-50 rounded-[24px] border border-slate-100 text-sm text-slate-500 font-medium leading-relaxed">
          <p className="mb-2">Все изменения сохраняются автоматически. Эти KPI используются в дашборде (Command Center) для расчета скорости выполнения планов (Run Rate).</p>
        </div>
      </div>
    </div>
  );
}