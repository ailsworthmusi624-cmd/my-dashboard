import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import {
  PlusCircle, Wallet, AlertCircle, Calendar, TrendingDown, TrendingUp,
  CheckCircle2, X, Menu, Bell, LayoutDashboard, PieChart, ChevronDown,
  ChevronUp, Target, WifiOff, RotateCcw, Edit3, Save, Upload,
  Calculator, RefreshCw, Zap, FileSpreadsheet, ArrowRight, Loader2
} from 'lucide-react';

// --- ИНИЦИАЛИЗАЦИЯ FIREBASE ---
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
const auth = getAuth(fbApp);
const db = getFirestore(fbApp);
const APP_ID = "dashboard-27927";

// --- ПРЕДОХРАНИТЕЛЬ (ERROR BOUNDARY) ---
class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(e) { return { hasError: true, error: e }; }
  render() {
    if (this.state.hasError) return (
      <div className="min-h-screen flex items-center justify-center bg-red-50 p-6 font-sans">
        <div className="bg-white p-8 rounded-[32px] shadow-xl text-center max-w-md">
          <AlertCircle className="mx-auto text-red-500 mb-4" size={48} />
          <h1 className="text-2xl font-black text-slate-900 mb-2">Сбой в коде</h1>
          <p className="text-sm text-slate-500 mb-6 bg-slate-50 p-4 rounded-xl overflow-auto text-left font-mono">{this.state.error?.toString()}</p>
          <button onClick={() => { localStorage.clear(); window.location.reload(); }} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-emerald-600 transition-colors">
            Сбросить кэш и перезагрузить
          </button>
        </div>
      </div>
    );
    return this.props.children;
  }
}

// --- УТИЛИТЫ И НАЧАЛЬНЫЕ ДАННЫЕ ---
const today = () => { const d = new Date(); d.setHours(0,0,0,0); return d; };
const daysFrom = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().split('T')[0]; };

const initialDebts = [
  { id: 1, name: 'Сбер (Кредитка)', balance: 85000, rate: 25.9, minPayment: 3500, nextPaymentDate: daysFrom(5), isPaidThisMonth: false, details: { summary: 'Грейс возобновляется только после полного погашения.' } },
  { id: 2, name: 'ВТБ (Кредитка)', balance: 120000, rate: 29.9, minPayment: 5000, nextPaymentDate: daysFrom(12), isPaidThisMonth: false, details: { summary: 'При пропуске платежа льготный период сгорает.' } },
];

const fmt = (v) => new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(v || 0);

const getDaysDiff = (dateStr) => {
  if (!dateStr) return 0;
  const [y, m, d] = dateStr.split('-').map(Number);
  const target = new Date(y, m - 1, d);
  return Math.ceil((target - today()) / 86400000);
};

const fmtDate = (dateStr, opts = {}) => {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('ru-RU', opts);
};

// --- КОМПОНЕНТЫ ВКЛАДОК ---

function DaysBadge({ days, paid }) {
  if (paid) return <span className="text-[10px] font-black px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-600 uppercase tracking-widest">Оплачено</span>;
  if (days < 0) return <span className="text-[10px] font-black px-3 py-1.5 rounded-xl bg-red-50 text-red-600 uppercase tracking-widest">Просрочка {Math.abs(days)} дн.</span>;
  if (days === 0) return <span className="text-[10px] font-black px-3 py-1.5 rounded-xl bg-orange-50 text-orange-600 uppercase tracking-widest">Сегодня</span>;
  if (days <= 3) return <span className="text-[10px] font-black px-3 py-1.5 rounded-xl bg-orange-50 text-orange-500 uppercase tracking-widest">{days} дн.</span>;
  return <span className="text-[10px] font-black px-3 py-1.5 rounded-xl bg-slate-50 text-slate-500 uppercase tracking-widest">{days} дн.</span>;
}

function CalendarTab({ debts }) {
  const now = new Date();
  const year = now.getFullYear();
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

  const cells = Array(startOffset).fill(null).concat(Array.from({length: daysInMonth}, (_, i) => i + 1));
  const months = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
  const days = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'];
  const sorted = [...debts].sort((a,b) => getDaysDiff(a.nextPaymentDate) - getDaysDiff(b.nextPaymentDate));

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-300">
      <h2 className="text-3xl font-black text-slate-900 flex items-center gap-3"><Calendar className="text-emerald-600" size={30}/> Календарь платежей</h2>

      <div className="bg-white rounded-[32px] border border-slate-100 p-6 md:p-8 shadow-sm">
        <div className="text-xl font-black text-slate-900 mb-6">{months[month]} {year}</div>
        <div className="grid grid-cols-7 mb-2">
          {days.map(d => <div key={d} className="text-center text-[10px] font-black text-slate-300 uppercase tracking-widest py-2">{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((day, i) => {
            if (!day) return <div key={`e${i}`}/>;
            const isToday = day === now.getDate();
            const pmts = byDay[day];
            const isPaid = pmts && pmts.every(d => d.isPaidThisMonth);
            const isOverdue = pmts && pmts.some(d => !d.isPaidThisMonth && getDaysDiff(d.nextPaymentDate) < 0);
            
            let cls = 'relative aspect-square flex flex-col items-center justify-start pt-1.5 rounded-2xl text-sm font-bold transition-all';
            if (isToday) cls += ' ring-2 ring-emerald-500 ring-offset-1';
            if (pmts) {
              if (isPaid) cls += ' bg-emerald-50 text-emerald-700';
              else if (isOverdue) cls += ' bg-red-50 text-red-700';
              else cls += ' bg-slate-50 text-slate-700 hover:bg-slate-100 cursor-pointer';
            } else cls += ' text-slate-300';
            
            return (
              <div key={day} className={cls}>
                <span>{day}</span>
                {pmts && <div className="flex flex-wrap justify-center gap-0.5 mt-1">{pmts.map(d => <div key={d.id} className={`w-1.5 h-1.5 rounded-full ${d.isPaidThisMonth ? 'bg-emerald-500' : isOverdue ? 'bg-red-500' : 'bg-emerald-400'}`}/>)}</div>}
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-white rounded-[32px] border border-slate-100 p-6 md:p-8 shadow-sm">
        <h3 className="font-black text-lg text-slate-900 mb-6">Все платежи</h3>
        <div className="space-y-3">
          {sorted.map(d => {
            const dDiff = getDaysDiff(d.nextPaymentDate);
            return (
              <div key={d.id} className={`flex items-center justify-between p-4 rounded-2xl border transition-colors ${d.isPaidThisMonth ? 'border-slate-100 opacity-40 grayscale' : dDiff < 0 ? 'border-red-100 bg-red-50/30' : 'border-slate-100 hover:border-emerald-100'}`}>
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-[11px] font-black ${d.isPaidThisMonth ? 'bg-emerald-100 text-emerald-700' : dDiff < 0 ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-700'}`}>
                    {fmtDate(d.nextPaymentDate, {day:'numeric', month:'short'})}
                  </div>
                  <div>
                    <div className="font-bold text-slate-900 text-sm">{d.name}</div>
                    <div className="text-[11px] text-slate-400 font-medium">{d.rate > 0 ? `${d.rate}% год.` : 'Рассрочка'}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="font-black text-slate-900">{fmt(d.minPayment)}</div>
                  <DaysBadge days={dDiff} paid={d.isPaidThisMonth}/>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function AnalyticsTab({ debts, totalMinPaymentAll }) {
  const totalDebt = debts.reduce((acc, d) => acc + Number(d.balance || 0), 0);
  const totalMonthlyInterest = debts.reduce((s, d) => s + (d.rate > 0 ? (d.balance * d.rate / 100 / 12) : 0), 0);
  
  // Примерный расчет переплаты по аннуитету
  const totalOverpay = debts.reduce((s, d) => {
    if (!d.rate || !d.minPayment || !d.balance) return s;
    const r = d.rate / 100 / 12;
    if (r === 0) return s;
    const months = r > 0 ? Math.ceil(Math.log(d.minPayment / (d.minPayment - r * d.balance)) / Math.log(1 + r)) : 0;
    return s + (isFinite(months) && months > 0 ? (d.minPayment * months - d.balance) : 0);
  }, 0);

  const mostExpensive = [...debts].sort((a,b) => b.rate - a.rate)[0];
  const barColors = ['bg-emerald-500','bg-teal-400','bg-cyan-400','bg-sky-400','bg-blue-400','bg-indigo-400','bg-violet-400'];

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-300">
      <h2 className="text-3xl font-black text-slate-900 flex items-center gap-3"><PieChart className="text-emerald-600" size={30}/> Аналитика</h2>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Всего долгов', val: debts.length, color: 'text-slate-900' },
          { label: 'Проценты / мес', val: fmt(totalMonthlyInterest), color: 'text-red-500' },
          { label: 'КПД платежа', val: totalMinPaymentAll > 0 ? Math.round((totalMinPaymentAll - totalMonthlyInterest) / totalMinPaymentAll * 100) + '%' : '—', color: 'text-emerald-600' },
          { label: 'Переплата итого', val: fmt(Math.max(0, totalOverpay)), color: 'text-orange-500' },
        ].map(k => (
          <div key={k.label} className="bg-white p-5 rounded-[28px] border border-slate-100 shadow-sm">
            <div className="text-[9px] text-slate-400 font-black uppercase tracking-widest mb-2">{k.label}</div>
            <div className={`text-2xl font-black ${k.color}`}>{k.val}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-7 rounded-[32px] border border-slate-100 shadow-sm">
          <h3 className="font-black text-slate-900 text-lg mb-6">Структура долга</h3>
          {totalDebt === 0 ? <p className="text-sm text-slate-400 text-center py-8">Нет данных</p> : (
            <div className="space-y-4">
              {[...debts].sort((a,b) => b.balance - a.balance).map((d,i) => {
                const pct = (d.balance / totalDebt) * 100;
                return (
                  <div key={d.id}>
                    <div className="flex justify-between text-xs font-bold mb-1.5">
                      <span className="text-slate-700 truncate mr-2">{d.name}</span>
                      <span className="text-slate-400">{Math.round(pct)}%</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                      <div className={`${barColors[i % barColors.length]} h-full rounded-full`} style={{width:`${pct}%`}}/>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-white p-7 rounded-[32px] border border-slate-100 shadow-sm">
          <h3 className="font-black text-slate-900 text-lg mb-6">Куда уходит платёж</h3>
          <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
            {debts.map(d => {
              const interest = d.rate > 0 ? (d.balance * d.rate / 100 / 12) : 0;
              const principal = Math.max(0, d.minPayment - interest);
              const pct = d.minPayment > 0 ? (interest / d.minPayment) * 100 : 0;
              return (
                <div key={d.id}>
                  <div className="flex justify-between text-xs font-bold mb-1.5">
                    <span className="text-slate-700 truncate mr-2">{d.name}</span>
                    <span className="text-red-400">{Math.round(pct)}% в воздух</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden flex">
                    <div className="bg-red-400 h-full" style={{width:`${pct}%`}}/>
                    <div className="bg-emerald-500 h-full" style={{width:`${100-pct}%`}}/>
                  </div>
                  <div className="flex justify-between text-[10px] font-medium text-slate-400 mt-1">
                    <span className="text-red-400">%: {fmt(interest)}</span>
                    <span className="text-emerald-600">Тело: {fmt(principal)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {mostExpensive && (
        <div className="bg-red-50 p-7 rounded-[32px] border border-red-100">
          <div className="text-[9px] text-red-400 font-black uppercase tracking-widest mb-3 flex items-center gap-2"><AlertCircle size={14}/> Самый невыгодный кредит</div>
          <div className="font-black text-xl text-slate-900 mb-1">{mostExpensive.name}</div>
          <div className="text-4xl font-black text-red-500 mb-2">{mostExpensive.rate}%</div>
          <p className="text-sm text-red-700 font-medium">
            Этот долг ежемесячно сжигает {fmt(mostExpensive.balance * mostExpensive.rate / 100 / 12)} на проценты. По стратегии <span className="font-black">Лавина</span> его нужно гасить в первую очередь.
          </p>
        </div>
      )}
    </div>
  );
}

function InvestingTab({ totalMinPaymentAll, freeMoney }) {
  const monthlyInvestment = totalMinPaymentAll + Number(freeMoney);
  const futureValue = monthlyInvestment * ((Math.pow(1 + (0.12 / 12), 120) - 1) / (0.12 / 12));

  return (
    <div className="max-w-3xl mx-auto text-center py-10 md:py-16 animate-in fade-in zoom-in-95 duration-500">
      <div className="w-24 h-24 bg-emerald-50 text-emerald-600 rounded-[32px] flex items-center justify-center mx-auto mb-8 shadow-inner"><Target size={48}/></div>
      <h2 className="text-4xl md:text-5xl font-black mb-6 text-slate-900 tracking-tight">Жизнь после долгов</h2>
      <p className="text-slate-500 mb-12 leading-relaxed text-lg max-w-2xl mx-auto">
        Как только кредиты исчезнут, сумма <span className="font-bold text-emerald-600">{fmt(monthlyInvestment)}</span> станет вашей ежемесячной инвестицией. Не меняйте привычек, просто начните платить себе.
      </p>
      
      <div className="bg-white p-10 md:p-16 rounded-[48px] border border-slate-100 shadow-2xl shadow-slate-200/50">
        <div className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-6">Ваш капитал через 10 лет</div>
        <div className="text-5xl md:text-7xl font-black text-emerald-600 tracking-tighter mb-6">{fmt(futureValue)}</div>
        <div className="inline-block bg-slate-50 text-slate-500 px-4 py-2 rounded-xl text-xs font-bold">* Расчет при средней рыночной доходности 12% годовых</div>
      </div>
    </div>
  );
}

// --- ОСНОВНОЙ КОМПОНЕНТ APP ---
function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLocalFallback, setIsLocalFallback] = useState(false);

  const [debts, setDebts] = useState([]);
  const [freeMoney, setFreeMoney] = useState(15000);
  const [strategy, setStrategy] = useState('avalanche');
  const [freeMoneyInput, setFreeMoneyInput] = useState('15000');

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [newDebt, setNewDebt] = useState({ name: '', balance: '', rate: '', minPayment: '', nextPaymentDate: '', detailsSummary: '' });

  // Авторизация Firebase
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, u => { if (u) setUser(u); });
    signInAnonymously(auth).catch((e) => {
      console.warn("Auth failed, using local mode", e);
      enableLocalMode();
    });
    return () => unsub();
  }, []);

  // Синхронизация данных
  useEffect(() => {
    if (isLocalFallback || !user) return;
    const ref = doc(db, 'artifacts', APP_ID, 'public', 'data', 'appState', 'main');
    
    // Таймаут для фоллбека
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
        setDoc(ref, { debts: initialDebts, freeMoney: 15000, strategy: 'avalanche' }).catch(console.error);
      }
      setIsLoading(false);
    }, (err) => { 
      console.warn("Snapshot error", err);
      clearTimeout(timer); 
      enableLocalMode(); 
    });
    
    return () => { clearTimeout(timer); unsub(); };
  }, [user, isLocalFallback]);

  const enableLocalMode = useCallback(() => {
    setIsLocalFallback(true);
    setIsLoading(false);
    try {
      const sd = localStorage.getItem('localDebts');
      const sf = localStorage.getItem('localFreeMoney');
      const ss = localStorage.getItem('localStrategy');
      setDebts(sd ? JSON.parse(sd) : initialDebts);
      setFreeMoney(sf ? Number(sf) : 15000);
      setFreeMoneyInput(sf || '15000');
      setStrategy(ss || 'avalanche');
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

  // Вычисления
  const totalDebt = debts.reduce((acc, d) => acc + Number(d.balance || 0), 0);
  const totalMinPaymentAll = debts.reduce((acc, d) => acc + Number(d.minPayment || 0), 0);
  const totalMinPaymentLeft = debts.reduce((acc, d) => acc + (d.isPaidThisMonth ? 0 : Number(d.minPayment || 0)), 0);
  const paidThisMonthAmount = debts.filter(d => d.isPaidThisMonth).reduce((acc, d) => acc + Number(d.minPayment || 0), 0);
  const progressPercent = totalMinPaymentAll === 0 ? 0 : Math.round((paidThisMonthAmount / totalMinPaymentAll) * 100);
  
  const overdueDebts = debts.filter(d => !d.isPaidThisMonth && getDaysDiff(d.nextPaymentDate) < 0);
  const totalOverdue = overdueDebts.reduce((acc, d) => acc + Number(d.minPayment || 0), 0);

  const sortedDebts = useMemo(() => [...debts].sort((a, b) => {
    if (a.isPaidThisMonth !== b.isPaidThisMonth) return a.isPaidThisMonth ? 1 : -1;
    return getDaysDiff(a.nextPaymentDate) - getDaysDiff(b.nextPaymentDate);
  }), [debts]);

  const strategyAllocation = useMemo(() => {
    let remain = Number(freeMoney) || 0;
    const alloc = {};
    const targets = [...debts.filter(d => d.balance > 0)];
    targets.sort((a, b) => strategy === 'avalanche' ? (b.rate || 0) - (a.rate || 0) : (a.balance || 0) - (b.balance || 0));
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

  // Обработчики
  const handleMarkPaid = (id) => {
    const next = debts.map(d => d.id === id ? { ...d, isPaidThisMonth: true, balance: Math.max(0, Number(d.balance) - Number(d.minPayment || 0)), _prevBalance: d.balance } : d);
    setDebts(next); saveData(next, freeMoney, strategy);
  };
  const handleUndoPaid = (id) => {
    const next = debts.map(d => d.id === id ? { ...d, isPaidThisMonth: false, balance: d._prevBalance !== undefined ? d._prevBalance : Number(d.balance) + Number(d.minPayment || 0) } : d);
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
      ...newDebt, id: Date.now(), isPaidThisMonth: false, balance: Number(newDebt.balance), rate: Number(newDebt.rate), minPayment: Number(newDebt.minPayment),
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
    setFreeMoney(val); saveData(debts, val, strategy);
  };

  if (isLoading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8FAFC] text-emerald-700">
      <Loader2 size={48} className="animate-spin mb-4" />
      <p className="font-bold tracking-tight text-xl">Синхронизация...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 font-sans flex overflow-hidden">
      {isSidebarOpen && <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 lg:hidden" onClick={() => setIsSidebarOpen(false)} />}

      {/* --- SIDEBAR --- */}
      <aside className={`fixed lg:static inset-y-0 left-0 w-64 bg-white border-r border-slate-100 z-50 transition-transform duration-300 flex flex-col ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-200"><Wallet size={20} /></div>
          <span className="font-black text-xl tracking-tight text-slate-900">Свобода.</span>
        </div>
        <nav className="flex-1 px-4 space-y-2 mt-4">
          {[
            { id: 'dashboard', icon: <LayoutDashboard size={20}/>, label: 'Дашборд' },
            { id: 'calendar', icon: <Calendar size={20}/>, label: 'Календарь' },
            { id: 'analytics', icon: <PieChart size={20}/>, label: 'Аналитика' },
            { id: 'investing', icon: <Target size={20}/>, label: 'После долгов' }
          ].map(item => (
            <button key={item.id} onClick={() => { setActiveTab(item.id); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-3 p-3.5 rounded-2xl font-bold text-sm transition-all ${activeTab === item.id ? 'bg-emerald-50 text-emerald-700' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'}`}>
              {item.icon} {item.label}
            </button>
          ))}
        </nav>
        <div className="px-4 pb-6 mt-auto">
          <div className="bg-slate-900 p-6 rounded-[32px] text-white relative overflow-hidden shadow-2xl shadow-slate-900/20">
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 text-center relative z-10">Прогресс месяца</div>
            <div className="text-xs text-emerald-400 font-bold text-center mb-6 relative z-10">{fmt(paidThisMonthAmount)} / {fmt(totalMinPaymentAll)}</div>
            <div className="flex justify-center relative z-10">
              <svg className="w-28 h-28 -rotate-90">
                <circle cx="56" cy="56" r="48" stroke="currentColor" strokeWidth="10" fill="transparent" className="text-slate-800" />
                <circle cx="56" cy="56" r="48" stroke="currentColor" strokeWidth="10" fill="transparent" strokeDasharray="301.5" strokeDashoffset={301.5 - (progressPercent / 100) * 301.5} strokeLinecap="round" className="text-emerald-500 transition-all duration-1000" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center font-black text-2xl">{progressPercent}%</div>
            </div>
            <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-emerald-500 rounded-full blur-3xl opacity-20"></div>
          </div>
        </div>
      </aside>

      {/* --- MAIN CONTENT --- */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="bg-white/80 backdrop-blur-md p-4 lg:px-8 flex justify-between items-center border-b border-slate-100 sticky top-0 z-30">
          <button className="lg:hidden p-2 -ml-2 text-slate-500 hover:bg-slate-50 rounded-lg transition-colors" onClick={() => setIsSidebarOpen(true)}><Menu size={24} /></button>
          <div className="flex items-center gap-4 ml-auto">
            {isLocalFallback ? (
              <div className="hidden sm:flex items-center gap-1.5 bg-orange-50 text-orange-600 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest"><WifiOff size={14}/> Офлайн режим</div>
            ) : (
              <div className="hidden sm:flex items-center gap-1.5 bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest"><div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Облако активно</div>
            )}
            
            <div className="relative">
              <button onClick={() => setIsNotificationsOpen(!isNotificationsOpen)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full relative transition-colors">
                <Bell size={22} />
                {notifications.length > 0 && <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 border-2 border-white rounded-full" />}
              </button>
              {isNotificationsOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsNotificationsOpen(false)} />
                  <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-slate-100 p-2 z-50 overflow-hidden">
                    <div className="p-3 font-bold border-b border-slate-50 text-sm">Уведомления</div>
                    <div className="max-h-60 overflow-y-auto">
                      {notifications.length === 0 ? <div className="p-4 text-xs text-slate-400 text-center">Все спокойно</div> : notifications.map(n => (
                        <div key={n.id} className="p-3 border-b border-slate-50 last:border-0 text-xs hover:bg-slate-50 transition-colors">
                          <div className={`font-bold mb-0.5 ${n.type === 'overdue' ? 'text-red-600' : 'text-orange-500'}`}>{n.title}</div>
                          {n.text}
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
            <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-400"><Wallet size={20}/></div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 lg:p-8">
          <div className="max-w-6xl mx-auto">
            {/* ТАБ 1: ДАШБОРД */}
            {activeTab === 'dashboard' && (
              <div className="animate-in fade-in duration-300">
                <div className="flex flex-col sm:flex-row justify-between sm:items-end mb-8 gap-4">
                  <div>
                    <h1 className="text-3xl lg:text-4xl font-black tracking-tight text-slate-900">Дашборд</h1>
                    <p className="text-sm text-slate-500 mt-1 font-medium">Осталось закрыть {debts.filter(d => d.balance > 0).length} кредитов</p>
                  </div>
                  <button onClick={() => setIsAddModalOpen(true)} className="w-full sm:w-auto bg-emerald-600 text-white px-6 py-3.5 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition-all active:scale-95 text-xs">
                    <PlusCircle size={18}/> Добавить долг
                  </button>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                  <div className="bg-emerald-600 p-6 rounded-[32px] text-white flex flex-col justify-between shadow-xl shadow-emerald-100 min-h-[140px] relative overflow-hidden">
                    <div className="relative z-10"><div className="text-[10px] opacity-70 font-black uppercase tracking-widest mb-1">Общий долг</div><div className="text-2xl md:text-3xl font-black truncate">{fmt(totalDebt)}</div></div>
                    <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-white opacity-10 rounded-full blur-xl"></div>
                  </div>
                  <div className="bg-white p-6 rounded-[32px] border border-slate-100 flex flex-col justify-between shadow-sm min-h-[140px]">
                    <div><div className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Осталось оплатить</div><div className="text-2xl md:text-3xl font-black truncate text-slate-900">{fmt(totalMinPaymentLeft)}</div></div>
                    <div className="text-[10px] text-slate-400 font-medium">из {fmt(totalMinPaymentAll)}</div>
                  </div>
                  <div className="bg-white p-6 rounded-[32px] border border-slate-100 flex flex-col justify-between shadow-sm min-h-[140px]">
                    <div><div className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Просрочено</div><div className={`text-2xl md:text-3xl font-black truncate ${totalOverdue > 0 ? 'text-red-500' : 'text-slate-900'}`}>{fmt(totalOverdue)}</div></div>
                    <div className={`mt-2 text-[10px] font-black uppercase tracking-widest px-2.5 py-1.5 rounded-xl w-fit ${totalOverdue > 0 ? 'bg-red-50 text-red-600' : 'bg-slate-50 text-slate-400'}`}>{totalOverdue > 0 ? 'Требует внимания' : 'График соблюден'}</div>
                  </div>
                  <div className="bg-white p-6 rounded-[32px] border border-slate-100 flex flex-col justify-between shadow-sm focus-within:ring-2 ring-emerald-500 transition-all min-h-[140px]">
                    <div className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Свободные деньги</div>
                    <div className="relative">
                      <input type="number" value={freeMoneyInput} onChange={e => setFreeMoneyInput(e.target.value)} onBlur={handleFreeMoneyBlur} className="text-2xl md:text-3xl font-black text-emerald-600 bg-transparent border-b-2 border-emerald-50 outline-none w-full pb-1 focus:border-emerald-500 transition-colors"/>
                      <span className="absolute right-0 bottom-2 text-emerald-600/30 font-black">₽</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-2 space-y-4">
                    <div className="flex justify-between items-center px-2">
                      <h3 className="font-black text-xl text-slate-900">Список платежей</h3>
                      <button onClick={handleResetMonth} className="text-[10px] font-black text-slate-400 border border-slate-200 px-3.5 py-2 rounded-xl flex items-center gap-1.5 hover:bg-slate-50 hover:text-slate-900 transition-colors uppercase tracking-widest"><RotateCcw size={14}/> Сброс месяца</button>
                    </div>
                    
                    {sortedDebts.length === 0 ? (
                      <div className="bg-white rounded-[32px] border border-slate-100 p-10 text-center text-slate-400 font-medium">Нет добавленных долгов. Нажмите "Добавить долг".</div>
                    ) : (
                      sortedDebts.map(d => {
                        const days = getDaysDiff(d.nextPaymentDate);
                        const monthlyInterest = d.rate > 0 ? (Number(d.balance) * (Number(d.rate) / 100)) / 12 : 0;
                        const principalPayment = Math.max(0, Number(d.minPayment) - monthlyInterest);
                        
                        return (
                          <div key={d.id} className={`bg-white p-5 md:p-6 rounded-[32px] border transition-all ${d.isPaidThisMonth ? 'opacity-40 grayscale border-slate-100' : days < 0 ? 'border-red-100 bg-red-50/10' : 'border-slate-100 hover:shadow-xl hover:shadow-slate-200/50'}`}>
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 cursor-pointer" onClick={() => setExpandedId(expandedId === d.id ? null : d.id)}>
                              <div className="flex items-center gap-5">
                                <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 shrink-0"><Wallet size={24}/></div>
                                <div>
                                  <h4 className="font-black text-lg text-slate-900 flex items-center gap-2">{d.name} {expandedId === d.id ? <ChevronUp size={16} className="text-slate-400"/> : <ChevronDown size={16} className="text-slate-400"/>}</h4>
                                  <p className="text-xs text-slate-500 font-medium mt-1">{d.rate > 0 ? `${d.rate}% год.` : 'Рассрочка'} • Остаток: <span className="font-bold">{fmt(d.balance)}</span></p>
                                </div>
                              </div>
                              <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto">
                                <div className="text-left sm:text-right">
                                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Платеж</p>
                                  <p className="text-xl font-black text-slate-900">{fmt(d.minPayment)}</p>
                                </div>
                                <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                                  {d.isPaidThisMonth ? (
                                    <button onClick={() => handleUndoPaid(d.id)} className="w-12 h-12 flex items-center justify-center text-slate-400 hover:text-orange-500 bg-slate-50 hover:bg-orange-50 rounded-2xl transition-colors"><RotateCcw size={20}/></button>
                                  ) : (
                                    <button onClick={() => handleMarkPaid(d.id)} className="bg-slate-900 text-white px-6 rounded-2xl text-xs font-black flex items-center justify-center gap-2 hover:bg-emerald-600 transition-colors shadow-lg active:scale-95 uppercase tracking-widest h-12"><CheckCircle2 size={18}/> <span className="hidden sm:inline">Оплатить</span></button>
                                  )}
                                </div>
                              </div>
                            </div>

                            {expandedId === d.id && (
                              <div className="mt-6 pt-6 border-t border-slate-100 cursor-default" onClick={e => e.stopPropagation()}>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                                  <div className="bg-slate-50 p-4 rounded-2xl"><span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Проценты</span><span className="font-bold text-red-500">{fmt(monthlyInterest)}</span></div>
                                  <div className="bg-slate-50 p-4 rounded-2xl"><span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Тело долга</span><span className="font-bold text-emerald-600">{fmt(principalPayment)}</span></div>
                                  <div className="col-span-2 md:col-span-2 bg-slate-50 p-4 rounded-2xl flex justify-between items-center"><span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest">Статус</span><span className={`font-bold ${days < 0 ? 'text-red-500' : 'text-slate-900'}`}>{days < 0 ? `Просрочка ${Math.abs(days)} дн.` : `Осталось ${days} дн.`}</span></div>
                                </div>
                                {d.details?.summary && (
                                  <div className="bg-amber-50 text-amber-900 p-5 rounded-2xl text-sm font-medium border border-amber-100 leading-relaxed">
                                    <div className="flex items-center gap-2 mb-2 text-amber-700 font-black uppercase tracking-widest text-[10px]"><AlertCircle size={14}/> Условия банка:</div>
                                    {d.details.summary}
                                  </div>
                                )}
                                <div className="mt-4 flex justify-end gap-3">
                                  <button onClick={() => handleDelete(d.id)} className="text-[10px] font-black text-red-500 bg-red-50 px-4 py-2.5 rounded-xl hover:bg-red-100 transition-colors uppercase tracking-widest">Удалить</button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                  
                  <div className="space-y-6">
                    <div className="bg-white p-6 md:p-8 rounded-[32px] border border-slate-100 shadow-sm">
                      <h3 className="font-black mb-6 flex items-center gap-2 text-slate-900 text-lg"><TrendingDown className="text-emerald-600" size={20}/> Стратегия</h3>
                      <div className="flex bg-slate-50 p-1.5 rounded-2xl mb-6">
                        <button onClick={() => {setStrategy('avalanche'); saveData(debts, freeMoney, 'avalanche')}} className={`flex-1 py-3 rounded-xl text-[10px] font-black transition-all uppercase tracking-widest ${strategy === 'avalanche' ? 'bg-white shadow-sm text-emerald-700' : 'text-slate-400'}`}>Лавина</button>
                        <button onClick={() => {setStrategy('snowball'); saveData(debts, freeMoney, 'snowball')}} className={`flex-1 py-3 rounded-xl text-[10px] font-black transition-all uppercase tracking-widest ${strategy === 'snowball' ? 'bg-white shadow-sm text-emerald-700' : 'text-slate-400'}`}>Ком</button>
                      </div>
                      <div className="space-y-2 min-h-[100px]">
                        {Object.entries(strategyAllocation).some(([_,a])=>a>0) ? Object.entries(strategyAllocation).map(([id, amt]) => (amt > 0 && (
                          <div key={id} className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl">
                            <span className="text-xs font-bold text-slate-700 truncate mr-2">{debts.find(d=>d.id == id)?.name}</span>
                            <span className="font-black text-sm text-emerald-600">+{fmt(amt)}</span>
                          </div>
                        ))) : <p className="text-center text-xs text-slate-400 py-6 font-medium">Введите свободные деньги для расчета ускоренного погашения</p>}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'calendar' && <CalendarTab debts={debts} />}
            {activeTab === 'analytics' && <AnalyticsTab debts={debts} totalMinPaymentAll={totalMinPaymentAll} />}
            {activeTab === 'investing' && <InvestingTab totalMinPaymentAll={totalMinPaymentAll} freeMoney={freeMoney} />}

          </div>
        </div>
      </main>

      {/* --- МОДАЛЬНОЕ ОКНО ДОБАВЛЕНИЯ --- */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 overflow-y-auto">
          <form onSubmit={handleAdd} className="bg-white rounded-[40px] p-8 md:p-10 w-full max-w-md shadow-2xl space-y-5 my-auto animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-black tracking-tight text-slate-900">Новый долг</h3>
              <button type="button" onClick={() => setIsAddModalOpen(false)} className="w-10 h-10 flex items-center justify-center bg-slate-50 text-slate-400 rounded-full hover:bg-slate-100 transition-colors"><X size={20}/></button>
            </div>
            
            <div className="space-y-4 font-medium">
              <div>
                <label className="text-[10px] uppercase font-black text-slate-400 ml-4 mb-1.5 block tracking-widest">Название банка</label>
                <input required placeholder="Например: Кредитка Альфа" className="w-full bg-slate-50 p-4 rounded-2xl outline-none font-bold text-slate-900 focus:ring-4 ring-emerald-600/10 transition-all border border-transparent focus:border-emerald-200" value={newDebt.name} onChange={e => setNewDebt({...newDebt, name: e.target.value})}/>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] uppercase font-black text-slate-400 ml-4 mb-1.5 block tracking-widest">Остаток ₽</label>
                  <input required type="number" className="w-full bg-slate-50 p-4 rounded-2xl outline-none font-bold text-slate-900 focus:ring-4 ring-emerald-600/10 transition-all border border-transparent focus:border-emerald-200" value={newDebt.balance} onChange={e => setNewDebt({...newDebt, balance: e.target.value})}/>
                </div>
                <div>
                  <label className="text-[10px] uppercase font-black text-slate-400 ml-4 mb-1.5 block tracking-widest">Ставка %</label>
                  <input required type="number" step="0.1" className="w-full bg-slate-50 p-4 rounded-2xl outline-none font-bold text-slate-900 focus:ring-4 ring-emerald-600/10 transition-all border border-transparent focus:border-emerald-200" value={newDebt.rate} onChange={e => setNewDebt({...newDebt, rate: e.target.value})}/>
                </div>
              </div>
              
              <div>
                <label className="text-[10px] uppercase font-black text-slate-400 ml-4 mb-1.5 block tracking-widest">Платеж ₽</label>
                <input required type="number" className="w-full bg-slate-50 p-4 rounded-2xl outline-none font-bold text-slate-900 focus:ring-4 ring-emerald-600/10 transition-all border border-transparent focus:border-emerald-200" value={newDebt.minPayment} onChange={e => setNewDebt({...newDebt, minPayment: e.target.value})}/>
              </div>
              
              <div>
                <label className="text-[10px] uppercase font-black text-slate-400 ml-4 mb-1.5 block tracking-widest">Дата платежа</label>
                <input required type="date" className="w-full bg-slate-50 p-4 rounded-2xl outline-none font-bold text-slate-600 focus:ring-4 ring-emerald-600/10 transition-all border border-transparent focus:border-emerald-200" value={newDebt.nextPaymentDate} onChange={e => setNewDebt({...newDebt, nextPaymentDate: e.target.value})}/>
              </div>
            </div>
            
            <button type="submit" className="w-full bg-slate-900 text-white p-5 rounded-2xl font-black shadow-xl shadow-slate-200 hover:bg-emerald-600 transition-all uppercase tracking-widest mt-6">
              Сохранить
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

const root = createRoot(document.getElementById('root'));
root.render(<ErrorBoundary><App /></ErrorBoundary>);
