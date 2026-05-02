import React, { useState } from 'react';
import { Wallet, CheckCircle2, RotateCcw, Archive, Check, Trash2 } from 'lucide-react';
import useAppStore from '../../../store/useAppStore';
import { fmt, getDaysDiff } from '../../../shared/utils/format';
import KpiCard from '../../../shared/components/KpiCard';
import DaysBadge from '../../../shared/components/DaysBadge';
import ConfirmModal from '../../../shared/modals/ConfirmModal';

export default function Dashboard() {
  const { debts, freeMoney, markPaid, undoPaid, deleteDebt } = useAppStore();
  const [showArchived, setShowArchived] = useState(false);
  const [confirm, setConfirm] = useState(null); // Состояние для модалки

  // Разделяем активные и закрытые долги
  const activeDebts = debts.filter(d => d.status !== 'archived');
  const archivedDebts = debts.filter(d => d.status === 'archived');

  // Считаем метрики (KPI)
  const totalDebt = activeDebts.reduce((a, d) => a + Number(d.balance || 0), 0);
  const totalMinPaymentLeft = activeDebts.reduce((a, d) => a + (d.isPaidThisMonth ? 0 : Number(d.minPayment || 0)), 0);
  const overdueCount = activeDebts.filter(d => !d.isPaidThisMonth && getDaysDiff(d.nextPaymentDate) < 0).length;

  // Логика подтверждения удаления
  const requestDelete = (id) => setConfirm({
    title: 'Удалить долг?', 
    message: 'Это действие нельзя отменить. Вся история платежей по этому долгу будет удалена.',
    onConfirm: () => { deleteDebt(id); setConfirm(null); }
  });

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-300">
      
      {/* ─── СЕТКА МЕТРИК (KPI) ─── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6">
        <KpiCard title="Общий долг" value={fmt(totalDebt)} subValue={`${activeDebts.length} активных`} bg="bg-emerald-600" textInverse={true} />
        <KpiCard title="К оплате в мес." value={fmt(totalMinPaymentLeft)} subValue="осталось внести" color="text-slate-900" />
        <KpiCard title="Свободные деньги" value={fmt(freeMoney)} subValue="на досрочку" color="text-emerald-600" />
        <KpiCard title="Просрочено" value={overdueCount} subValue={overdueCount > 0 ? 'Требует внимания!' : 'Всё по графику ✓'} color={overdueCount > 0 ? 'text-red-500' : 'text-slate-900'} />
      </div>

      {/* ─── СПИСОК ДОЛГОВ ─── */}
      <div className="bg-white rounded-[24px] md:rounded-[40px] border border-slate-100 shadow-sm p-4 md:p-8">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-black text-xl md:text-2xl text-slate-900">Список платежей</h3>
          {archivedDebts.length > 0 && (
            <button onClick={() => setShowArchived(!showArchived)} className="text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-50 px-3 py-2 rounded-xl flex items-center gap-2 hover:bg-slate-100 transition-colors">
              <Archive size={14}/> {showArchived ? 'Скрыть архив' : 'Архив'}
            </button>
          )}
        </div>

        <div className="space-y-4">
          {activeDebts.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-3">🎉</div>
              <p className="font-bold text-slate-400">Активных долгов нет!</p>
            </div>
          ) : (
            activeDebts.sort((a,b) => getDaysDiff(a.nextPaymentDate) - getDaysDiff(b.nextPaymentDate)).map(d => {
              const days = getDaysDiff(d.nextPaymentDate);
              return (
                <div key={d.id} className={`p-5 rounded-[24px] border transition-all ${d.isPaidThisMonth ? 'bg-slate-50 border-slate-100 opacity-60' : days < 0 ? 'bg-red-50/30 border-red-100' : 'bg-white border-slate-100 shadow-sm'}`}>
                  <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                    
                    {/* Иконка и Название */}
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-slate-100 rounded-[16px] flex items-center justify-center text-slate-400 shrink-0"><Wallet size={20}/></div>
                      <div>
                        <h4 className="font-black text-base text-slate-900">{d.name}</h4>
                        <p className="text-[11px] text-slate-400 font-medium">Остаток: {fmt(d.balance)} · {d.rate}% год.</p>
                      </div>
                    </div>

                    {/* Сумма и Кнопки действий */}
                    <div className="flex items-center justify-between md:justify-end gap-4">
                      <div className="text-left md:text-right">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Платёж</p>
                        <p className="text-lg font-black text-slate-900">{fmt(d.minPayment)}</p>
                      </div>
                      
                      <DaysBadge days={days} paid={d.isPaidThisMonth}/>
                      
                      <div className="flex gap-1">
                        <button onClick={() => requestDelete(d.id)} className="w-10 h-10 flex items-center justify-center text-slate-300 hover:text-red-500 bg-slate-50 rounded-xl transition-colors"><Trash2 size={16}/></button>
                        {d.isPaidThisMonth 
                          ? <button onClick={() => undoPaid(d.id)} className="w-10 h-10 flex items-center justify-center text-orange-400 bg-orange-50 rounded-xl transition-colors hover:bg-orange-100"><RotateCcw size={16}/></button>
                          : <button onClick={() => markPaid(d.id)} className="px-4 h-10 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase flex items-center gap-2 hover:bg-emerald-600 transition-colors"><CheckCircle2 size={16}/> Оплатить</button>
                        }
                      </div>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* ─── ЗАКРЫТЫЕ ДОЛГИ (АРХИВ) ─── */}
        {showArchived && archivedDebts.length > 0 && (
          <div className="mt-8 pt-8 border-t border-slate-100 animate-in fade-in">
            <h4 className="font-black text-slate-400 uppercase tracking-widest text-[10px] mb-4">Закрытые долги</h4>
            <div className="space-y-3">
              {archivedDebts.map(d => (
                <div key={d.id} className="p-4 rounded-[20px] bg-slate-50 border border-slate-100 flex justify-between items-center opacity-70">
                  <div><span className="font-bold text-slate-900 text-sm">{d.name}</span> <span className="text-xs text-slate-400 ml-2">Закрыт</span></div>
                  <Check className="text-emerald-500" size={18}/>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Вызов нашей переиспользуемой модалки */}
      <ConfirmModal isOpen={!!confirm} title={confirm?.title} message={confirm?.message} onConfirm={confirm?.onConfirm} onCancel={() => setConfirm(null)} />
    </div>
  );
}