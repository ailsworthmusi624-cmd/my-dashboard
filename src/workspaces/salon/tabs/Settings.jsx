import React, { useState } from 'react';
import { Settings as SettingsIcon, Target } from 'lucide-react';
import useAppStore from '../../../store/useAppStore';
import { fmt } from '../../../shared/utils/format';

export default function Settings() {
  const globalPlans = useAppStore(s => s.salon?.globalPlans ?? { revenue: 0, clients: 0, avgCheck: 0 });
  const updateGlobalPlans = useAppStore(s => s.updateGlobalPlans);
  
  const handleGlobalPlanChange = (field, val) => {
    updateGlobalPlans({ [field]: Number(val) });
  };

  const inCls = "w-full bg-slate-50 border border-slate-100 text-slate-900 font-bold rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 ring-indigo-300 transition-colors";
  const lblCls = "text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block";

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-300 pb-10">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-indigo-600 rounded-[16px] text-white flex items-center justify-center shadow-lg shadow-indigo-200">
          <SettingsIcon size={24} />
        </div>
        <div>
          <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">Настройки</h2>
          <p className="text-sm text-slate-500 font-medium">Управление планами и командой</p>
        </div>
      </div>

      {/* ─── БЛОК А: Глобальные планы салона ─── */}
      <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm p-6 md:p-8">
        <h3 className="font-black text-xl text-slate-900 mb-6 flex items-center gap-2">
          <Target size={20} className="text-indigo-500" /> Целевые показатели салона
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className={lblCls}>План по выручке ₽</label>
            <input type="number" value={globalPlans.revenue || ''} onChange={e => handleGlobalPlanChange('revenue', e.target.value)} placeholder="500000" className={`${inCls} font-mono`} />
          </div>
          <div>
            <label className={lblCls}>План по клиентам</label>
            <input type="number" value={globalPlans.clients || ''} onChange={e => handleGlobalPlanChange('clients', e.target.value)} placeholder="150" className={`${inCls} font-mono`} />
          </div>
          <div>
            <label className={lblCls}>План среднего чека ₽</label>
            <input type="number" value={globalPlans.avgCheck || ''} onChange={e => handleGlobalPlanChange('avgCheck', e.target.value)} placeholder="3300" className={`${inCls} font-mono`} />
          </div>
        </div>
      </div>
    </div>
  );
}