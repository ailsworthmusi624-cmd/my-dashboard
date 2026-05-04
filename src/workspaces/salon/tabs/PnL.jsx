import React, { useState, useMemo } from 'react';
import { BarChart3, TrendingUp } from 'lucide-react';
import useAppStore from '../../../store/useAppStore';
import { fmt } from '../../../shared/utils/format';
import AiSearchBar from '../../../shared/components/AiSearchBar';

export default function PnL() {
  const journal = useAppStore(s => s.journal ?? []);
  const expenses = useAppStore(s => s.expenses ?? []);

  const [monthStr, setMonthStr] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  const metrics = useMemo(() => {
    const startDate = `${monthStr}-01`;
    const endDate = new Date(monthStr.split('-')[0], monthStr.split('-')[1], 0).toISOString().split('T')[0];

    const fJournal = journal.filter(e => e.date >= startDate && e.date <= endDate);
    const fExpenses = expenses.filter(e => e.date >= startDate && e.date <= endDate);

    let serviceRevenue = 0;
    let goodsRevenue = 0;
    let cogs = 0;
    let payroll = 0;

    fJournal.forEach(entry => {
      if (entry.services) {
        entry.services.forEach(svc => {
          const amt = Number(svc.amount) || 0;
          const rate = Number(svc.rate) || 0;
          serviceRevenue += amt;
          payroll += amt * (rate / 100);
        });
      }
      
      if (entry.goods) {
        entry.goods.forEach(g => {
          const amt = Number(g.amount) || 0;
          const cost = Number(g.cogs) || 0;
          const rate = Number(g.rate) || 0;
          goodsRevenue += amt;
          cogs += cost;
          payroll += amt * (rate / 100);
        });
      }
    });

    const totalRevenue = serviceRevenue + goodsRevenue;
    const bankCommission = totalRevenue * 0.025;
    const netRevenue = totalRevenue - bankCommission;
    const grossProfit = netRevenue - cogs;

    let rent = 0;
    let utilities = 0;
    let materials = 0;
    let marketing = 0;
    let managerSalary = 0;
    let other = 0;

    fExpenses.forEach(e => {
      const amt = Number(e.amount) || 0;
      const cat = e.category || '';
      const catLower = cat.toLowerCase();

      if (cat === 'Аренда') rent += amt;
      else if (cat === 'ЖКУ') utilities += amt;
      else if (catLower.includes('материал')) materials += amt;
      else if (cat === 'Реклама') marketing += amt;
      else if (catLower.includes('зп управляющего')) managerSalary += amt;
      else other += amt;
    });

    const totalExpenses = payroll + rent + utilities + materials + marketing + managerSalary + other;
    const usnTax = totalRevenue * 0.06;
    const netProfit = grossProfit - totalExpenses - usnTax;
    const margin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    return {
      serviceRevenue, goodsRevenue, cogs, totalRevenue, grossProfit,
      bankCommission, netRevenue, payroll, rent, utilities, materials, 
      marketing, managerSalary, other, totalExpenses, usnTax, netProfit, margin
    };
  }, [journal, expenses, monthStr]);

  const TableRow = ({ label, value, isNegative, isBold, color }) => (
    <div className="flex justify-between items-center py-3 border-b border-slate-50 last:border-0 px-2 hover:bg-slate-50/50 transition-colors">
      <span className={`text-sm ${isBold ? 'font-black text-slate-900' : 'font-medium text-slate-600'}`}>{label}</span>
      <span className={`font-mono text-sm ${isBold ? 'font-black' : 'font-bold'} ${isNegative ? 'text-rose-500' : color || 'text-slate-900'}`}>
        {isNegative && value > 0 ? '-' : ''}{fmt(value)}
      </span>
    </div>
  );

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-300">
      <AiSearchBar />
      
      {/* Header */}
      <div className="bg-white p-4 md:p-6 rounded-[24px] md:rounded-[32px] border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-[16px] flex items-center justify-center shrink-0 shadow-sm">
            <BarChart3 size={24} />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900">Profit & Loss</h2>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Отчет о прибылях и убытках</p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-white border border-slate-100 rounded-2xl p-1.5 shadow-sm">
          <input 
            type="month" 
            value={monthStr} 
            onChange={e => setMonthStr(e.target.value)} 
            className="bg-transparent text-slate-900 text-sm font-bold px-4 py-2 outline-none" 
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden p-6 md:p-10 space-y-8">
        
        <section>
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 px-2">01. Доходы</h3>
          <TableRow label="Выручка от услуг" value={metrics.serviceRevenue} />
          <TableRow label="Продажа товаров" value={metrics.goodsRevenue} />
          <TableRow label="Себестоимость товаров" value={metrics.cogs} isNegative />
          <TableRow label="Комиссия банка (2.5%)" value={metrics.bankCommission} isNegative />
          <TableRow label="Валовая прибыль" value={metrics.grossProfit} isBold color="text-indigo-600" />
        </section>

        <section>
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 px-2">02. Операционные расходы</h3>
          <TableRow label="ФОТ (Зарплаты мастеров)" value={metrics.payroll} />
          <TableRow label="Аренда" value={metrics.rent} />
          <TableRow label="ЖКУ" value={metrics.utilities} />
          <TableRow label="Материалы" value={metrics.materials} />
          <TableRow label="Реклама" value={metrics.marketing} />
          <TableRow label="ЗП Управляющего" value={metrics.managerSalary} />
          <TableRow label="Прочие расходы" value={metrics.other} />
          <div className="flex justify-between items-center py-4 px-4 bg-slate-50 rounded-2xl mt-4 border border-slate-100">
            <span className="text-sm font-black text-slate-900">ИТОГО РАСХОДЫ</span>
            <span className="font-mono text-sm md:text-base font-black text-rose-600">-{fmt(metrics.totalExpenses)}</span>
          </div>
        </section>

        <section>
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 px-2">03. Налоги</h3>
          <TableRow label="УСН (6%)" value={metrics.usnTax} isNegative />
        </section>

        <section className="pt-6 border-t-2 border-slate-100">
          <div className="flex flex-col md:flex-row justify-between md:items-center p-6 rounded-[24px] mb-6 bg-slate-900 text-white shadow-xl shadow-slate-200">
            <span className="text-lg font-black uppercase tracking-widest opacity-90 mb-2 md:mb-0">Чистая прибыль</span>
            <span className="font-mono text-4xl md:text-5xl font-black">{fmt(metrics.netProfit)}</span>
          </div>

          <div className="p-6 bg-slate-50 rounded-[24px] border border-slate-100 flex items-center gap-4">
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm"><TrendingUp size={24}/></div>
            <div>
              <div className="text-[10px] font-black uppercase text-slate-400 mb-1">Рентабельность (Маржинальность)</div>
              <div className="text-2xl font-black font-mono text-slate-900">{metrics.margin.toFixed(1)}%</div>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
