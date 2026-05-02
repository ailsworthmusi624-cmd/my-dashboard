import React from 'react';

export default function DaysBadge({ days, paid }) {
  if (paid) return <span className="text-[10px] font-black px-3 py-1.5 rounded-[12px] bg-emerald-50 text-emerald-600 uppercase tracking-widest">Оплачено</span>;
  if (days < 0) return <span className="text-[10px] font-black px-3 py-1.5 rounded-[12px] bg-red-50 text-red-600 uppercase tracking-widest">Просрочка</span>;
  if (days === 0) return <span className="text-[10px] font-black px-3 py-1.5 rounded-[12px] bg-orange-50 text-orange-600 uppercase tracking-widest">Сегодня</span>;
  if (days <= 3) return <span className="text-[10px] font-black px-3 py-1.5 rounded-[12px] bg-orange-50 text-orange-500 uppercase tracking-widest">{days} дн.</span>;
  
  return <span className="text-[10px] font-black px-3 py-1.5 rounded-[12px] bg-slate-50 text-slate-500 uppercase tracking-widest">{days} дн.</span>;
}