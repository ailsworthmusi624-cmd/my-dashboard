import React, { useState, useMemo } from 'react';
import { Calculator, TrendingDown, Clock, CheckCircle2 } from 'lucide-react';
import useAppStore from '../../../store/useAppStore';
import { fmt } from '../../../shared/utils/format';
import { calcEarlyPayoff, calcAnnuitySchedule } from '../../../shared/utils/finance';

export default function Calculators() {
  const debts = useAppStore(s => s.debts ?? []);
  const activeDebts = debts.filter(d => d.status !== 'archived');
  
  const [selectedId, setSelectedId] = useState(activeDebts[0]?.id || '');
  const [extraPayment, setExtraPayment] = useState('5000');

  const selectedDebt = activeDebts.find(d => d.id == selectedId);

  const result = useMemo(() => {
    if (!selectedDebt || !extraPayment || isNaN(extraPayment)) return null;
    // Используем нашу финансовую утилиту для симуляции досрочного погашения
    return calcEarlyPayoff(
      Number(selectedDebt.balance),
      Number(selectedDebt.rate),
      Number(selectedDebt.minPayment),
      Number(extraPayment)
    );
  }, [selectedDebt, extraPayment]);

  const inCls = "w-full bg-slate-50 p-4 rounded-2xl outline-none font-bold text-slate-900 border border-transparent focus:border-emerald-300 focus:ring-2 ring-emerald-100 transition-all text-sm";
  const lCls = "text-[10px] uppercase font-black text-slate-400 ml-1 mb-1.5 block tracking-widest";

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-300">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-emerald-600 rounded-[16px] text-white flex items-center justify-center shadow-lg shadow-emerald-200">
          <Calculator size={24} />
        </div>
        <div>
          <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">Калькулятор досрочки</h2>
          <p className="text-sm text-slate-500 font-medium">Узнайте, сколько вы сэкономите на переплате банку</p>
        </div>
      </div>

      <div className="bg-white rounded-[24px] md:rounded-[40px] border border-slate-100 shadow-sm p-6 md:p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div>
            <label className={lCls}>Выберите кредит</label>
            <select className={inCls} value={selectedId} onChange={e => setSelectedId(e.target.value)}>
              {activeDebts.map(d => (
                <option key={d.id} value={d.id}>{d.name} ({d.rate}% — остаток {fmt(d.balance)})</option>
              ))}
            </select>
          </div>
          <div>
            <label className={lCls}>Доп. платёж в месяц ₽</label>
            <input type="number" className={inCls} value={extraPayment} onChange={e => setExtraPayment(e.target.value)} placeholder="Например, 5000" />
          </div>
        </div>

        {selectedDebt && result && isFinite(result.baseMon) && (
          <div className="bg-slate-50 rounded-[24px] p-6 border border-slate-100">
            <h3 className="font-black text-slate-900 text-lg mb-5 flex items-center gap-2">
              <CheckCircle2 className="text-emerald-500" size={20} /> Результат симуляции
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white p-5 rounded-2xl shadow-sm">
                <div className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-2 flex items-center gap-1"><TrendingDown size={14}/> Сэкономлено на %</div>
                <div className="text-3xl font-black text-emerald-600">{fmt(result.savedMoney)}</div>
                <div className="text-[11px] text-slate-400 mt-1 font-medium">Ваша чистая выгода</div>
              </div>
              
              <div className="bg-white p-5 rounded-2xl shadow-sm">
                <div className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-2 flex items-center gap-1"><Clock size={14}/> Сокращение срока</div>
                <div className="text-3xl font-black text-emerald-600">−{result.savedMon} мес.</div>
                <div className="text-[11px] text-slate-400 mt-1 font-medium">Закроете за {result.extraMon} мес. вместо {result.baseMon} мес.</div>
              </div>
            </div>
          </div>
        )}
        {selectedDebt && result && !isFinite(result.baseMon) && (
          <div className="p-4 bg-red-50 text-red-600 font-bold rounded-2xl text-sm">Текущий минимальный платёж не покрывает проценты! Долг будет расти.</div>
        )}
      </div>
    </div>
  );
}