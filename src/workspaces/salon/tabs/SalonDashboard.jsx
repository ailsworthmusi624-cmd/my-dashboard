import React, { useState, useMemo } from 'react';
import { AlertCircle, Target, Users, Banknote, Calendar, Wallet, X } from 'lucide-react';
import useAppStore from '../../../store/useAppStore';
import { fmt } from '../../../shared/utils/format';
export default function SalonDashboard() {
  const journal = useAppStore(s => s.journal ?? []);
  const expenses = useAppStore(s => s.expenses ?? []);
  const masters = useAppStore(s => s.masters ?? []);
  const advances = useAppStore(s => s.advances ?? []);
  const globalPlans = useAppStore(s => s.salon?.globalPlans ?? {});

  const today = new Date();
  const currentMonthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  const todayStr = `${currentMonthStr}-${String(today.getDate()).padStart(2, '0')}`;
  const [startDate, setStartDate] = useState(`${currentMonthStr}-01`);
  const [endDate, setEndDate] = useState(todayStr);

  const [isRevenueTrendOpen, setIsRevenueTrendOpen] = useState(false);

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

      if (entry.goods) {
        entry.goods.forEach(g => {
          const amt = Number(g.amount) || 0;
          const rate = Number(g.rate) || 0;
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

    const fixedCosts = fExpenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);
    const variableCosts = payroll + bankCommission + (revenue * 0.06); // Налог и комиссии - тоже переменные расходы
    const netProfit = revenue - fixedCosts - variableCosts;
    
    const margin = revenue > 0 ? (netProfit / revenue) * 100 : 0;
    const cmRatio = revenue > 0 ? (revenue - variableCosts) / revenue : 0; // Маржинальная рентабельность
    const breakEven = cmRatio > 0 ? fixedCosts / cmRatio : 0; // Точка безубыточности
    const safetyMargin = revenue > 0 ? ((revenue - breakEven) / revenue) * 100 : 0; // Запас прочности
    
    const planTotal = masters.reduce((acc, m) => acc + (Number(m.plan) || 0), 0);
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

    // Данные для графика по дням
    const dailyData = (() => {
      const days = {};
      const start = new Date(startDate);
      const end = new Date(endDate);
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const key = d.toISOString().split('T')[0];
        days[key] = { date: key, revenue: 0, fixedCosts: 0, variableCosts: 0, profit: 0 };
      }
      const totalDayCount = Math.max(1, Object.keys(days).length);
      const fixedPerDay = fExpenses.reduce((s, e) => s + (Number(e.amount) || 0), 0) / totalDayCount;
      fJournal.forEach(entry => {
        if (!days[entry.date]) return;
        const entryRev = (entry.services || []).reduce((s, sv) => s + (Number(sv.amount) || 0), 0)
          + (entry.goods || []).reduce((s, g) => s + (Number(g.amount) || 0), 0);
        const entryPayroll = (entry.services || []).reduce((s, sv) => s + (Number(sv.amount) || 0) * (Number(sv.rate) || 0) / 100, 0);
        const commission = entry.paymentMethod === 'card' ? entryRev * 0.029 : entry.paymentMethod === 'sbp' ? entryRev * 0.007 : 0;
        days[entry.date].revenue += entryRev;
        days[entry.date].variableCosts += entryPayroll + commission;
      });
      Object.values(days).forEach(d => {
        d.fixedCosts = fixedPerDay;
        d.profit = Math.max(0, d.revenue - d.fixedCosts - d.variableCosts);
        if (d.revenue === 0) { d.fixedCosts = fixedPerDay; d.variableCosts = 0; d.profit = 0; }
      });
      return Object.values(days).slice(-30);
    })();

    return {
      revenue, netProfit, margin, breakEven, safetyMargin, planTotal, planProgress, runRate,
      clientsCount, avgCheck, mastersList, totalToPay, bankCommission, dailyData,
      taxReserveTarget: revenue * 0.03, insuranceFund: netProfit > 0 ? netProfit * 0.1 : 0
    };
  }, [journal, expenses, masters, advances, globalPlans, startDate, endDate]);

  // Расчет тенденции выручки по месяцам
  const revenueTrends = useMemo(() => {
    const grouped = {};
    journal.forEach(e => {
      const m = e.date.substring(0, 7);
      if (!grouped[m]) grouped[m] = { revenue: 0 };
      const srvRev = (e.services || []).reduce((s, x) => s + (Number(x.amount) || 0), 0);
      const goodsRev = (e.goods || []).reduce((s, x) => s + (Number(x.amount) || 0), 0);
      grouped[m].revenue += (srvRev + goodsRev);
    });
    // Сортируем от новых к старым
    return Object.entries(grouped).sort((a, b) => b[0].localeCompare(a[0])).map(([month, data]) => ({ month, ...data }));
  }, [journal]);

  const alerts = [];
  if (metrics.revenue > 0 && metrics.revenue < metrics.breakEven) {
    alerts.push({ type: 'danger', text: `Выручка ниже точки безубыточности на ${fmt(metrics.breakEven - metrics.revenue)} — срочно анализировать` });
  }

  const safeWithdrawal = Math.max(0, metrics.netProfit - metrics.taxReserveTarget - metrics.insuranceFund);

  const KpiBox = ({ label1, value1, sub1, label2, value2, highlight, onClick }) => (
    <div onClick={onClick} className={`bg-white/70 backdrop-blur-2xl p-6 rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/50 flex flex-col justify-between h-full hover:-translate-y-1 transition-transform duration-300 ${onClick ? 'cursor-pointer' : ''}`}>
      <div className="mb-4">
        <div className="text-[11px] font-black uppercase tracking-wider text-slate-400 mb-2">{label1}</div>
        <div className={`font-mono text-2xl md:text-4xl font-black break-words ${highlight ? 'text-emerald-500' : 'text-slate-900'}`}>{value1}</div>
        {sub1 && <div className="text-[9px] font-bold text-slate-400 mt-1">{sub1}</div>}
      </div>
      <div>
        <div className="text-[10px] font-bold text-slate-400">{label2}</div>
        <div className="font-mono text-sm font-black text-slate-700">{value2}</div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-300 pb-10">

      {/* ─── ШАПКА ─── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-slate-800 to-slate-900 text-white rounded-[16px] flex items-center justify-center shadow-lg shadow-slate-300/50 shrink-0">
            <Target size={24} />
          </div>
          <div>
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">Command Center</h2>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Управление салоном</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {/* ─── SAFE WITHDRAWAL compact ─── */}
          <div className="flex items-center gap-3 bg-emerald-500 rounded-2xl px-5 py-3 text-white shadow-lg shadow-emerald-100">
            <Wallet size={18} className="text-emerald-100 shrink-0" />
            <div>
              <div className="text-[9px] font-black uppercase tracking-widest text-emerald-100">Безопасно к выводу</div>
              <div className="font-mono text-lg font-black leading-tight">{fmt(safeWithdrawal)} ₽</div>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-white/60 backdrop-blur-xl border border-white/80 rounded-2xl p-1.5 shadow-sm">
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-transparent text-slate-900 text-xs font-bold px-2 py-1.5 outline-none" />
            <span className="text-slate-300 font-bold">—</span>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-transparent text-slate-900 text-xs font-bold px-2 py-1.5 outline-none" />
          </div>
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

      {/* ─── СЕТКА KPI ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <KpiBox label1="Выручка (факт)" value1={fmt(metrics.revenue)} sub1={`Прогноз: ${fmt(metrics.runRate)}`} label2={`План: ${fmt(metrics.planTotal)}`} value2={`${metrics.planProgress.toFixed(1)}%`} highlight onClick={() => setIsRevenueTrendOpen(true)} />
        <KpiBox label1="Чистая прибыль" value1={fmt(metrics.netProfit)} sub1={`Комиссии банка: −${fmt(metrics.bankCommission)}`} label2="Маржинальность" value2={`${metrics.margin.toFixed(1)}%`} />
        <KpiBox label1="Средний чек" value1={fmt(metrics.avgCheck)} label2="Клиентов за месяц" value2={`${metrics.clientsCount} чел.`} />
        <KpiBox label1="Точка безубыт." value1={fmt(metrics.breakEven)} label2="Запас прочности" value2={`${metrics.safetyMargin.toFixed(1)}%`} />
      </div>
      
      {/* ─── ГРАФИК ПО ДНЯМ ─── */}
      {metrics.dailyData?.length > 0 && (
        <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-black text-lg text-slate-900">Доходы и расходы по дням</h3>
            <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-rose-400 inline-block"/>Пост. расходы</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-amber-400 inline-block"/>Перем. расходы</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-400 inline-block"/>Прибыль</span>
            </div>
          </div>
          <div className="flex items-end gap-1 h-40 overflow-x-auto pb-2">
            {metrics.dailyData.map(day => {
              const total = day.fixedCosts + day.variableCosts + day.profit;
              if (total === 0) return (
                <div key={day.date} className="flex flex-col items-center gap-1 min-w-[28px] flex-1">
                  <div className="w-full h-1 bg-slate-100 rounded-full" />
                  <span className="text-[8px] text-slate-300 font-bold">{day.date.slice(8)}</span>
                </div>
              );
              const fixedPct = (day.fixedCosts / total) * 100;
              const varPct = (day.variableCosts / total) * 100;
              const profitPct = (day.profit / total) * 100;
              return (
                <div key={day.date} className="flex flex-col items-center gap-1 min-w-[28px] flex-1 group relative">
                  <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[9px] rounded-lg px-2 py-1.5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10 font-bold">
                    <div>Выручка: {fmt(day.revenue)} ₽</div>
                    <div className="text-rose-300">Пост: −{fmt(day.fixedCosts)} ₽</div>
                    <div className="text-amber-300">Перем: −{fmt(day.variableCosts)} ₽</div>
                    <div className="text-emerald-300">Прибыль: {fmt(day.profit)} ₽</div>
                  </div>
                  <div className="w-full flex flex-col rounded-lg overflow-hidden" style={{height: '120px'}}>
                    <div className="w-full bg-emerald-400" style={{flex: profitPct}} />
                    <div className="w-full bg-amber-400" style={{flex: varPct}} />
                    <div className="w-full bg-rose-400" style={{flex: fixedPct}} />
                  </div>
                  <span className="text-[8px] text-slate-400 font-bold">{day.date.slice(8)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ─── МАСТЕРА И ФОТ ─── */}
        <div className="lg:col-span-2 bg-white/70 backdrop-blur-2xl rounded-[32px] border border-white/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-8">
          <h3 className="font-black text-xl text-slate-900 mb-6 flex items-center gap-2"><Users className="text-indigo-500" size={20}/> Эффективность мастеров</h3>
          <div className="space-y-3">
            {metrics.mastersList.map(m => (
              <div key={m.id} className="flex justify-between items-center p-5 bg-white/50 rounded-[24px] shadow-sm border border-white/60 hover:bg-white/50 transition-colors">
                <span className="font-black text-sm text-slate-900">{m.name}</span>
                <div className="flex gap-6 md:gap-10 text-right">
                  <div><div className="text-[9px] font-black uppercase tracking-widest text-slate-400">Выручка</div><div className="font-mono text-sm font-bold text-slate-700">{fmt(m.gross)}</div></div>
                  <div><div className="text-[9px] font-black uppercase tracking-widest text-slate-400">Зарплата</div><div className="font-mono text-sm font-black text-emerald-500">{fmt(m.toPay)}</div></div>
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
        <div className="bg-white/70 backdrop-blur-2xl rounded-[32px] border border-white/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-8">
          <h3 className="font-black text-xl text-slate-900 mb-6 flex items-center gap-2"><Wallet className="text-emerald-500" size={20}/> Фонды</h3>
          <div className="space-y-4">
            <div className="p-5 bg-white/50 rounded-[24px] shadow-sm border border-white/60">
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Резерв под налог (3%)</div>
              <div className="font-mono text-2xl font-black text-slate-900 mb-2">{fmt(metrics.taxReserveTarget)}</div>
              <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden"><div className="w-0 h-full bg-emerald-500"/></div>
              <div className="text-[9px] font-bold text-slate-400 mt-2 uppercase tracking-widest">Цель по выручке</div>
            </div>
            <div className="p-5 bg-white/50 rounded-[24px] shadow-sm border border-white/60">
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Страховой фонд (10%)</div>
              <div className="font-mono text-2xl font-black text-slate-900 mb-2">{fmt(metrics.insuranceFund)}</div>
              <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">От чистой прибыли</div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── МОДАЛКА ТЕНДЕНЦИИ ВЫРУЧКИ ─── */}
      {isRevenueTrendOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white/60 backdrop-blur-xl rounded-[32px] p-6 md:p-8 w-full max-w-lg shadow-2xl border border-white/80">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black text-slate-900">Тенденция выручки</h3>
              <button onClick={() => setIsRevenueTrendOpen(false)} className="w-8 h-8 flex items-center justify-center bg-slate-50 text-slate-400 rounded-full hover:bg-slate-100"><X size={18}/></button>
            </div>
            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
              {revenueTrends.map(t => (
                 <div key={t.month} className="flex justify-between items-center p-4 bg-white/30 rounded-2xl border border-white/80">
                   <span className="font-bold text-slate-700">{t.month}</span>
                   <span className="font-black text-indigo-600">{fmt(t.revenue)}</span>
                 </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}