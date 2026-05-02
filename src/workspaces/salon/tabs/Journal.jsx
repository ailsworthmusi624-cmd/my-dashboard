import React, { useState } from 'react';
import { BookOpen, PlusCircle, User, Clock } from 'lucide-react';
import useAppStore from '../../../store/useAppStore';
import { fmt, fmtDate } from '../../../shared/utils/format';
import AddJournalModal from '../../../shared/modals/AddJournalModal';

export default function Journal() {
  const journal = useAppStore(s => s.journal ?? []);
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row justify-between md:items-end gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-purple-600 rounded-[16px] text-white flex items-center justify-center shadow-lg shadow-purple-200">
            <BookOpen size={24} />
          </div>
          <div>
            <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">Журнал</h2>
            <p className="text-sm text-slate-500 font-medium">Учёт оказанных услуг</p>
          </div>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="bg-purple-600 text-white px-5 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-purple-200 hover:scale-105 transition-transform w-full md:w-auto">
          <PlusCircle size={20}/> Добавить запись
        </button>
      </div>

      <div className="bg-white rounded-[24px] md:rounded-[40px] border border-slate-100 shadow-sm p-4 md:p-8">
        {journal.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-3">📝</div>
            <p className="font-bold text-slate-400">Журнал пуст. Добавьте первую запись!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {journal.map((entry, idx) => {
              const entryTotal = entry.amount || (entry.services ? entry.services.reduce((s, svc) => s + (svc.amount || 0), 0) : 0);
              return (
                <div key={entry.id || idx} className="p-5 rounded-[24px] border border-white/40 bg-white/60 backdrop-blur-xl shadow-sm hover:shadow-md transition-all">
                  <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-purple-100 rounded-2xl flex items-center justify-center text-purple-600 shadow-inner"><User size={20} /></div>
                      <div>
                        <div className="font-black text-lg text-slate-900">Визит #{String(entry.id).slice(-4)}</div>
                        <div className="text-xs text-slate-500 font-medium flex items-center gap-2 mt-0.5">
                          <Clock size={12}/> {fmtDate(entry.date)} <span className="text-slate-300">|</span> Мастер: <span className="font-bold text-slate-700">{entry.masterName}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-left md:text-right">
                      <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Сумма чека</div>
                      <div className="text-2xl font-black text-purple-600">{fmt(entryTotal)}</div>
                    </div>
                  </div>
                  
                  {entry.services && entry.services.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-slate-200/50"><div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Оказанные услуги</div><div className="space-y-2">{entry.services.map((svc, i) => (<div key={i} className="flex justify-between items-center text-sm font-bold text-slate-700 bg-white/50 p-2.5 rounded-xl"><span>{svc.title} <span className="text-xs text-slate-400 font-medium ml-2">({svc.rate}%)</span></span><span>{fmt(svc.amount)}</span></div>))}</div></div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
      <AddJournalModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
}