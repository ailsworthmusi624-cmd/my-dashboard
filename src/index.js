import React, { useState, useEffect, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { 
  PlusCircle, Wallet, AlertCircle, Calendar, TrendingDown, TrendingUp, 
  ArrowRight, CheckCircle2, X, Menu, Bell, LayoutDashboard, Settings, 
  PieChart, ArrowUpRight, Search, Mail, HelpCircle, LogOut, 
  ChevronDown, ChevronUp, FileText, RotateCcw, Clock, Target, Loader2, WifiOff
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

// Безопасная инициализация
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);
const db = getFirestore(app);
const APP_ID = "dashboard-27927";

// --- ПРЕДОХРАНИТЕЛЬ ОТ БЕЛОГО ЭКРАНА ---
class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-red-50 p-6">
          <div className="bg-white p-8 rounded-3xl shadow-xl text-center max-w-md">
            <AlertCircle className="mx-auto text-red-500 mb-4" size={48} />
            <h1 className="text-xl font-bold text-slate-900 mb-2">Случился сбой</h1>
            <p className="text-sm text-slate-500 mb-6">{this.state.error?.toString()}</p>
            <button onClick={() => { localStorage.clear(); window.location.reload(); }} className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold">Сбросить и перезагрузить</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const initialDebts = [
  { id: 1, name: 'Сбер (Кредитка)', balance: 85000, rate: 25.9, minPayment: 3500, nextPaymentDate: new Date(new Date().setDate(new Date().getDate() + 5)).toISOString().split('T')[0], isPaidThisMonth: false, details: { summary: 'Грейс 120 дней.' } },
  { id: 2, name: 'ВТБ (Кредитка)', balance: 120000, rate: 29.9, minPayment: 5000, nextPaymentDate: new Date(new Date().setDate(new Date().getDate() + 12)).toISOString().split('T')[0], isPaidThisMonth: false, details: { summary: 'Мин. платеж 3%.' } }
];

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLocalFallback, setIsLocalFallback] = useState(false); // Умный переключатель

  const [debts, setDebts] = useState([]);
  const [freeMoney, setFreeMoney] = useState(15000);
  const [strategy, setStrategy] = useState('avalanche');
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [newDebt, setNewDebt] = useState({ name: '', balance: '', rate: '', minPayment: '', nextPaymentDate: '', detailsSummary: '' });

  // Запуск и Авторизация
  useEffect(() => {
    const initApp = async () => {
      try {
        await signInAnonymously(auth);
      } catch (err) {
        console.warn("Firebase Auth Error (Fallback to local):", err);
        enableLocalMode();
      }
    };
    initApp();

    const unsub = onAuthStateChanged(auth, (u) => {
      if (u) {
        setUser(u);
      }
    });
    return () => unsub();
  }, []);

  // Подключение к базе данных
  useEffect(() => {
    if (isLocalFallback) return; // Если уже в локальном режиме, облако не трогаем
    if (!user) return;

    const docRef = doc(db, "artifacts", APP_ID, "public", "data", "appState", "main");
    
    // Таймер ожидания: если база не ответила за 5 секунд - переходим в локальный режим
    const timeout = setTimeout(() => {
      if (isLoading) enableLocalMode();
    }, 5000);

    const unsubscribe = onSnapshot(docRef, (snap) => {
      clearTimeout(timeout);
      if (snap.exists()) {
        const data = snap.data();
        setDebts(data.debts || []);
        setFreeMoney(data.freeMoney || 15000);
        setStrategy(data.strategy || 'avalanche');
      } else {
        setDoc(docRef, { debts: initialDebts, freeMoney: 15000, strategy: 'avalanche' });
      }
      setIsLoading(false);
    }, (err) => {
      console.warn("Firestore Rules Error (Fallback to local):", err);
      clearTimeout(timeout);
      enableLocalMode();
    });

    return () => {
      clearTimeout(timeout);
      unsubscribe();
    };
  }, [user, isLocalFallback]); // eslint-disable-line

  // Функция перехода в локальный режим
  const enableLocalMode = () => {
    setIsLocalFallback(true);
    setIsLoading(false);
    try {
      const savedDebts = localStorage.getItem('localDebts');
      const savedFree = localStorage.getItem('localFreeMoney');
      const savedStrategy = localStorage.getItem('localStrategy');
      setDebts(savedDebts ? JSON.parse(savedDebts) : initialDebts);
      if (savedFree) setFreeMoney(Number(savedFree));
      if (savedStrategy) setStrategy(savedStrategy);
    } catch (e) {
      setDebts(initialDebts);
    }
  };

  // Сохранение (Либо в облако, либо в локально)
  const saveData = (newDebts, newFreeMoney, newStrategy) => {
    if (isLocalFallback || !user) {
      localStorage.setItem('localDebts', JSON.stringify(newDebts));
      localStorage.setItem('localFreeMoney', newFreeMoney);
      localStorage.setItem('localStrategy', newStrategy);
    } else {
      const docRef = doc(db, "artifacts", APP_ID, "public", "data", "appState", "main");
      setDoc(docRef, { debts: newDebts, freeMoney: Number(newFreeMoney), strategy: newStrategy }, { merge: true }).catch(console.error);
    }
  };

  // Хелперы
  const formatMoney = (v) => new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(v || 0);
  const getDaysDiff = (dateStr) => {
    if (!dateStr) return 0;
    const diff = new Date(dateStr) - new Date().setHours(0,0,0,0);
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  // Математика
  const totalDebt = debts.reduce((acc, d) => acc + Number(d.balance || 0), 0);
  const totalMinPaymentAll = debts.reduce((acc, d) => acc + Number(d.minPayment || 0), 0);
  const totalMinPaymentRemaining = debts.reduce((acc, d) => acc + (d.isPaidThisMonth ? 0 : Number(d.minPayment || 0)), 0);
  const paidThisMonthAmount = debts.filter(d => d.isPaidThisMonth).reduce((acc, d) => acc + Number(d.minPayment || 0), 0);
  const progressPercent = totalMinPaymentAll === 0 ? 0 : Math.round((paidThisMonthAmount / totalMinPaymentAll) * 100);
  
  const sortedDebts = [...debts].sort((a, b) => {
    if (a.isPaidThisMonth !== b.isPaidThisMonth) return a.isPaidThisMonth ? 1 : -1;
    return new Date(a.nextPaymentDate || 0) - new Date(b.nextPaymentDate || 0);
  });

  const strategyAllocation = useMemo(() => {
    let remain = Number(freeMoney) || 0;
    const alloc = {};
    let targets = debts.filter(d => d.balance > 0);
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
    debts.filter(d => !d.isPaidThisMonth && getDaysDiff(d.nextPaymentDate) < 0).forEach(d => list.push({ id: d.id, title: 'Просрочка', text: `По "${d.name}" пропущена оплата!` }));
    debts.filter(d => !d.isPaidThisMonth && getDaysDiff(d.nextPaymentDate) >= 0 && getDaysDiff(d.nextPaymentDate) <= 3).forEach(d => list.push({ id: d.id, title: 'Скоро платеж', text: `"${d.name}" - осталось ${getDaysDiff(d.nextPaymentDate)} дн.` }));
    return list;
  }, [debts]);

  // Экшены
  const handleMarkPaid = (id) => {
    const next = debts.map(d => d.id === id ? { ...d, isPaidThisMonth: true, balance: Math.max(0, d.balance - (d.minPayment || 0)), _prev: d.balance } : d);
    setDebts(next); saveData(next, freeMoney, strategy);
  };
  const handleUndoPaid = (id) => {
    const next = debts.map(d => d.id === id ? { ...d, isPaidThisMonth: false, balance: d._prev !== undefined ? d._prev : d.balance + (d.minPayment || 0) } : d);
    setDebts(next); saveData(next, freeMoney, strategy);
  };
  const handleResetMonth = () => {
    if(window.confirm('Сбросить статусы оплат?')) {
      const next = debts.map(d => ({...d, isPaidThisMonth: false}));
      setDebts(next); saveData(next, freeMoney, strategy);
    }
  };
  const handleAdd = (e) => {
    e.preventDefault();
    const item = { ...newDebt, id: Date.now(), isPaidThisMonth: false, balance: Number(newDebt.balance), rate: Number(newDebt.rate), minPayment: Number(newDebt.minPayment), details: { summary: newDebt.detailsSummary || '' } };
    const next = [...debts, item];
    setDebts(next); saveData(next, freeMoney, strategy);
    setIsAddModalOpen(false);
    setNewDebt({ name: '', type: 'loan', balance: '', rate: '', minPayment: '', nextPaymentDate: '', detailsSummary: '' });
  };
  const handleDelete = (id) => { if(window.confirm('Удалить?')) { const next = debts.filter(d => d.id !== id); setDebts(next); saveData(next, freeMoney, strategy); } };

  // ЭКРАН ЗАГРУЗКИ
  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] font-sans text-emerald-700 flex-col">
      <div className="relative w-16 h-16 mb-4">
        <div className="absolute inset-0 border-4 border-emerald-100 rounded-full"></div>
        <div className="absolute inset-0 border-4 border-emerald-600 rounded-full border-t-transparent animate-spin"></div>
      </div>
      <p className="font-bold tracking-tight">Подключение...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 font-sans flex overflow-hidden">
      {isSidebarOpen && <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden" onClick={() => setIsSidebarOpen(false)} />}
      
      {/* Меню */}
      <aside className={`fixed lg:static inset-y-0 left-0 w-64 bg-white border-r z-50 transition-transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'} flex flex-col`}>
        <div className="p-6 flex items-center gap-3"><div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-200"><Wallet size={20}/></div><span className="font-bold text-xl tracking-tight">Свобода.</span></div>
        <nav className="flex-1 px-4 space-y-2 mt-4">
          <button onClick={() => {setActiveTab('dashboard'); setIsSidebarOpen(false);}} className={`w-full flex items-center gap-3 p-3.5 rounded-2xl font-bold transition-all ${activeTab === 'dashboard' ? 'bg-emerald-50 text-emerald-700' : 'text-slate-400 hover:bg-slate-50'}`}><LayoutDashboard size={20}/> Дашборд</button>
          <button onClick={() => {setActiveTab('calendar'); setIsSidebarOpen(false);}} className={`w-full flex items-center gap-3 p-3.5 rounded-2xl font-bold transition-all ${activeTab === 'calendar' ? 'bg-emerald-50 text-emerald-700' : 'text-slate-400 hover:bg-slate-50'}`}><Calendar size={20}/> Календарь</button>
          <button onClick={() => {setActiveTab('analytics'); setIsSidebarOpen(false);}} className={`w-full flex items-center gap-3 p-3.5 rounded-2xl font-bold transition-all ${activeTab === 'analytics' ? 'bg-emerald-50 text-emerald-700' : 'text-slate-400 hover:bg-slate-50'}`}><PieChart size={20}/> Аналитика</button>
        </nav>
        <div className="p-4"><button onClick={() => {setActiveTab('investing'); setIsSidebarOpen(false);}} className="w-full bg-slate-900 text-white p-5 rounded-[24px] text-sm font-bold flex flex-col items-center gap-2 shadow-xl hover:scale-[1.02] transition-transform"><Target size={24}/> Читать план</button></div>
      </aside>

      {/* Основная часть */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="bg-white/80 backdrop-blur-md p-4 lg:px-8 flex justify-between items-center border-b sticky top-0 z-30">
          <button className="lg:hidden p-2 -ml-2 text-slate-500" onClick={() => setIsSidebarOpen(true)}><Menu /></button>
          <div className="flex items-center gap-4 ml-auto">
            {/* ИНДИКАТОР ОБЛАКА */}
            {isLocalFallback ? (
              <div className="hidden sm:flex items-center gap-2 bg-orange-50 text-orange-600 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest"><WifiOff size={14}/> Офлайн режим</div>
            ) : (
              <div className="hidden sm:flex items-center gap-2 text-emerald-600 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest"><div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div> Облако активно</div>
            )}
            
            <div className="relative">
              <button onClick={() => setIsNotificationsOpen(!isNotificationsOpen)} className="p-2 text-slate-500 hover:bg-slate-100 rounded-full relative transition-colors">
                <Bell size={22} />
                {notifications.length > 0 && <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 border-2 border-white rounded-full"></span>}
              </button>
              {isNotificationsOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsNotificationsOpen(false)}></div>
                  <div className="absolute right-0 mt-2 w-72 bg-white rounded-[24px] shadow-2xl border p-2 z-50 overflow-hidden">
                    <div className="p-3 font-bold border-b border-slate-50 text-sm">Уведомления</div>
                    <div className="max-h-60 overflow-y-auto">
                      {notifications.length === 0 ? <div className="p-4 text-xs text-slate-400 text-center">Все спокойно</div> : notifications.map(n => <div key={n.id} className="p-3 border-b border-slate-50 last:border-0 text-xs"><div className="font-bold text-red-600 mb-0.5">{n.title}</div>{n.text}</div>)}
                    </div>
                  </div>
                </>
              )}
            </div>
            <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-400"><Wallet size={20}/></div>
          </div>
        </header>

        {isLocalFallback && (
          <div className="bg-orange-100 text-orange-800 text-xs p-3 text-center sm:hidden font-medium">Работает в локальном режиме. Настройте Firebase для облака.</div>
        )}

        <div className="flex-1 overflow-y-auto p-4 lg:p-8">
          <div className="max-w-5xl mx-auto">
            
            {/* ТАБ 1: ДАШБОРД */}
            {activeTab === 'dashboard' && (
              <>
                <div className="flex justify-between items-end mb-8">
                  <div><h1 className="text-3xl lg:text-4xl font-black tracking-tight text-slate-900">Дашборд</h1><p className="text-sm text-slate-500 mt-1">Осталось закрыть {debts.length} кредитов</p></div>
                  <button onClick={() => setIsAddModalOpen(true)} className="bg-emerald-600 text-white px-5 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-emerald-200 hover:scale-105 transition-transform"><PlusCircle size={20}/> <span className="hidden sm:inline">Добавить</span></button>
                </div>
                
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                  <div className="bg-emerald-600 p-6 rounded-[32px] text-white flex flex-col justify-between shadow-xl shadow-emerald-100">
                    <div className="text-[10px] opacity-70 font-bold uppercase tracking-widest mb-1">Общий долг</div>
                    <div className="text-2xl md:text-3xl font-black truncate">{formatMoney(totalDebt)}</div>
                  </div>
                  <div className="bg-white p-6 rounded-[32px] border border-slate-100 flex flex-col justify-between">
                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">К оплате в мес.</div>
                    <div className="text-2xl md:text-3xl font-black truncate text-slate-900">{formatMoney(totalMinPaymentRemaining)}</div>
                  </div>
                  <div className="bg-white p-6 rounded-[32px] border border-slate-100 flex flex-col justify-between">
                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Просрочено</div>
                    <div className={`text-2xl md:text-3xl font-black truncate ${totalOverdue > 0 ? 'text-red-500' : 'text-slate-900'}`}>{formatMoney(totalOverdue)}</div>
                  </div>
                  <div className="bg-white p-6 rounded-[32px] border border-slate-100 flex flex-col justify-between focus-within:ring-2 ring-emerald-500 transition-all">
                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Свободные деньги</div>
                    <div className="relative">
                      <input type="number" value={freeMoney} onChange={e => setFreeMoney(e.target.value)} onBlur={() => saveToCloud(debts, freeMoney, strategy)} className="text-2xl md:text-3xl font-black text-emerald-600 bg-transparent border-b border-emerald-100 outline-none w-full pb-1"/>
                      <span className="absolute right-0 bottom-2 text-emerald-600/30 font-black">₽</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-2 space-y-4">
                    <div className="flex justify-between items-center mb-6">
                      <h3 className="font-bold text-xl text-slate-900">Список платежей</h3>
                      <button onClick={handleResetMonth} className="text-[10px] font-bold text-slate-400 border border-slate-200 px-3 py-1.5 rounded-xl flex items-center gap-1 hover:bg-slate-50 transition-colors uppercase tracking-widest"><RotateCcw size={14}/> Сброс месяца</button>
                    </div>
                    {sortedDebts.map(d => {
                      const days = getDaysDiff(d.nextPaymentDate);
                      const monthlyInterest = d.rate > 0 ? (Number(d.balance) * (Number(d.rate) / 100)) / 12 : 0;
                      const principalPayment = Math.max(0, Number(d.minPayment) - monthlyInterest);
                      
                      return (
                        <div key={d.id} className={`bg-white p-5 md:p-6 rounded-[32px] border transition-all ${d.isPaidThisMonth ? 'opacity-40 grayscale' : days < 0 ? 'border-red-100 bg-red-50/10' : 'border-slate-100 hover:shadow-xl hover:shadow-slate-200/50'}`}>
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer" onClick={() => setExpandedId(expandedId === d.id ? null : d.id)}>
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 shrink-0"><Wallet size={24}/></div>
                              <div>
                                <h4 className="font-bold text-lg text-slate-900 flex items-center gap-2">{d.name} {expandedId === d.id ? <ChevronUp size={16} className="text-slate-400"/> : <ChevronDown size={16} className="text-slate-400"/>}</h4>
                                <p className="text-xs text-slate-500 font-medium mt-0.5">{d.rate}% год. • Остаток: {formatMoney(d.balance)}</p>
                              </div>
                            </div>
                            <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto">
                              <div className="text-left sm:text-right">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Платеж</p>
                                <p className="text-xl font-black text-slate-900">{formatMoney(d.minPayment)}</p>
                              </div>
                              <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                                {d.isPaidThisMonth ? (
                                  <button onClick={() => handleUndoPaid(d.id)} className="w-12 h-12 flex items-center justify-center text-slate-400 hover:text-orange-500 bg-slate-50 hover:bg-orange-50 rounded-2xl transition-colors"><RotateCcw size={20}/></button>
                                ) : (
                                  <button onClick={() => handleMarkPaid(d.id)} className="bg-slate-900 text-white px-5 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 hover:bg-emerald-600 transition-colors shadow-lg"><CheckCircle2 size={18}/> <span className="hidden sm:inline">ОПЛАТИТЬ</span></button>
                                )}
                              </div>
                            </div>
                          </div>

                          {expandedId === d.id && (
                            <div className="mt-6 pt-6 border-t border-slate-100 cursor-default" onClick={e => e.stopPropagation()}>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                                <div className="bg-slate-50 p-4 rounded-2xl">
                                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Проценты</span>
                                  <span className="font-bold text-red-500">{formatMoney(monthlyInterest)}</span>
                                </div>
                                <div className="bg-slate-50 p-4 rounded-2xl">
                                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Тело долга</span>
                                  <span className="font-bold text-emerald-600">{formatMoney(principalPayment)}</span>
                                </div>
                                <div className="col-span-2 md:col-span-2">
                                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 flex justify-between"><span>Статус</span><span>{days < 0 ? 'Просрочка' : 'До платежа'}</span></span>
                                  <span className={`font-bold ${days < 0 ? 'text-red-500' : 'text-slate-900'}`}>{Math.abs(days)} дней</span>
                                </div>
                              </div>
                              {d.details?.summary && (
                                <div className="bg-amber-50 text-amber-900 p-4 rounded-2xl text-sm font-medium border border-amber-100">
                                  <div className="flex items-center gap-2 mb-1 text-amber-700 font-bold"><AlertCircle size={16}/> Условия банка:</div>
                                  {d.details.summary}
                                </div>
                              )}
                              <div className="mt-4 flex justify-end">
                                <button onClick={() => handleDelete(d.id)} className="text-xs font-bold text-red-500 bg-red-50 px-4 py-2 rounded-xl hover:bg-red-100 transition-colors flex items-center gap-2"><X size={14}/> Удалить этот долг</button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  
                  <div className="space-y-6">
                    <div className="bg-white p-6 md:p-8 rounded-[32px] border border-slate-100 shadow-sm">
                      <h3 className="font-bold mb-6 flex items-center gap-2 text-slate-900 text-lg"><TrendingDown className="text-emerald-600" size={20}/> Стратегия</h3>
                      <div className="flex bg-slate-50 p-1.5 rounded-2xl mb-6">
                        <button onClick={() => {setStrategy('avalanche'); saveToCloud(debts, freeMoney, 'avalanche')}} className={`flex-1 py-2.5 rounded-xl text-[10px] font-black transition-all ${strategy === 'avalanche' ? 'bg-white shadow-sm text-emerald-700' : 'text-slate-400'}`}>ЛАВИНА</button>
                        <button onClick={() => {setStrategy('snowball'); saveToCloud(debts, freeMoney, 'snowball')}} className={`flex-1 py-2.5 rounded-xl text-[10px] font-black transition-all ${strategy === 'snowball' ? 'bg-white shadow-sm text-emerald-700' : 'text-slate-400'}`}>СНЕЖНЫЙ КОМ</button>
                      </div>
                      <div className="space-y-2 min-h-[100px]">
                        {Object.entries(strategyAllocation).some(([_,a])=>a>0) ? Object.entries(strategyAllocation).map(([id, amt]) => (amt > 0 && (
                          <div key={id} className="flex justify-between items-center p-3 md:p-4 bg-slate-50 rounded-2xl">
                            <span className="text-xs font-bold text-slate-700 truncate mr-2">{debts.find(d=>d.id == id)?.name}</span>
                            <span className="font-black text-sm text-emerald-600">+{formatMoney(amt)}</span>
                          </div>
                        ))) : <p className="text-center text-xs text-slate-400 py-4 font-medium">Введите свободные деньги для расчета</p>}
                      </div>
                    </div>
                    
                    <div className="bg-slate-900 p-8 rounded-[32px] text-white relative overflow-hidden shadow-2xl shadow-slate-300">
                      <h3 className="font-bold mb-1 text-[10px] text-center uppercase tracking-widest text-slate-400">Прогресс месяца</h3>
                      <div className="text-xs text-emerald-400 text-center mb-6 font-bold">{formatMoney(paidThisMonthAmount)} / {formatMoney(totalMinPaymentAll)}</div>
                      <div className="flex justify-center relative">
                        <svg className="w-32 h-32 transform -rotate-90">
                          <circle cx="64" cy="64" r="56" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-slate-800" />
                          <circle cx="64" cy="64" r="56" stroke="currentColor" strokeWidth="12" fill="transparent" strokeDasharray="351.8" strokeDashoffset={351.8 - (progressPercent/100)*351.8} strokeLinecap="round" className="text-emerald-500 transition-all duration-1000" />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center font-black text-3xl">{progressPercent}%</div>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* ТАБ 2: КАЛЕНДАРЬ */}
            {activeTab === 'calendar' && (
              <div className="bg-white p-8 md:p-10 rounded-[40px] border border-slate-100 shadow-sm max-w-2xl mx-auto">
                <h2 className="text-3xl font-black mb-10 flex items-center gap-4 text-slate-900"><Calendar className="text-emerald-600" size={32}/> Календарь</h2>
                <div className="space-y-8 border-l-2 border-slate-100 ml-4 pl-8 relative pb-4">
                  {sortedDebts.map(d => (
                    <div key={d.id} className="relative">
                      <div className={`absolute -left-[41px] top-1.5 w-4 h-4 rounded-full border-4 border-white shadow-sm ${d.isPaidThisMonth ? 'bg-emerald-500' : 'bg-slate-200'}`}></div>
                      <div className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-1">{new Date(d.nextPaymentDate).toLocaleDateString('ru-RU', {day:'numeric', month:'long'})}</div>
                      <div className="font-bold text-lg text-slate-900">{d.name}</div>
                      <div className="text-sm font-bold text-slate-400 mt-1">{formatMoney(d.minPayment)}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ТАБ 3: АНАЛИТИКА */}
            {activeTab === 'analytics' && (
              <div className="space-y-6 max-w-4xl mx-auto">
                <h2 className="text-3xl font-black text-slate-900 mb-8">Аналитика портфеля</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm">
                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-2">Переплата банку</div>
                    <div className="text-5xl font-black text-red-500 mb-4">{formatMoney(debts.reduce((s,d)=>s+(d.rate>0?(d.balance*d.rate/100/12):0),0))}</div>
                    <div className="text-sm text-slate-500 font-medium leading-relaxed">Это примерная сумма, которая ежемесячно сгорает на выплату процентов по всем вашим кредитам.</div>
                  </div>
                  <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm flex flex-col justify-center">
                    <h4 className="font-black text-slate-900 mb-6 text-xl">Структура долга</h4>
                    <div className="space-y-5">
                      {debts.sort((a,b)=>b.balance-a.balance).map(d=>(
                        <div key={d.id}>
                          <div className="flex justify-between text-xs font-bold mb-2"><span className="text-slate-700">{d.name}</span><span className="text-slate-900">{Math.round(d.balance/totalDebt*100)}%</span></div>
                          <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden"><div className="bg-emerald-600 h-full rounded-full transition-all duration-1000" style={{width:`${d.balance/totalDebt*100}%`}}></div></div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ТАБ 4: ИНВЕСТИЦИИ */}
            {activeTab === 'investing' && (
              <div className="max-w-3xl mx-auto text-center py-10 md:py-20">
                <div className="w-24 h-24 bg-emerald-50 text-emerald-600 rounded-[32px] flex items-center justify-center mx-auto mb-8 shadow-inner"><Target size={48}/></div>
                <h2 className="text-4xl md:text-5xl font-black mb-6 text-slate-900 tracking-tight">Жизнь после долгов</h2>
                <p className="text-slate-500 mb-12 leading-relaxed text-lg max-w-2xl mx-auto">Как только кредиты исчезнут, сумма <span className="font-bold text-emerald-600">{formatMoney(totalMinPaymentAll + Number(freeMoney))}</span> станет вашей ежемесячной инвестицией. Не меняйте привычек, просто платите себе.</p>
                
                <div className="bg-white p-10 md:p-16 rounded-[48px] border border-slate-100 shadow-2xl shadow-slate-200/50">
                  <div className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-6">Ваш капитал через 10 лет</div>
                  <div className="text-5xl md:text-7xl font-black text-slate-900 tracking-tighter mb-6">{formatMoney((totalMinPaymentAll + Number(freeMoney)) * 120 * 1.6)}</div>
                  <div className="inline-block bg-emerald-50 text-emerald-700 px-4 py-2 rounded-xl text-xs font-bold">* Расчет при средней рыночной доходности 12% годовых</div>
                </div>
              </div>
            )}

          </div>
        </div>
      </main>

      {/* МОДАЛЬНОЕ ОКНО ДОБАВЛЕНИЯ */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
          <form onSubmit={handleAdd} className="bg-white rounded-[40px] p-8 md:p-10 w-full max-w-md shadow-2xl space-y-5 my-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-2xl font-black tracking-tight text-slate-900">Новый долг</h3>
              <button type="button" onClick={() => setIsAddModalOpen(false)} className="w-10 h-10 flex items-center justify-center bg-slate-50 text-slate-400 rounded-full hover:bg-slate-100 transition-colors"><X/></button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 ml-4 mb-1 block tracking-widest">Название банка</label>
                <input required placeholder="Например: Кредитка Альфа" className="w-full bg-slate-50 p-4 rounded-2xl outline-none font-bold text-slate-900 focus:ring-4 ring-emerald-600/10 transition-all border border-transparent focus:border-emerald-200" value={newDebt.name} onChange={e => setNewDebt({...newDebt, name: e.target.value})}/>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 ml-4 mb-1 block tracking-widest">Остаток ₽</label>
                  <input required type="number" className="w-full bg-slate-50 p-4 rounded-2xl outline-none font-bold text-slate-900 focus:ring-4 ring-emerald-600/10 transition-all border border-transparent focus:border-emerald-200" value={newDebt.balance} onChange={e => setNewDebt({...newDebt, balance: e.target.value})}/>
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 ml-4 mb-1 block tracking-widest">Ставка %</label>
                  <input required type="number" step="0.1" className="w-full bg-slate-50 p-4 rounded-2xl outline-none font-bold text-slate-900 focus:ring-4 ring-emerald-600/10 transition-all border border-transparent focus:border-emerald-200" value={newDebt.rate} onChange={e => setNewDebt({...newDebt, rate: e.target.value})}/>
                </div>
              </div>
              
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 ml-4 mb-1 block tracking-widest">Ежемесячный платёж ₽</label>
                <input required type="number" className="w-full bg-slate-50 p-4 rounded-2xl outline-none font-bold text-slate-900 focus:ring-4 ring-emerald-600/10 transition-all border border-transparent focus:border-emerald-200" value={newDebt.minPayment} onChange={e => setNewDebt({...newDebt, minPayment: e.target.value})}/>
              </div>
              
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 ml-4 mb-1 block tracking-widest">Ближайшая дата</label>
                <input required type="date" className="w-full bg-slate-50 p-4 rounded-2xl outline-none font-bold text-slate-500 focus:ring-4 ring-emerald-600/10 transition-all border border-transparent focus:border-emerald-200" value={newDebt.nextPaymentDate} onChange={e => setNewDebt({...newDebt, nextPaymentDate: e.target.value})}/>
              </div>
            </div>
            
            <button type="submit" className="w-full bg-slate-900 text-white p-5 rounded-2xl font-black shadow-xl shadow-slate-200 hover:bg-emerald-600 transition-all uppercase tracking-widest mt-4">Добавить в дашборд</button>
          </form>
        </div>
      )}
    </div>
  );
}

const root = createRoot(document.getElementById('root'));
root.render(<ErrorBoundary><App /></ErrorBoundary>);
