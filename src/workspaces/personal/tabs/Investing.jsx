import React, { useState, useMemo } from 'react';
import { Target, Landmark, Calculator, ArrowUpRight } from 'lucide-react';
import useAppStore from '../../../store/useAppStore';
import { fmt, fmtDate, daysFrom } from '../../../shared/utils/format';
import { calcDepositIncome } from '../../../shared/utils/deposit';

export default function Investing() {
  const deposits = useAppStore(s => s.deposits ?? []);
  const totalDeposits = deposits.reduce((sum, d) => sum + Number(d.amount), 0);

  // Состояния для калькулятора вкладов
  const [calcAmount, setCalcAmount] = useState('100000');
  const [calcRate, setCalcRate] = useState('16');
  const [calcMonths, setCalcMonths] = useState('12');

  const calcResult = useMemo(() => {
    if (!calcAmount || !calcRate || !calcMonths) return null;
    const start = new Date().toISOString().split('T')[0];
    const end = daysFrom(Math.round(Number(calcMonths) * 30.44)); // переводим месяцы в дни
    return calcDepositIncome(Number(calcAmount), Number(calcRate), start, end, true);
  }, [calcAmount, calcRate, calcMonths]);

  const inCls = "w-full bg-white p-4 rounded-2xl outline-none font-bold text-slate-900 border border-slate-200 focus:border-emerald-300 focus:ring-2 ring-emerald-100 transition-all text-sm";
  const lCls = "text-[10px] uppercase font-black text-slate-400 ml-1 mb-1.5 block tracking-widest";

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-300">
      
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-emerald-600 rounded-[16px] text-white flex items-center justify-center shadow-lg shadow-emerald-200">
          <Target size={24} />
        </div>
        <div>
          <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">Капитал</h2>
          <p className="text-sm text-slate-500 font-medium">Ваши активы и накопления</p>
        </div>
      </div>

      {/* ─── МОИ ВКЛАДЫ ─── */}
      <div className="bg-white rounded-[24px] md:rounded-[40px] border border-slate-100 shadow-sm p-6 md:p-8">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-black text-xl text-slate-900 flex items-center gap-2"><Landmark size={20} className="text-emerald-500"/> Мои вклады</h3>
          <div className="bg-emerald-50 px-4 py-2 rounded-xl text-emerald-700 font-black text-sm">Итого: {fmt(totalDeposits)}</div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {deposits.length === 0 ? (
            <p className="text-slate-400 text-sm font-medium col-span-full">У вас пока нет активных вкладов.</p>
          ) : deposits.map(dep => (
            <div key={dep.id} className="p-5 border border-slate-100 bg-slate-50 rounded-[24px]">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <div className="font-black text-slate-900">{dep.name}</div>
                  <div className="text-[11px] text-slate-400 font-bold mt-1">До {fmtDate(dep.endDate)}</div>
                </div>
                <div className="bg-white px-2 py-1 rounded-lg text-emerald-600 font-black text-xs shadow-sm">{dep.rate}%</div>
              </div>
              <div className="text-2xl font-black text-slate-900">{fmt(dep.amount)}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ─── КАЛЬКУЛЯТОР ВЛОЖЕНИЙ ─── */}
      <div className="bg-slate-100 rounded-[24px] md:rounded-[40px] p-6 md:p-8">
        <h3 className="font-black text-xl text-slate-900 flex items-center gap-2 mb-6"><Calculator size={20} className="text-slate-500"/> Калькулятор сложного процента</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <label className={lCls}>Сумма вклада ₽</label>
            <input type="number" className={inCls} value={calcAmount} onChange={e => setCalcAmount(e.target.value)} />
          </div>
          <div>
            <label className={lCls}>Ставка % годовых</label>
            <input type="number" className={inCls} value={calcRate} onChange={e => setCalcRate(e.target.value)} />
          </div>
          <div>
            <label className={lCls}>Срок (месяцев)</label>
            <input type="number" className={inCls} value={calcMonths} onChange={e => setCalcMonths(e.target.value)} />
          </div>
        </div>

        {calcResult && (
          <div className="bg-slate-900 text-white p-6 rounded-[24px] flex flex-col md:flex-row justify-between md:items-center gap-4 shadow-xl">
            <div>
              <div className="text-[10px] text-emerald-400 font-black uppercase tracking-widest mb-1">Итоговая сумма через {calcMonths} мес.</div>
              <div className="text-3xl md:text-4xl font-black">{fmt(calcResult.total)}</div>
            </div>
            <div className="text-emerald-400 font-bold text-sm bg-white/10 px-4 py-2 rounded-xl flex items-center gap-2"><ArrowUpRight size={16}/> Чистый доход: {fmt(calcResult.income)}</div>
          </div>
        )}
      </div>
    </div>
  );
}