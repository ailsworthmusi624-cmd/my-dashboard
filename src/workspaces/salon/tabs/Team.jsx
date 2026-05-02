import React, { useState, useMemo } from 'react';
import { Calendar, UserCircle, Calculator, Wallet, Scissors } from 'lucide-react';
import useAppStore from '../../../store/useAppStore';

// Простая функция форматирования (если utils не импортируется)
const fmt = (v) => new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(v || 0);

export default function Team() {
  const masters = useAppStore(s => s.masters ?? []);
  const journal = useAppStore(s => s.journal ?? []);
  
  // Даты по умолчанию: с 1 числа текущего месяца по последний день
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];

  const [startDate, setStartDate] = useState(firstDay);
  const [endDate, setEndDate] = useState(lastDay);

  // Вычисляем зарплаты динамически на основе выбранных дат
  const payrollData = useMemo(() => {
    // 1. Фильтруем журнал по датам
    const filteredJournal = journal.filter(entry => entry.date >= startDate && entry.date <= endDate);

    // 2. Считаем ЗП для каждого мастера
    return masters.map(master => {
      // Ищем все записи этого мастера за период
      const masterEntries = filteredJournal.filter(e => e.masterName === master.name);
      
      // Считаем уникальные выходы (даты)
      const uniqueDates = new Set(masterEntries.map(e => e.date)).size;
      
      // Считаем оклад
      const basePay = uniqueDates * (master.basePerShift || 0);
      
      // Считаем проценты со всех услуг
      let percentPay = 0;
      masterEntries.forEach(entry => {
        if (entry.services) {
          entry.services.forEach(srv => {
            percentPay += (Number(srv.amount) * (Number(srv.rate) / 100));
          });
        }
      });

      return {
        ...master,
        shifts: uniqueDates,
        basePay,
        percentPay,
        totalPay: basePay + percentPay
      };
    });
  }, [masters, journal, startDate, endDate]);

  const totalPayroll = payrollData.reduce((sum, m) => sum + m.totalPay, 0);

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-300">
      
      {/* ─── ШАПКА ФИЛЬТРА ДАТ ─── */}
      <div className="bg-white p-4 md:p-6 rounded-[24px] md:rounded-[32px] border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-[16px] flex items-center justify-center shrink-0">
            <Calculator size={24} />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900">Зарплаты</h2>
            <p className="text-xs font-medium text-slate-400">Общий ФОТ: <span className="font-bold text-slate-900">{fmt(totalPayroll)}</span></p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-2xl border border-slate-100 overflow-x-auto">
          <input 
            type="date" 
            value={startDate} 
            onChange={(e) => setStartDate(e.target.value)}
            className="bg-white border border-slate-100 text-slate-900 text-xs font-bold rounded-xl px-3 py-2.5 focus:outline-none focus:border-purple-300"
          />
          <span className="text-slate-400 font-bold text-xs px-1">—</span>
          <input 
            type="date" 
            value={endDate} 
            onChange={(e) => setEndDate(e.target.value)}
            className="bg-white border border-slate-100 text-slate-900 text-xs font-bold rounded-xl px-3 py-2.5 focus:outline-none focus:border-purple-300"
          />
        </div>
      </div>

      {/* ─── КАРТОЧКИ МАСТЕРОВ ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {payrollData.map((master) => (
          <div key={master.id} className="bg-white p-5 md:p-6 rounded-[24px] md:rounded-[32px] border border-slate-100 shadow-sm relative overflow-hidden">
            {/* Декоративный фон */}
            <div className="absolute -right-6 -top-6 w-24 h-24 bg-purple-50 rounded-full opacity-50 pointer-events-none"></div>

            <div className="flex items-start justify-between mb-6 relative">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center shrink-0">
                  <UserCircle size={24} />
                </div>
                <div>
                  <h3 className="font-black text-lg text-slate-900">{master.name}</h3>
                  <p className="text-[11px] font-medium text-slate-400">{master.role} · Ставка {master.rate1}%</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Итого ЗП</p>
                <p className="text-xl md:text-2xl font-black text-purple-600">{fmt(master.totalPay)}</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-100">
              <div className="text-center md:text-left p-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Выходов</p>
                <p className="font-bold text-slate-900 flex items-center justify-center md:justify-start gap-1">
                  <Calendar size={12} className="text-slate-400" /> {master.shifts} дн.
                </p>
              </div>
              <div className="text-center md:text-left p-2 border-l border-slate-200">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Оклад</p>
                <p className="font-bold text-slate-900">{fmt(master.basePay)}</p>
              </div>
              <div className="text-center md:text-left p-2 border-l border-slate-200">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Процент</p>
                <p className="font-bold text-slate-900 flex items-center justify-center md:justify-start gap-1">
                  <Scissors size={12} className="text-slate-400" /> {fmt(master.percentPay)}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}