import React, { useState, useEffect, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { 
  PlusCircle, Wallet, AlertCircle, Calendar, TrendingDown, TrendingUp, 
  ArrowRight, CheckCircle2, X, Menu, Bell, LayoutDashboard, Settings, 
  PieChart, ArrowUpRight, Search, Mail, HelpCircle, LogOut, 
  ChevronDown, ChevronUp, FileText, RotateCcw, Clock, Target, Loader2 
} from 'lucide-react';

// --- ИНИЦИАЛИЗАЦИЯ FIREBASE ---
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, onSnapshot, getDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAYNPCG4DHFTAwWkARHGyYmiU0GTklQ6_Q",
  authDomain: "dashboard-27927.firebaseapp.com",
  projectId: "dashboard-27927",
  storageBucket: "dashboard-27927.firebasestorage.app",
  messagingSenderId: "428248986605",
  appId: "1:428248986605:web:95b3ccf9ffa65d0e68ade4"
};

// Безопасная проверка инициализации
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);
const db = getFirestore(app);
const DB_DOC_PATH = "artifacts/dashboard-27927/public/data/appState/main";

// --- КОМПОНЕНТ ПРЕДОХРАНИТЕЛЬ ---
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-10 text-center font-sans">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Что-то пошло не так</h1>
          <p className="text-gray-600 mb-6">{this.state.error?.toString()}</p>
          <button onClick={() => { localStorage.clear(); window.location.reload(); }} className="bg-emerald-600 text-white px-6 py-2 rounded-xl">Сбросить кэш и перезагрузить</button>
        </div>
      );
    }
    return this.props.children;
  }
}

const initialDebts = [
  { id: 1, name: 'Сбер (Кредитка)', balance: 85000, rate: 25.9, minPayment: 3500, nextPaymentDate: new Date().toISOString().split('T')[0], isPaidThisMonth: false, details: { summary: 'Грейс 120 дней.' } },
  { id: 2, name: 'ВТБ (Кредитка)', balance: 120000, rate: 29.9, minPayment: 5000, nextPaymentDate: new Date().toISOString().split('T')[0], isPaidThisMonth: false, details: { summary: 'Мин. платеж 3%.' } }
];

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [debts, setDebts] = useState([]);
  const [freeMoney, setFreeMoney] = useState(15000);
  const [strategy, setStrategy] = useState('avalanche');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newDebt, setNewDebt] = useState({ name: '', type: 'loan', balance: '', rate: '', minPayment: '', nextPaymentDate: '', detailsSummary: '' });

  // 1. Авторизация
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        await signInAnonymously(auth);
      } else {
        setUser(u);
      }
    });
    return () => unsub();
  }, []);

  // 2. Загрузка данных
  useEffect(() => {
    if (!user) return;
    const docRef = doc(db, "artifacts", "dashboard-27927", "public", "data", "appState", "main");
    
    const unsubscribe = onSnapshot(docRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setDebts(data.debts || []);
        setFreeMoney(data.freeMoney || 0);
        setStrategy(data.strategy || 'avalanche');
      } else {
        setDoc(docRef, { debts: initialDebts, freeMoney: 15000, strategy: 'avalanche' });
      }
      setIsLoading(false);
    }, (err) => {
      console.error("Firestore Error:", err);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [user]);

  const saveToCloud = (d, f, s) => {
    if (!user) return;
    const docRef = doc(db, "artifacts", "dashboard-27927", "public", "data", "appState", "main");
    setDoc(docRef, { debts: d, freeMoney: Number(f), strategy: s }, { merge: true }).catch(console.error);
  };

  // Хелперы
  const formatMoney = (v) => new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(v || 0);
  const getDaysDiff = (dateStr) => {
    if (!dateStr) return 0;
    const diff = new Date(dateStr) - new Date().setHours(0,0,0,0);
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  // Расчеты
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

  // Обработчики
  const handleMarkPaid = (id) => {
    const next = debts.map(d => d.id === id ? { ...d, isPaidThisMonth: true, balance: Math.max(0, d.balance - (d.minPayment || 0)), _prev: d.balance } : d);
    setDebts(next); saveToCloud(next, freeMoney, strategy);
  };
  const handleUndoPaid = (id) => {
    const next = debts.map(d => d.id === id ? { ...d, isPaidThisMonth: false, balance: d._prev !== undefined ? d._prev : d.balance + (d.minPayment || 0) } : d);
    setDebts(next); saveToCloud(next, freeMoney, strategy);
  };
  const handleAdd = (e) => {
    e.preventDefault();
    const item = { ...newDebt, id: Date.now(), isPaidThisMonth: false, balance: Number(newDebt.balance), rate: Number(newDebt.rate), minPayment: Number(newDebt.minPayment), details: { summary: newDebt.detailsSummary || '' } };
    const next = [...debts, item];
    setDebts(next); saveToCloud(next, freeMoney, strategy);
    setIsAddModalOpen(false);
    setNewDebt({ name: '', type: 'loan', balance: '', rate: '', minPayment: '', nextPaymentDate: '', detailsSummary: '' });
  };
  const handleDelete = (id) => { if(window.confirm('Удалить?')) { const next = debts.filter(d => d.id !== id); setDebts(next); saveToCloud(next, freeMoney, strategy); } };

  if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-[#F4F6F8] font-sans text-emerald-700 flex-col"><Loader2 className="animate-spin mb-4" size={40} /><p className="font-bold">Подключение к облаку...</p></div>;

  return (
    <div className="min-h-screen bg-[#F4F6F8] text-gray-800 font-sans flex overflow-hidden">
      {isSidebarOpen && <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden" onClick={() => setIsSidebarOpen(false)} />}
      
      {/* Меню */}
      <aside className={`fixed lg:static inset-y-0 left-0 w-64 bg-white border-r z-50 transition-transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'} flex flex-col`}>
        <div className="p-6 flex items-center gap-3"><div className="w-8 h-8 bg-emerald-700 rounded-lg flex items-center justify-center text-white"><Wallet size={18}/></div><span className="font-bold text-xl">Свобода.</span></div>
        <nav className="flex-1 px-4 space-y-1">
          <button onClick={() => {setActiveTab('dashboard'); setIsSidebarOpen(false);}} className={`w-full flex items-center gap-3 p-3 rounded-xl font-medium transition-colors ${activeTab === 'dashboard' ? 'bg-emerald-50 text-emerald-700' : 'text-gray-500 hover:bg-gray-50'}`}><LayoutDashboard size={20}/> Дашборд</button>
          <button onClick={() => {setActiveTab('calendar'); setIsSidebarOpen(false);}} className={`w-full flex items-center gap-3 p-3 rounded-xl font-medium transition-colors ${activeTab === 'calendar' ? 'bg-emerald-50 text-emerald-700' : 'text-gray-500 hover:bg-gray-50'}`}><Calendar size={20}/> Календарь</button>
          <button onClick={() => {setActiveTab('analytics'); setIsSidebarOpen(false);}} className={`w-full flex items-center gap-3 p-3 rounded-xl font-medium transition-colors ${activeTab === 'analytics' ? 'bg-emerald-50 text-emerald-700' : 'text-gray-500 hover:bg-gray-50'}`}><PieChart size={20}/> Аналитика</button>
        </nav>
        <div className="p-4"><button onClick={() => {setActiveTab('investing'); setIsSidebarOpen(false);}} className="w-full bg-emerald-700 text-white p-4 rounded-2xl text-sm font-bold flex flex-col items-center gap-2 shadow-lg shadow-emerald-700/20 hover:bg-emerald-800 transition-all"><Target size={24}/> Читать план</button></div>
      </aside>

      {/* Основная часть */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="bg-white/80 backdrop-blur-md p-4 lg:px-8 flex justify-between items-center border-b sticky top-0 z-30">
          <button className="lg:hidden p-2 -ml-2" onClick={() => setIsSidebarOpen(true)}><Menu /></button>
          <div className="flex items-center gap-4 ml-auto">
            <div className="relative">
              <button onClick={() => setIsNotificationsOpen(!isNotificationsOpen)} className="p-2 text-gray-500 hover:bg-gray-100 rounded-full relative transition-colors">
                <Bell size={22} />
                {notifications.length > 0 && <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 border-2 border-white rounded-full"></span>}
              </button>
              {isNotificationsOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsNotificationsOpen(false)}></div>
                  <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-2xl border p-2 z-50 overflow-hidden">
                    <div className="p-3 font-bold border-b text-sm bg-gray-50">Уведомления</div>
                    <div className="max-h-60 overflow-y-auto">
                      {notifications.length === 0 ? <div className="p-4 text-xs text-gray-400 text-center">Все спокойно</div> : notifications.map(n => <div key={n.id} className="p-3 border-b last:border-0 text-xs hover:bg-gray-50"><div className="font-bold text-red-600 mb-0.5">{n.title}</div>{n.text}</div>)}
                    </div>
                  </div>
                </>
              )}
            </div>
            <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-400"><Wallet size={20}/></div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 lg:p-8">
          <div className="max-w-5xl mx-auto">
            
            {/* ТАБ 1: ДАШБОРД */}
            {activeTab === 'dashboard' && (
              <>
                <div className="flex justify-between items-end mb-8">
                  <div><h1 className="text-3xl font-bold tracking-tight">Дашборд</h1><p className="text-sm text-gray-500 mt-1">Контроль долгов в реальном времени</p></div>
                  <button onClick={() => setIsAddModalOpen(true)} className="bg-emerald-700 text-white px-5 py-2.5 rounded-full font-bold flex items-center gap-2 shadow-lg shadow-emerald-700/20 hover:scale-105 transition-transform"><PlusCircle size={20}/> Добавить</button>
                </div>
                
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                  <div className="bg-emerald-700 p-5 rounded-3xl text-white flex flex-col justify-between h-32 md:h-40">
                    <div><div className="text-xs opacity-70 font-medium uppercase tracking-wider">Общий долг</div><div className="text-2xl md:text-3xl font-bold truncate mt-1">{formatMoney(totalDebt)}</div></div>
                    <div className="text-[10px] bg-white/20 w-fit px-2 py-1 rounded-lg">Кредитов: {debts.length}</div>
                  </div>
                  <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between h-32 md:h-40">
                    <div><div className="text-xs text-gray-500 font-medium uppercase tracking-wider">К оплате (остаток)</div><div className="text-2xl md:text-3xl font-bold truncate mt-1">{formatMoney(totalMinPaymentRemaining)}</div></div>
                    <div className="text-[10px] text-gray-400">из {formatMoney(totalMinPaymentAll)} в мес.</div>
                  </div>
                  <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between h-32 md:h-40">
                    <div><div className="text-xs text-gray-500 font-medium uppercase tracking-wider">Просрочено</div><div className={`text-2xl md:text-3xl font-bold truncate mt-1 ${totalOverdue > 0 ? 'text-red-500' : ''}`}>{formatMoney(totalOverdue)}</div></div>
                    <div className={`text-[10px] px-2 py-1 rounded-lg w-fit ${totalOverdue > 0 ? 'bg-red-50 text-red-600' : 'text-gray-400'}`}>{totalOverdue > 0 ? 'Требует внимания' : 'График соблюден'}</div>
                  </div>
                  <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between h-32 md:h-40">
                    <div className="text-xs text-gray-500 font-medium uppercase tracking-wider">Свободные деньги</div>
                    <div className="relative">
                      <input type="number" value={freeMoney} onChange={e => setFreeMoney(e.target.value)} onBlur={() => saveToCloud(debts, freeMoney, strategy)} className="text-2xl md:text-3xl font-bold text-emerald-700 bg-transparent border-b-2 border-emerald-50 outline-none w-full pb-1 focus:border-emerald-700 transition-colors"/>
                      <span className="absolute right-0 bottom-2 text-emerald-700/30 font-bold">₽</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2 space-y-4">
                    <div className="flex justify-between items-center px-2">
                      <h3 className="font-bold text-lg">График платежей</h3>
                      <button onClick={() => {if(window.confirm('Сбросить все отметки об оплате?')) { const n = debts.map(d=>({...d, isPaidThisMonth: false})); setDebts(n); saveToCloud(n, freeMoney, strategy);}}} className="text-[10px] font-bold text-gray-400 border border-gray-200 px-3 py-1 rounded-full flex items-center gap-1.5 hover:bg-white transition-colors uppercase tracking-widest"><RotateCcw size={12}/> Сброс месяца</button>
                    </div>
                    {sortedDebts.map(d => {
                      const days = getDaysDiff(d.nextPaymentDate);
                      return (
                        <div key={d.id} className={`bg-white p-4 md:p-6 rounded-3xl border transition-all ${d.isPaidThisMonth ? 'opacity-50' : days < 0 ? 'border-red-100 bg-red-50/10' : 'border-gray-100 hover:shadow-lg hover:shadow-emerald-900/5'}`}>
                          <div className="flex justify-between items-center mb-4">
                            <div className="flex items-center gap-3">
                              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${d.isPaidThisMonth ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-50 text-gray-400'}`}><Wallet size={24}/></div>
                              <div><div className="font-bold text-base text-gray-900">{d.name}</div><div className="text-xs text-gray-400 font-medium mt-0.5">{d.rate}% годовых • Остаток: {formatMoney(d.balance)}</div></div>
                            </div>
                            <div className={`text-[10px] font-bold px-3 py-1.5 rounded-full uppercase tracking-wider ${d.isPaidThisMonth ? 'bg-emerald-100 text-emerald-700' : days < 0 ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500'}`}>{d.isPaidThisMonth ? 'Оплачено' : days < 0 ? `Просрочка ${Math.abs(days)} дн.` : days === 0 ? 'Сегодня' : `Через ${days} дн.`}</div>
                          </div>
                          <div className="flex justify-between items-center pt-4 border-t border-gray-50">
                            <div><div className="text-[10px] text-gray-400 uppercase font-bold tracking-widest mb-1">Мин. Платёж</div><div className="font-bold text-lg text-gray-900">{formatMoney(d.minPayment)}</div></div>
                            <div className="flex gap-2">
                              {d.isPaidThisMonth ? (
                                <button onClick={() => handleUndoPaid(d.id)} className="p-3 text-gray-400 hover:text-orange-500 hover:bg-orange-50 rounded-2xl transition-colors"><RotateCcw size={20}/></button>
                              ) : (
                                <button onClick={() => handleMarkPaid(d.id)} className="bg-emerald-700 text-white px-6 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 hover:bg-emerald-800 transition-colors shadow-md shadow-emerald-700/10"><CheckCircle2 size={16}/> ОПЛАТИЛ</button>
                              )}
                              <button onClick={() => handleDelete(d.id)} className="p-3 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-colors"><X size={20}/></button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="space-y-6">
                    <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                      <h3 className="font-bold mb-4 flex items-center gap-2 text-gray-900"><TrendingDown size={18} className="text-emerald-700"/> Стратегия</h3>
                      <div className="flex bg-gray-50 p-1 rounded-2xl mb-5">
                        <button onClick={() => {setStrategy('avalanche'); saveToCloud(debts, freeMoney, 'avalanche')}} className={`flex-1 py-2 text-[10px] font-bold rounded-xl transition-all ${strategy === 'avalanche' ? 'bg-white shadow-sm text-emerald-700' : 'text-gray-400'}`}>ЛАВИНА</button>
                        <button onClick={() => {setStrategy('snowball'); saveToCloud(debts, freeMoney, 'snowball')}} className={`flex-1 py-2 text-[10px] font-bold rounded-xl transition-all ${strategy === 'snowball' ? 'bg-white shadow-sm text-emerald-700' : 'text-gray-400'}`}>СНЕЖНЫЙ КОМ</button>
                      </div>
                      <div className="space-y-3 min-h-[100px]">
                        {Object.entries(strategyAllocation).some(([_,a])=>a>0) ? Object.entries(strategyAllocation).map(([id, amt]) => (amt > 0 && (
                          <div key={id} className="flex justify-between items-center p-3 bg-gray-50 rounded-2xl border border-gray-100">
                            <span className="text-xs font-bold text-gray-700 truncate mr-2">{debts.find(d=>d.id == id)?.name}</span>
                            <span className="font-bold text-sm text-emerald-700">+{formatMoney(amt)}</span>
                          </div>
                        ))) : <p className="text-center text-xs text-gray-400 py-4">Добавьте свободные деньги</p>}
                      </div>
                    </div>
                    <div className="bg-emerald-900 p-8 rounded-[32px] text-white relative overflow-hidden shadow-xl shadow-emerald-900/20">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-700 rounded-full blur-3xl opacity-50 -mr-10 -mt-10"></div>
                      <h3 className="font-bold mb-1 text-sm text-center uppercase tracking-widest opacity-80">Прогресс месяца</h3>
                      <div className="text-[10px] text-emerald-300 text-center mb-6 font-bold">{formatMoney(paidThisMonthAmount)} / {formatMoney(totalMinPaymentAll)}</div>
                      <div className="flex justify-center relative">
                        <svg className="w-28 h-28 transform -rotate-90">
                          <circle cx="56" cy="56" r="48" stroke="currentColor" strokeWidth="10" fill="transparent" className="text-white/10" />
                          <circle cx="56" cy="56" r="48" stroke="currentColor" strokeWidth="10" fill="transparent" strokeDasharray="301.5" strokeDashoffset={301.5 - (progressPercent/100)*301.5} strokeLinecap="round" className="text-emerald-400 transition-all duration-1000" />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center font-bold text-2xl tracking-tighter">{progressPercent}%</div>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* ТАБ 2: КАЛЕНДАРЬ */}
            {activeTab === 'calendar' && (
              <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm max-w-2xl mx-auto">
                <h2 className="text-2xl font-bold mb-8 flex items-center gap-3 text-gray-900"><Calendar className="text-emerald-700"/> Календарь платежей</h2>
                <div className="space-y-8 border-l-2 border-emerald-50 ml-4 pl-8 relative pb-4">
                  {sortedDebts.map(d => (
                    <div key={d.id} className="relative">
                      <div className={`absolute -left-[41px] top-1.5 w-4 h-4 rounded-full border-4 border-white shadow-sm ${d.isPaidThisMonth ? 'bg-emerald-500' : 'bg-gray-200'}`}></div>
                      <div className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest mb-1">{new Date(d.nextPaymentDate).toLocaleDateString('ru-RU', {day:'numeric', month:'long'})}</div>
                      <div className="font-bold text-gray-900">{d.name}</div>
                      <div className="text-sm text-gray-500 mt-1">{formatMoney(d.minPayment)}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ТАБ 3: АНАЛИТИКА */}
            {activeTab === 'analytics' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900">Аналитика портфеля</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm">
                    <div className="text-xs text-gray-400 font-bold uppercase tracking-widest mb-2">Переплата по %</div>
                    <div className="text-4xl font-bold text-red-500">{formatMoney(debts.reduce((s,d)=>s+(d.rate>0?(d.balance*d.rate/100/12):0),0))}</div>
                    <div className="text-xs text-gray-400 mt-2">Эту сумму вы отдаете банкам просто за "воздух" ежемесячно.</div>
                  </div>
                  <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm flex flex-col justify-center">
                    <h4 className="font-bold text-gray-900 mb-6">Структура долга</h4>
                    <div className="space-y-4">
                      {debts.sort((a,b)=>b.balance-a.balance).map(d=>(
                        <div key={d.id}>
                          <div className="flex justify-between text-xs font-bold mb-1.5"><span className="text-gray-700">{d.name}</span><span className="text-gray-900">{Math.round(d.balance/totalDebt*100)}%</span></div>
                          <div className="w-full bg-gray-50 h-2 rounded-full overflow-hidden"><div className="bg-emerald-700 h-full rounded-full transition-all duration-1000" style={{width:`${d.balance/totalDebt*100}%`}}></div></div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ТАБ 4: ИНВЕСТИЦИИ */}
            {activeTab === 'investing' && (
              <div className="max-w-2xl mx-auto text-center py-10">
                <div className="w-20 h-20 bg-emerald-50 text-emerald-700 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-inner"><Target size={40}/></div>
                <h2 className="text-3xl font-bold mb-4 text-gray-900 tracking-tight">Жизнь после долгов</h2>
                <p className="text-gray-500 mb-10 leading-relaxed">Когда вы закроете последний кредит, сумма <span className="font-bold text-emerald-700">{formatMoney(totalMinPaymentAll + Number(freeMoney))}</span> превратится в ваш ежемесячный доход от инвестиций. Это путь к настоящему капиталу.</p>
                <div className="bg-white p-10 rounded-[40px] border border-emerald-50 shadow-xl shadow-emerald-900/5">
                  <div className="text-xs text-emerald-700 font-bold uppercase tracking-widest mb-4">Ваш капитал через 10 лет</div>
                  <div className="text-5xl font-bold text-emerald-900 tracking-tighter mb-4">{formatMoney((totalMinPaymentAll + Number(freeMoney)) * 120 * 1.6)}</div>
                  <div className="text-xs text-gray-400 font-medium">*Расчет при средней доходности рынка 12% годовых</div>
                </div>
              </div>
            )}

          </div>
        </div>
      </main>

      {/* МОДАЛЬНОЕ ОКНО */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-md z-[100] flex items-center justify-center p-4 overflow-y-auto">
          <form onSubmit={handleAdd} className="bg-white rounded-[40px] p-8 md:p-10 w-full max-w-md shadow-2xl space-y-5 my-auto">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-2xl font-bold text-gray-900">Новый долг</h3>
              <button type="button" onClick={() => setIsAddModalOpen(false)} className="w-10 h-10 flex items-center justify-center bg-gray-50 text-gray-400 rounded-full hover:bg-gray-100 transition-colors"><X/></button>
            </div>
            <div className="space-y-4 font-medium">
              <div><label className="text-[10px] uppercase font-bold text-gray-400 ml-4 mb-1 block tracking-widest">Название банка</label>
              <input required placeholder="Например: Альфа Кредитка" className="w-full bg-gray-50 p-4 rounded-2xl outline-none focus:ring-4 ring-emerald-700/5 transition-all" value={newDebt.name} onChange={e => setNewDebt({...newDebt, name: e.target.value})}/></div>
              
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-[10px] uppercase font-bold text-gray-400 ml-4 mb-1 block tracking-widest">Остаток ₽</label>
                <input required type="number" className="w-full bg-gray-50 p-4 rounded-2xl outline-none focus:ring-4 ring-emerald-700/5" value={newDebt.balance} onChange={e => setNewDebt({...newDebt, balance: e.target.value})}/></div>
                <div><label className="text-[10px] uppercase font-bold text-gray-400 ml-4 mb-1 block tracking-widest">Ставка %</label>
                <input required type="number" step="0.1" className="w-full bg-gray-50 p-4 rounded-2xl outline-none focus:ring-4 ring-emerald-700/5" value={newDebt.rate} onChange={e => setNewDebt({...newDebt, rate: e.target.value})}/></div>
              </div>
              
              <div><label className="text-[10px] uppercase font-bold text-gray-400 ml-4 mb-1 block tracking-widest">Ежемесячный платёж ₽</label>
              <input required type="number" className="w-full bg-gray-50 p-4 rounded-2xl outline-none focus:ring-4 ring-emerald-700/5" value={newDebt.minPayment} onChange={e => setNewDebt({...newDebt, minPayment: e.target.value})}/></div>
              
              <div><label className="text-[10px] uppercase font-bold text-gray-400 ml-4 mb-1 block tracking-widest">Дата следующего платежа</label>
              <input required type="date" className="w-full bg-gray-50 p-4 rounded-2xl outline-none focus:ring-4 ring-emerald-700/5" value={newDebt.nextPaymentDate} onChange={e => setNewDebt({...newDebt, nextPaymentDate: e.target.value})}/></div>
            </div>
            <button type="submit" className="w-full bg-emerald-700 text-white p-5 rounded-2xl font-bold shadow-xl shadow-emerald-700/20 hover:bg-emerald-800 transition-all hover:scale-[1.02] active:scale-[0.98]">Добавить в дашборд</button>
          </form>
        </div>
      )}
    </div>
  );
}

// РЕНДЕР
const container = document.getElementById('root');
const root = createRoot(container);
root.render(<ErrorBoundary><App /></ErrorBoundary>);
