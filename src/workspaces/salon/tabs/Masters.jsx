import React, { useState, useMemo } from 'react';
import { Users, Calculator, Calendar, Scissors, Banknote, Plus, ChevronDown, ChevronUp, Edit3, Trash2 } from 'lucide-react';
import useAppStore from '../../../store/useAppStore';
import { fmt, fmtDate } from '../../../shared/utils/format';

export default function Masters() {
  const masters = useAppStore(s => s.masters ?? []);
  const journal = useAppStore(s => s.journal ?? []);
  const advances = useAppStore(s => s.advances ?? []);
  const addAdvance = useAppStore(s => s.addAdvance);
  const addMaster = useAppStore(s => s.addMaster);
  const updateMaster = useAppStore(s => s.updateMaster);
  const removeMaster = useAppStore(s => s.removeMaster);

  const today = new Date();
  const currentMonthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  const todayStr = `${currentMonthStr}-${String(today.getDate()).padStart(2, '0')}`;
  const [startDate, setStartDate] = useState(`${currentMonthStr}-01`);
  const [endDate, setEndDate] = useState(todayStr);

  const [expandedId, setExpandedId] = useState(null);
  
  // Локальные стейты для выдачи аванса
  const [advanceAmount, setAdvanceAmount] = useState('');
  
  // Состояния для нового мастера
  const [isAdding, setIsAdding] = useState(false);
  const [newMaster, setNewMaster] = useState({ name: '', role: 'Мастер', rate1: '', plan: '' });

  const handleAddMaster = () => {
    if (!newMaster.name || !newMaster.rate1) return;
    addMaster({ ...newMaster, rate1: Number(newMaster.rate1), plan: Number(newMaster.plan) });
    setNewMaster({ name: '', role: 'Мастер', rate1: '', plan: '' });
    setIsAdding(false);
  };

  // Вычисляем статистику мастеров
  const mastersStats = useMemo(() => {
    const fJournal = journal.filter(e => e.date >= startDate && e.date <= endDate);
    const fAdvances = advances.filter(a => a.date >= startDate && a.date <= endDate);

    return masters.map(master => {
      const mEntries = fJournal.filter(e => e.masterName === master.name);
      const mAdvances = fAdvances.filter(a => a.masterId === master.id);
      
      // Кол-во клиентов (1 чек = 1 клиент)
      const clientCount = mEntries.length;
      const advancesSum = mAdvances.reduce((sum, a) => sum + Number(a.amount), 0);
      
      let grossRevenue = 0;
      let salaryPercent = 0;

      mEntries.forEach(entry => {
        if (entry.services) {
          entry.services.forEach(srv => {
            const amt = Number(srv.amount) || 0;
            grossRevenue += amt;
            salaryPercent += amt * (Number(srv.rate) / 100);
          });
        }
        
        if (entry.goods) {
          entry.goods.forEach(g => {
            const amt = Number(g.amount) || 0;
            grossRevenue += amt;
            salaryPercent += amt * (Number(g.rate) / 100);
          });
        }
      });

      const totalSalary = salaryPercent; // Окладов нет
      
      // Расчет выполнения планов
      const currentAvgCheck = clientCount > 0 ? grossRevenue / clientCount : 0;
      
      const calcProgress = (cur, target) => ({
        val: Math.round(target ? (cur / target) * 100 : 0),
        color: (target ? (cur / target) * 100 : 0) >= 80 ? 'bg-emerald-500' : (target ? (cur / target) * 100 : 0) >= 50 ? 'bg-orange-400' : 'bg-red-500'
      });

      const stats = {
        revenue: calcProgress(grossRevenue, master.plan),
        currentAvgCheck
      };
      
      return { ...master, clientCount, grossRevenue, salaryPercent, totalSalary, advancesSum, toPay: totalSalary - advancesSum, stats };
    }).sort((a, b) => b.grossRevenue - a.grossRevenue);
  }, [masters, journal, advances, startDate, endDate]);

  const ProgressBar = ({ label, current, target, stats, suffix = '' }) => (
    <div className="space-y-1">
      <div className="flex justify-between text-[10px] font-black uppercase tracking-tight text-slate-400">
        <span>{label}</span>
        <span className={stats.color.replace('bg-', 'text-')}>{stats.val}%</span>
      </div>
      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full ${stats.color} transition-all duration-700`} style={{ width: `${Math.min(100, stats.val)}%` }} />
      </div>
      <div className="flex justify-between text-[9px] font-bold text-slate-500">
        <span>{current}{suffix}</span>
        <span>цель: {target}{suffix}</span>
      </div>
    </div>
  );

  const handleGiveAdvance = (masterId) => {
    if (!advanceAmount || isNaN(advanceAmount)) return;
    addAdvance({ id: Date.now(), masterId, date: new Date().toISOString().split('T')[0], amount: Number(advanceAmount) });
    setAdvanceAmount('');
  };

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-300">
      
      {/* ─── ШАПКА ФИЛЬТРА ДАТ ─── */}
      <div className="bg-white/80 backdrop-blur-xl p-4 md:p-6 rounded-[24px] md:rounded-[32px] border border-white/20 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-purple-600 text-white rounded-[16px] flex items-center justify-center shrink-0 shadow-lg shadow-purple-200">
            <Users size={24} />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900">Команда мастеров</h2>
            <p className="text-xs font-medium text-slate-400">Аналитика и расчет ЗП</p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2 bg-white border border-slate-100 rounded-2xl p-1.5 shadow-sm w-full sm:w-auto">
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-transparent text-slate-900 text-xs font-bold px-2 py-1.5 outline-none" />
            <span className="text-slate-300 font-bold">—</span>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-transparent text-slate-900 text-xs font-bold px-2 py-1.5 outline-none" />
          </div>
          <button onClick={() => setIsAdding(!isAdding)} className="bg-purple-50 text-purple-600 px-4 py-2.5 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-purple-100 transition-colors w-full sm:w-auto">
            <Plus size={18}/> Добавить
          </button>
        </div>
      </div>

      {/* ─── ФОРМА ДОБАВЛЕНИЯ МАСТЕРА ─── */}
      {isAdding && (
        <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm animate-in slide-in-from-top-4">
          <h3 className="font-black text-lg text-slate-900 mb-4">Новый мастер</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div><label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Имя</label><input type="text" value={newMaster.name} onChange={e => setNewMaster({...newMaster, name: e.target.value})} placeholder="Анна" className="w-full bg-slate-50 border border-slate-100 text-slate-900 font-bold rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 ring-purple-300" /></div>
            <div><label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Должность</label><input type="text" value={newMaster.role} onChange={e => setNewMaster({...newMaster, role: e.target.value})} placeholder="Мастер" className="w-full bg-slate-50 border border-slate-100 text-slate-900 font-bold rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 ring-purple-300" /></div>
            <div><label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Ставка (%)</label><input type="number" value={newMaster.rate1} onChange={e => setNewMaster({...newMaster, rate1: e.target.value})} placeholder="40" className="w-full bg-slate-50 border border-slate-100 text-slate-900 font-bold rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 ring-purple-300" /></div>
            <div><label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Личный план (₽)</label><input type="number" value={newMaster.plan} onChange={e => setNewMaster({...newMaster, plan: e.target.value})} placeholder="150000" className="w-full bg-slate-50 border border-slate-100 text-slate-900 font-bold rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 ring-purple-300" /></div>
          </div>
          <button onClick={handleAddMaster} className="bg-purple-600 text-white px-6 py-3 rounded-2xl font-bold shadow-md hover:bg-purple-700 transition-colors w-full md:w-auto">Сохранить мастера</button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {mastersStats.map(master => {
          const isExpanded = expandedId === master.id;
          return (
            <div key={master.id} className="bg-white rounded-[32px] border border-slate-100 shadow-sm transition-all overflow-hidden">
              {/* Основная карточка */}
              <div className="p-6 cursor-pointer hover:bg-slate-50/50 transition-colors" onClick={() => setExpandedId(isExpanded ? null : master.id)}>
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-purple-50 text-purple-600 rounded-[20px] flex items-center justify-center font-black text-xl shadow-inner">{master.name.charAt(0)}</div>
                    <div><h3 className="font-black text-lg text-slate-900 flex items-center gap-2">{master.name} {isExpanded ? <ChevronUp size={16} className="text-slate-400"/> : <ChevronDown size={16} className="text-slate-400"/>}</h3><p className="text-xs font-medium text-slate-500">{master.role}</p></div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Выручка</div>
                    <div className="text-xl font-black text-emerald-600">{fmt(master.grossRevenue)}</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 mb-6">
                  <ProgressBar label="Выручка" current={fmt(master.grossRevenue)} target={fmt(master.plan)} stats={master.stats.revenue} />
                  <div className="flex justify-between items-center bg-slate-50 p-3 rounded-2xl border border-slate-100 mt-2">
                    <div><div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Клиенты</div><div className="font-bold text-slate-900 text-sm">{master.clientCount} чел.</div></div>
                    <div className="text-right"><div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Средний чек</div><div className="font-bold text-slate-900 text-sm">{Math.round(master.stats.currentAvgCheck)} ₽</div></div>
                  </div>
                </div>

                <div className="flex gap-2 text-xs border-t border-slate-50 pt-4">
                  <div className="bg-purple-50 px-3 py-1.5 rounded-xl font-bold text-purple-700 flex items-center gap-1.5"><Banknote size={14}/> ЗП: {fmt(master.toPay)}</div>
                </div>
              </div>

              {/* Раскрывающаяся часть */}
              {isExpanded && (
                <div className="p-6 pt-0 border-t border-slate-50 bg-slate-50/30 space-y-4">
                  {/* Настройки мастера */}
                  <div className="grid grid-cols-2 gap-4 bg-white p-4 rounded-2xl border border-slate-100">
                    <div>
                      <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1 flex items-center gap-1"><Edit3 size={10}/> Ставка (%)</label>
                      <input type="number" value={master.rate1 || ''} onChange={e => updateMaster(master.id, { rate1: Number(e.target.value) })} className="w-full bg-slate-50 border border-slate-100 text-slate-900 font-mono font-bold rounded-xl px-3 py-2 outline-none focus:border-purple-300" />
                    </div>
                    <div>
                      <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1 flex items-center gap-1"><Edit3 size={10}/> План (₽)</label>
                      <input type="number" value={master.plan || ''} onChange={e => updateMaster(master.id, { plan: Number(e.target.value) })} className="w-full bg-slate-50 border border-slate-100 text-slate-900 font-mono font-bold rounded-xl px-3 py-2 outline-none focus:border-purple-300" />
                    </div>
                  </div>

                  <div className="bg-purple-600 text-white rounded-[24px] p-5 shadow-lg shadow-purple-200">
                    <div className="flex justify-between items-center mb-4">
                      <div><div className="text-[10px] font-black uppercase tracking-widest text-purple-200">Начислено</div><div className="font-black text-lg">{fmt(master.totalSalary)}</div></div>
                      <div className="text-right"><div className="text-[10px] font-black uppercase tracking-widest text-purple-200">Выдано авансов</div><div className="font-black text-lg">{fmt(master.advancesSum)}</div></div>
                    </div>
                    <div className="border-t border-purple-500 pt-4 mb-4 flex justify-between items-center"><div className="text-xs font-black uppercase tracking-widest text-purple-100">К выплате сейчас</div><div className="text-2xl font-black text-white">{fmt(master.toPay)}</div></div>
                    
                    <div className="flex gap-2">
                      <input type="number" placeholder="Сумма аванса ₽" value={advanceAmount} onChange={e => setAdvanceAmount(e.target.value)} className="flex-1 bg-white/10 border border-white/20 text-white placeholder:text-purple-300 text-sm font-bold rounded-xl px-4 py-3 outline-none focus:ring-2 ring-white/30" />
                      <button onClick={() => handleGiveAdvance(master.id)} className="bg-white text-purple-700 px-4 rounded-xl font-black text-sm shadow-sm hover:scale-105 transition-transform">Выдать</button>
                    </div>
                  </div>

                  {/* Удаление */}
                  <div className="flex justify-end pt-2">
                    <button onClick={() => { if(window.confirm('Удалить мастера?')) removeMaster(master.id); }} className="text-xs font-black text-red-500 bg-red-50 hover:bg-red-100 px-4 py-2.5 rounded-xl transition-colors flex items-center gap-2">
                      <Trash2 size={14}/> Удалить мастера
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}