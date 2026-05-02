import React, { useState } from 'react';
import { Receipt, Plus, Trash2, Calendar, Tag } from 'lucide-react';
import useAppStore from '../../../store/useAppStore';
import { fmt, fmtDate } from '../../../shared/utils/format';

export default function Expenses() {
  const expenses = useAppStore(s => s.expenses ?? []);
  const addExpense = useAppStore(s => s.addExpense);
  const deleteExpense = useAppStore(s => s.deleteExpense);

  const [isAdding, setIsAdding] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [category, setCategory] = useState('Расходники');
  const [amount, setAmount] = useState('');

  const today = new Date();
  const [startDate, setStartDate] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(() => new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0]);

  const fExpenses = expenses.filter(e => e.date >= startDate && e.date <= endDate);
  const totalExpenses = fExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  // Группировка расходов по категориям
  const CATEGORIES = ['Аренда', 'Расходники', 'Маркетинг', 'Бытовые нужды', 'Налоги', 'Прочее'];
  const COLORS = ['bg-purple-500', 'bg-emerald-400', 'bg-blue-400', 'bg-orange-400', 'bg-rose-400', 'bg-slate-400'];
  
  const expensesByCategory = CATEGORIES.map((cat, index) => {
    const amount = fExpenses.filter(e => e.category === cat).reduce((s, e) => s + Number(e.amount), 0);
    return { category: cat, amount, percent: totalExpenses ? (amount / totalExpenses) * 100 : 0, color: COLORS[index] };
  }).filter(c => c.amount > 0).sort((a, b) => b.amount - a.amount);

  const handleAdd = () => {
    if (!amount || isNaN(amount)) return;
    addExpense({ id: Date.now(), date, category, amount: Number(amount) });
    setAmount('');
    setIsAdding(false);
  };

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row justify-between md:items-end gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-purple-600 rounded-[16px] text-white flex items-center justify-center shadow-lg shadow-purple-200">
            <Receipt size={24} />
          </div>
          <div>
            <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">Операционные расходы</h2>
            <p className="text-sm text-slate-500 font-medium">Итого: <span className="font-bold text-slate-900">{fmt(totalExpenses)}</span></p>
          </div>
        </div>
        <div className="flex flex-col md:flex-row items-center gap-4">
          <div className="flex items-center gap-2 bg-white border border-slate-100 rounded-2xl p-1.5 shadow-sm w-full md:w-auto">
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-transparent text-slate-900 text-xs font-bold px-2 py-1.5 outline-none" />
            <span className="text-slate-300 font-bold">—</span>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-transparent text-slate-900 text-xs font-bold px-2 py-1.5 outline-none" />
          </div>
          <button onClick={() => setIsAdding(!isAdding)} className="bg-purple-600 text-white px-5 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-purple-200 hover:scale-105 transition-transform w-full md:w-auto">
            <Plus size={20}/> {isAdding ? 'Отмена' : 'Добавить расход'}
          </button>
        </div>
      </div>

      {isAdding && (
        <div className="bg-purple-50 p-5 rounded-[24px] border border-purple-100 animate-in slide-in-from-top-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="text-[10px] uppercase font-black text-slate-400 ml-1 mb-1.5 block tracking-widest">Дата</label>
              <input type="date" className="w-full bg-white p-3.5 rounded-2xl font-bold text-slate-900 outline-none focus:ring-2 ring-purple-200" value={date} onChange={e => setDate(e.target.value)} />
            </div>
            <div>
              <label className="text-[10px] uppercase font-black text-slate-400 ml-1 mb-1.5 block tracking-widest">Категория</label>
              <select className="w-full bg-white p-3.5 rounded-2xl font-bold text-slate-900 outline-none focus:ring-2 ring-purple-200" value={category} onChange={e => setCategory(e.target.value)}>
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] uppercase font-black text-slate-400 ml-1 mb-1.5 block tracking-widest">Сумма ₽</label>
              <input type="number" placeholder="5000" className="w-full bg-white p-3.5 rounded-2xl font-bold text-slate-900 outline-none focus:ring-2 ring-purple-200" value={amount} onChange={e => setAmount(e.target.value)} />
            </div>
          </div>
          <button onClick={handleAdd} className="w-full bg-purple-600 text-white p-4 rounded-2xl font-black shadow-md hover:bg-purple-700 transition-colors">Сохранить</button>
        </div>
      )}

      {/* ─── АНАЛИТИКА ─── */}
      {expensesByCategory.length > 0 && (
        <div className="bg-white/80 backdrop-blur-xl border border-slate-100 rounded-[24px] md:rounded-[40px] p-6 md:p-8 shadow-sm">
          <h3 className="font-black text-xl text-slate-900 mb-6">Структура расходов</h3>
          <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden flex mb-6">
            {expensesByCategory.map(cat => <div key={cat.category} className={`${cat.color} h-full transition-all`} style={{ width: `${cat.percent}%` }} />)}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {expensesByCategory.map(cat => (
              <div key={cat.category} className="flex items-center gap-3 bg-slate-50/50 p-3 rounded-2xl border border-slate-100"><div className={`w-3 h-3 rounded-full ${cat.color}`} /><div className="flex-1"><div className="text-xs font-bold text-slate-900 flex justify-between"><span>{cat.category}</span><span>{fmt(cat.amount)}</span></div><div className="text-[10px] text-slate-400 font-medium">{Math.round(cat.percent)}%</div></div></div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-[24px] md:rounded-[40px] border border-slate-100 shadow-sm p-4 md:p-8 space-y-3">
        {fExpenses.length === 0 ? (
          <div className="text-center py-12"><div className="text-4xl mb-3">💸</div><p className="font-bold text-slate-400">Расходов пока нет.</p></div>
        ) : (
          fExpenses.sort((a,b) => new Date(b.date) - new Date(a.date)).map(exp => (
            <div key={exp.id} className="flex justify-between items-center p-4 md:p-5 rounded-[24px] border border-slate-100/50 bg-slate-50/50 hover:bg-slate-50 transition-all group">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-red-400 shadow-sm"><Tag size={18} /></div>
                <div>
                  <div className="font-black text-slate-900 text-sm md:text-base">{exp.category}</div>
                  <div className="text-[11px] text-slate-400 font-medium flex items-center gap-1 mt-0.5"><Calendar size={12}/> {fmtDate(exp.date)}</div>
                </div>
              </div>
              <div className="flex items-center gap-4"><span className="text-lg md:text-xl font-black text-slate-900">{fmt(exp.amount)}</span><button onClick={() => deleteExpense(exp.id)} className="text-slate-300 hover:text-red-500 transition-colors md:opacity-0 md:group-hover:opacity-100"><Trash2 size={18} /></button></div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}