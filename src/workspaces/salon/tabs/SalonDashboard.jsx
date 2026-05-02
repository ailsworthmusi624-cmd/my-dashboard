import React, { useState, useMemo } from 'react';
import { AlertCircle, Target, Users, Banknote, Calendar, Wallet } from 'lucide-react';
import useAppStore from '../../../store/useAppStore';
import { fmt } from '../../../shared/utils/format';

export default function SalonDashboard() {
  const journal = useAppStore(s => s.journal ?? []);
  const expenses = useAppStore(s => s.expenses ?? []);
  const masters = useAppStore(s => s.masters ?? []);
  const advances = useAppStore(s => s.advances ?? []);
  const globalPlans = useAppStore(s => s.salon?.globalPlans ?? {});

  const today = new Date();
  const [startDate, setStartDate] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(() => new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0]);

  const metrics = useMemo(() => {
    const fJournal = journal.filter(e => e.date >= startDate && e.date <= endDate);
    const fExpenses = expenses.filter(e => e.date >= startDate && e.date <= endDate);
    const fAdvances = advances.filter(a => a.date >= startDate && a.date <= endDate);

    let revenue = 0;
    let bankCommission = 0;
    let payroll = 0;
    
    const mastersData = {};
    masters.forEach(m => { mastersData[m.name] = { id: m.id, name: m.name, gross: 0, salary: 0, advances: 0, toPay: 0 }; });

    fAdvances.forEach(adv => {
      const m = masters.find(m => m.id === adv.masterId);
      if (m && mastersData[m.name]) mastersData[m.name].advances += Number(adv.amount);
    });

    fJournal.forEach(entry => {
      const method = entry.paymentMethod || 'cash';
      let entryRevenue = 0;
      let entryPayroll = 0;
      
      if (entry.services) {
        entry.services.forEach(svc => {
          const amt = Number(svc.amount) || 0;
          const rate = Number(svc.rate) || 0;
          entryRevenue += amt;
          entryPayroll += amt * (rate / 100);
        });
      }
      
      revenue += entryRevenue;
      payroll += entryPayroll;
      
      if (method === 'card') bankCommission += entryRevenue * 0.029;
      else if (method === 'sbp') bankCommission += entryRevenue * 0.007;

      if (mastersData[entry.masterName]) {
        mastersData[entry.masterName].gross += entryRevenue;
        mastersData[entry.masterName].salary += entryPayroll;
      }
    });

    const opEx = fExpenses.reduce((s, e) => s + (Number(e.amount) || 0), 0) + payroll;
    const usnTax = revenue * 0.06;
    const netProfit = revenue - bankCommission - opEx - usnTax;
    
    const margin = revenue > 0 ? (netProfit / revenue) * 100 : 0;
    const breakEven = margin > 0 ? opEx / (margin / 100) : 0;
    const safetyMargin = revenue > 0 ? ((revenue - breakEven) / revenue) * 100 : 0;
    
    const planTotal = globalPlans.revenue || 0;
    const planProgress = planTotal > 0 ? (revenue / planTotal) * 100 : 0;
    const clientsCount = fJournal.length;
    const avgCheck = clientsCount > 0 ? revenue / clientsCount : 0;

    // Расчет Run Rate (Прогноза)
    const start = new Date(startDate);
    const end = new Date(endDate);
    const now = new Date();
    
    const totalDays = Math.max(1, Math.ceil((end - start) / 86400000) + 1);
    let daysPassed = totalDays;
    if (now >= start && now <= end) daysPassed = Math.max(1, Math.ceil((now - start) / 86400000) + 1);
    else if (now < start) daysPassed = 1;
    
    const runRate = (revenue / daysPassed) * totalDays;

    let totalToPay = 0;
    const mastersList = Object.values(mastersData).map(m => {
      m.toPay = m.salary - m.advances;
      totalToPay += m.toPay;
      return m;
    }).sort((a,b) => b.gross - a.gross);

    return {
      revenue, netProfit, margin, breakEven, safetyMargin, planTotal, planProgress, runRate,
      clientsCount, avgCheck, mastersList, totalToPay,
      taxReserveTarget: revenue * 0.03, insuranceFund: netProfit > 0 ? netProfit * 0.1 : 0
    };
  }, [journal, expenses, masters, advances, globalPlans, startDate, endDate]);

  const alerts = [];
  if (metrics.revenue > 0 && metrics.revenue < metrics.breakEven) {
    alerts.push({ type: 'danger', text: `Выручка ниже точки безубыточности на ${fmt(metrics.breakEven - metrics.revenue)} — срочно анализировать` });
  }

  const safeWithdrawal = Math.max(0, metrics.netProfit - metrics.taxReserveTarget - metrics.insuranceFund);

  const KpiBox = ({ label1, value1, sub1, label2, value2, highlight }) => (
    <div className="bg-white p-5 rounded-[24px] shadow-sm border border-slate-100 flex flex-col justify-between h-full hover:shadow-md transition-shadow">
      <div className="mb-4">
        <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{label1}</div>
        <div className={`font-mono text-2xl md:text-3xl font-black ${highlight ? 'text-indigo-600' : 'text-slate-900'}`}>{value1}</div>
        {sub1 && <div className="text-[9px] font-bold text-slate-400 mt-1">{sub1}</div>}
      </div>
      <div className="pt-3 border-t border-slate-50">
        <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">{label2}</div>
        <div className="font-mono text-base font-black text-slate-700">{value2}</div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-300 pb-10">
      
      {/* ─── ШАПКА ─── */}
      <div className="flex flex-col md:flex-row justify-between md:items-end gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-600 text-white rounded-[16px] flex items-center justify-center shadow-lg shadow-indigo-200 shrink-0">
            <Target size={24} />
          </div>
          <div>
            <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">Command Center</h2>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Управление салоном</p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-white border border-slate-100 rounded-2xl p-1.5 shadow-sm">
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-transparent text-slate-900 text-xs font-bold px-2 py-1.5 outline-none" />
          <span className="text-slate-300 font-bold">—</span>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-transparent text-slate-900 text-xs font-bold px-2 py-1.5 outline-none" />
        </div>
      </div>

      {/* ─── АЛЕРТЫ ─── */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((al, i) => (
            <div key={i} className={`p-4 rounded-[20px] border flex items-center gap-3 ${al.type === 'danger' ? 'bg-rose-50 border-rose-100 text-rose-800' : 'bg-amber-50 border-amber-100 text-amber-800'}`}>
              <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${al.type === 'danger' ? 'bg-rose-500' : 'bg-amber-500'}`} />
              <span className="text-sm font-bold">{al.text}</span>
            </div>
          ))}
        </div>
      )}

      {/* ─── SAFE WITHDRAWAL ─── */}
      <div className="bg-emerald-500 rounded-[32px] p-6 md:p-8 text-white shadow-xl shadow-emerald-200 relative overflow-hidden">
        <div className="absolute -right-10 -top-10 w-40 h-40 bg-emerald-400 rounded-full opacity-50 blur-3xl pointer-events-none"></div>
        <div className="flex justify-between items-start mb-2 relative z-10">
          <div>
            <div className="text-[10px] font-black uppercase tracking-widest text-emerald-100 mb-1">Безопасно к выводу сегодня</div>
            <div className="font-mono text-4xl md:text-5xl font-black tracking-tight">{fmt(safeWithdrawal)}</div>
          </div>
          <div className="w-12 h-12 bg-white/20 rounded-[16px] flex items-center justify-center backdrop-blur-md">
            <Wallet size={24} className="text-white" />
          </div>
        </div>
        <p className="text-xs font-medium text-emerald-100 relative z-10">Чистая прибыль за вычетом резервов и фондов (Дивиденды)</p>
      </div>

      {/* ─── СЕТКА KPI ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <KpiBox label1="Выручка (факт)" value1={fmt(metrics.revenue)} sub1={`Прогноз: ${fmt(metrics.runRate)}`} label2={`План: ${fmt(metrics.planTotal)}`} value2={`${metrics.planProgress.toFixed(1)}%`} highlight />
        <KpiBox label1="Чистая прибыль" value1={fmt(metrics.netProfit)} label2="Маржинальность" value2={`${metrics.margin.toFixed(1)}%`} />
        <KpiBox label1="Средний чек" value1={fmt(metrics.avgCheck)} label2="Клиентов за месяц" value2={`${metrics.clientsCount} чел.`} />
        <KpiBox label1="Точка безубыт." value1={fmt(metrics.breakEven)} label2="Запас прочности" value2={`${metrics.safetyMargin.toFixed(1)}%`} />
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* ─── МАСТЕРА И ФОТ ─── */}
        <div className="lg:col-span-2 bg-white rounded-[32px] border border-slate-100 shadow-sm p-6 md:p-8">
          <h3 className="font-black text-xl text-slate-900 mb-6 flex items-center gap-2"><Users className="text-indigo-500" size={20}/> Эффективность мастеров</h3>
          <div className="space-y-3">
            {metrics.mastersList.map(m => (
              <div key={m.id} className="flex justify-between items-center p-4 bg-slate-50 rounded-[20px] border border-slate-100/50 hover:bg-slate-100 transition-colors">
                <span className="font-black text-sm text-slate-900">{m.name}</span>
                <div className="flex gap-6 md:gap-10 text-right">
                  <div><div className="text-[9px] font-black uppercase tracking-widest text-slate-400">Выручка</div><div className="font-mono text-sm font-bold text-slate-700">{fmt(m.gross)}</div></div>
                  <div><div className="text-[9px] font-black uppercase tracking-widest text-slate-400">Зарплата</div><div className="font-mono text-sm font-black text-indigo-600">{fmt(m.toPay)}</div></div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 pt-5 border-t border-slate-100 flex justify-between items-center bg-indigo-50/50 p-5 rounded-[20px]">
            <span className="font-black text-sm uppercase tracking-widest text-indigo-900">К выплате СЕЙЧАС</span>
            <span className="font-mono text-2xl font-black text-indigo-600">{fmt(metrics.totalToPay)}</span>
          </div>
        </div>

        {/* ─── РЕЗЕРВЫ ─── */}
        <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm p-6 md:p-8">
          <h3 className="font-black text-xl text-slate-900 mb-6 flex items-center gap-2"><Wallet className="text-emerald-500" size={20}/> Фонды</h3>
          <div className="space-y-4">
            <div className="p-5 bg-slate-50 rounded-[24px] border border-slate-100">
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Резерв под налог (3%)</div>
              <div className="font-mono text-2xl font-black text-slate-900 mb-2">{fmt(metrics.taxReserveTarget)}</div>
              <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden"><div className="w-0 h-full bg-emerald-500"/></div>
              <div className="text-[9px] font-bold text-slate-400 mt-2 uppercase tracking-widest">Цель по выручке</div>
            </div>
            <div className="p-5 bg-slate-50 rounded-[24px] border border-slate-100">
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Страховой фонд (10%)</div>
              <div className="font-mono text-2xl font-black text-slate-900 mb-2">{fmt(metrics.insuranceFund)}</div>
              <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">От чистой прибыли</div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}