import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import {
  PlusCircle, Wallet, AlertCircle, Calendar, TrendingDown, TrendingUp,
  CheckCircle2, X, Menu, Bell, LayoutDashboard, PieChart, ChevronDown,
  ChevronUp, Target, WifiOff, RotateCcw, Edit3, Save, Upload,
  Calculator, RefreshCw, Zap, FileSpreadsheet, ArrowRight
} from 'lucide-react';

// ─── FIREBASE ────────────────────────────────────────────────────────────────
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, onSnapshot } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAYNPCG4DHFTAwWkARHGyYmiU0GTklQ6_Q",
  authDomain: "dashboard-27927.firebaseapp.com",
  projectId: "dashboard-27927",
  storageBucket: "dashboard-27927.firebasestorage.app",
  messagingSenderId: "428248986605",
  appId: "1:428248986605:web:95b3ccf9ffa65d0e68ade4"
};

const fbApp  = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const auth   = getAuth(fbApp);
const db     = getFirestore(fbApp);
const APP_ID = "dashboard-27927";

// ─── ERROR BOUNDARY ───────────────────────────────────────────────────────────
class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(e) { return { hasError: true, error: e }; }
  render() {
    if (this.state.hasError) return (
      <div className="min-h-screen flex items-center justify-center bg-red-50 p-6">
        <div className="bg-white p-8 rounded-3xl shadow-xl text-center max-w-md">
          <AlertCircle className="mx-auto text-red-500 mb-4" size={48} />
          <h1 className="text-xl font-bold text-slate-900 mb-2">Сбой в коде</h1>
          <p className="text-sm text-slate-500 mb-6">{this.state.error?.toString()}</p>
          <button onClick={() => { localStorage.clear(); window.location.reload(); }}
            className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold">
            Сбросить и перезагрузить
          </button>
        </div>
      </div>
    );
    return this.props.children;
  }
}

// ─── НАЧАЛЬНЫЕ ДАННЫЕ ─────────────────────────────────────────────────────────
const daysFrom = (n) => {
  const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().split('T')[0];
};

const initialDebts = [
  { id: 1, name: 'Сбер (Кредитка)',      balance: 85000,  rate: 25.9, minPayment: 3500,  nextPaymentDate: daysFrom(5),  isPaidThisMonth: false, details: { gracePeriod: 'до 120 дней', penalty: '36% годовых', summary: 'Грейс возобновляется только после полного погашения. Снятие наличных — комиссия 390 ₽ + 3.9%.' }, schedule: [] },
  { id: 2, name: 'ВТБ (Кредитка)',       balance: 120000, rate: 29.9, minPayment: 5000,  nextPaymentDate: daysFrom(12), isPaidThisMonth: false, details: { gracePeriod: 'до 200 дней', penalty: '0.1% в день', summary: 'При пропуске платежа льготный период сгорает.' }, schedule: [] },
  { id: 3, name: 'Альфа (Кредитка)',     balance: 45000,  rate: 34.9, minPayment: 2000,  nextPaymentDate: daysFrom(2),  isPaidThisMonth: false, details: { gracePeriod: 'Год без %', penalty: '20% годовых', summary: 'Проверьте скрытую страховку (~1.2% в мес).' }, schedule: [] },
  { id: 4, name: 'Т-Банк (Кредитка)',    balance: 60000,  rate: 28.5, minPayment: 3000,  nextPaymentDate: daysFrom(-1), isPaidThisMonth: false, details: { penalty: '20% год. + 590 ₽', summary: 'Штраф за неоплату — 590 ₽ фиксированно.' }, schedule: [] },
  { id: 5, name: 'ОТП Банк (Кредит)',    balance: 250000, rate: 18.0, minPayment: 12500, nextPaymentDate: daysFrom(20), isPaidThisMonth: false, details: { penalty: '0.1% в день', summary: 'Досрочное погашение без штрафов. Выгоднее уменьшать срок.' }, schedule: [] },
  { id: 6, name: 'Яндекс (Кредит)',      balance: 150000, rate: 21.5, minPayment: 8500,  nextPaymentDate: daysFrom(8),  isPaidThisMonth: false, details: { penalty: '20% год.', summary: 'Досрочное погашение — только в дату платежа.' }, schedule: [] },
  { id: 7, name: 'Яндекс Сплит',         balance: 25000,  rate: 0,    minPayment: 6250,  nextPaymentDate: daysFrom(4),  isPaidThisMonth: false, details: { penalty: 'Разовый штраф', summary: 'Процентов нет. Просрочка — разовая комиссия.' }, schedule: [] },
];

// ─── УТИЛИТЫ ──────────────────────────────────────────────────────────────────
const fmt = (v) =>
  new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(v || 0);

const getDaysDiff = (dateStr) => {
  if (!dateStr) return 0;
  const [y, m, d] = dateStr.split('-').map(Number);
  const target = new Date(y, m - 1, d);
  const tod = new Date(); tod.setHours(0,0,0,0);
  return Math.ceil((target - tod) / 86400000);
};

const fmtDate = (dateStr, opts = {}) => {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('ru-RU', opts);
};

// Аннуитетный расчёт: генерирует полный график платежей
const buildAnnuitySchedule = (balance, annualRate, monthlyPayment) => {
  if (!balance || !monthlyPayment) return [];
  const r = annualRate / 100 / 12;
  const rows = [];
  let b = balance;
  let month = 0;
  while (b > 0.5 && month < 600) {
    const interest = r > 0 ? b * r : 0;
    const principal = Math.min(b, monthlyPayment - interest);
    if (principal <= 0 && r > 0) break; // платёж не покрывает проценты
    b = Math.max(0, b - principal);
    const d = new Date();
    d.setMonth(d.getMonth() + month);
    rows.push({
      month: month + 1,
      date: `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01`,
      payment: monthlyPayment,
      interest: Math.round(interest),
      principal: Math.round(principal),
      balance: Math.round(b),
    });
    month++;
  }
  return rows;
};

// ─── КОМПОНЕНТ: БЕЙДЖ ДНЕЙ ───────────────────────────────────────────────────
function DaysBadge({ days, paid }) {
  if (paid)      return <span className="text-[10px] font-black px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-600 uppercase tracking-widest">Оплачено</span>;
  if (days < 0)  return <span className="text-[10px] font-black px-3 py-1.5 rounded-xl bg-red-50 text-red-600 uppercase tracking-widest">Просрочка {Math.abs(days)} дн.</span>;
  if (days === 0) return <span className="text-[10px] font-black px-3 py-1.5 rounded-xl bg-orange-50 text-orange-600 uppercase tracking-widest">Сегодня!</span>;
  if (days <= 3)  return <span className="text-[10px] font-black px-3 py-1.5 rounded-xl bg-orange-50 text-orange-500 uppercase tracking-widest">{days} дн.</span>;
  return          <span className="text-[10px] font-black px-3 py-1.5 rounded-xl bg-slate-50 text-slate-500 uppercase tracking-widest">{days} дн.</span>;
}

// ─── МОДАЛ: РЕДАКТИРОВАНИЕ ДОЛГА ─────────────────────────────────────────────
function EditDebtModal({ debt, onSave, onClose }) {
  const [form, setForm] = useState({
    name:            debt.name,
    balance:         String(debt.balance),
    rate:            String(debt.rate),
    minPayment:      String(debt.minPayment),
    nextPaymentDate: debt.nextPaymentDate || '',
    detailsSummary:  debt.details?.summary || '',
    gracePeriod:     debt.details?.gracePeriod || '',
    penalty:         debt.details?.penalty || '',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...debt,
      name:            form.name,
      balance:         Number(form.balance),
      rate:            Number(form.rate),
      minPayment:      Number(form.minPayment),
      nextPaymentDate: form.nextPaymentDate,
      details: {
        ...debt.details,
        gracePeriod: form.gracePeriod,
        penalty:     form.penalty,
        summary:     form.detailsSummary,
      },
    });
  };

  const inp = "w-full bg-slate-50 p-3.5 rounded-2xl outline-none font-bold text-slate-900 focus:ring-4 ring-emerald-500/10 border border-transparent focus:border-emerald-200 transition-all text-sm";
  const lbl = "text-[9px] uppercase font-black text-slate-400 ml-1 mb-1 block tracking-widest";

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto">
      <form onSubmit={handleSubmit} className="bg-white rounded-t-[40px] sm:rounded-[40px] p-8 w-full sm:max-w-md shadow-2xl space-y-4">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-2xl font-black text-slate-900">Редактировать</h3>
          <button type="button" onClick={onClose} className="w-10 h-10 flex items-center justify-center bg-slate-50 text-slate-400 rounded-full hover:bg-slate-100 transition-colors"><X size={20}/></button>
        </div>

        <div><label className={lbl}>Название</label><input required className={inp} value={form.name} onChange={e => setForm({...form, name: e.target.value})}/></div>

        <div className="grid grid-cols-2 gap-3">
          <div><label className={lbl}>Остаток ₽</label><input required type="number" className={inp} value={form.balance} onChange={e => setForm({...form, balance: e.target.value})}/></div>
          <div><label className={lbl}>Ставка %</label><input required type="number" step="0.1" className={inp} value={form.rate} onChange={e => setForm({...form, rate: e.target.value})}/></div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div><label className={lbl}>Платёж ₽</label><input required type="number" className={inp} value={form.minPayment} onChange={e => setForm({...form, minPayment: e.target.value})}/></div>
          <div><label className={lbl}>Дата платежа</label><input required type="date" className={inp} value={form.nextPaymentDate} onChange={e => setForm({...form, nextPaymentDate: e.target.value})}/></div>
        </div>

        <div><label className={lbl}>Грейс-период</label><input className={inp} placeholder="до 120 дней" value={form.gracePeriod} onChange={e => setForm({...form, gracePeriod: e.target.value})}/></div>
        <div><label className={lbl}>Штраф за просрочку</label><input className={inp} placeholder="590 ₽ + 20% год." value={form.penalty} onChange={e => setForm({...form, penalty: e.target.value})}/></div>
        <div><label className={lbl}>Условия / заметка</label>
          <textarea rows={2} className={inp + ' resize-none'} placeholder="Особые условия..." value={form.detailsSummary} onChange={e => setForm({...form, detailsSummary: e.target.value})}/>
        </div>

        <button type="submit" className="w-full bg-slate-900 text-white p-4 rounded-2xl font-black hover:bg-emerald-600 transition-all uppercase tracking-widest flex items-center justify-center gap-2">
          <Save size={18}/> Сохранить изменения
        </button>
      </form>
    </div>
  );
}

// ─── МОДАЛ: АННУИТЕТНЫЙ ГРАФИК ───────────────────────────────────────────────
function ScheduleModal({ debt, onSave, onClose }) {
  const [tab, setTab]       = useState('auto'); // 'auto' | 'manual'
  const [csvText, setCsvText] = useState('');
  const [csvError, setCsvError] = useState('');
  const fileRef = useRef();

  // Авто-генерация
  const autoSchedule = useMemo(() =>
    buildAnnuitySchedule(debt.balance, debt.rate, debt.minPayment),
  [debt]);

  const totalPaidAuto    = autoSchedule.reduce((s, r) => s + r.payment, 0);
  const totalInterestAuto= autoSchedule.reduce((s, r) => s + r.interest, 0);

  // Ручная загрузка CSV (формат: дата;платёж;проценты;тело;остаток)
  const parseCsv = (text) => {
    setCsvError('');
    try {
      const lines = text.trim().split('\n').filter(l => l.trim());
      const rows = lines.map((line, i) => {
        const parts = line.split(/[;,\t]/).map(p => p.trim().replace(/[^\d.-]/g,''));
        if (parts.length < 5) throw new Error(`Строка ${i+1}: нужно 5 колонок`);
        const [,payment,interest,principal,balance] = parts.map(Number);
        if ([payment,interest,principal,balance].some(isNaN)) throw new Error(`Строка ${i+1}: нечисловые значения`);
        return { month: i+1, date: '', payment, interest, principal, balance };
      });
      return rows;
    } catch(e) {
      setCsvError(e.message);
      return null;
    }
  };

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setCsvText(ev.target.result);
    reader.readAsText(file, 'utf-8');
  };

  const handleSave = () => {
    if (tab === 'auto') {
      onSave({ ...debt, schedule: autoSchedule });
    } else {
      const rows = parseCsv(csvText);
      if (rows) onSave({ ...debt, schedule: rows });
    }
  };

  const schedule = tab === 'auto' ? autoSchedule : (parseCsv(csvText) || []);
  const totalPaid    = schedule.reduce((s, r) => s + r.payment, 0);
  const totalInterest= schedule.reduce((s, r) => s + r.interest, 0);

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-[40px] p-8 w-full max-w-2xl shadow-2xl my-auto">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-2xl font-black text-slate-900">График платежей</h3>
          <button onClick={onClose} className="w-10 h-10 flex items-center justify-center bg-slate-50 text-slate-400 rounded-full hover:bg-slate-100 transition-colors"><X size={20}/></button>
        </div>
        <p className="text-sm text-slate-500 font-medium mb-6">{debt.name} · Остаток {fmt(debt.balance)} · {debt.rate}%</p>

        {/* Переключатель */}
        <div className="flex bg-slate-50 p-1.5 rounded-2xl mb-6">
          <button onClick={() => setTab('auto')} className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all ${tab === 'auto' ? 'bg-white shadow-sm text-emerald-700' : 'text-slate-400'}`}>Автоматический расчёт</button>
          <button onClick={() => setTab('manual')} className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all ${tab === 'manual' ? 'bg-white shadow-sm text-emerald-700' : 'text-slate-400'}`}>Загрузить из банка</button>
        </div>

        {tab === 'manual' && (
          <div className="mb-6 space-y-3">
            <div className="bg-blue-50 text-blue-800 p-4 rounded-2xl text-xs font-medium">
              <div className="font-black mb-1">Формат CSV (5 колонок через ; или ,):</div>
              дата ; сумма_платежа ; проценты ; тело_долга ; остаток<br/>
              <span className="text-blue-500 mt-1 block">Пример: 2025-05-01;12500;3750;8750;241250</span>
            </div>
            <button onClick={() => fileRef.current?.click()} className="w-full border-2 border-dashed border-slate-200 p-4 rounded-2xl text-sm font-bold text-slate-500 hover:border-emerald-400 hover:text-emerald-600 transition-colors flex items-center justify-center gap-2">
              <Upload size={18}/> Загрузить CSV-файл
            </button>
            <input ref={fileRef} type="file" accept=".csv,.txt" className="hidden" onChange={handleFile}/>
            <textarea rows={5} className="w-full bg-slate-50 p-3 rounded-2xl text-xs font-mono outline-none border border-transparent focus:border-emerald-200 resize-none" placeholder="Или вставьте данные вручную..." value={csvText} onChange={e => setCsvText(e.target.value)}/>
            {csvError && <div className="text-red-500 text-xs font-bold bg-red-50 p-3 rounded-xl">{csvError}</div>}
          </div>
        )}

        {/* Итоги */}
        {schedule.length > 0 && (
          <>
            <div className="grid grid-cols-3 gap-3 mb-5">
              <div className="bg-slate-50 p-4 rounded-2xl text-center">
                <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Месяцев</div>
                <div className="text-2xl font-black text-slate-900">{schedule.length}</div>
              </div>
              <div className="bg-slate-50 p-4 rounded-2xl text-center">
                <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Выплат итого</div>
                <div className="text-lg font-black text-slate-900">{fmt(totalPaid)}</div>
              </div>
              <div className="bg-red-50 p-4 rounded-2xl text-center">
                <div className="text-[9px] font-black text-red-400 uppercase tracking-widest mb-1">Переплата</div>
                <div className="text-lg font-black text-red-500">{fmt(totalInterest)}</div>
              </div>
            </div>

            {/* Таблица (первые 12 строк) */}
            <div className="overflow-auto max-h-52 rounded-2xl border border-slate-100 mb-5">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 sticky top-0">
                  <tr>
                    {['№','Платёж','%','Тело','Остаток'].map(h => (
                      <th key={h} className="p-2.5 text-[10px] font-black text-slate-400 uppercase tracking-wider text-right first:text-left">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {schedule.map((r, i) => (
                    <tr key={i} className="border-t border-slate-50 hover:bg-slate-50/50">
                      <td className="p-2.5 font-bold text-slate-500">{r.month}</td>
                      <td className="p-2.5 font-bold text-right">{fmt(r.payment)}</td>
                      <td className="p-2.5 font-bold text-red-400 text-right">{fmt(r.interest)}</td>
                      <td className="p-2.5 font-bold text-emerald-600 text-right">{fmt(r.principal)}</td>
                      <td className="p-2.5 font-bold text-slate-700 text-right">{fmt(r.balance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
        {tab === 'auto' && schedule.length === 0 && (
          <div className="text-center py-8 text-slate-400 text-sm">Не удалось рассчитать: платёж меньше месячных процентов</div>
        )}

        <button onClick={handleSave} className="w-full bg-slate-900 text-white p-4 rounded-2xl font-black hover:bg-emerald-600 transition-all uppercase tracking-widest flex items-center justify-center gap-2">
          <Save size={18}/> Сохранить график
        </button>
      </div>
    </div>
  );
}

// ─── ТАБ: КАЛЕНДАРЬ ──────────────────────────────────────────────────────────
function CalendarTab({ debts }) {
  const now   = new Date();
  const year  = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startOffset = (new Date(year, month, 1).getDay() + 6) % 7;

  const byDay = useMemo(() => {
    const map = {};
    debts.forEach(d => {
      if (!d.nextPaymentDate) return;
      const [y, m, day] = d.nextPaymentDate.split('-').map(Number);
      if (y === year && m - 1 === month) {
        if (!map[day]) map[day] = [];
        map[day].push(d);
      }
    });
    return map;
  }, [debts, year, month]);

  const cells = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let i = 1; i <= daysInMonth; i++) cells.push(i);

  const todayDay = now.getDate();
  const months = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
  const days   = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'];

  const sorted = [...debts].sort((a,b) => getDaysDiff(a.nextPaymentDate) - getDaysDiff(b.nextPaymentDate));

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <h2 className="text-3xl font-black text-slate-900 flex items-center gap-3"><Calendar className="text-emerald-600" size={30}/> Календарь платежей</h2>

      <div className="bg-white rounded-[32px] border border-slate-100 p-6 md:p-8 shadow-sm">
        <div className="text-xl font-black text-slate-900 mb-6">{months[month]} {year}</div>
        <div className="grid grid-cols-7 mb-2">
          {days.map(d => <div key={d} className="text-center text-[10px] font-black text-slate-300 uppercase tracking-widest py-2">{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((day, i) => {
            if (!day) return <div key={`e${i}`}/>;
            const isToday = day === todayDay;
            const pmts = byDay[day];
            const isPaid   = pmts && pmts.every(d => d.isPaidThisMonth);
            const isOverdue= pmts && pmts.some(d => !d.isPaidThisMonth && getDaysDiff(d.nextPaymentDate) < 0);
            const isUrgent = pmts && pmts.some(d => !d.isPaidThisMonth && getDaysDiff(d.nextPaymentDate) >= 0 && getDaysDiff(d.nextPaymentDate) <= 3);
            let cls = 'relative aspect-square flex flex-col items-center justify-start pt-1.5 rounded-2xl text-sm font-bold transition-all';
            if (isToday) cls += ' ring-2 ring-emerald-500 ring-offset-1';
            if (pmts) {
              if (isPaid)       cls += ' bg-emerald-50 text-emerald-700';
              else if (isOverdue) cls += ' bg-red-50 text-red-700';
              else if (isUrgent)  cls += ' bg-orange-50 text-orange-700';
              else                cls += ' bg-slate-50 text-slate-700';
            } else cls += ' text-slate-300';
            return (
              <div key={day} className={cls}>
                <span>{day}</span>
                {pmts && <div className="flex flex-wrap justify-center gap-0.5 mt-1">{pmts.map(d => <div key={d.id} className={`w-1.5 h-1.5 rounded-full ${d.isPaidThisMonth ? 'bg-emerald-500' : isOverdue ? 'bg-red-500' : 'bg-orange-400'}`}/>)}</div>}
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-white rounded-[32px] border border-slate-100 p-6 md:p-8 shadow-sm">
        <h3 className="font-black text-lg text-slate-900 mb-6">Все платежи</h3>
        <div className="space-y-3">
          {sorted.map(d => {
            const days_ = getDaysDiff(d.nextPaymentDate);
            return (
              <div key={d.id} className={`flex items-center justify-between p-4 rounded-2xl border ${d.isPaidThisMonth ? 'border-slate-100 opacity-40' : days_ < 0 ? 'border-red-100 bg-red-50/30' : days_ <= 3 ? 'border-orange-100 bg-orange-50/30' : 'border-slate-100'}`}>
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-[11px] font-black ${d.isPaidThisMonth ? 'bg-emerald-100 text-emerald-700' : days_ < 0 ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-700'}`}>
                    {fmtDate(d.nextPaymentDate, {day:'numeric', month:'short'})}
                  </div>
                  <div>
                    <div className="font-bold text-slate-900 text-sm">{d.name}</div>
                    <div className="text-[11px] text-slate-400 font-medium">{d.rate > 0 ? `${d.rate}%` : 'Рассрочка 0%'}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="font-black text-slate-900">{fmt(d.minPayment)}</div>
                  <DaysBadge days={days_} paid={d.isPaidThisMonth}/>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── ТАБ: АНАЛИТИКА + ГРАФИК ─────────────────────────────────────────────────
function AnalyticsTab({ debts, freeMoney, totalDebt, totalMinPaymentAll, debtHistory }) {
  const totalMonthlyInterest = debts.reduce((s,d) => s + (d.rate > 0 ? d.balance * d.rate / 100 / 12 : 0), 0);

  // Точная переплата: из графика если есть, иначе аннуитетный расчёт
  const totalOverpay = debts.reduce((s, d) => {
    const sched = d.schedule?.length > 0 ? d.schedule : buildAnnuitySchedule(d.balance, d.rate, d.minPayment);
    return s + sched.reduce((si, r) => si + r.interest, 0);
  }, 0);

  // График динамики долга по месяцам (история + прогноз)
  const chartData = useMemo(() => {
    // История из debtHistory
    const hist = (debtHistory || []).map(h => ({ label: h.label, value: h.total, type: 'fact' }));

    // Прогноз: симулируем погашение по стратегии лавина
    const current = debts.map(d => ({ ...d, bal: d.balance }));
    const months  = ['Янв','Фев','Мар','Апр','Май','Июн','Июл','Авг','Сен','Окт','Ноя','Дек'];
    const now = new Date();
    const forecast = [];
    for (let i = 0; i <= 18; i++) {
      const d_ = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const lbl = `${months[d_.getMonth()]} ${d_.getFullYear().toString().slice(2)}`;
      const total = current.reduce((s, d) => s + Math.max(0, d.bal), 0);
      forecast.push({ label: lbl, value: Math.round(total), type: i === 0 ? 'fact' : 'forecast' });
      // Уменьшаем балансы
      current.forEach(d => {
        if (d.bal <= 0) return;
        const interest = d.rate > 0 ? d.bal * d.rate / 100 / 12 : 0;
        d.bal = Math.max(0, d.bal - (d.minPayment - interest));
      });
    }
    // Объединяем: история до сегодня, прогноз далее
    return hist.length > 0 ? [...hist, ...forecast.slice(1)] : forecast;
  }, [debts, debtHistory]);

  const maxVal = Math.max(...chartData.map(p => p.value), 1);
  const chartH = 140;

  const mostExpensive = [...debts].sort((a,b) => b.rate - a.rate)[0];
  const mostUrgent    = [...debts].filter(d => !d.isPaidThisMonth).sort((a,b) => getDaysDiff(a.nextPaymentDate) - getDaysDiff(b.nextPaymentDate))[0];

  const barColors = ['bg-emerald-500','bg-teal-400','bg-cyan-400','bg-sky-400','bg-blue-400','bg-indigo-400','bg-violet-400'];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h2 className="text-3xl font-black text-slate-900 flex items-center gap-3"><PieChart className="text-emerald-600" size={30}/> Аналитика</h2>

      {/* KPI */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Всего долгов', val: debts.length, unit: 'шт', color: 'text-slate-900' },
          { label: 'Проценты / мес', val: fmt(totalMonthlyInterest), unit: '', color: 'text-red-500' },
          { label: 'КПД платежа', val: totalMinPaymentAll > 0 ? Math.round((totalMinPaymentAll - totalMonthlyInterest) / totalMinPaymentAll * 100) + '%' : '—', unit: '', color: 'text-emerald-600' },
          { label: 'Переплата итого', val: fmt(totalOverpay), unit: '', color: 'text-orange-500' },
        ].map(k => (
          <div key={k.label} className="bg-white p-5 rounded-[28px] border border-slate-100 shadow-sm">
            <div className="text-[9px] text-slate-400 font-black uppercase tracking-widest mb-2">{k.label}</div>
            <div className={`text-2xl font-black ${k.color}`}>{k.val}</div>
          </div>
        ))}
      </div>

      {/* График динамики */}
      <div className="bg-white p-7 rounded-[32px] border border-slate-100 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-black text-slate-900 text-lg">Динамика долга</h3>
          <div className="flex items-center gap-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-emerald-500 inline-block"/><span>Факт</span></span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-2 rounded border-2 border-dashed border-slate-300 inline-block"/><span>Прогноз</span></span>
          </div>
        </div>
        <div className="relative" style={{height: chartH + 40}}>
          {/* Горизонтальные линии */}
          {[0,0.25,0.5,0.75,1].map(f => (
            <div key={f} className="absolute w-full border-t border-slate-100 flex items-center" style={{bottom: f * chartH + 24}}>
              <span className="text-[10px] text-slate-300 font-bold -translate-y-2 -translate-x-1 pr-1 whitespace-nowrap">{fmt(maxVal * f)}</span>
            </div>
          ))}
          {/* Бары + линия */}
          <div className="absolute inset-x-0 bottom-6 top-0 flex items-end gap-1 pl-16 pr-2 overflow-hidden">
            {chartData.map((p, i) => {
              const h = Math.round((p.value / maxVal) * chartH);
              return (
                <div key={i} className="flex-1 flex flex-col items-center justify-end gap-1 min-w-0 group" style={{height: chartH}}>
                  <div
                    className={`w-full rounded-t-xl transition-all duration-700 relative ${p.type === 'fact' ? 'bg-emerald-500' : 'bg-slate-200'}`}
                    style={{height: h}}
                    title={`${p.label}: ${fmt(p.value)}`}
                  >
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[9px] font-black px-2 py-1 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                      {fmt(p.value)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {/* Подписи */}
          <div className="absolute inset-x-0 bottom-0 flex gap-1 pl-16 pr-2">
            {chartData.map((p, i) => (
              <div key={i} className="flex-1 text-center text-[9px] font-bold text-slate-400 truncate min-w-0">{p.label}</div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Структура долга */}
        <div className="bg-white p-7 rounded-[32px] border border-slate-100 shadow-sm">
          <h3 className="font-black text-slate-900 text-lg mb-6">Структура долга</h3>
          {totalDebt === 0 ? <p className="text-sm text-slate-400 text-center py-8">Нет данных</p> : (
            <div className="space-y-4">
              {[...debts].sort((a,b) => b.balance - a.balance).map((d,i) => (
                <div key={d.id}>
                  <div className="flex justify-between text-xs font-bold mb-1.5">
                    <span className="text-slate-700 truncate mr-2">{d.name}</span>
                    <span className="text-slate-400">{Math.round(d.balance / totalDebt * 100)}%</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                    <div className={`${barColors[i % barColors.length]} h-full rounded-full transition-all duration-700`} style={{width:`${d.balance/totalDebt*100}%`}}/>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Куда уходит платёж */}
        <div className="bg-white p-7 rounded-[32px] border border-slate-100 shadow-sm">
          <h3 className="font-black text-slate-900 text-lg mb-6">Состав платежей</h3>
          <div className="space-y-4">
            {debts.map(d => {
              const interest   = d.rate > 0 ? d.balance * d.rate / 100 / 12 : 0;
              const principal  = Math.max(0, d.minPayment - interest);
              const pct        = d.minPayment > 0 ? interest / d.minPayment * 100 : 0;
              return (
                <div key={d.id}>
                  <div className="flex justify-between text-xs font-bold mb-1.5">
                    <span className="text-slate-700 truncate mr-2">{d.name}</span>
                    <span className="text-red-400">{Math.round(pct)}% %</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden flex">
                    <div className="bg-red-400 h-full" style={{width:`${pct}%`}}/>
                    <div className="bg-emerald-500 h-full" style={{width:`${100-pct}%`}}/>
                  </div>
                  <div className="flex justify-between text-[10px] font-medium text-slate-400 mt-1">
                    <span className="text-red-400">%: {fmt(interest)}</span>
                    <span className="text-emerald-600">Долг: {fmt(principal)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Инсайты */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {mostExpensive && (
          <div className="bg-red-50 p-7 rounded-[32px] border border-red-100">
            <div className="text-[9px] text-red-400 font-black uppercase tracking-widest mb-3">🔥 Самый дорогой</div>
            <div className="font-black text-xl text-slate-900 mb-1">{mostExpensive.name}</div>
            <div className="text-4xl font-black text-red-500 mb-2">{mostExpensive.rate}%</div>
            <p className="text-sm text-red-700 font-medium">Сжигает {fmt(mostExpensive.balance * mostExpensive.rate / 100 / 12)} в мес. По стратегии Лавина — гасить первым.</p>
          </div>
        )}
        {mostUrgent && (
          <div className="bg-orange-50 p-7 rounded-[32px] border border-orange-100">
            <div className="text-[9px] text-orange-400 font-black uppercase tracking-widest mb-3">⏰ Ближайший платёж</div>
            <div className="font-black text-xl text-slate-900 mb-1">{mostUrgent.name}</div>
            <div className="text-4xl font-black text-orange-500 mb-2">{(() => { const d = getDaysDiff(mostUrgent.nextPaymentDate); return d < 0 ? `−${Math.abs(d)} дн.` : d === 0 ? 'Сегодня' : `${d} дн.`; })()}</div>
            <p className="text-sm text-orange-700 font-medium">Платёж {fmt(mostUrgent.minPayment)}. {getDaysDiff(mostUrgent.nextPaymentDate) < 0 ? 'Просрочка! Срочно оплатите.' : 'Пополните счёт заранее.'}</p>
          </div>
        )}
      </div>

      {/* Советы */}
      <div className="bg-white p-7 rounded-[32px] border border-slate-100 shadow-sm">
        <h3 className="font-black text-slate-900 text-lg mb-5">Как снизить переплату</h3>
        <div className="space-y-3">
          {[
            ['⚡','Частичное досрочное погашение','Любая сумма сверх обязательного платежа сокращает тело долга и уменьшает будущие проценты.'],
            ['🔄','Рефинансирование','Если нашли ставку на 3%+ ниже — рефинансируйте. Особенно актуально для кредиток 29–34%.'],
            ['❌','Отключите страховку','Проверьте приложения банков: скрытые страховки часто 1–1.5% в месяц.'],
            ['📆','Используйте грейс-период','По кредиткам — полностью гасите долг до конца беспроцентного периода.'],
            ['📉','Уменьшайте срок, не платёж','При досрочке выбирайте уменьшение срока — это выгоднее.'],
          ].map(([icon, title, desc]) => (
            <div key={title} className="flex gap-4 p-4 bg-slate-50 rounded-2xl">
              <span className="text-2xl shrink-0">{icon}</span>
              <div><div className="font-bold text-slate-900 text-sm mb-0.5">{title}</div><div className="text-xs text-slate-500 font-medium leading-relaxed">{desc}</div></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── ТАБ: КАЛЬКУЛЯТОРЫ ───────────────────────────────────────────────────────
function CalculatorsTab({ debts }) {
  // ── Досрочное погашение ──────────────────────────────────────────────────
  const [epDebtId,    setEpDebtId]    = useState(debts[0]?.id || '');
  const [epAmount,    setEpAmount]    = useState('');
  const [epMode,      setEpMode]      = useState('term'); // 'term' | 'payment'
  const [epResult,    setEpResult]    = useState(null);

  const calcEarlyPayoff = () => {
    const debt = debts.find(d => d.id == epDebtId);
    if (!debt || !epAmount) return;
    const extra = Number(epAmount);
    const r = debt.rate / 100 / 12;

    // Без досрочки
    const schedBase = buildAnnuitySchedule(debt.balance, debt.rate, debt.minPayment);
    const baseMonths = schedBase.length;
    const baseInterest = schedBase.reduce((s,row) => s + row.interest, 0);

    // С досрочкой: применяем extra к телу долга
    const newBalance = Math.max(0, debt.balance - extra);
    const newPayment = epMode === 'term'
      ? debt.minPayment  // тот же платёж → меньше срок
      : r > 0 ? Math.ceil(newBalance * r / (1 - Math.pow(1+r, -baseMonths))) : Math.ceil(newBalance / baseMonths); // тот же срок → меньше платёж

    const schedNew   = buildAnnuitySchedule(newBalance, debt.rate, Math.max(newPayment, r > 0 ? newBalance * r + 1 : 1));
    const newMonths  = schedNew.length;
    const newInterest= schedNew.reduce((s,row) => s + row.interest, 0);

    setEpResult({
      baseMo: baseMonths, newMo: newMonths, savedMo: baseMonths - newMonths,
      baseInt: baseInterest, newInt: newInterest, savedInt: baseInterest - newInterest,
      newPayment: epMode === 'payment' ? newPayment : debt.minPayment,
    });
  };

  // ── Рефинансирование ─────────────────────────────────────────────────────
  const [refiDebtId,  setRefiDebtId]  = useState(debts[0]?.id || '');
  const [refiRate,    setRefiRate]    = useState('');
  const [refiResult,  setRefiResult]  = useState(null);

  const calcRefi = () => {
    const debt = debts.find(d => d.id == refiDebtId);
    if (!debt || !refiRate) return;

    const schedOld = buildAnnuitySchedule(debt.balance, debt.rate, debt.minPayment);
    const oldMonths   = schedOld.length;
    const oldInterest = schedOld.reduce((s,r) => s + r.interest, 0);

    const rNew = Number(refiRate) / 100 / 12;
    const newPayment = rNew > 0
      ? Math.ceil(debt.balance * rNew / (1 - Math.pow(1+rNew, -oldMonths)))
      : Math.ceil(debt.balance / oldMonths);

    const schedNew   = buildAnnuitySchedule(debt.balance, Number(refiRate), newPayment);
    const newInterest= schedNew.reduce((s,r) => s + r.interest, 0);

    setRefiResult({
      oldRate: debt.rate, newRate: Number(refiRate),
      oldPayment: debt.minPayment, newPayment,
      oldInterest, newInterest,
      savedInterest: oldInterest - newInterest,
      savedMonthly: debt.minPayment - newPayment,
      months: oldMonths,
    });
  };

  const sel  = "w-full bg-slate-50 p-3.5 rounded-2xl outline-none font-bold text-slate-900 focus:ring-4 ring-emerald-500/10 border border-transparent focus:border-emerald-200 transition-all text-sm";
  const inp  = sel;
  const lbl  = "text-[9px] uppercase font-black text-slate-400 ml-1 mb-1 block tracking-widest";

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <h2 className="text-3xl font-black text-slate-900 flex items-center gap-3"><Calculator className="text-emerald-600" size={30}/> Калькуляторы</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

        {/* ── Досрочное погашение ── */}
        <div className="bg-white p-7 rounded-[32px] border border-slate-100 shadow-sm">
          <h3 className="font-black text-lg text-slate-900 mb-1 flex items-center gap-2"><Zap size={20} className="text-emerald-600"/> Досрочное погашение</h3>
          <p className="text-xs text-slate-400 font-medium mb-6">Внесите сумму сверх платежа — увидите экономию</p>

          <div className="space-y-4">
            <div>
              <label className={lbl}>Кредит</label>
              <select className={sel} value={epDebtId} onChange={e => { setEpDebtId(e.target.value); setEpResult(null); }}>
                {debts.map(d => <option key={d.id} value={d.id}>{d.name} ({fmt(d.balance)})</option>)}
              </select>
            </div>
            <div>
              <label className={lbl}>Сумма досрочного взноса ₽</label>
              <input type="number" className={inp} placeholder="50000" value={epAmount} onChange={e => { setEpAmount(e.target.value); setEpResult(null); }}/>
            </div>
            <div>
              <label className={lbl}>Что уменьшить?</label>
              <div className="flex bg-slate-50 p-1.5 rounded-2xl">
                <button onClick={() => setEpMode('term')} className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all ${epMode === 'term' ? 'bg-white shadow-sm text-emerald-700' : 'text-slate-400'}`}>Срок кредита</button>
                <button onClick={() => setEpMode('payment')} className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all ${epMode === 'payment' ? 'bg-white shadow-sm text-emerald-700' : 'text-slate-400'}`}>Платёж</button>
              </div>
            </div>
            <button onClick={calcEarlyPayoff} disabled={!epAmount || !epDebtId} className="w-full bg-slate-900 text-white p-4 rounded-2xl font-black hover:bg-emerald-600 transition-all disabled:opacity-40 uppercase tracking-widest">
              Рассчитать
            </button>
          </div>

          {epResult && (
            <div className="mt-6 space-y-3">
              <div className="bg-emerald-50 p-5 rounded-2xl border border-emerald-100">
                <div className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-3">Результат</div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-[10px] text-slate-400 font-bold mb-0.5">Срок</div>
                    <div className="font-black text-slate-900">{epResult.baseMo} → {epResult.newMo} мес.</div>
                    <div className="text-emerald-600 font-black text-sm">−{epResult.savedMo} мес.</div>
                  </div>
                  {epMode === 'payment' && (
                    <div>
                      <div className="text-[10px] text-slate-400 font-bold mb-0.5">Новый платёж</div>
                      <div className="font-black text-slate-900">{fmt(epResult.newPayment)}</div>
                      <div className="text-emerald-600 font-black text-sm">−{fmt(debts.find(d=>d.id==epDebtId)?.minPayment - epResult.newPayment)}/мес</div>
                    </div>
                  )}
                  <div className="col-span-2 bg-white p-3 rounded-xl">
                    <div className="text-[10px] text-slate-400 font-bold mb-0.5">Экономия на процентах</div>
                    <div className="text-2xl font-black text-emerald-600">{fmt(epResult.savedInt)}</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Рефинансирование ── */}
        <div className="bg-white p-7 rounded-[32px] border border-slate-100 shadow-sm">
          <h3 className="font-black text-lg text-slate-900 mb-1 flex items-center gap-2"><RefreshCw size={20} className="text-blue-500"/> Рефинансирование</h3>
          <p className="text-xs text-slate-400 font-medium mb-6">Сравните текущую ставку с новым предложением</p>

          <div className="space-y-4">
            <div>
              <label className={lbl}>Кредит для рефинансирования</label>
              <select className={sel} value={refiDebtId} onChange={e => { setRefiDebtId(e.target.value); setRefiResult(null); }}>
                {debts.map(d => <option key={d.id} value={d.id}>{d.name} — {d.rate}% ({fmt(d.balance)})</option>)}
              </select>
            </div>
            <div>
              <label className={lbl}>Новая ставка % годовых</label>
              <input type="number" step="0.1" className={inp} placeholder="14.9" value={refiRate} onChange={e => { setRefiRate(e.target.value); setRefiResult(null); }}/>
            </div>

            {refiRate && debts.find(d => d.id == refiDebtId) && (
              <div className={`p-3 rounded-xl text-xs font-bold ${Number(refiRate) < debts.find(d=>d.id==refiDebtId)?.rate ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
                {Number(refiRate) < debts.find(d=>d.id==refiDebtId)?.rate
                  ? `✓ Ставка ниже на ${(debts.find(d=>d.id==refiDebtId)?.rate - Number(refiRate)).toFixed(1)}%`
                  : `✗ Ставка выше — рефинансирование невыгодно`}
              </div>
            )}

            <button onClick={calcRefi} disabled={!refiRate || !refiDebtId} className="w-full bg-slate-900 text-white p-4 rounded-2xl font-black hover:bg-blue-600 transition-all disabled:opacity-40 uppercase tracking-widest">
              Сравнить
            </button>
          </div>

          {refiResult && (
            <div className="mt-6 space-y-3">
              <div className={`p-5 rounded-2xl border ${refiResult.savedInterest > 0 ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}>
                <div className={`text-[9px] font-black uppercase tracking-widest mb-3 ${refiResult.savedInterest > 0 ? 'text-emerald-600' : 'text-red-500'}`}>Результат сравнения</div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="text-[10px] text-slate-400 font-bold mb-0.5">Старый платёж</div>
                    <div className="font-black text-slate-700">{fmt(refiResult.oldPayment)}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400 font-bold mb-0.5">Новый платёж</div>
                    <div className={`font-black ${refiResult.newPayment < refiResult.oldPayment ? 'text-emerald-600' : 'text-red-500'}`}>{fmt(refiResult.newPayment)}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400 font-bold mb-0.5">Экономия / мес</div>
                    <div className={`font-black text-lg ${refiResult.savedMonthly > 0 ? 'text-emerald-600' : 'text-red-500'}`}>{refiResult.savedMonthly > 0 ? '+' : ''}{fmt(refiResult.savedMonthly)}</div>
                  </div>
                  <div className="bg-white p-3 rounded-xl">
                    <div className="text-[10px] text-slate-400 font-bold mb-0.5">Экономия итого</div>
                    <div className={`font-black text-lg ${refiResult.savedInterest > 0 ? 'text-emerald-600' : 'text-red-500'}`}>{fmt(refiResult.savedInterest)}</div>
                  </div>
                </div>
                <div className="mt-3 text-xs text-slate-500 font-medium">
                  Старые %: {fmt(refiResult.oldInterest)} → Новые %: {fmt(refiResult.newInterest)}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── ГЛАВНЫЙ КОМПОНЕНТ ────────────────────────────────────────────────────────
function App() {
  const [activeTab, setActiveTab]         = useState('dashboard');
  const [user, setUser]                   = useState(null);
  const [isLoading, setIsLoading]         = useState(true);
  const [isLocalFallback, setIsLocalFallback] = useState(false);

  const [debts, setDebts]                 = useState([]);
  const [freeMoney, setFreeMoney]         = useState(15000);
  const [freeMoneyInput, setFreeMoneyInput] = useState('15000');
  const [strategy, setStrategy]           = useState('avalanche');
  const [debtHistory, setDebtHistory]     = useState([]); // [{label, total}]

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen]     = useState(false);
  const [isAddOpen, setIsAddOpen]         = useState(false);
  const [editingDebt, setEditingDebt]     = useState(null);
  const [scheduleDebt, setScheduleDebt]   = useState(null);
  const [expandedId, setExpandedId]       = useState(null);
  const [newDebt, setNewDebt] = useState({ name:'', balance:'', rate:'', minPayment:'', nextPaymentDate:'', detailsSummary:'' });

  // ── Firebase Auth ──
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, u => { if (u) setUser(u); });
    signInAnonymously(auth).catch(() => enableLocalMode());
    return () => unsub();
  }, []);

  // ── Firestore ──
  useEffect(() => {
    if (isLocalFallback || !user) return;
    const ref   = doc(db, 'artifacts', APP_ID, 'public', 'data', 'appState', 'main');
    const timer = setTimeout(() => { if (isLoading) enableLocalMode(); }, 5000);
    const unsub = onSnapshot(ref, snap => {
      clearTimeout(timer);
      if (snap.exists()) {
        const data = snap.data();
        setDebts(data.debts || []);
        setFreeMoney(data.freeMoney ?? 15000);
        setFreeMoneyInput(String(data.freeMoney ?? 15000));
        setStrategy(data.strategy || 'avalanche');
        setDebtHistory(data.debtHistory || []);
      } else {
        setDoc(ref, { debts: initialDebts, freeMoney: 15000, strategy: 'avalanche', debtHistory: [] });
      }
      setIsLoading(false);
    }, () => { clearTimeout(timer); enableLocalMode(); });
    return () => { clearTimeout(timer); unsub(); };
  }, [user, isLocalFallback]); // eslint-disable-line

  const enableLocalMode = useCallback(() => {
    setIsLocalFallback(true); setIsLoading(false);
    try {
      const sd = localStorage.getItem('localDebts');
      const sf = localStorage.getItem('localFreeMoney');
      const ss = localStorage.getItem('localStrategy');
      const sh = localStorage.getItem('localHistory');
      const d  = sd ? JSON.parse(sd) : initialDebts;
      const f  = sf ? Number(sf) : 15000;
      const s  = ss || 'avalanche';
      const h  = sh ? JSON.parse(sh) : [];
      setDebts(d); setFreeMoney(f); setFreeMoneyInput(String(f)); setStrategy(s); setDebtHistory(h);
    } catch { setDebts(initialDebts); }
  }, []);

  const saveData = useCallback((nd, nf, ns, nh) => {
    const history = nh !== undefined ? nh : debtHistory;
    if (isLocalFallback || !user) {
      localStorage.setItem('localDebts', JSON.stringify(nd));
      localStorage.setItem('localFreeMoney', String(nf));
      localStorage.setItem('localStrategy', ns);
      localStorage.setItem('localHistory', JSON.stringify(history));
    } else {
      const ref = doc(db, 'artifacts', APP_ID, 'public', 'data', 'appState', 'main');
      setDoc(ref, { debts: nd, freeMoney: Number(nf), strategy: ns, debtHistory: history }, { merge: true }).catch(console.error);
    }
  }, [isLocalFallback, user, debtHistory]);

  // ── Математика ──
  const totalDebt           = debts.reduce((acc,d) => acc + Number(d.balance||0), 0);
  const totalMinPaymentAll  = debts.reduce((acc,d) => acc + Number(d.minPayment||0), 0);
  const totalMinPaymentLeft = debts.reduce((acc,d) => acc + (d.isPaidThisMonth ? 0 : Number(d.minPayment||0)), 0);
  const paidThisMonthAmount = debts.filter(d => d.isPaidThisMonth).reduce((acc,d) => acc + Number(d.minPayment||0), 0);
  const progressPercent     = totalMinPaymentAll === 0 ? 0 : Math.round(paidThisMonthAmount / totalMinPaymentAll * 100);
  const overdueDebts        = debts.filter(d => !d.isPaidThisMonth && getDaysDiff(d.nextPaymentDate) < 0);
  const totalOverdue        = overdueDebts.reduce((acc,d) => acc + Number(d.minPayment||0), 0);

  const sortedDebts = useMemo(() =>
    [...debts].sort((a,b) => {
      if (a.isPaidThisMonth !== b.isPaidThisMonth) return a.isPaidThisMonth ? 1 : -1;
      return getDaysDiff(a.nextPaymentDate) - getDaysDiff(b.nextPaymentDate);
    }), [debts]);

  const strategyAllocation = useMemo(() => {
    let remain = Number(freeMoney) || 0;
    const alloc = {};
    const targets = [...debts.filter(d => d.balance > 0)];
    targets.sort((a,b) => strategy === 'avalanche' ? (b.rate||0) - (a.rate||0) : (a.balance||0) - (b.balance||0));
    targets.forEach(d => { const take = Math.min(remain, d.balance); alloc[d.id] = take; remain -= take; });
    return alloc;
  }, [debts, freeMoney, strategy]);

  const notifications = useMemo(() => {
    const list = [];
    overdueDebts.forEach(d => list.push({ type:'overdue', title:'Просрочка', text:`"${d.name}" — платёж просрочен!` }));
    debts.filter(d => !d.isPaidThisMonth && getDaysDiff(d.nextPaymentDate) >= 0 && getDaysDiff(d.nextPaymentDate) <= 3)
         .forEach(d => list.push({ type:'soon', title:'Скоро платёж', text:`"${d.name}" — через ${getDaysDiff(d.nextPaymentDate)} дн.` }));
    return list;
  }, [debts, overdueDebts]);

  // ── Действия ──
  const handleMarkPaid = (id) => {
    const next = debts.map(d => d.id === id ? { ...d, isPaidThisMonth: true, balance: Math.max(0, d.balance - (d.minPayment||0)), _prevBalance: d.balance } : d);
    setDebts(next); saveData(next, freeMoney, strategy);
  };
  const handleUndoPaid = (id) => {
    const next = debts.map(d => d.id === id ? { ...d, isPaidThisMonth: false, balance: d._prevBalance ?? d.balance + (d.minPayment||0) } : d);
    setDebts(next); saveData(next, freeMoney, strategy);
  };
  const handleResetMonth = () => {
    if (!window.confirm('Сбросить статусы оплат для нового месяца?')) return;
    // Записываем снимок в историю
    const months = ['Янв','Фев','Мар','Апр','Май','Июн','Июл','Авг','Сен','Окт','Ноя','Дек'];
    const now = new Date();
    const label = `${months[now.getMonth()]} ${now.getFullYear().toString().slice(2)}`;
    const newHistory = [...debtHistory, { label, total: totalDebt }].slice(-24);
    setDebtHistory(newHistory);
    const next = debts.map(d => ({ ...d, isPaidThisMonth: false }));
    setDebts(next); saveData(next, freeMoney, strategy, newHistory);
  };
  const handleAdd = (e) => {
    e.preventDefault();
    const item = { ...newDebt, id: Date.now(), isPaidThisMonth: false, balance: Number(newDebt.balance), rate: Number(newDebt.rate), minPayment: Number(newDebt.minPayment), details: { summary: newDebt.detailsSummary || '' }, schedule: [] };
    const next = [...debts, item];
    setDebts(next); saveData(next, freeMoney, strategy);
    setIsAddOpen(false);
    setNewDebt({ name:'', balance:'', rate:'', minPayment:'', nextPaymentDate:'', detailsSummary:'' });
  };
  const handleSaveEdit = (updated) => {
    const next = debts.map(d => d.id === updated.id ? updated : d);
    setDebts(next); saveData(next, freeMoney, strategy);
    setEditingDebt(null);
  };
  const handleSaveSchedule = (updated) => {
    const next = debts.map(d => d.id === updated.id ? updated : d);
    setDebts(next); saveData(next, freeMoney, strategy);
    setScheduleDebt(null);
  };
  const handleDelete = (id) => {
    if (!window.confirm('Удалить этот долг?')) return;
    const next = debts.filter(d => d.id !== id);
    setDebts(next); saveData(next, freeMoney, strategy);
  };
  const handleFreeMoneyBlur = () => {
    const val = Number(freeMoneyInput) || 0;
    setFreeMoney(val); saveData(debts, val, strategy);
  };
  const handleStrategyChange = (s) => {
    setStrategy(s); saveData(debts, freeMoney, s);
  };

  if (isLoading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8FAFC] text-emerald-700">
      <div className="relative w-16 h-16 mb-4">
        <div className="absolute inset-0 border-4 border-emerald-100 rounded-full"/>
        <div className="absolute inset-0 border-4 border-emerald-600 rounded-full border-t-transparent animate-spin"/>
      </div>
      <p className="font-bold tracking-tight">Подключение...</p>
    </div>
  );

  const nav = [
    { id:'dashboard',   icon:<LayoutDashboard size={20}/>, label:'Дашборд'      },
    { id:'calendar',    icon:<Calendar size={20}/>,        label:'Календарь'    },
    { id:'analytics',   icon:<PieChart size={20}/>,        label:'Аналитика'    },
    { id:'calculators', icon:<Calculator size={20}/>,      label:'Калькуляторы' },
    { id:'investing',   icon:<Target size={20}/>,          label:'После долгов' },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 font-sans flex overflow-hidden">
      {isSidebarOpen && <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden" onClick={() => setIsSidebarOpen(false)}/>}

      {/* ── Sidebar ── */}
      <aside className={`fixed lg:static inset-y-0 left-0 w-64 bg-white border-r border-slate-100 z-50 transition-transform duration-300 flex flex-col ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-200"><Wallet size={20}/></div>
          <span className="font-black text-xl tracking-tight text-slate-900">Свобода.</span>
        </div>
        <nav className="flex-1 px-4 space-y-1 mt-2">
          {nav.map(item => (
            <button key={item.id} onClick={() => { setActiveTab(item.id); setIsSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 p-3.5 rounded-2xl font-bold text-sm transition-all ${activeTab === item.id ? 'bg-emerald-50 text-emerald-700' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'}`}>
              {item.icon} {item.label}
            </button>
          ))}
        </nav>
        <div className="px-4 pb-6">
          <div className="bg-slate-900 p-5 rounded-[24px] text-white">
            <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1 text-center">Прогресс месяца</div>
            <div className="text-[11px] text-emerald-400 font-bold text-center mb-4">{fmt(paidThisMonthAmount)} / {fmt(totalMinPaymentAll)}</div>
            <div className="flex justify-center relative">
              <svg className="w-24 h-24 -rotate-90">
                <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="9" fill="transparent" className="text-slate-800"/>
                <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="9" fill="transparent" strokeDasharray="251.3" strokeDashoffset={251.3 - (progressPercent/100)*251.3} strokeLinecap="round" className="text-emerald-500 transition-all duration-1000"/>
              </svg>
              <div className="absolute inset-0 flex items-center justify-center font-black text-2xl">{progressPercent}%</div>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="bg-white/80 backdrop-blur-md border-b border-slate-100 sticky top-0 z-30">
          <div className="flex items-center justify-between px-4 lg:px-8 py-4">
            <button className="lg:hidden p-2 -ml-2 text-slate-500" onClick={() => setIsSidebarOpen(true)}><Menu size={22}/></button>
            <div className="flex items-center gap-3 ml-auto">
              {isLocalFallback
                ? <div className="hidden sm:flex items-center gap-2 bg-orange-50 text-orange-600 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest"><WifiOff size={13}/> Локальный режим</div>
                : <div className="hidden sm:flex items-center gap-2 text-emerald-600 text-[10px] font-black uppercase tracking-widest"><div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"/> Облако</div>
              }
              <div className="relative">
                <button onClick={() => setIsNotifOpen(v => !v)} className="p-2 text-slate-500 hover:bg-slate-100 rounded-full relative transition-colors">
                  <Bell size={22}/>
                  {notifications.length > 0 && <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 border-2 border-white rounded-full"/>}
                </button>
                {isNotifOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsNotifOpen(false)}/>
                    <div className="absolute right-0 mt-2 w-72 bg-white rounded-[24px] shadow-2xl border border-slate-100 p-2 z-50">
                      <div className="p-3 font-black text-sm border-b border-slate-50 text-slate-900">Уведомления</div>
                      <div className="max-h-64 overflow-y-auto">
                        {notifications.length === 0
                          ? <div className="p-5 text-xs text-slate-400 text-center font-medium">Всё спокойно ✓</div>
                          : notifications.map((n,i) => (
                            <div key={i} className={`p-3 border-b border-slate-50 last:border-0 text-xs ${n.type === 'overdue' ? 'bg-red-50/50' : ''}`}>
                              <div className={`font-black mb-0.5 ${n.type === 'overdue' ? 'text-red-600' : 'text-orange-500'}`}>{n.title}</div>
                              <div className="text-slate-600 font-medium">{n.text}</div>
                            </div>
                          ))
                        }
                      </div>
                    </div>
                  </>
                )}
              </div>
              <div className="w-9 h-9 bg-slate-100 rounded-full flex items-center justify-center text-slate-400"><Wallet size={18}/></div>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 lg:p-8">
          <div className="max-w-5xl mx-auto">

            {/* ════════════════ ДАШБОРД ════════════════ */}
            {activeTab === 'dashboard' && (
              <>
                <div className="flex justify-between items-end mb-8">
                  <div>
                    <h1 className="text-3xl lg:text-4xl font-black tracking-tight text-slate-900">Дашборд</h1>
                    <p className="text-sm text-slate-400 mt-1 font-medium">Осталось закрыть: {debts.length} кредитов</p>
                  </div>
                  <button onClick={() => setIsAddOpen(true)} className="bg-emerald-600 text-white px-5 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-emerald-200 hover:scale-105 transition-transform">
                    <PlusCircle size={20}/><span className="hidden sm:inline">Добавить</span>
                  </button>
                </div>

                {/* Метрики */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                  <div className="bg-emerald-600 p-6 rounded-[32px] text-white flex flex-col justify-between shadow-xl shadow-emerald-100">
                    <div className="text-[9px] opacity-70 font-black uppercase tracking-widest mb-2">Общий долг</div>
                    <div className="text-2xl md:text-3xl font-black truncate">{fmt(totalDebt)}</div>
                    <div className="text-[10px] opacity-60 mt-2 font-medium">{debts.length} обязательств</div>
                  </div>
                  <div className="bg-white p-6 rounded-[32px] border border-slate-100 flex flex-col justify-between shadow-sm">
                    <div className="text-[9px] text-slate-400 font-black uppercase tracking-widest mb-2">К оплате в мес.</div>
                    <div className="text-2xl md:text-3xl font-black text-slate-900 truncate">{fmt(totalMinPaymentLeft)}</div>
                    <div className="text-[10px] text-slate-400 mt-2 font-medium">осталось оплатить</div>
                  </div>
                  <div className="bg-white p-6 rounded-[32px] border border-slate-100 flex flex-col justify-between shadow-sm">
                    <div className="text-[9px] text-slate-400 font-black uppercase tracking-widest mb-2">Просрочено</div>
                    <div className={`text-2xl md:text-3xl font-black truncate ${totalOverdue > 0 ? 'text-red-500' : 'text-slate-900'}`}>{fmt(totalOverdue)}</div>
                    <div className={`text-[10px] mt-2 font-medium ${totalOverdue > 0 ? 'text-red-400' : 'text-emerald-500'}`}>{totalOverdue > 0 ? `${overdueDebts.length} просроченных` : 'Всё по графику ✓'}</div>
                  </div>
                  <div className="bg-white p-6 rounded-[32px] border border-slate-100 flex flex-col justify-between shadow-sm focus-within:ring-2 ring-emerald-500 transition-all">
                    <div className="text-[9px] text-slate-400 font-black uppercase tracking-widest mb-2">Свободные деньги</div>
                    <div className="relative">
                      <input type="number" value={freeMoneyInput} onChange={e => setFreeMoneyInput(e.target.value)} onBlur={handleFreeMoneyBlur}
                        className="text-2xl md:text-3xl font-black text-emerald-600 bg-transparent border-b border-emerald-100 outline-none w-full pb-1"/>
                      <span className="absolute right-0 bottom-2 text-emerald-300 font-black text-lg">₽</span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-2 font-medium">для досрочного погашения</div>
                  </div>
                </div>

                {/* Список + Стратегия */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-2 space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="font-black text-xl text-slate-900">Список платежей</h3>
                      <button onClick={handleResetMonth} className="text-[10px] font-black text-slate-400 border border-slate-200 px-3 py-1.5 rounded-xl flex items-center gap-1 hover:bg-slate-50 transition-colors uppercase tracking-widest">
                        <RotateCcw size={13}/> Новый месяц
                      </button>
                    </div>

                    {sortedDebts.length === 0 && (
                      <div className="text-center py-16 bg-white rounded-[32px] border border-dashed border-slate-200">
                        <div className="text-4xl mb-4">🎉</div>
                        <p className="font-bold text-slate-500">Долгов нет — вы свободны!</p>
                      </div>
                    )}

                    {sortedDebts.map(d => {
                      const days_  = getDaysDiff(d.nextPaymentDate);
                      const monthly = d.rate > 0 ? Number(d.balance) * Number(d.rate) / 100 / 12 : 0;
                      const principal = Math.max(0, Number(d.minPayment) - monthly);
                      const isExp  = expandedId === d.id;
                      const extra  = strategyAllocation[d.id] || 0;
                      const hasSched = d.schedule?.length > 0;
                      const totalOverpayDebt = hasSched
                        ? d.schedule.reduce((s,r) => s + r.interest, 0)
                        : buildAnnuitySchedule(d.balance, d.rate, d.minPayment).reduce((s,r) => s + r.interest, 0);

                      let cardCls = 'bg-white border-slate-100';
                      if (d.isPaidThisMonth)  cardCls = 'bg-white border-slate-100 opacity-40 grayscale';
                      else if (days_ < 0)     cardCls = 'bg-red-50/30 border-red-200';
                      else if (days_ <= 3)    cardCls = 'bg-orange-50/30 border-orange-200';

                      return (
                        <div key={d.id} className={`rounded-[32px] border transition-all shadow-sm ${cardCls} ${!d.isPaidThisMonth && days_ >= 0 ? 'hover:shadow-xl hover:shadow-slate-200/50' : ''}`}>
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-5 md:p-6 gap-4 cursor-pointer" onClick={() => setExpandedId(isExp ? null : d.id)}>
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-300 shrink-0"><Wallet size={24}/></div>
                              <div>
                                <h4 className="font-black text-base text-slate-900 flex items-center gap-2">
                                  {d.name}
                                  {isExp ? <ChevronUp size={16} className="text-slate-300"/> : <ChevronDown size={16} className="text-slate-300"/>}
                                </h4>
                                <p className="text-xs text-slate-400 font-medium mt-0.5">
                                  {d.rate > 0 ? `${d.rate}% год.` : 'Рассрочка 0%'} · Остаток {fmt(d.balance)}
                                  {hasSched && <span className="ml-1 text-emerald-500">· График загружен</span>}
                                </p>
                                {extra > 0 && !d.isPaidThisMonth && <p className="text-[10px] text-emerald-600 font-black mt-1 flex items-center gap-1"><TrendingDown size={12}/> Досрочно +{fmt(extra)}</p>}
                              </div>
                            </div>
                            <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto">
                              <div className="text-left sm:text-right">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Платёж</p>
                                <p className="text-xl font-black text-slate-900">{fmt(d.minPayment)}</p>
                              </div>
                              <DaysBadge days={days_} paid={d.isPaidThisMonth}/>
                              <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                                {d.isPaidThisMonth
                                  ? <button onClick={() => handleUndoPaid(d.id)} className="w-11 h-11 flex items-center justify-center text-slate-400 hover:text-orange-500 bg-slate-50 hover:bg-orange-50 rounded-2xl transition-colors" title="Отменить"><RotateCcw size={18}/></button>
                                  : <button onClick={() => handleMarkPaid(d.id)} className="bg-slate-900 text-white px-4 h-11 rounded-2xl text-[10px] font-black flex items-center gap-2 hover:bg-emerald-600 transition-colors shadow-lg"><CheckCircle2 size={16}/><span className="hidden sm:inline">ОПЛАТИТЬ</span></button>
                                }
                              </div>
                            </div>
                          </div>

                          {/* Развёрнутая секция */}
                          {isExp && (
                            <div className="px-5 md:px-6 pb-6 pt-2 border-t border-slate-100 cursor-default" onClick={e => e.stopPropagation()}>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 mb-5">
                                <div className="bg-slate-50 p-4 rounded-2xl"><span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">% в месяц</span><span className="font-black text-red-500">{fmt(monthly)}</span></div>
                                <div className="bg-slate-50 p-4 rounded-2xl"><span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">В долг</span><span className="font-black text-emerald-600">{fmt(principal)}</span></div>
                                <div className="bg-slate-50 p-4 rounded-2xl"><span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Дата</span><span className="font-black text-slate-900 text-sm">{fmtDate(d.nextPaymentDate, {day:'numeric', month:'short'})}</span></div>
                                <div className="bg-red-50 p-4 rounded-2xl"><span className="block text-[9px] font-black text-red-400 uppercase tracking-widest mb-1.5">Переплата</span><span className="font-black text-red-500">{fmt(totalOverpayDebt)}</span></div>
                              </div>

                              {d.rate > 0 && d.minPayment > 0 && (
                                <div className="mb-4">
                                  <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Состав платежа</div>
                                  <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden flex">
                                    <div className="bg-red-400 h-full" style={{width:`${Math.min(100,monthly/d.minPayment*100)}%`}}/>
                                    <div className="bg-emerald-500 h-full" style={{width:`${Math.max(0,100-monthly/d.minPayment*100)}%`}}/>
                                  </div>
                                  <div className="flex justify-between text-[10px] font-bold mt-1.5">
                                    <span className="text-red-400">Проценты: {fmt(monthly)}</span>
                                    <span className="text-emerald-600">Тело: {fmt(principal)}</span>
                                  </div>
                                </div>
                              )}

                              {/* Мини-таблица графика (5 строк) */}
                              {hasSched && (
                                <div className="mb-4">
                                  <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                                    <FileSpreadsheet size={12}/> Аннуитетный график (первые строки)
                                  </div>
                                  <div className="overflow-auto rounded-xl border border-slate-100">
                                    <table className="w-full text-[11px]">
                                      <thead className="bg-slate-50"><tr>{['№','Платёж','%','Тело','Остаток'].map(h => <th key={h} className="p-2 font-black text-slate-400 text-right first:text-left">{h}</th>)}</tr></thead>
                                      <tbody>
                                        {d.schedule.slice(0,5).map((r,i) => (
                                          <tr key={i} className="border-t border-slate-50">
                                            <td className="p-2 font-bold text-slate-400">{r.month}</td>
                                            <td className="p-2 font-bold text-right">{fmt(r.payment)}</td>
                                            <td className="p-2 font-bold text-red-400 text-right">{fmt(r.interest)}</td>
                                            <td className="p-2 font-bold text-emerald-600 text-right">{fmt(r.principal)}</td>
                                            <td className="p-2 font-bold text-slate-700 text-right">{fmt(r.balance)}</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              )}

                              {d.details?.summary && (
                                <div className="bg-amber-50 text-amber-900 p-4 rounded-2xl text-xs font-medium border border-amber-100 mb-4">
                                  <div className="flex items-center gap-2 mb-1.5 text-amber-600 font-black text-[10px] uppercase tracking-widest"><AlertCircle size={14}/> Условия банка</div>
                                  {d.details.gracePeriod && <div className="mb-1"><span className="font-black">Грейс: </span>{d.details.gracePeriod}</div>}
                                  {d.details.penalty    && <div className="mb-1"><span className="font-black">Штраф: </span><span className="text-red-700">{d.details.penalty}</span></div>}
                                  {d.details.summary}
                                </div>
                              )}

                              <div className="flex flex-wrap gap-2 justify-end">
                                <button onClick={() => setScheduleDebt(d)}
                                  className="text-xs font-black text-blue-500 bg-blue-50 hover:bg-blue-100 px-4 py-2.5 rounded-xl transition-colors flex items-center gap-2">
                                  <FileSpreadsheet size={14}/> {hasSched ? 'График' : 'Загрузить график'}
                                </button>
                                <button onClick={() => setEditingDebt(d)}
                                  className="text-xs font-black text-slate-600 bg-slate-100 hover:bg-slate-200 px-4 py-2.5 rounded-xl transition-colors flex items-center gap-2">
                                  <Edit3 size={14}/> Редактировать
                                </button>
                                <button onClick={() => handleDelete(d.id)}
                                  className="text-xs font-black text-red-400 bg-red-50 hover:bg-red-100 px-4 py-2.5 rounded-xl transition-colors flex items-center gap-2">
                                  <X size={14}/> Удалить
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Стратегия */}
                  <div className="space-y-5">
                    <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
                      <h3 className="font-black text-lg text-slate-900 mb-5 flex items-center gap-2"><TrendingDown className="text-emerald-600" size={20}/> Стратегия</h3>
                      <div className="flex bg-slate-50 p-1.5 rounded-2xl mb-4">
                        {[['avalanche','Лавина'],['snowball','Снежный ком']].map(([s, label]) => (
                          <button key={s} onClick={() => handleStrategyChange(s)}
                            className={`flex-1 py-2.5 rounded-xl text-[10px] font-black transition-all ${strategy === s ? 'bg-white shadow-sm text-emerald-700' : 'text-slate-400 hover:text-slate-600'}`}>
                            {label}
                          </button>
                        ))}
                      </div>
                      <p className="text-[10px] text-slate-400 font-medium mb-4 leading-relaxed">
                        {strategy === 'avalanche' ? '🔥 Гасим самый дорогой % первым. Максимальная экономия.' : '⛄ Закрываем наименьший долг первым. Быстрый психологический результат.'}
                      </p>
                      <div className="space-y-2">
                        {Object.entries(strategyAllocation).some(([,a]) => a > 0)
                          ? Object.entries(strategyAllocation).map(([id, amt]) => {
                            if (amt <= 0) return null;
                            const debt = debts.find(d => d.id == id);
                            return (
                              <div key={id} className="flex justify-between items-center p-3 bg-slate-50 rounded-2xl">
                                <span className="text-xs font-bold text-slate-700 truncate mr-2">{debt?.name}</span>
                                <span className="font-black text-sm text-emerald-600 shrink-0">+{fmt(amt)}</span>
                              </div>
                            );
                          })
                          : <p className="text-center text-xs text-slate-400 py-4 font-medium">Введите свободные деньги выше</p>
                        }
                      </div>
                    </div>

                    {/* Ссылки на калькуляторы */}
                    <div className="bg-white p-5 rounded-[28px] border border-slate-100 shadow-sm space-y-2">
                      <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Быстрые калькуляторы</div>
                      {[['Досрочное погашение','calculators'],['Рефинансирование','calculators'],['Аннуитетный график','calculators']].map(([label, tab]) => (
                        <button key={label} onClick={() => setActiveTab(tab)} className="w-full flex items-center justify-between p-3 bg-slate-50 hover:bg-emerald-50 rounded-xl text-xs font-bold text-slate-600 hover:text-emerald-700 transition-colors">
                          {label}<ArrowRight size={14}/>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* ════════════════ КАЛЕНДАРЬ ════════════════ */}
            {activeTab === 'calendar' && <CalendarTab debts={debts}/>}

            {/* ════════════════ АНАЛИТИКА ════════════════ */}
            {activeTab === 'analytics' && (
              <AnalyticsTab
                debts={debts} freeMoney={freeMoney}
                totalDebt={totalDebt} totalMinPaymentAll={totalMinPaymentAll}
                debtHistory={debtHistory}
              />
            )}

            {/* ════════════════ КАЛЬКУЛЯТОРЫ ════════════════ */}
            {activeTab === 'calculators' && <CalculatorsTab debts={debts}/>}

            {/* ════════════════ ПОСЛЕ ДОЛГОВ ════════════════ */}
            {activeTab === 'investing' && (
              <div className="max-w-3xl mx-auto text-center py-10 md:py-16">
                <div className="w-24 h-24 bg-emerald-50 text-emerald-600 rounded-[32px] flex items-center justify-center mx-auto mb-8 shadow-inner"><Target size={48}/></div>
                <h2 className="text-4xl md:text-5xl font-black mb-6 text-slate-900 tracking-tight">Жизнь после долгов</h2>
                <p className="text-slate-500 mb-10 leading-relaxed text-lg max-w-2xl mx-auto">
                  Как только кредиты закроются, сумма <span className="font-black text-emerald-600">{fmt(totalMinPaymentAll + Number(freeMoney))}</span> станет вашей ежемесячной инвестицией.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 text-left">
                  {[[5,7.6,'через 5 лет'],[10,20.7,'через 10 лет'],[20,98,'через 20 лет']].map(([y,mult,label]) => (
                    <div key={y} className="bg-white p-7 rounded-[32px] border border-slate-100 shadow-sm">
                      <div className="text-[9px] text-slate-400 font-black uppercase tracking-widest mb-2">{label}</div>
                      <div className="text-3xl font-black text-slate-900 mb-1">{fmt((totalMinPaymentAll + Number(freeMoney)) * mult)}</div>
                      <div className="text-[10px] text-slate-400 font-medium">при 12% год.</div>
                    </div>
                  ))}
                </div>
                <div className="bg-white p-10 rounded-[48px] border border-slate-100 shadow-2xl shadow-slate-100">
                  <div className="text-[9px] text-slate-400 font-black uppercase tracking-widest mb-4">Капитал через 10 лет</div>
                  <div className="text-5xl md:text-7xl font-black text-slate-900 tracking-tighter mb-4">{fmt((totalMinPaymentAll + Number(freeMoney)) * 120 * 1.6)}</div>
                  <div className="inline-block bg-emerald-50 text-emerald-700 px-4 py-2 rounded-xl text-xs font-black">* При средней доходности 12% годовых</div>
                </div>
              </div>
            )}

          </div>
        </div>
      </main>

      {/* ── Модал: Добавить долг ── */}
      {isAddOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto">
          <form onSubmit={handleAdd} className="bg-white rounded-t-[40px] sm:rounded-[40px] p-8 w-full sm:max-w-md shadow-2xl space-y-4">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-2xl font-black text-slate-900">Новый долг</h3>
              <button type="button" onClick={() => setIsAddOpen(false)} className="w-10 h-10 flex items-center justify-center bg-slate-50 text-slate-400 rounded-full hover:bg-slate-100 transition-colors"><X size={20}/></button>
            </div>
            {[
              ['Название','text','name','Кредитка Альфа'],
              ['Остаток ₽','number','balance','100000'],
              ['Ставка %','number','rate','24.9'],
              ['Ежемесячный платёж ₽','number','minPayment','5000'],
            ].map(([label, type, key, ph]) => (
              <div key={key}>
                <label className="text-[9px] uppercase font-black text-slate-400 ml-1 mb-1 block tracking-widest">{label}</label>
                <input required type={type} step={type==='number'?'0.1':undefined} placeholder={ph}
                  className="w-full bg-slate-50 p-3.5 rounded-2xl outline-none font-bold text-slate-900 focus:ring-4 ring-emerald-500/10 border border-transparent focus:border-emerald-200 transition-all"
                  value={newDebt[key]} onChange={e => setNewDebt({...newDebt, [key]: e.target.value})}/>
              </div>
            ))}
            <div>
              <label className="text-[9px] uppercase font-black text-slate-400 ml-1 mb-1 block tracking-widest">Ближайшая дата</label>
              <input required type="date" className="w-full bg-slate-50 p-3.5 rounded-2xl outline-none font-bold text-slate-500 focus:ring-4 ring-emerald-500/10 border border-transparent focus:border-emerald-200 transition-all" value={newDebt.nextPaymentDate} onChange={e => setNewDebt({...newDebt, nextPaymentDate: e.target.value})}/>
            </div>
            <div>
              <label className="text-[9px] uppercase font-black text-slate-400 ml-1 mb-1 block tracking-widest flex justify-between"><span>Условия</span><span className="normal-case font-medium">необязательно</span></label>
              <textarea rows={2} placeholder="Грейс 120 дней. Штраф 590₽..." className="w-full bg-slate-50 p-3.5 rounded-2xl outline-none font-medium text-slate-900 text-sm focus:ring-4 ring-emerald-500/10 border border-transparent focus:border-emerald-200 transition-all resize-none" value={newDebt.detailsSummary} onChange={e => setNewDebt({...newDebt, detailsSummary: e.target.value})}/>
            </div>
            <button type="submit" className="w-full bg-slate-900 text-white p-4 rounded-2xl font-black hover:bg-emerald-600 transition-all uppercase tracking-widest">Добавить в дашборд</button>
          </form>
        </div>
      )}

      {/* ── Модал: Редактировать долг ── */}
      {editingDebt && <EditDebtModal debt={editingDebt} onSave={handleSaveEdit} onClose={() => setEditingDebt(null)}/>}

      {/* ── Модал: Аннуитетный график ── */}
      {scheduleDebt && <ScheduleModal debt={scheduleDebt} onSave={handleSaveSchedule} onClose={() => setScheduleDebt(null)}/>}
    </div>
  );
}

// ─── MOUNT ────────────────────────────────────────────────────────────────────
const root = createRoot(document.getElementById('root'));
root.render(<ErrorBoundary><App/></ErrorBoundary>);
