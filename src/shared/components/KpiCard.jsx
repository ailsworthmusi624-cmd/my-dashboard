import React from 'react';

export default function KpiCard({ title, value, subValue, color = "text-slate-900", bg = "bg-white", textInverse = false }) {
  return (
    <div className={`${bg} p-5 md:p-6 rounded-[24px] md:rounded-[32px] border ${textInverse ? 'border-transparent' : 'border-slate-100'} shadow-sm`}>
      <div className={`text-[10px] font-black uppercase tracking-widest mb-2 ${textInverse ? 'opacity-70 text-white' : 'text-slate-400'}`}>
        {title}
      </div>
      <div className={`text-2xl md:text-3xl font-black truncate ${textInverse ? 'text-white' : color}`}>
        {value}
      </div>
      {subValue && (
        <div className={`text-[10px] md:text-[11px] mt-2 font-medium ${textInverse ? 'text-white/80' : 'text-slate-400'}`}>
          {subValue}
        </div>
      )}
    </div>
  );
}