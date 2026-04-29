import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import {
  PlusCircle, Wallet, AlertCircle, Calendar, TrendingDown,
  CheckCircle2, X, Menu, Bell, LayoutDashboard,
  PieChart, ChevronDown, ChevronUp, Target, WifiOff,
  RotateCcw, Clock
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

const fbApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const auth  = getAuth(fbApp);
const db    = getFirestore(fbApp);
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
const today = () => { const d = new Date(); d.setHours(0,0,0,0); return d; };
const daysFrom = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
};

const initialDebts = [
  { id: 1, name: 'Сбер (Кредитка)',      balance: 85000,  rate: 25.9, minPayment: 3500,  nextPaymentDate: daysFrom(5),  isPaidThisMonth: false, details: { gracePeriod: 'до 120 дней',   penalty: '36% годовых', summary: 'Грейс возобновляется только после полного погашения. Снятие наличных — комиссия 390 ₽ + 3.9%.' } },
  { id: 2, name: 'ВТБ (Кредитка)',       balance: 120000, rate: 29.9, minPayment: 5000,  nextPaymentDate: daysFrom(12), isPaidThisMonth: false, details: { gracePeriod: 'до 200 дней',   penalty: '0.1% в день',  summary: 'При пропуске платежа льготный период сгорает, проценты начисляются за весь срок.' } },
  { id: 3, name: 'Альфа (Кредитка)',     balance: 45000,  rate: 34.9, minPayment: 2000,  nextPaymentDate: daysFrom(2),  isPaidThisMonth: false, details: { gracePeriod: 'Год без % (на покупки в первые 30 дней)', penalty: '20% годовых', summary: 'Проверьте скрытую страховку (~1.2% в мес), её можно отключить в приложении.' } },
  { id: 4, name: 'Т-Банк (Кредитка)',    balance: 60000,  rate: 28.5, minPayment: 3000,  nextPaymentDate: daysFrom(-1), isPaidThisMonth: false, details: { gracePeriod: 'до 55 дней',    penalty: '20% год. + 590 ₽', summary: 'Штраф за неоплату — 590 ₽ фиксированно. SMS-info: 99 ₽/мес.' } },
  { id: 5, name: 'ОТП Банк (Кредит)',    balance: 250000, rate: 18.0, minPayment: 12500, nextPaymentDate: daysFrom(20), isPaidThisMonth: false, details: { penalty: '0.1% в день',   summary: 'Досрочное погашение без штрафов в любую дату через приложение. Выгоднее уменьшать срок, а не платёж.' } },
  { id: 6, name: 'Яндекс (Кредит)',      balance: 150000, rate: 21.5, minPayment: 8500,  nextPaymentDate: daysFrom(8),  isPaidThisMonth: false, details: { penalty: '20% год.',      summary: 'Досрочное погашение — только в дату платежа. Подавать заявку заранее.' } },
  { id: 7, name: 'Яндекс Сплит (Рассрочка)', balance: 25000, rate: 0, minPayment: 6250, nextPaymentDate: daysFrom(4),  isPaidThisMonth: false, details: { penalty: 'Разовый штраф', summary: 'Процентов нет. Просрочка — разовая комиссия и блокировка лимита.' } },
];

// ─── УТИЛИТЫ ──────────────────────────────────────────────────────────────────
const fmt = (v) =>
  new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(v || 0);

/** Возвращает разницу в днях между сегодня и dateStr (может быть отрицательной) */
const getDaysDiff = (dateStr) => {
  if (!dateStr) return 0;
  // Парсим как локальную дату, избегая UTC-сдвига
  const [y, m, d] = dateStr.split('-').map(Number);
  const target = new Date(y, m - 1, d);
  const diff = target - today();
  return Math.ceil(diff / 86400000);
};

/** Форматирует дату для отображения без UTC-смещения */
const fmtDate = (dateStr, opts = {}) => {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('ru-RU', opts);
};

// ─── КОМПОНЕНТ ИНДИКАТОРА ДНЕЙ ────────────────────────────────────────────────
function DaysBadge({ days, paid }) {
  if (paid) return <span className="text-[10px] font-black px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-600 uppercase tracking-widest">Оплачено</span>;
  if (days < 0)  return <span className="text-[10px] font-black px-3 py-1.5 rounded-xl bg-red-50   text-red-600   uppercase tracking-widest">Просрочка {Math.abs(days)} дн.</span>;
  if (days === 0) return <span className="text-[10px] font-black px-3 py-1.5 rounded-xl bg-orange-50 text-orange-600 uppercase tracking-widest">Сегодня!</span>;
  if (days <= 3)  return <span className="text-[10px] font-black px-3 py-1.5 rounded-xl bg-orange-50 text-orange-500 uppercase tracking-widest">{days} дн.</span>;
  return           <span className="text-[10px] font-black px-3 py-1.5 rounded-xl bg-slate-50   text-slate-500 uppercase tracking-widest">{days} дн.</span>;
}

// ─── МИНИ-BAR CHART (аналитика) ───────────────────────────────────────────────
function MiniBar({ label, pct, color }) {
  return (
    <div>
      <div className="flex justify-between text-xs font-bold mb-1.5">
        <span className="text-slate-700 truncate mr-2">{label}</span>
        <span className="text-slate-400 shrink-0">{Math.round(pct)}%</span>
      </div>
      <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
        <div className={`${color} h-full rounded-full transition-all duration-700`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ─── ДОСКА КАЛЕНДАРЯ ─────────────────────────────────────────────────────────
function CalendarTab({ debts, freeMoney, totalMinPaymentAll, fmt, fmtDate, getDaysDiff }) {
  const now    = new Date();
  const year   = now.getFullYear();
  const month  = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDow    = new Date(year, month, 1).getDay(); // 0=вс
  // Сдвиг: у нас неделя начинается с понедельника
  const startOffset = (firstDow + 6) % 7;

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
  const monthNames = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
  const dayNames = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'];

  // Хронологический список
  const upcoming = [...debts].sort((a, b) => getDaysDiff(a.nextPaymentDate) - getDaysDiff(b.nextPaymentDate));

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <h2 className="text-3xl font-black text-slate-900 flex items-center gap-3">
        <Calendar className="text-emerald-600" size={30} />
        Календарь платежей
      </h2>

      {/* Сетка календаря */}
      <div className="bg-white rounded-[32px] border border-slate-100 p-6 md:p-8 shadow-sm">
        <div className="text-xl font-black text-slate-900 mb-6 capitalize">{monthNames[month]} {year}</div>
        {/* Заголовки дней */}
        <div className="grid grid-cols-7 mb-2">
          {dayNames.map(d => (
            <div key={d} className="text-center text-[10px] font-black text-slate-300 uppercase tracking-widest py-2">{d}</div>
          ))}
        </div>
        {/* Ячейки */}
        <div className="grid grid-cols-7 gap-1">
          {cells.map((day, idx) => {
            if (!day) return <div key={`e${idx}`} />;
            const isToday = day === todayDay;
            const hasPayments = byDay[day];
            const isPaid = hasPayments && hasPayments.every(d => d.isPaidThisMonth);
            const isOverdue = hasPayments && hasPayments.some(d => !d.isPaidThisMonth && getDaysDiff(d.nextPaymentDate) < 0);
            const isUrgent = hasPayments && hasPayments.some(d => !d.isPaidThisMonth && getDaysDiff(d.nextPaymentDate) >= 0 && getDaysDiff(d.nextPaymentDate) <= 3);

            let cellCls = 'relative aspect-square flex flex-col items-center justify-start pt-1.5 rounded-2xl text-sm font-bold transition-all select-none';
            if (isToday)       cellCls += ' ring-2 ring-emerald-500 ring-offset-1';
            if (hasPayments) {
              if (isPaid)      cellCls += ' bg-emerald-50 text-emerald-700';
              else if (isOverdue) cellCls += ' bg-red-50 text-red-700';
              else if (isUrgent)  cellCls += ' bg-orange-50 text-orange-700';
              else               cellCls += ' bg-slate-50 text-slate-700';
            } else {
              cellCls += ' text-slate-300';
            }

            return (
              <div key={day} className={cellCls}>
                <span>{day}</span>
                {hasPayments && (
                  <div className="flex flex-wrap justify-center gap-0.5 mt-1">
                    {hasPayments.map(d => (
                      <div key={d.id} className={`w-1.5 h-1.5 rounded-full ${d.isPaidThisMonth ? 'bg-emerald-500' : isOverdue ? 'bg-red-500' : 'bg-orange-400'}`} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Хронологический список */}
      <div className="bg-white rounded-[32px] border border-slate-100 p-6 md:p-8 shadow-sm">
        <h3 className="font-black text-lg text-slate-900 mb-6">Все платежи по датам</h3>
        <div className="space-y-3">
          {upcoming.map(d => {
            const days = getDaysDiff(d.nextPaymentDate);
            return (
              <div key={d.id} className={`flex items-center justify-between p-4 rounded-2xl border ${d.isPaidThisMonth ? 'border-slate-100 opacity-40' : days < 0 ? 'border-red-100 bg-red-50/30' : days <= 3 ? 'border-orange-100 bg-orange-50/30' : 'border-slate-100'}`}>
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-[11px] font-black ${d.isPaidThisMonth ? 'bg-emerald-100 text-emerald-700' : days < 0 ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-700'}`}>
                    {fmtDate(d.nextPaymentDate, { day: 'numeric', month: 'short' })}
                  </div>
                  <div>
                    <div className="font-bold text-slate-900 text-sm">{d.name}</div>
                    <div className="text-[11px] text-slate-400 font-medium">{d.rate > 0 ? `${d.rate}%` : 'Рассрочка 0%'}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="font-black text-slate-900">{fmt(d.minPayment)}</div>
                  </div>
                  <DaysBadge days={days} paid={d.isPaidThisMonth} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── АНАЛИТИКА ────────────────────────────────────────────────────────────────
function AnalyticsTab({ debts, freeMoney, totalDebt, totalMinPaymentAll, fmt }) {
  const totalMonthlyInterest = debts.reduce((s, d) => s + (d.rate > 0 ? (d.balance * d.rate / 100 / 12) : 0), 0);
  const totalOverpayEstimate = debts.reduce((s, d) => {
    if (!d.rate || !d.minPayment || !d.balance) return s;
    const r = d.rate / 100 / 12;
    if (r === 0) return s;
    const months = r > 0 ? Math.ceil(Math.log(d.minPayment / (d.minPayment - r * d.balance)) / Math.log(1 + r)) : 0;
    return s + (isFinite(months) && months > 0 ? (d.minPayment * months - d.balance) : 0);
  }, 0);

  // Наиболее дорогой кредит
  const mostExpensive = [...debts].sort((a, b) => b.rate - a.rate)[0];
  const mostUrgent = [...debts].filter(d => !d.isPaidThisMonth).sort((a, b) => {
    const da = getDaysDiff(a.nextPaymentDate);
    const db_ = getDaysDiff(b.nextPaymentDate);
    return da - db_;
  })[0];

  const barColors = ['bg-emerald-500','bg-teal-400','bg-cyan-400','bg-sky-400','bg-blue-400','bg-indigo-400','bg-violet-400'];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h2 className="text-3xl font-black text-slate-900 flex items-center gap-3">
        <PieChart className="text-emerald-600" size={30} />
        Аналитика портфеля
      </h2>

      {/* KPI-карточки */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-[28px] border border-slate-100 shadow-sm">
          <div className="text-[9px] text-slate-400 font-black uppercase tracking-widest mb-2">Всего долгов</div>
          <div className="text-3xl font-black text-slate-900">{debts.length}</div>
          <div className="text-[11px] text-slate-400 mt-1 font-medium">кредитных обязательств</div>
        </div>
        <div className="bg-white p-5 rounded-[28px] border border-slate-100 shadow-sm">
          <div className="text-[9px] text-slate-400 font-black uppercase tracking-widest mb-2">Проценты / мес</div>
          <div className="text-3xl font-black text-red-500">{fmt(totalMonthlyInterest)}</div>
          <div className="text-[11px] text-slate-400 mt-1 font-medium">сгорает на %</div>
        </div>
        <div className="bg-white p-5 rounded-[28px] border border-slate-100 shadow-sm">
          <div className="text-[9px] text-slate-400 font-black uppercase tracking-widest mb-2">КПД платежа</div>
          <div className="text-3xl font-black text-emerald-600">
            {totalMinPaymentAll > 0 ? Math.round(((totalMinPaymentAll - totalMonthlyInterest) / totalMinPaymentAll) * 100) : 0}%
          </div>
          <div className="text-[11px] text-slate-400 mt-1 font-medium">идёт в счёт долга</div>
        </div>
        <div className="bg-white p-5 rounded-[28px] border border-slate-100 shadow-sm">
          <div className="text-[9px] text-slate-400 font-black uppercase tracking-widest mb-2">Переплата итого</div>
          <div className="text-2xl font-black text-orange-500">{fmt(Math.max(0, totalOverpayEstimate))}</div>
          <div className="text-[11px] text-slate-400 mt-1 font-medium">при мин. платежах</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Структура долга */}
        <div className="bg-white p-7 rounded-[32px] border border-slate-100 shadow-sm">
          <h3 className="font-black text-slate-900 text-lg mb-6">Структура долга</h3>
          {totalDebt === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">Нет данных</p>
          ) : (
            <div className="space-y-4">
              {[...debts].sort((a,b)=>b.balance-a.balance).map((d, i) => (
                <MiniBar key={d.id} label={d.name} pct={(d.balance / totalDebt) * 100} color={barColors[i % barColors.length]} />
              ))}
            </div>
          )}
        </div>

        {/* Куда уходит платёж */}
        <div className="bg-white p-7 rounded-[32px] border border-slate-100 shadow-sm">
          <h3 className="font-black text-slate-900 text-lg mb-6">Куда уходит платёж</h3>
          <div className="space-y-4">
            {debts.map(d => {
              const interest = d.rate > 0 ? (d.balance * d.rate / 100 / 12) : 0;
              const principal = Math.max(0, d.minPayment - interest);
              const pct = d.minPayment > 0 ? (interest / d.minPayment) * 100 : 0;
              return (
                <div key={d.id}>
                  <div className="flex justify-between text-xs font-bold mb-1.5">
                    <span className="text-slate-700 truncate mr-2">{d.name}</span>
                    <span className="text-red-400 shrink-0">{Math.round(pct)}% %</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden flex">
                    <div className="bg-red-400 h-full transition-all duration-700" style={{ width: `${pct}%` }} />
                    <div className="bg-emerald-500 h-full transition-all duration-700" style={{ width: `${100 - pct}%` }} />
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
            <div className="text-[9px] text-red-400 font-black uppercase tracking-widest mb-3">🔥 Самый дорогой кредит</div>
            <div className="font-black text-xl text-slate-900 mb-1">{mostExpensive.name}</div>
            <div className="text-4xl font-black text-red-500 mb-2">{mostExpensive.rate}%</div>
            <p className="text-sm text-red-700 font-medium">
              Ежемесячно сжигает {fmt(mostExpensive.balance * mostExpensive.rate / 100 / 12)} на проценты.
              По стратегии <span className="font-black">Лавина</span> — гасить в первую очередь.
            </p>
          </div>
        )}
        {mostUrgent && (
          <div className="bg-orange-50 p-7 rounded-[32px] border border-orange-100">
            <div className="text-[9px] text-orange-400 font-black uppercase tracking-widest mb-3">⏰ Ближайший платёж</div>
            <div className="font-black text-xl text-slate-900 mb-1">{mostUrgent.name}</div>
            <div className="text-4xl font-black text-orange-500 mb-2">
              {(() => { const d = getDaysDiff(mostUrgent.nextPaymentDate); return d < 0 ? `−${Math.abs(d)} дн.` : d === 0 ? 'Сегодня' : `${d} дн.`; })()}
            </div>
            <p className="text-sm text-orange-700 font-medium">
              Платёж {fmt(mostUrgent.minPayment)}.{' '}
              {getDaysDiff(mostUrgent.nextPaymentDate) < 0 ? 'Просрочка! Срочно оплатите.' : 'Не забудьте пополнить счёт заранее.'}
            </p>
          </div>
        )}
      </div>

      {/* Советы по оптимизации */}
      <div className="bg-white p-7 rounded-[32px] border border-slate-100 shadow-sm">
        <h3 className="font-black text-slate-900 text-lg mb-5">Как снизить переплату</h3>
        <div className="space-y-3">
          {[
            { icon: '⚡', title: 'Частичное досрочное погашение', desc: 'Любая сумма сверх обязательного платежа сокращает тело долга и экономит на будущих процентах.' },
            { icon: '🔄', title: 'Рефинансирование', desc: 'Если нашли ставку на 3%+ ниже — рефинансируйте. Особенно актуально для кредиток с 29–34%.' },
            { icon: '❌', title: 'Отключите страховку', desc: 'Проверьте приложения банков: скрытые страховки часто составляют 1–1.5% в месяц от суммы долга.' },
            { icon: '📆', title: 'Используйте грейс-период', desc: 'По кредиткам с грейсом — полностью гасите долг до конца беспроцентного периода.' },
            { icon: '📉', title: 'Уменьшайте срок, не платёж', desc: 'При досрочке выбирайте уменьшение срока — это выгоднее, чем уменьшение ежемесячного платежа.' },
          ].map(t => (
            <div key={t.title} className="flex gap-4 p-4 bg-slate-50 rounded-2xl">
              <span className="text-2xl shrink-0">{t.icon}</span>
              <div>
                <div className="font-bold text-slate-900 text-sm mb-0.5">{t.title}</div>
                <div className="text-xs text-slate-500 font-medium leading-relaxed">{t.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── ГЛАВНЫЙ КОМ-Т ────────────────────────────────────────────────────────────
function App() {
  const [activeTab, setActiveTab]           = useState('dashboard');
  const [user, setUser]                     = useState(null);
  const [isLoading, setIsLoading]           = useState(true);
  const [isLocalFallback, setIsLocalFallback] = useState(false);

  const [debts, setDebts]           = useState([]);
  const [freeMoney, setFreeMoney]   = useState(15000);
  const [strategy, setStrategy]     = useState('avalanche');
  const [freeMoneyInput, setFreeMoneyInput] = useState('15000');

  const [isSidebarOpen, setIsSidebarOpen]       = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen]     = useState(false);
  const [expandedId, setExpandedId]             = useState(null);
  const [newDebt, setNewDebt] = useState({ name: '', balance: '', rate: '', minPayment: '', nextPaymentDate: '', detailsSummary: '' });

  // ── Auth ──
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, u => { if (u) setUser(u); });
    signInAnonymously(auth).catch(() => enableLocalMode());
    return () => unsub();
  }, []);

  // ── Firestore ──
  useEffect(() => {
    if (isLocalFallback || !user) return;
    const ref = doc(db, 'artifacts', APP_ID, 'public', 'data', 'appState', 'main');
    const timer = setTimeout(() => { if (isLoading) enableLocalMode(); }, 5000);
    const unsub = onSnapshot(ref, snap => {
      clearTimeout(timer);
      if (snap.exists()) {
        const data = snap.data();
        setDebts(data.debts || []);
        setFreeMoney(data.freeMoney ?? 15000);
        setFreeMoneyInput(String(data.freeMoney ?? 15000));
        setStrategy(data.strategy || 'avalanche');
      } else {
        setDoc(ref, { debts: initialDebts, freeMoney: 15000, strategy: 'avalanche' });
      }
      setIsLoading(false);
    }, () => { clearTimeout(timer); enableLocalMode(); });
    return () => { clearTimeout(timer); unsub(); };
  }, [user, isLocalFallback]); // eslint-disable-line

  const enableLocalMode = useCallback(() => {
    setIsLocalFallback(true);
    setIsLoading(false);
    try {
      const sd = localStorage.getItem('localDebts');
      const sf = localStorage.getItem('localFreeMoney');
      const ss = localStorage.getItem('localStrategy');
      const d  = sd ? JSON.parse(sd) : initialDebts;
      const f  = sf ? Number(sf) : 15000;
      const s  = ss || 'avalanche';
      setDebts(d);
      setFreeMoney(f);
      setFreeMoneyInput(String(f));
      setStrategy(s);
    } catch { setDebts(initialDebts); }
  }, []);

  const saveData = useCallback((nd, nf, ns) => {
    if (isLocalFallback || !user) {
      localStorage.setItem('localDebts', JSON.stringify(nd));
      localStorage.setItem('localFreeMoney', String(nf));
      localStorage.setItem('localStrategy', ns);
    } else {
      const ref = doc(db, 'artifacts', APP_ID, 'public', 'data', 'appState', 'main');
      setDoc(ref, { debts: nd, freeMoney: Number(nf), strategy: ns }, { merge: true }).catch(console.error);
    }
  }, [isLocalFallback, user]);

  // ── Вычисления ──
  const totalDebt            = debts.reduce((acc, d) => acc + Number(d.balance || 0), 0);
  const totalMinPaymentAll   = debts.reduce((acc, d) => acc + Number(d.minPayment || 0), 0);
  const totalMinPaymentLeft  = debts.reduce((acc, d) => acc + (d.isPaidThisMonth ? 0 : Number(d.minPayment || 0)), 0);
  const paidThisMonthAmount  = debts.filter(d => d.isPaidThisMonth).reduce((acc, d) => acc + Number(d.minPayment || 0), 0);
  const progressPercent      = totalMinPaymentAll === 0 ? 0 : Math.round((paidThisMonthAmount / totalMinPaymentAll) * 100);
  // FIX: totalOverdue теперь объявлен
  const overdueDebts         = debts.filter(d => !d.isPaidThisMonth && getDaysDiff(d.nextPaymentDate) < 0);
  const totalOverdue         = overdueDebts.reduce((acc, d) => acc + Number(d.minPayment || 0), 0);

  const sortedDebts = useMemo(() => [...debts].sort((a, b) => {
    if (a.isPaidThisMonth !== b.isPaidThisMonth) return a.isPaidThisMonth ? 1 : -1;
    return getDaysDiff(a.nextPaymentDate) - getDaysDiff(b.nextPaymentDate);
  }), [debts]);

  const strategyAllocation = useMemo(() => {
    let remain = Number(freeMoney) || 0;
    const alloc = {};
    const targets = [...debts.filter(d => d.balance > 0)];
    targets.sort((a, b) => strategy === 'avalanche'
      ? (b.rate || 0) - (a.rate || 0)
      : (a.balance || 0) - (b.balance || 0));
    targets.forEach(d => {
      const take = Math.min(remain, d.balance);
      alloc[d.id] = take;
      remain -= take;
    });
    return alloc;
  }, [debts, freeMoney, strategy]);

  const notifications = useMemo(() => {
    const list = [];
    overdueDebts.forEach(d => list.push({ id: d.id, type: 'overdue', title: 'Просрочка', text: `"${d.name}" — платёж просрочен!` }));
    debts.filter(d => !d.isPaidThisMonth && getDaysDiff(d.nextPaymentDate) >= 0 && getDaysDiff(d.nextPaymentDate) <= 3)
      .forEach(d => list.push({ id: d.id, type: 'soon', title: 'Скоро платёж', text: `"${d.name}" — через ${getDaysDiff(d.nextPaymentDate)} дн.` }));
    return list;
  }, [debts, overdueDebts]);

  // ── Экшены ──
  const handleMarkPaid = (id) => {
    const next = debts.map(d => d.id === id
      ? { ...d, isPaidThisMonth: true, balance: Math.max(0, Number(d.balance) - Number(d.minPayment || 0)), _prevBalance: d.balance }
      : d);
    setDebts(next); saveData(next, freeMoney, strategy);
  };
  const handleUndoPaid = (id) => {
    const next = debts.map(d => d.id === id
      ? { ...d, isPaidThisMonth: false, balance: d._prevBalance !== undefined ? d._prevBalance : Number(d.balance) + Number(d.minPayment || 0) }
      : d);
    setDebts(next); saveData(next, freeMoney, strategy);
  };
  const handleResetMonth = () => {
    if (!window.confirm('Сбросить статусы оплат для нового месяца?')) return;
    const next = debts.map(d => ({ ...d, isPaidThisMonth: false }));
    setDebts(next); saveData(next, freeMoney, strategy);
  };
  const handleAdd = (e) => {
    e.preventDefault();
    const item = {
      ...newDebt, id: Date.now(),
      isPaidThisMonth: false,
      balance:    Number(newDebt.balance),
      rate:       Number(newDebt.rate),
      minPayment: Number(newDebt.minPayment),
      details: { summary: newDebt.detailsSummary || '' }
    };
    const next = [...debts, item];
    setDebts(next); saveData(next, freeMoney, strategy);
    setIsAddModalOpen(false);
    setNewDebt({ name: '', balance: '', rate: '', minPayment: '', nextPaymentDate: '', detailsSummary: '' });
  };
  const handleDelete = (id) => {
    if (!window.confirm('Удалить этот долг?')) return;
    const next = debts.filter(d => d.id !== id);
    setDebts(next); saveData(next, freeMoney, strategy);
  };
  const handleFreeMoneyBlur = () => {
    const val = Number(freeMoneyInput) || 0;
    setFreeMoney(val);
    saveData(debts, val, strategy);
  };
  const handleStrategyChange = (s) => {
    setStrategy(s);
    saveData(debts, freeMoney, s);
  };

  // ── Экран загрузки ──
  if (isLoading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8FAFC] text-emerald-700">
      <div className="relative w-16 h-16 mb-4">
        <div className="absolute inset-0 border-4 border-emerald-100 rounded-full" />
        <div className="absolute inset-0 border-4 border-emerald-600 rounded-full border-t-transparent animate-spin" />
      </div>
      <p className="font-bold tracking-tight">Подключение...</p>
    </div>
  );

  const nav = [
    { id: 'dashboard', icon: <LayoutDashboard size={20} />, label: 'Дашборд' },
    { id: 'calendar',  icon: <Calendar size={20} />,        label: 'Календарь' },
    { id: 'analytics', icon: <PieChart size={20} />,        label: 'Аналитика' },
    { id: 'investing', icon: <Target size={20} />,          label: 'После долгов' },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 font-sans flex overflow-hidden">
      {/* Overlay */}
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden" onClick={() => setIsSidebarOpen(false)} />
      )}

      {/* ── Sidebar ── */}
      <aside className={`fixed lg:static inset-y-0 left-0 w-64 bg-white border-r border-slate-100 z-50 transition-transform duration-300 flex flex-col
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-200">
            <Wallet size={20} />
          </div>
          <span className="font-black text-xl tracking-tight text-slate-900">Свобода.</span>
        </div>

        <nav className="flex-1 px-4 space-y-1 mt-4">
          {nav.map(item => (
            <button key={item.id}
              onClick={() => { setActiveTab(item.id); setIsSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 p-3.5 rounded-2xl font-bold text-sm transition-all
                ${activeTab === item.id ? 'bg-emerald-50 text-emerald-700' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'}`}
            >
              {item.icon} {item.label}
            </button>
          ))}
        </nav>

        {/* Прогресс месяца в сайдбаре */}
        <div className="px-4 pb-6">
          <div className="bg-slate-900 p-5 rounded-[24px] text-white">
            <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1 text-center">Прогресс месяца</div>
            <div className="text-[11px] text-emerald-400 font-bold text-center mb-4">{fmt(paidThisMonthAmount)} / {fmt(totalMinPaymentAll)}</div>
            <div className="flex justify-center relative">
              <svg className="w-24 h-24 -rotate-90">
                <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="9" fill="transparent" className="text-slate-800" />
                <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="9" fill="transparent"
                  strokeDasharray="251.3"
                  strokeDashoffset={251.3 - (progressPercent / 100) * 251.3}
                  strokeLinecap="round"
                  className="text-emerald-500 transition-all duration-1000" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center font-black text-2xl">{progressPercent}%</div>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">

        {/* Header */}
        <header className="bg-white/80 backdrop-blur-md border-b border-slate-100 sticky top-0 z-30">
          <div className="flex items-center justify-between px-4 lg:px-8 py-4">
            <button className="lg:hidden p-2 -ml-2 text-slate-500" onClick={() => setIsSidebarOpen(true)}>
              <Menu size={22} />
            </button>

            <div className="flex items-center gap-3 ml-auto">
              {/* Статус облака */}
              {isLocalFallback ? (
                <div className="hidden sm:flex items-center gap-2 bg-orange-50 text-orange-600 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest">
                  <WifiOff size={13} /> Локальный режим
                </div>
              ) : (
                <div className="hidden sm:flex items-center gap-2 text-emerald-600 text-[10px] font-black uppercase tracking-widest">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Облако
                </div>
              )}

              {/* Колокол */}
              <div className="relative">
                <button onClick={() => setIsNotificationsOpen(v => !v)}
                  className="p-2 text-slate-500 hover:bg-slate-100 rounded-full relative transition-colors">
                  <Bell size={22} />
                  {notifications.length > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 border-2 border-white rounded-full" />
                  )}
                </button>
                {isNotificationsOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsNotificationsOpen(false)} />
                    <div className="absolute right-0 mt-2 w-72 bg-white rounded-[24px] shadow-2xl border border-slate-100 p-2 z-50">
                      <div className="p-3 font-black text-sm border-b border-slate-50 text-slate-900">Уведомления</div>
                      <div className="max-h-64 overflow-y-auto">
                        {notifications.length === 0
                          ? <div className="p-5 text-xs text-slate-400 text-center font-medium">Всё спокойно ✓</div>
                          : notifications.map((n, i) => (
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

              <div className="w-9 h-9 bg-slate-100 rounded-full flex items-center justify-center text-slate-400">
                <Wallet size={18} />
              </div>
            </div>
          </div>
        </header>

        {/* Контент */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-8">
          <div className="max-w-5xl mx-auto">

            {/* ── ДАШБОРД ── */}
            {activeTab === 'dashboard' && (
              <>
                <div className="flex justify-between items-end mb-8">
                  <div>
                    <h1 className="text-3xl lg:text-4xl font-black tracking-tight text-slate-900">Дашборд</h1>
                    <p className="text-sm text-slate-400 mt-1 font-medium">Осталось закрыть: {debts.length} кредитов</p>
                  </div>
                  <button onClick={() => setIsAddModalOpen(true)}
                    className="bg-emerald-600 text-white px-5 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-emerald-200 hover:scale-105 transition-transform">
                    <PlusCircle size={20} />
                    <span className="hidden sm:inline">Добавить</span>
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
                    <div className={`text-2xl md:text-3xl font-black truncate ${totalOverdue > 0 ? 'text-red-500' : 'text-slate-900'}`}>
                      {fmt(totalOverdue)}
                    </div>
                    <div className={`text-[10px] mt-2 font-medium ${totalOverdue > 0 ? 'text-red-400' : 'text-emerald-500'}`}>
                      {totalOverdue > 0 ? `${overdueDebts.length} просроченных` : 'Всё по графику ✓'}
                    </div>
                  </div>
                  <div className="bg-white p-6 rounded-[32px] border border-slate-100 flex flex-col justify-between shadow-sm focus-within:ring-2 ring-emerald-500 transition-all">
                    <div className="text-[9px] text-slate-400 font-black uppercase tracking-widest mb-2">Свободные деньги</div>
                    <div className="relative">
                      <input
                        type="number"
                        value={freeMoneyInput}
                        onChange={e => setFreeMoneyInput(e.target.value)}
                        onBlur={handleFreeMoneyBlur}
                        className="text-2xl md:text-3xl font-black text-emerald-600 bg-transparent border-b border-emerald-100 outline-none w-full pb-1"
                      />
                      <span className="absolute right-0 bottom-2 text-emerald-300 font-black text-lg">₽</span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-2 font-medium">для досрочного погашения</div>
                  </div>
                </div>

                {/* Список + Стратегия */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Список долгов */}
                  <div className="lg:col-span-2 space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="font-black text-xl text-slate-900">Список платежей</h3>
                      <button onClick={handleResetMonth}
                        className="text-[10px] font-black text-slate-400 border border-slate-200 px-3 py-1.5 rounded-xl flex items-center gap-1 hover:bg-slate-50 transition-colors uppercase tracking-widest">
                        <RotateCcw size={13} /> Новый месяц
                      </button>
                    </div>

                    {sortedDebts.length === 0 && (
                      <div className="text-center py-16 bg-white rounded-[32px] border border-dashed border-slate-200">
                        <div className="text-4xl mb-4">🎉</div>
                        <p className="font-bold text-slate-500">Долгов нет — вы свободны!</p>
                      </div>
                    )}

                    {sortedDebts.map(d => {
                      const days = getDaysDiff(d.nextPaymentDate);
                      const monthlyInterest = d.rate > 0 ? (Number(d.balance) * Number(d.rate) / 100 / 12) : 0;
                      const principalPayment = Math.max(0, Number(d.minPayment) - monthlyInterest);
                      const isExpanded = expandedId === d.id;
                      const extra = strategyAllocation[d.id] || 0;

                      let cardCls = 'bg-white border-slate-100';
                      if (d.isPaidThisMonth) cardCls = 'bg-white border-slate-100 opacity-40 grayscale';
                      else if (days < 0)   cardCls = 'bg-red-50/30 border-red-200';
                      else if (days <= 3)  cardCls = 'bg-orange-50/30 border-orange-200';

                      return (
                        <div key={d.id} className={`rounded-[32px] border transition-all shadow-sm ${cardCls} ${!d.isPaidThisMonth && days >= 0 ? 'hover:shadow-xl hover:shadow-slate-200/50' : ''}`}>
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-5 md:p-6 gap-4 cursor-pointer"
                            onClick={() => setExpandedId(isExpanded ? null : d.id)}>
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-300 shrink-0">
                                <Wallet size={24} />
                              </div>
                              <div>
                                <h4 className="font-black text-base text-slate-900 flex items-center gap-2">
                                  {d.name}
                                  {isExpanded ? <ChevronUp size={16} className="text-slate-300" /> : <ChevronDown size={16} className="text-slate-300" />}
                                </h4>
                                <p className="text-xs text-slate-400 font-medium mt-0.5">
                                  {d.rate > 0 ? `${d.rate}% год.` : 'Рассрочка 0%'} · Остаток {fmt(d.balance)}
                                </p>
                                {extra > 0 && !d.isPaidThisMonth && (
                                  <p className="text-[10px] text-emerald-600 font-black mt-1 flex items-center gap-1">
                                    <TrendingDown size={12} /> Досрочно +{fmt(extra)} по стратегии
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto">
                              <div className="text-left sm:text-right">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Платёж</p>
                                <p className="text-xl font-black text-slate-900">{fmt(d.minPayment)}</p>
                              </div>
                              <DaysBadge days={days} paid={d.isPaidThisMonth} />
                              <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                                {d.isPaidThisMonth ? (
                                  <button onClick={() => handleUndoPaid(d.id)}
                                    className="w-11 h-11 flex items-center justify-center text-slate-400 hover:text-orange-500 bg-slate-50 hover:bg-orange-50 rounded-2xl transition-colors"
                                    title="Отменить оплату">
                                    <RotateCcw size={18} />
                                  </button>
                                ) : (
                                  <button onClick={() => handleMarkPaid(d.id)}
                                    className="bg-slate-900 text-white px-4 h-11 rounded-2xl text-[10px] font-black flex items-center gap-2 hover:bg-emerald-600 transition-colors shadow-lg">
                                    <CheckCircle2 size={16} />
                                    <span className="hidden sm:inline">ОПЛАТИТЬ</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Развёрнутая секция */}
                          {isExpanded && (
                            <div className="px-5 md:px-6 pb-6 pt-2 border-t border-slate-100 cursor-default"
                              onClick={e => e.stopPropagation()}>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 mb-5">
                                <div className="bg-slate-50 p-4 rounded-2xl">
                                  <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">% в месяц</span>
                                  <span className="font-black text-red-500">{fmt(monthlyInterest)}</span>
                                </div>
                                <div className="bg-slate-50 p-4 rounded-2xl">
                                  <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">В долг</span>
                                  <span className="font-black text-emerald-600">{fmt(principalPayment)}</span>
                                </div>
                                <div className="bg-slate-50 p-4 rounded-2xl">
                                  <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Дата платежа</span>
                                  <span className="font-black text-slate-900 text-sm">{fmtDate(d.nextPaymentDate, { day: 'numeric', month: 'short' })}</span>
                                </div>
                                <div className="bg-slate-50 p-4 rounded-2xl">
                                  <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Статус</span>
                                  <span className={`font-black text-sm ${days < 0 ? 'text-red-500' : days <= 3 ? 'text-orange-500' : 'text-slate-900'}`}>
                                    {days < 0 ? `−${Math.abs(days)} дн.` : days === 0 ? 'Сегодня' : `${days} дн.`}
                                  </span>
                                </div>
                              </div>

                              {/* Куда уходит платёж */}
                              {d.rate > 0 && d.minPayment > 0 && (
                                <div className="mb-4">
                                  <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Структура платежа</div>
                                  <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden flex">
                                    <div className="bg-red-400 h-full transition-all" style={{ width: `${Math.min(100, monthlyInterest / d.minPayment * 100)}%` }} />
                                    <div className="bg-emerald-500 h-full transition-all" style={{ width: `${Math.max(0, 100 - monthlyInterest / d.minPayment * 100)}%` }} />
                                  </div>
                                  <div className="flex justify-between text-[10px] font-bold mt-1.5">
                                    <span className="text-red-400">Проценты: {fmt(monthlyInterest)}</span>
                                    <span className="text-emerald-600">Тело: {fmt(principalPayment)}</span>
                                  </div>
                                </div>
                              )}

                              {d.details?.summary && (
                                <div className="bg-amber-50 text-amber-900 p-4 rounded-2xl text-xs font-medium border border-amber-100 mb-4">
                                  <div className="flex items-center gap-2 mb-1.5 text-amber-600 font-black text-[10px] uppercase tracking-widest">
                                    <AlertCircle size={14} /> Условия банка
                                  </div>
                                  {d.details.gracePeriod && <div className="mb-1"><span className="font-black">Грейс: </span>{d.details.gracePeriod}</div>}
                                  {d.details.penalty && <div className="mb-1"><span className="font-black">Штраф: </span><span className="text-red-700">{d.details.penalty}</span></div>}
                                  {d.details.summary}
                                </div>
                              )}

                              <div className="flex justify-end">
                                <button onClick={() => handleDelete(d.id)}
                                  className="text-xs font-black text-red-400 bg-red-50 hover:bg-red-100 px-4 py-2.5 rounded-xl transition-colors flex items-center gap-2">
                                  <X size={14} /> Удалить долг
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
                      <h3 className="font-black text-lg text-slate-900 mb-5 flex items-center gap-2">
                        <TrendingDown className="text-emerald-600" size={20} /> Стратегия
                      </h3>
                      <div className="flex bg-slate-50 p-1.5 rounded-2xl mb-5">
                        {[['avalanche','Лавина'],['snowball','Снежный ком']].map(([s, label]) => (
                          <button key={s} onClick={() => handleStrategyChange(s)}
                            className={`flex-1 py-2.5 rounded-xl text-[10px] font-black transition-all
                              ${strategy === s ? 'bg-white shadow-sm text-emerald-700' : 'text-slate-400 hover:text-slate-600'}`}>
                            {label}
                          </button>
                        ))}
                      </div>
                      <p className="text-[10px] text-slate-400 font-medium mb-4 leading-relaxed">
                        {strategy === 'avalanche'
                          ? '🔥 Лавина: гасим самый дорогой % первым. Максимальная экономия на переплате.'
                          : '⛄ Снежный ком: закрываем наименьший долг первым. Быстрый психологический результат.'}
                      </p>
                      <div className="space-y-2">
                        {Object.entries(strategyAllocation).some(([, a]) => a > 0)
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
                  </div>
                </div>
              </>
            )}

            {/* ── КАЛЕНДАРЬ ── */}
            {activeTab === 'calendar' && (
              <CalendarTab
                debts={debts}
                freeMoney={freeMoney}
                totalMinPaymentAll={totalMinPaymentAll}
                fmt={fmt}
                fmtDate={fmtDate}
                getDaysDiff={getDaysDiff}
              />
            )}

            {/* ── АНАЛИТИКА ── */}
            {activeTab === 'analytics' && (
              <AnalyticsTab
                debts={debts}
                freeMoney={freeMoney}
                totalDebt={totalDebt}
                totalMinPaymentAll={totalMinPaymentAll}
                fmt={fmt}
              />
            )}

            {/* ── ПОСЛЕ ДОЛГОВ ── */}
            {activeTab === 'investing' && (
              <div className="max-w-3xl mx-auto text-center py-10 md:py-16">
                <div className="w-24 h-24 bg-emerald-50 text-emerald-600 rounded-[32px] flex items-center justify-center mx-auto mb-8 shadow-inner">
                  <Target size={48} />
                </div>
                <h2 className="text-4xl md:text-5xl font-black mb-6 text-slate-900 tracking-tight">Жизнь после долгов</h2>
                <p className="text-slate-500 mb-10 leading-relaxed text-lg max-w-2xl mx-auto">
                  Как только кредиты закроются, сумма{' '}
                  <span className="font-black text-emerald-600">{fmt(totalMinPaymentAll + Number(freeMoney))}</span>{' '}
                  станет вашей ежемесячной инвестицией. Не меняйте привычек — просто платите себе.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 text-left">
                  {[
                    { years: 5,  rate: 1.6,  label: 'через 5 лет' },
                    { years: 10, rate: 3.1,  label: 'через 10 лет' },
                    { years: 20, rate: 9.6,  label: 'через 20 лет' },
                  ].map(({ years, rate, label }) => (
                    <div key={years} className="bg-white p-7 rounded-[32px] border border-slate-100 shadow-sm">
                      <div className="text-[9px] text-slate-400 font-black uppercase tracking-widest mb-2">{label}</div>
                      <div className="text-3xl font-black text-slate-900 mb-1">{fmt((totalMinPaymentAll + Number(freeMoney)) * years * 12 * rate / years / 12 * 12 * years)}</div>
                      <div className="text-[10px] text-slate-400 font-medium">при 12% годовых</div>
                    </div>
                  ))}
                </div>

                <div className="bg-white p-10 rounded-[48px] border border-slate-100 shadow-2xl shadow-slate-100">
                  <div className="text-[9px] text-slate-400 font-black uppercase tracking-widest mb-4">Капитал через 10 лет</div>
                  <div className="text-5xl md:text-7xl font-black text-slate-900 tracking-tighter mb-4">
                    {fmt((totalMinPaymentAll + Number(freeMoney)) * 120 * 1.6)}
                  </div>
                  <div className="inline-block bg-emerald-50 text-emerald-700 px-4 py-2 rounded-xl text-xs font-black">
                    * При средней доходности 12% годовых
                  </div>
                  <p className="text-sm text-slate-400 font-medium mt-4 max-w-md mx-auto leading-relaxed">
                    Это {Math.round((totalMinPaymentAll + Number(freeMoney)) * 120 * 1.6 / ((totalMinPaymentAll + Number(freeMoney)) * 120))}x к вложенным{' '}
                    {fmt((totalMinPaymentAll + Number(freeMoney)) * 120)}. Инфляция побеждается сложным процентом.
                  </p>
                </div>
              </div>
            )}

          </div>
        </div>
      </main>

      {/* ── МОДАЛЬНОЕ ОКНО ── */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto">
          <form onSubmit={handleAdd}
            className="bg-white rounded-t-[40px] sm:rounded-[40px] p-8 md:p-10 w-full sm:max-w-md shadow-2xl space-y-5">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-2xl font-black tracking-tight text-slate-900">Новый долг</h3>
              <button type="button" onClick={() => setIsAddModalOpen(false)}
                className="w-10 h-10 flex items-center justify-center bg-slate-50 text-slate-400 rounded-full hover:bg-slate-100 transition-colors">
                <X size={20} />
              </button>
            </div>

            <div>
              <label className="text-[9px] uppercase font-black text-slate-400 ml-1 mb-1.5 block tracking-widest">Название</label>
              <input required placeholder="Кредитка Альфа"
                className="w-full bg-slate-50 p-4 rounded-2xl outline-none font-bold text-slate-900 focus:ring-4 ring-emerald-500/10 border border-transparent focus:border-emerald-200 transition-all"
                value={newDebt.name} onChange={e => setNewDebt({ ...newDebt, name: e.target.value })} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[9px] uppercase font-black text-slate-400 ml-1 mb-1.5 block tracking-widest">Остаток ₽</label>
                <input required type="number" placeholder="100000"
                  className="w-full bg-slate-50 p-4 rounded-2xl outline-none font-bold text-slate-900 focus:ring-4 ring-emerald-500/10 border border-transparent focus:border-emerald-200 transition-all"
                  value={newDebt.balance} onChange={e => setNewDebt({ ...newDebt, balance: e.target.value })} />
              </div>
              <div>
                <label className="text-[9px] uppercase font-black text-slate-400 ml-1 mb-1.5 block tracking-widest">Ставка %</label>
                <input required type="number" step="0.1" placeholder="24.9"
                  className="w-full bg-slate-50 p-4 rounded-2xl outline-none font-bold text-slate-900 focus:ring-4 ring-emerald-500/10 border border-transparent focus:border-emerald-200 transition-all"
                  value={newDebt.rate} onChange={e => setNewDebt({ ...newDebt, rate: e.target.value })} />
              </div>
            </div>

            <div>
              <label className="text-[9px] uppercase font-black text-slate-400 ml-1 mb-1.5 block tracking-widest">Ежемесячный платёж ₽</label>
              <input required type="number" placeholder="5000"
                className="w-full bg-slate-50 p-4 rounded-2xl outline-none font-bold text-slate-900 focus:ring-4 ring-emerald-500/10 border border-transparent focus:border-emerald-200 transition-all"
                value={newDebt.minPayment} onChange={e => setNewDebt({ ...newDebt, minPayment: e.target.value })} />
            </div>

            <div>
              <label className="text-[9px] uppercase font-black text-slate-400 ml-1 mb-1.5 block tracking-widest">Ближайшая дата платежа</label>
              <input required type="date"
                className="w-full bg-slate-50 p-4 rounded-2xl outline-none font-bold text-slate-500 focus:ring-4 ring-emerald-500/10 border border-transparent focus:border-emerald-200 transition-all"
                value={newDebt.nextPaymentDate} onChange={e => setNewDebt({ ...newDebt, nextPaymentDate: e.target.value })} />
            </div>

            <div>
              <label className="text-[9px] uppercase font-black text-slate-400 ml-1 mb-1.5 block tracking-widest flex justify-between">
                <span>Условия / заметка</span>
                <span className="normal-case font-medium">необязательно</span>
              </label>
              <textarea rows={3} placeholder="Грейс 120 дней. Штраф за просрочку 590₽..."
                className="w-full bg-slate-50 p-4 rounded-2xl outline-none font-medium text-slate-900 text-sm focus:ring-4 ring-emerald-500/10 border border-transparent focus:border-emerald-200 transition-all resize-none"
                value={newDebt.detailsSummary} onChange={e => setNewDebt({ ...newDebt, detailsSummary: e.target.value })} />
            </div>

            <button type="submit"
              className="w-full bg-slate-900 text-white p-5 rounded-2xl font-black shadow-xl hover:bg-emerald-600 transition-all uppercase tracking-widest">
              Добавить в дашборд
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

// ─── MOUNT ────────────────────────────────────────────────────────────────────
const root = createRoot(document.getElementById('root'));
root.render(<ErrorBoundary><App /></ErrorBoundary>);
