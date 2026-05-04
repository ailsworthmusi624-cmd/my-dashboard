import React, { useState } from 'react';
import { Sparkles, Send, Loader2, X } from 'lucide-react';
import useAppStore from '../../store/useAppStore';
import { askSmartAssistant } from './aiService';

export default function AiSearchBar() {
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);


  const handleAsk = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsLoading(true);
    setIsOpen(true);
    setResponse('');

    const state = useAppStore.getState();
    const journal = state.journal || [];
    const expenses = state.expenses || [];
    const masters = state.masters || [];
    const plans = state.salon?.globalPlans || {};

    let grossRevenue = 0;
    let payroll = 0;
    const mastersStats = {};

    masters.forEach(m => {
      mastersStats[m.name] = { plan: m.plan, revenue: 0 };
    });

    journal.forEach(entry => {
      let entryRev = 0;
      (entry.services || []).forEach(s => {
        const amt = Number(s.amount) || 0;
        entryRev += amt;
        payroll += amt * (Number(s.rate) / 100);
      });
      (entry.goods || []).forEach(g => {
        const amt = Number(g.amount) || 0;
        entryRev += amt;
        payroll += amt * (Number(g.rate) / 100);
      });
      grossRevenue += entryRev;
      
      if (mastersStats[entry.masterName]) {
        mastersStats[entry.masterName].revenue += entryRev;
      }
    });

    const bankCommission = grossRevenue * 0.025;
    const netRevenue = grossRevenue - bankCommission;
    const otherExpenses = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const totalExpenses = payroll + otherExpenses;
    const ebitda = netRevenue - totalExpenses;
    const usnTax = grossRevenue * 0.06;
    const netProfit = ebitda - usnTax;
    const margin = grossRevenue > 0 ? (netProfit / grossRevenue) * 100 : 0;

    const contextData = {
      rawJournal: journal,
      rawMasters: masters,
      rawExpenses: expenses,
      finance: {
        "Грязная выручка": grossRevenue,
        "Чистая выручка": netRevenue,
        "EBITDA": ebitda,
        "Чистая прибыль": netProfit,
        "Маржинальность": margin.toFixed(2) + '%'
      },
      team: masters.map(m => ({
        "Имя": m.name,
        "Текущая выручка": mastersStats[m.name]?.revenue || 0,
        "Личный план": m.plan,
        "Выполнение плана": m.plan ? ((mastersStats[m.name]?.revenue || 0) / m.plan * 100).toFixed(1) + '%' : '0%'
      })),
      plans: plans,
    };

    const res = await askSmartAssistant(query, contextData);
    setResponse(res);
    setIsLoading(false);
    setQuery('');
  };

  return (
    <div className="relative z-40 mb-6 mx-auto w-full max-w-3xl animate-in fade-in slide-in-from-top-4 duration-500">
      <form 
        onSubmit={handleAsk} 
        className="relative flex items-center bg-white rounded-[20px] shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-indigo-100 overflow-hidden focus-within:border-indigo-400 focus-within:ring-4 ring-indigo-50 transition-all h-[56px] md:h-[64px]"
      >
        <div className="pl-4 md:pl-5 pr-2 text-indigo-500 shrink-0 h-full flex items-center justify-center bg-indigo-50/50">
          <Sparkles size={20} />
        </div>
        <input 
          type="text" 
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Спросите AI-Ассистента (например: 'Какой прогноз?')"
          className="w-full bg-transparent border-none py-2 px-3 md:px-4 text-sm md:text-base font-bold text-slate-900 placeholder:text-slate-400 outline-none"
          disabled={isLoading}
        />
        <button 
          type="submit" 
          disabled={isLoading || !query.trim()} 
          className="h-full px-5 md:px-8 bg-indigo-600 text-white font-bold text-sm md:text-base hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center justify-center"
        >
          {isLoading ? <Loader2 size={20} className="animate-spin" /> : 'Спросить'}
        </button>
      </form>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-3 bg-white/95 backdrop-blur-xl p-5 md:p-6 rounded-[24px] md:rounded-[32px] shadow-2xl border border-slate-100 z-50 animate-in fade-in slide-in-from-top-2">
          <div className="flex justify-between items-start mb-4">
            <div className="text-[10px] font-black uppercase tracking-widest text-indigo-500 flex items-center gap-1.5 bg-indigo-50 px-3 py-1.5 rounded-xl">
              <Sparkles size={12} /> Ответ AI-Ассистента
            </div>
            <button onClick={() => setIsOpen(false)} className="w-8 h-8 flex items-center justify-center bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-900 rounded-full transition-colors"><X size={16} /></button>
          </div>
          <div className="text-sm font-medium text-slate-700 leading-relaxed whitespace-pre-wrap min-h-[40px]">
            {isLoading ? <div className="space-y-2 animate-pulse"><div className="h-4 bg-slate-200 rounded w-3/4"></div><div className="h-4 bg-slate-200 rounded w-1/2"></div><div className="h-4 bg-slate-200 rounded w-5/6"></div></div> : response}
          </div>
        </div>
      )}
    </div>
  );
}