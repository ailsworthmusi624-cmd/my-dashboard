import React, { useState, useEffect, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { PlusCircle, Wallet, AlertCircle, Calendar, TrendingDown, TrendingUp, ArrowRight, CheckCircle2, X, Menu, Bell, LayoutDashboard, Settings, PieChart, ArrowUpRight, Search, Mail, HelpCircle, LogOut, ChevronDown, ChevronUp, FileText, RotateCcw, Clock, Target, Loader2 } from 'lucide-react';

// --- НАСТРОЙКИ FIREBASE (ОБЛАКО) ---
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, doc, setDoc, onSnapshot } from 'firebase/firestore';

// Ключи от вашей базы данных Firebase
const firebaseConfigStr = typeof __firebase_config !== 'undefined' ? __firebase_config : JSON.stringify({
  apiKey: "AIzaSyAYNPCG4DHFTAwWkARHGyYmiU0GTklQ6_Q",
  authDomain: "dashboard-27927.firebaseapp.com",
  projectId: "dashboard-27927",
  storageBucket: "dashboard-27927.firebasestorage.app",
  messagingSenderId: "428248986605",
  appId: "1:428248986605:web:95b3ccf9ffa65d0e68ade4"
});
const firebaseConfig = JSON.parse(firebaseConfigStr);
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'dashboard-27927';

// Ловец ошибок
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error, errorInfo) { this.setState({ errorInfo }); }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', backgroundColor: '#fee', color: '#c00', fontFamily: 'sans-serif' }}>
          <h2 style={{ marginBottom: '10px' }}>Упс! Произошла ошибка в коде:</h2>
          <p style={{ fontWeight: 'bold' }}>{this.state.error && this.state.error.toString()}</p>
          <pre style={{ marginTop: '20px', fontSize: '12px', whiteSpace: 'pre-wrap' }}>
            {this.state.errorInfo && this.state.errorInfo.componentStack}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

// Демонстрационные данные (если база пустая)
const initialDebts = [
  { id: 1, name: 'Сбер (Кредитка)', type: 'credit_card', balance: 85000, rate: 25.9, minPayment: 3500, nextPaymentDate: new Date(new Date().setDate(new Date().getDate() + 5)).toISOString().split('T')[0], isPaidThisMonth: false, details: { summary: 'Важно: Снятие наличных отменяет грейс-период.' } },
  { id: 2, name: 'ВТБ (Кредитка)', type: 'credit_card', balance: 120000, rate: 29.9, minPayment: 5000, nextPaymentDate: new Date(new Date().setDate(new Date().getDate() + 12)).toISOString().split('T')[0], isPaidThisMonth: false, details: { summary: 'Минимальный платеж 3% от суммы долга.' } }
];

export default function App() {
  // Навигация
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Состояния синхронизации с облаком
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Данные приложения
  const [debts, setDebts] = useState([]);
  const [freeMoney, setFreeMoney] = useState(15000);
  const [strategy, setStrategy] = useState('avalanche');
  
  // UI Состояния
  const [expandedId, setExpandedId] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  const [newDebt, setNewDebt] = useState({
    name: '', type: 'loan', balance: '', rate: '', minPayment: '', nextPaymentDate: '', detailsSummary: ''
  });

  // Инициализация Авторизации Firebase
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (error) {
        console.error("Auth error:", error);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  // Загрузка и синхронизация данных из Firestore
  useEffect(() => {
    if (!user) return;
    const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'appState', 'main');
    
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setDebts(data.debts || []);
        setFreeMoney(data.freeMoney || 15000);
        setStrategy(data.strategy || 'avalanche');
      } else {
        setDoc(docRef, { debts: initialDebts, freeMoney: 15000, strategy: 'avalanche' });
      }
      setIsLoading(false);
    }, (err) => {
      console.error("Ошибка загрузки данных:", err);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  // Отправка изменений в облако
  const updateCloud = (newDebts, newFreeMoney, newStrategy) => {
    if (!user) return;
    const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'appState', 'main');
    setDoc(docRef, { debts: newDebts, freeMoney: Number(newFreeMoney), strategy: newStrategy }, { merge: true });
  };

  // Хелперы для дат
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const getDaysDiff = (dateStr) => {
    if (!dateStr) return 0;
    const targetDate = new Date(dateStr);
    targetDate.setHours(0, 0, 0, 0);
    const diffTime = targetDate - today;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const formatMoney = (amount) => {
    return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(amount || 0);
  };

  // Вычисления
  const totalDebt = debts.reduce((sum, d) => sum + Number(d.balance || 0), 0);
  const totalMinPaymentAll = debts.reduce((sum, d) => sum + Number(d.minPayment || 0), 0);
  const totalMinPaymentRemaining = debts.reduce((sum, d) => sum + (d.isPaidThisMonth ? 0 : Number(d.minPayment || 0)), 0);
  const paidThisMonthAmount = debts.filter(d => d.isPaidThisMonth).reduce((sum, d) => sum + Number(d.minPayment || 0), 0);
  const progressPercent = totalMinPaymentAll === 0 ? 0 : Math.round((paidThisMonthAmount / totalMinPaymentAll) * 100);
  
  const circleCircumference = 351.8;
  const circleDashoffset = circleCircumference - (progressPercent / 100) * circleCircumference;

  const overdueDebts = debts.filter(d => !d.isPaidThisMonth && getDaysDiff(d.nextPaymentDate) < 0);
  const totalOverdue = overdueDebts.reduce((sum, d) => sum + Number(d.minPayment || 0), 0);

  const sortedDebts = [...debts].sort((a, b) => {
    if (a.isPaidThisMonth !== b.isPaidThisMonth) return a.isPaidThisMonth ? 1 : -1;
    return new Date(a.nextPaymentDate || 0) - new Date(b.nextPaymentDate || 0);
  });

  const notifications = useMemo(() => {
    const alerts = [];
    overdueDebts.forEach(d => {
      alerts.push({ id: `over_${d.id}`, type: 'error', title: 'Просрочка', text: `Платеж ${formatMoney(d.minPayment)} по "${d.name}" просрочен!` });
    });
    debts.filter(d => !d.isPaidThisMonth && getDaysDiff(d.nextPaymentDate) >= 0 && getDaysDiff(d.nextPaymentDate) <= 3).forEach(d => {
      alerts.push({ id: `warn_${d.id}`, type: 'warning', title: 'Скоро платеж', text: `По "${d.name}" нужно внести ${formatMoney(d.minPayment)} в течение ${getDaysDiff(d.nextPaymentDate)} дн.` });
    });
    return alerts;
  }, [debts, overdueDebts]);

  const strategyAllocation = useMemo(() => {
    let remainingMoney = Number(freeMoney) || 0;
    const allocation = {};
    let targetDebts = debts.filter(d => d.balance > 0);

    if (strategy === 'avalanche') {
      targetDebts.sort((a, b) => (b.rate || 0) - (a.rate || 0));
    } else {
      targetDebts.sort((a, b) => (a.balance || 0) - (b.balance || 0));
    }

    targetDebts.forEach(debt => {
      if (remainingMoney > 0) {
        const amountToDirect = Math.min(remainingMoney, debt.balance);
        allocation[debt.id] = amountToDirect;
        remainingMoney -= amountToDirect;
      } else {
        allocation[debt.id] = 0;
      }
    });

    return allocation;
  }, [debts, freeMoney, strategy]);

  // Действия с облаком
  const handleMarkPaid = (id) => {
    const newDebts = debts.map(d => {
      if (d.id === id) {
        const newBalance = Math.max(0, d.balance - (d.minPayment || 0));
        return { ...d, isPaidThisMonth: true, balance: newBalance, _prevBalance: d.balance };
      }
      return d;
    });
    setDebts(newDebts);
    updateCloud(newDebts, freeMoney, strategy);
  };

  const handleUndoPaid = (id) => {
    const newDebts = debts.map(d => {
      if (d.id === id) {
        const restoredBalance = d._prevBalance !== undefined ? d._prevBalance : d.balance + (d.minPayment || 0);
        return { ...d, isPaidThisMonth: false, balance: restoredBalance };
      }
      return d;
    });
    setDebts(newDebts);
    updateCloud(newDebts, freeMoney, strategy);
  };

  const handleResetMonth = () => {
    if (window.confirm('Вы уверены, что хотите начать новый месяц? Все статусы "Оплачено" будут сброшены.')) {
      const newDebts = debts.map(d => ({ ...d, isPaidThisMonth: false }));
      setDebts(newDebts);
      updateCloud(newDebts, freeMoney, strategy);
    }
  };

  const handleAddDebt = (e) => {
    e.preventDefault();
    const nextId = debts.length > 0 ? Math.max(...debts.map(d => d.id)) + 1 : 1;
    const debtToAdd = {
      ...newDebt,
      id: nextId,
      isPaidThisMonth: false,
      details: { summary: newDebt.detailsSummary || 'Нет сохраненных условий.' }
    };
    const newDebts = [...debts, debtToAdd];
    setDebts(newDebts);
    updateCloud(newDebts, freeMoney, strategy);
    setIsAddModalOpen(false);
    setNewDebt({ name: '', type: 'loan', balance: '', rate: '', minPayment: '', nextPaymentDate: '', detailsSummary: '' });
  };

  const handleDeleteDebt = (id) => {
    if (window.confirm('Точно удалить этот долг?')) {
      const newDebts = debts.filter(d => d.id !== id);
      setDebts(newDebts);
      updateCloud(newDebts, freeMoney, strategy);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F4F6F8] flex flex-col items-center justify-center text-[#106A3C]">
        <Loader2 className="w-12 h-12 animate-spin mb-4" />
        <h2 className="text-xl font-bold text-gray-900 tracking-tight">Подключение к облаку...</h2>
        <p className="text-sm text-gray-500 mt-2">Синхронизация ваших данных</p>
      </div>
    );
  }

  // --- ЭКРАНЫ ---

  const renderDashboard = () => (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-[#106A3C] rounded-[24px] p-5 md:p-6 text-white relative shadow-md shadow-[#106A3C]/10 flex flex-col justify-between">
          <div>
            <p className="text-white/80 text-sm font-medium">Общий долг</p>
            <h2 className="text-2xl md:text-3xl font-bold mt-2 tracking-tight">{formatMoney(totalDebt)}</h2>
          </div>
          <div className="absolute top-5 right-5 bg-white/20 p-1.5 md:p-2 rounded-full">
            <ArrowUpRight size={18} className="text-white" />
          </div>
          <div className="mt-4 bg-white/10 w-max px-3 py-1 rounded-lg text-xs flex items-center gap-1.5 backdrop-blur-sm">
            <span>Осталось {debts.length} шт.</span>
          </div>
        </div>

        <div className="bg-white rounded-[24px] p-5 md:p-6 border border-gray-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.02)] flex flex-col justify-between relative">
          <div>
            <p className="text-gray-500 text-sm font-medium">Осталось оплатить</p>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mt-2 tracking-tight">{formatMoney(totalMinPaymentRemaining)}</h2>
          </div>
          <div className="absolute top-5 right-5 border border-gray-100 p-1.5 md:p-2 rounded-full text-gray-400">
            <ArrowUpRight size={18} />
          </div>
          <div className="mt-4 text-xs text-gray-500 flex items-center gap-1.5">
            Из {formatMoney(totalMinPaymentAll)} в этом месяце
          </div>
        </div>

        <div className="bg-white rounded-[24px] p-5 md:p-6 border border-gray-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.02)] flex flex-col justify-between relative">
          <div>
            <p className="text-gray-500 text-sm font-medium">Просрочено</p>
            <h2 className={`text-2xl md:text-3xl font-bold mt-2 tracking-tight ${totalOverdue > 0 ? 'text-red-500' : 'text-gray-900'}`}>
              {formatMoney(totalOverdue)}
            </h2>
          </div>
          <div className="absolute top-5 right-5 border border-gray-100 p-1.5 md:p-2 rounded-full text-gray-400">
            <AlertCircle size={18} className={totalOverdue > 0 ? 'text-red-400' : ''} />
          </div>
          <div className="mt-4 text-xs flex items-center gap-1.5">
            {totalOverdue > 0 
              ? <span className="bg-red-50 text-red-600 px-2 py-1 rounded-md font-medium">{overdueDebts.length} платежей требуют внимания</span>
              : <span className="text-emerald-600 font-medium bg-emerald-50 px-2 py-1 rounded-md">Всё по графику</span>
            }
          </div>
        </div>

        <div className="bg-white rounded-[24px] p-5 md:p-6 border border-gray-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.02)] flex flex-col justify-between">
          <label className="text-gray-500 text-sm font-medium">Свободные средства</label>
          <div className="relative mt-2">
            <input 
              type="number" 
              value={freeMoney} 
              onChange={(e) => setFreeMoney(e.target.value)}
              onBlur={() => updateCloud(debts, freeMoney, strategy)}
              className="w-full bg-transparent text-2xl md:text-3xl font-bold text-[#106A3C] border-b-2 border-gray-100 focus:border-[#106A3C] outline-none pb-1 transition-colors"
            />
          </div>
          <div className="mt-4 text-xs text-gray-500">
            ₽ для стратегии досрочки
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-[24px] p-6 border border-gray-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.02)]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
            <h3 className="text-lg font-bold text-gray-900">Ближайшие платежи</h3>
            <div className="flex gap-2">
              <button 
                onClick={handleResetMonth}
                className="text-xs font-medium text-gray-500 border border-gray-200 px-3 py-1.5 rounded-full hover:bg-gray-100 hover:text-gray-900 transition-colors flex items-center gap-1.5"
                title="Начать новый месяц (сбросить все галочки 'Оплачено')"
              >
                <RotateCcw size={14} /> Новый месяц
              </button>
            </div>
          </div>
          
          <div className="space-y-4">
            {sortedDebts.map(debt => {
              const daysLeft = getDaysDiff(debt.nextPaymentDate);
              
              const monthlyInterest = debt.rate > 0 ? (Number(debt.balance || 0) * (Number(debt.rate || 0) / 100)) / 12 : 0;
              const principalPayment = Math.max(0, Number(debt.minPayment || 0) - monthlyInterest);
              const totalCurrentDebt = Number(debt.balance || 0) + monthlyInterest;
              
              const safeMinPayment = Number(debt.minPayment) || 1;
              const interestPercent = Math.min(100, (monthlyInterest / safeMinPayment) * 100) || 0;
              const principalPercent = Math.max(0, 100 - interestPercent);

              let iconColor = "bg-blue-100 text-blue-600";
              let badgeColor = "bg-blue-50 text-blue-600 border border-blue-100";
              let statusText = `Осталось ${daysLeft} дн.`;
              
              if (debt.isPaidThisMonth) {
                iconColor = "bg-emerald-100 text-emerald-600";
                badgeColor = "bg-emerald-50 text-emerald-600 border border-emerald-100";
                statusText = "Оплачено";
              } else if (daysLeft < 0) {
                iconColor = "bg-red-100 text-red-600";
                badgeColor = "bg-red-50 text-red-600 border border-red-100";
                statusText = `Просрочка ${Math.abs(daysLeft)} дн.`;
              } else if (daysLeft === 0) {
                iconColor = "bg-orange-100 text-orange-600";
                badgeColor = "bg-orange-50 text-orange-600 border border-orange-100";
                statusText = "Оплата сегодня";
              }

              return (
                <div key={debt.id} className={`flex flex-col rounded-2xl border transition-all ${debt.isPaidThisMonth ? 'border-gray-100 bg-gray-50/50 opacity-70' : 'border-gray-100 hover:shadow-md hover:border-gray-200'}`}>
                  
                  <div 
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-4 cursor-pointer"
                    onClick={() => setExpandedId(expandedId === debt.id ? null : debt.id)}
                  >
                    <div className="flex items-center gap-4 mb-4 sm:mb-0">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${iconColor}`}>
                        <Wallet size={24} />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                          {debt.name}
                          {expandedId === debt.id ? <ChevronUp size={16} className="text-gray-400"/> : <ChevronDown size={16} className="text-gray-400"/>}
                        </h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-gray-500 font-medium">Ставка: {debt.rate}%</span>
                          <span className="text-gray-300">•</span>
                          <span className="text-xs text-gray-500 font-medium">Остаток: {formatMoney(debt.balance)}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between sm:justify-end gap-4 sm:w-auto w-full">
                      <div className="text-left sm:text-right">
                        <p className="text-xs text-gray-400 font-medium mb-1">Платёж</p>
                        <p className="font-bold text-gray-900">{formatMoney(debt.minPayment)}</p>
                      </div>
                      
                      <div className={`text-xs font-bold px-3 py-1.5 rounded-full whitespace-nowrap ${badgeColor}`}>
                        {statusText}
                      </div>

                      <div className="flex items-center gap-1 border-l border-gray-100 pl-4 ml-2" onClick={e => e.stopPropagation()}>
                         {debt.isPaidThisMonth ? (
                           <button 
                            onClick={() => handleUndoPaid(debt.id)}
                            className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-orange-500 hover:bg-orange-50 rounded-full transition-colors"
                            title="Отменить платеж"
                          >
                            <RotateCcw size={18} />
                          </button>
                         ) : (
                          <button 
                            onClick={() => handleMarkPaid(debt.id)}
                            className="w-8 h-8 flex items-center justify-center text-emerald-600 hover:bg-emerald-50 rounded-full transition-colors"
                            title="Отметить как оплаченное"
                          >
                            <CheckCircle2 size={20} />
                          </button>
                         )}
                         <button 
                            onClick={() => handleDeleteDebt(debt.id)}
                            className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                            title="Удалить долг"
                          >
                            <X size={20} />
                          </button>
                      </div>
                    </div>
                  </div>

                  {expandedId === debt.id && (
                    <div className="p-4 border-t border-gray-100 bg-[#F8FAFC] rounded-b-2xl cursor-default" onClick={e => e.stopPropagation()}>
                      <div className="mb-5 bg-white p-4 rounded-xl border border-gray-100 shadow-[0_2px_8px_-4px_rgba(0,0,0,0.05)]">
                        <h6 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                          <PieChart size={14} className="text-[#106A3C]" />
                          Экономика на этот месяц
                        </h6>
                        <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-5">
                          <div>
                            <span className="block text-[10px] sm:text-xs text-gray-400 mb-1">Тело долга</span>
                            <span className="font-bold text-gray-900 text-sm sm:text-base">{formatMoney(debt.balance)}</span>
                          </div>
                          <div className="border-l border-gray-50 pl-2 sm:pl-4">
                            <span className="block text-[10px] sm:text-xs text-gray-400 mb-1">+ Проценты банку</span>
                            <span className="font-bold text-red-500 text-sm sm:text-base">{formatMoney(monthlyInterest)}</span>
                          </div>
                          <div className="border-l border-gray-50 pl-2 sm:pl-4">
                            <span className="block text-[10px] sm:text-xs text-gray-400 mb-1">Общий остаток</span>
                            <span className="font-bold text-[#106A3C] text-sm sm:text-base">{formatMoney(totalCurrentDebt)}</span>
                          </div>
                        </div>

                        {Number(debt.rate || 0) > 0 && (
                          <div className="pt-4 border-t border-gray-50">
                            <div className="flex justify-between items-end mb-2">
                              <span className="block text-xs text-gray-500 font-medium">Куда уходит ваш платеж ({formatMoney(debt.minPayment)}):</span>
                            </div>
                            <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden flex shadow-inner">
                              <div className="bg-red-400 h-full transition-all duration-500" style={{ width: `${interestPercent}%` }}></div>
                              <div className="bg-[#106A3C] h-full transition-all duration-500" style={{ width: `${principalPercent}%` }}></div>
                            </div>
                            <div className="flex justify-between mt-2 text-[11px] font-medium">
                              <span className="text-red-500 flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-400"></div>{formatMoney(monthlyInterest)} (Проценты)</span>
                              <span className="text-[#106A3C] flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-[#106A3C]"></div>{formatMoney(principalPayment)} (В счет долга)</span>
                            </div>
                          </div>
                        )}
                      </div>

                      <h5 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2"><FileText size={16} className="text-gray-400" />Условия договора</h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        {debt.details?.gracePeriod && (<div><span className="text-gray-500 block text-xs mb-0.5">Беспроцентный период:</span><span className="font-medium text-gray-900">{debt.details.gracePeriod}</span></div>)}
                        {debt.details?.penalty && (<div><span className="text-gray-500 block text-xs mb-0.5">Штраф за просрочку:</span><span className="font-medium text-red-600">{debt.details.penalty}</span></div>)}
                        <div className="md:col-span-2">
                          <span className="text-gray-500 block text-xs mb-1">Краткая выжимка (AI-анализ):</span>
                          <p className="text-gray-700 leading-relaxed bg-white p-3 rounded-xl border border-gray-100 shadow-sm text-xs sm:text-sm">{debt.details?.summary || 'Условия не добавлены.'}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            {debts.length === 0 && (
              <div className="text-center py-10 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                <p className="text-gray-500">Долгов нет. Вы свободны!</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-[24px] p-6 border border-gray-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.02)] flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-gray-900">Стратегия</h3>
          </div>
          <div className="bg-gray-50 p-1 rounded-xl flex mb-6">
            <button onClick={() => { setStrategy('avalanche'); updateCloud(debts, freeMoney, 'avalanche'); }} className={`flex-1 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all ${strategy === 'avalanche' ? 'bg-white text-gray-900 shadow-sm border border-gray-100' : 'text-gray-500 hover:text-gray-700'}`}>Лавина (Выгода)</button>
            <button onClick={() => { setStrategy('snowball'); updateCloud(debts, freeMoney, 'snowball'); }} className={`flex-1 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all ${strategy === 'snowball' ? 'bg-white text-gray-900 shadow-sm border border-gray-100' : 'text-gray-500 hover:text-gray-700'}`}>Снежный ком</button>
          </div>

          <div className="flex-1 flex flex-col justify-between">
            {Number(freeMoney) > 0 && totalDebt > 0 ? (
              <div className="mb-6">
                <p className="text-sm font-medium text-gray-500 mb-4">Куда направить свободные средства:</p>
                <div className="space-y-3">
                  {Object.entries(strategyAllocation).map(([id, amount]) => {
                    if (amount <= 0) return null;
                    const debt = debts.find(d => d.id === parseInt(id));
                    return (
                      <div key={id} className="flex justify-between items-center p-3 bg-gray-50 rounded-xl border border-gray-100">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-[#106A3C]/10 text-[#106A3C] flex items-center justify-center shrink-0"><TrendingDown size={14} /></div>
                          <span className="text-sm font-medium text-gray-700 truncate max-w-[140px] sm:max-w-[200px]">{debt.name}</span>
                        </div>
                        <span className="font-bold text-[#106A3C]">+{formatMoney(amount)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="text-center py-6 mb-6 border-b border-gray-50">
                <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3 text-gray-300"><Wallet size={24} /></div>
                <p className="text-xs text-gray-500">Добавьте свободные средства для расчета досрочного погашения.</p>
              </div>
            )}

            <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100 mt-auto">
              <h4 className="text-sm font-bold text-gray-900 mb-1 text-center">Прогресс месяца</h4>
              <p className="text-xs text-gray-500 text-center mb-4">Оплачено {formatMoney(paidThisMonthAmount)} из {formatMoney(totalMinPaymentAll)}</p>
              <div className="flex justify-center relative">
                <svg className="w-32 h-32 transform -rotate-90">
                  <circle cx="64" cy="64" r="56" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-gray-200" />
                  <circle cx="64" cy="64" r="56" stroke="currentColor" strokeWidth="12" fill="transparent" strokeDasharray={circleCircumference} strokeDashoffset={circleDashoffset} className="text-[#106A3C] transition-all duration-1000 ease-out" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-bold text-gray-900">{progressPercent}%</span>
                  <span className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">Готово</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );

  const renderCalendar = () => {
    const calendarDebts = [...debts].sort((a, b) => new Date(a.nextPaymentDate || 0) - new Date(b.nextPaymentDate || 0));
    return (
      <div className="bg-white rounded-[24px] p-6 border border-gray-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.02)] max-w-3xl mx-auto">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3"><Calendar className="text-[#106A3C]" /> Календарь платежей</h2>
        <div className="relative border-l-2 border-gray-100 ml-4 space-y-8 py-4">
          {calendarDebts.map(debt => {
            const date = new Date(debt.nextPaymentDate);
            const formattedDate = date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
            const isPast = getDaysDiff(debt.nextPaymentDate) < 0;
            return (
              <div key={`cal_${debt.id}`} className="relative pl-6">
                <div className={`absolute -left-[9px] top-1 w-4 h-4 rounded-full border-2 border-white ${debt.isPaidThisMonth ? 'bg-emerald-500' : isPast ? 'bg-red-500' : 'bg-[#106A3C]'}`}></div>
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                  <div>
                    <span className={`text-sm font-bold ${isPast && !debt.isPaidThisMonth ? 'text-red-500' : 'text-[#106A3C]'}`}>{formattedDate}</span>
                    <h4 className="font-semibold text-gray-900">{debt.name}</h4>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="font-bold text-gray-900">{formatMoney(debt.minPayment)}</p>
                    <p className="text-xs text-gray-500">{debt.isPaidThisMonth ? 'Оплачено' : 'К оплате'}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderAnalytics = () => {
    const totalInterestPerMonth = debts.reduce((sum, debt) => sum + (debt.rate > 0 ? (Number(debt.balance) * (Number(debt.rate) / 100)) / 12 : 0), 0);
    const averageRate = debts.filter(d=>d.rate>0).length ? debts.filter(d=>d.rate>0).reduce((sum,d)=>sum+Number(d.rate),0) / debts.filter(d=>d.rate>0).length : 0;
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3"><PieChart className="text-[#106A3C]" /> Аналитика портфеля</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <p className="text-gray-500 text-sm font-medium mb-2">Сгорает на проценты</p>
            <h3 className="text-3xl font-bold text-red-500">{formatMoney(totalInterestPerMonth)} <span className="text-base font-normal text-gray-400">/ мес</span></h3>
            <p className="text-xs text-gray-500 mt-2">Эту сумму вы дарите банкам каждый месяц.</p>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <p className="text-gray-500 text-sm font-medium mb-2">Средняя ставка</p>
            <h3 className="text-3xl font-bold text-gray-900">{averageRate.toFixed(1)}%</h3>
            <p className="text-xs text-gray-500 mt-2">Чем ниже, тем выгоднее долги.</p>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <p className="text-gray-500 text-sm font-medium mb-2">Количество кредиторов</p>
            <h3 className="text-3xl font-bold text-gray-900">{debts.length} <span className="text-base font-normal text-gray-400">банков</span></h3>
            <p className="text-xs text-gray-500 mt-2">Цель: свести к нулю.</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <h4 className="font-bold text-gray-900 mb-6">Структура долга</h4>
          <div className="space-y-4">
            {debts.sort((a,b)=>b.balance - a.balance).map(debt => (
              <div key={`stat_${debt.id}`}>
                <div className="flex justify-between text-sm mb-1"><span className="font-medium text-gray-700">{debt.name}</span><span className="font-bold text-gray-900">{Math.round((debt.balance / totalDebt) * 100)}%</span></div>
                <div className="w-full bg-gray-100 rounded-full h-2"><div className="bg-[#106A3C] h-2 rounded-full" style={{ width: `${(debt.balance / totalDebt) * 100}%` }}></div></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderInvestingPlan = () => {
    const monthlyInvestment = totalMinPaymentAll + Number(freeMoney);
    const monthsToPayoff = monthlyInvestment > 0 ? Math.ceil(totalDebt / monthlyInvestment) : 0;
    const r = 0.12 / 12;
    const n = 120;
    const futureValue = monthlyInvestment * ((Math.pow(1 + r, n) - 1) / r);

    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <h2 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3"><Target className="text-[#106A3C] w-8 h-8" /> Жизнь после долгов</h2>
        <p className="text-gray-500 mb-8">План превращения ваших кредитных платежей в личный капитал.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-8 text-white relative overflow-hidden shadow-xl">
            <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full blur-3xl -mr-10 -mt-10"></div>
            <Clock className="text-white/30 w-10 h-10 mb-4" />
            <p className="text-white/60 text-sm font-medium mb-1">Ориентировочный срок закрытия</p>
            <h3 className="text-4xl font-bold tracking-tight mb-2">~ {monthsToPayoff} мес.</h3>
            <p className="text-sm text-white/80">При платежах {formatMoney(monthlyInvestment)}/мес.</p>
          </div>
          <div className="bg-gradient-to-br from-[#106A3C] to-[#0a4a29] rounded-3xl p-8 text-white relative overflow-hidden shadow-xl shadow-[#106A3C]/20">
            <div className="absolute bottom-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-2xl -mr-10 -mb-10"></div>
            <TrendingUp className="text-white/30 w-10 h-10 mb-4" />
            <p className="text-white/60 text-sm font-medium mb-1">Капитал через 10 лет</p>
            <h3 className="text-4xl font-bold tracking-tight mb-2">{formatMoney(futureValue)}</h3>
            <p className="text-sm text-white/80">Если инвестировать эти деньги под 12% год.</p>
          </div>
        </div>
        <div className="bg-white p-6 md:p-8 rounded-3xl border border-gray-100 shadow-sm">
          <h4 className="text-lg font-bold text-gray-900 mb-4">Как это работает?</h4>
          <div className="space-y-4 text-gray-600 leading-relaxed text-sm md:text-base">
            <p>Сейчас вы каждый месяц отдаете банкам <strong>{formatMoney(totalMinPaymentAll)}</strong> в качестве обязательных платежей.</p>
            <p>Плюс вы готовы выделять <strong>{formatMoney(freeMoney)}</strong> сверху для стратегии досрочного погашения.</p>
            <p><strong>Секрет богатства:</strong> Как только вы закроете последний кредит, не увеличивайте свои траты! Ваш уровень жизни уже привык к отсутствию этих денег. Просто начните отправлять эту же самую сумму ({formatMoney(monthlyInvestment)}) на брокерский счет каждый месяц.</p>
            <p>Магия сложного процента сделает всё остальное. То, что раньше тянуло вас на дно, станет вашим капиталом, который будет приносить пассивный доход.</p>
          </div>
        </div>
      </div>
    );
  };

  const renderActiveTab = () => {
    switch(activeTab) {
      case 'dashboard': return renderDashboard();
      case 'calendar': return renderCalendar();
      case 'analytics': return renderAnalytics();
      case 'investing': return renderInvestingPlan();
      default: return renderDashboard();
    }
  };

  const navItemClass = (tabId) => `flex items-center gap-3 px-4 py-3 rounded-2xl relative font-medium transition-colors w-full ${activeTab === tabId ? 'bg-[#106A3C]/5 text-[#106A3C]' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}`;

  return (
    <div className="min-h-screen bg-[#F4F6F8] text-gray-800 font-sans flex overflow-hidden selection:bg-[#106A3C]/20">
      {isSidebarOpen && (<div className="fixed inset-0 bg-gray-900/20 backdrop-blur-sm z-40 lg:hidden" onClick={() => setIsSidebarOpen(false)} />)}

      <aside className={`fixed lg:static inset-y-0 left-0 w-[260px] bg-white border-r border-gray-100 z-50 transform transition-transform duration-300 flex flex-col ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="p-6 flex items-center gap-3">
          <div className="w-8 h-8 bg-[#106A3C] rounded-xl flex items-center justify-center text-white font-bold shrink-0"><Wallet size={18} /></div>
          <span className="font-bold text-xl tracking-tight text-gray-900">Свобода.</span>
          <button className="ml-auto lg:hidden text-gray-500" onClick={() => setIsSidebarOpen(false)}><X size={20} /></button>
        </div>

        <div className="px-4 py-2">
          <p className="text-xs font-semibold text-gray-400 mb-3 px-4 uppercase tracking-wider">Меню</p>
          <nav className="space-y-1">
            <button onClick={() => {setActiveTab('dashboard'); setIsSidebarOpen(false);}} className={navItemClass('dashboard')}>
              {activeTab === 'dashboard' && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-8 bg-[#106A3C] rounded-r-full"></div>}
              <LayoutDashboard size={20} /> Дашборд
            </button>
            <button onClick={() => {setActiveTab('calendar'); setIsSidebarOpen(false);}} className={navItemClass('calendar')}>
              {activeTab === 'calendar' && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-8 bg-[#106A3C] rounded-r-full"></div>}
              <Calendar size={20} /> Календарь
            </button>
            <button onClick={() => {setActiveTab('analytics'); setIsSidebarOpen(false);}} className={navItemClass('analytics')}>
              {activeTab === 'analytics' && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-8 bg-[#106A3C] rounded-r-full"></div>}
              <PieChart size={20} /> Аналитика
            </button>
          </nav>
        </div>

        <div className="px-4 py-6 mt-auto">
          <div className="mt-8 bg-gray-900 rounded-3xl p-5 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/20 rounded-full blur-3xl -mr-10 -mt-10"></div>
            <div className="relative z-10">
              <h4 className="font-semibold mb-1 text-sm">Жизнь без долгов</h4>
              <p className="text-[11px] text-gray-400 mb-4 leading-tight">Ваш план создания капитала</p>
              <button onClick={() => {setActiveTab('investing'); setIsSidebarOpen(false);}} className="w-full bg-[#106A3C] hover:bg-[#0c502d] text-white text-xs font-medium py-2 rounded-xl transition-colors">Читать план</button>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="bg-white/60 backdrop-blur-md border-b border-gray-100 lg:border-none sticky top-0 z-30">
          <div className="flex items-center justify-between p-4 lg:px-8 lg:py-6">
            <div className="flex items-center gap-4 flex-1">
              <button className="p-2 -ml-2 text-gray-600 lg:hidden" onClick={() => setIsSidebarOpen(true)}><Menu size={24} /></button>
            </div>
            
            <div className="flex items-center gap-3 lg:gap-5">
              <div className="relative">
                <button onClick={() => setIsNotificationsOpen(!isNotificationsOpen)} className="p-2 text-gray-500 hover:text-gray-900 relative rounded-full hover:bg-gray-100 transition-colors">
                  <Bell size={20} />
                  {notifications.length > 0 && <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 border-2 border-white rounded-full"></span>}
                </button>
                {isNotificationsOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsNotificationsOpen(false)}></div>
                    <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden transform origin-top-right transition-all">
                      <div className="p-4 border-b border-gray-50 bg-gray-50/50"><h4 className="font-bold text-gray-900 text-sm">Уведомления</h4></div>
                      <div className="max-h-[60vh] overflow-y-auto">
                        {notifications.length === 0 ? (
                          <div className="p-6 text-center text-gray-500 text-sm">Все отлично! Нет срочных уведомлений.</div>
                        ) : (
                          notifications.map(notif => (
                            <div key={notif.id} className="p-4 border-b border-gray-50 hover:bg-gray-50 transition-colors">
                              <div className="flex items-start gap-3">
                                {notif.type === 'error' ? <AlertCircle size={18} className="text-red-500 shrink-0 mt-0.5" /> : <Clock size={18} className="text-orange-500 shrink-0 mt-0.5" />}
                                <div><h5 className={`text-sm font-bold ${notif.type === 'error' ? 'text-red-600' : 'text-gray-900'}`}>{notif.title}</h5><p className="text-xs text-gray-600 mt-1 leading-relaxed">{notif.text}</p></div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="flex items-center gap-3 pl-2 lg:pl-5 lg:border-l border-gray-200">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-semibold text-gray-900 leading-tight">Мой профиль</p>
                  <p className="text-xs text-gray-500 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span> Облако</p>
                </div>
                <div className="w-10 h-10 bg-gray-200 rounded-full overflow-hidden flex items-center justify-center text-gray-500"><Wallet size={20} /></div>
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 lg:p-8">
          {renderActiveTab()}
        </div>
      </main>

      {isAddModalOpen && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-gray-100 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-6 md:p-8">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-900">Новый долг</h3>
                <button onClick={() => setIsAddModalOpen(false)} className="text-gray-400 hover:text-gray-900 bg-gray-50 p-2 rounded-full transition-colors"><X size={20} /></button>
              </div>
              <form onSubmit={handleAddDebt} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Название банка или кредита</label>
                  <input required type="text" value={newDebt.name} onChange={e => setNewDebt({...newDebt, name: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 text-gray-900 focus:outline-none focus:border-[#106A3C] focus:bg-white transition-colors" placeholder="Например: Кредитка Тинькофф" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Остаток (₽)</label>
                    <input required type="number" value={newDebt.balance} onChange={e => setNewDebt({...newDebt, balance: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 text-gray-900 focus:outline-none focus:border-[#106A3C] focus:bg-white transition-colors" placeholder="100000" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Ставка (% год.)</label>
                    <input required type="number" step="0.1" value={newDebt.rate} onChange={e => setNewDebt({...newDebt, rate: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 text-gray-900 focus:outline-none focus:border-[#106A3C] focus:bg-white transition-colors" placeholder="19.9" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Ежемесячный платеж (₽)</label>
                  <input required type="number" value={newDebt.minPayment} onChange={e => setNewDebt({...newDebt, minPayment: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 text-gray-900 focus:outline-none focus:border-[#106A3C] focus:bg-white transition-colors" placeholder="5000" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Дата платежа</label>
                  <input required type="date" value={newDebt.nextPaymentDate} onChange={e => setNewDebt({...newDebt, nextPaymentDate: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 text-gray-900 focus:outline-none focus:border-[#106A3C] focus:bg-white transition-colors" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5 flex justify-between items-center">
                    <span>Краткие условия (ИИ выжимка)</span><span className="text-xs text-gray-400 font-normal">Необязательно</span>
                  </label>
                  <textarea value={newDebt.detailsSummary} onChange={e => setNewDebt({...newDebt, detailsSummary: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 text-gray-900 focus:outline-none focus:border-[#106A3C] focus:bg-white transition-colors resize-none h-24 text-sm" placeholder="Сюда можно вставить результат анализа договора." />
                </div>
                <div className="pt-2">
                  <button type="submit" className="w-full bg-[#106A3C] hover:bg-[#0c502d] text-white font-medium py-3.5 rounded-xl transition-colors shadow-lg shadow-[#106A3C]/20">Добавить в дашборд</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
