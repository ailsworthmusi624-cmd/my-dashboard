import React, { useState, useEffect, useMemo } from 'react';
import { PlusCircle, Wallet, AlertCircle, Calendar, TrendingDown, ArrowRight, CheckCircle2, X, Menu, Bell, LayoutDashboard, Settings, PieChart, ArrowUpRight, Search, Mail, HelpCircle, LogOut, ChevronDown, ChevronUp, FileText } from 'lucide-react';

// Исходные данные для демонстрации (если хранилище пустое)
const initialDebts = [
  {
    id: 1,
    name: 'Сбер (Кредитка)',
    type: 'credit_card',
    balance: 85000,
    rate: 25.9,
    minPayment: 3500,
    nextPaymentDate: new Date(new Date().setDate(new Date().getDate() + 5)).toISOString().split('T')[0],
    isPaidThisMonth: false,
    details: { gracePeriod: 'до 120 дней', penalty: '36% годовых на сумму просрочки', summary: 'Важно: Грейс-период возобновляется только после полного погашения долга. Снятие наличных отменяет грейс-период и облагается комиссией 390 руб + 3.9%.' }
  },
  {
    id: 2,
    name: 'ВТБ (Кредитка)',
    type: 'credit_card',
    balance: 120000,
    rate: 29.9,
    minPayment: 5000,
    nextPaymentDate: new Date(new Date().setDate(new Date().getDate() + 12)).toISOString().split('T')[0],
    isPaidThisMonth: false,
    details: { gracePeriod: 'до 200 дней', penalty: '0.1% в день', summary: 'Минимальный платеж 3% от суммы долга. При пропуске платежа льготный период сгорает, начисляются проценты за весь срок.' }
  },
  {
    id: 3,
    name: 'Альфа (Кредитка)',
    type: 'credit_card',
    balance: 45000,
    rate: 34.9,
    minPayment: 2000,
    nextPaymentDate: new Date(new Date().setDate(new Date().getDate() + 2)).toISOString().split('T')[0],
    isPaidThisMonth: false,
    details: { gracePeriod: 'Год без % (на покупки в первые 30 дней)', penalty: 'Неустойка 20% годовых', summary: 'Ставка 34.9% применяется ко всем покупкам с 31-го дня. Проверьте скрытую страховку (обычно 1.2% в месяц), ее нужно отключить в приложении!' }
  },
  {
    id: 4,
    name: 'Т-Банк (Кредитка)',
    type: 'credit_card',
    balance: 60000,
    rate: 28.5,
    minPayment: 3000,
    nextPaymentDate: new Date(new Date().setDate(new Date().getDate() - 1)).toISOString().split('T')[0], 
    isPaidThisMonth: false,
    details: { gracePeriod: 'до 55 дней', penalty: '20% годовых + штраф 590 руб', summary: 'Штраф за неоплату минимального платежа фиксированный: 590 рублей. Часто включено SMS-информирование (99 руб/мес).' }
  },
  {
    id: 5,
    name: 'ОТП Банк (Кредит)',
    type: 'loan',
    balance: 250000,
    rate: 18.0,
    minPayment: 12500,
    nextPaymentDate: new Date(new Date().setDate(new Date().getDate() + 20)).toISOString().split('T')[0],
    isPaidThisMonth: false,
    details: { penalty: '0.1% в день', summary: 'Потребительский кредит. Досрочное погашение возможно в любую дату без штрафов через приложение. Перерасчет графика происходит автоматически (выгоднее уменьшать срок, а не платеж).' }
  },
  {
    id: 6,
    name: 'Яндекс (Кредит)',
    type: 'loan',
    balance: 150000,
    rate: 21.5,
    minPayment: 8500,
    nextPaymentDate: new Date(new Date().setDate(new Date().getDate() + 8)).toISOString().split('T')[0],
    isPaidThisMonth: false,
    details: { penalty: '20% годовых от суммы просрочки', summary: 'Досрочное погашение списывается только в дату регулярного платежа. Нужно подавать заявку заранее.' }
  },
  {
    id: 7,
    name: 'Яндекс Сплит (Рассрочка)',
    type: 'installment',
    balance: 25000,
    rate: 0,
    minPayment: 6250,
    nextPaymentDate: new Date(new Date().setDate(new Date().getDate() + 4)).toISOString().split('T')[0],
    isPaidThisMonth: false,
    details: { penalty: 'Единоразовый штраф', summary: 'Классический Сплит. Процентов нет. В случае просрочки взимается разовая комиссия и блокируется лимит на будущие покупки.' }
  }
];

export default function App() {
  // Состояние долгов (пытаемся загрузить из localStorage, иначе используем initialDebts)
  const [debts, setDebts] = useState(() => {
    const saved = localStorage.getItem('myDebts');
    return saved ? JSON.parse(saved) : initialDebts;
  });

  // Состояние свободных денег для стратегии
  const [freeMoney, setFreeMoney] = useState(15000);
  
  // Выбранная стратегия ('avalanche' - Лавина, 'snowball' - Снежный ком)
  const [strategy, setStrategy] = useState('avalanche');
  
  // Состояние развернутой карточки долга
  const [expandedId, setExpandedId] = useState(null);
  
  // Состояние бокового меню для мобильных устройств
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Состояние модального окна добавления долга
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newDebt, setNewDebt] = useState({
    name: '', type: 'loan', balance: '', rate: '', minPayment: '', nextPaymentDate: '', detailsSummary: ''
  });

  // Сохраняем в localStorage при каждом изменении debts
  useEffect(() => {
    localStorage.setItem('myDebts', JSON.stringify(debts));
  }, [debts]);

  // Вспомогательные функции для дат
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const getDaysDiff = (dateStr) => {
    const targetDate = new Date(dateStr);
    targetDate.setHours(0, 0, 0, 0);
    const diffTime = targetDate - today;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  // Вычисляемые данные
  const totalDebt = debts.reduce((sum, d) => sum + Number(d.balance), 0);
  const totalMinPayment = debts.reduce((sum, d) => sum + (d.isPaidThisMonth ? 0 : Number(d.minPayment)), 0);
  
  // Просрочки
  const overdueDebts = debts.filter(d => !d.isPaidThisMonth && getDaysDiff(d.nextPaymentDate) < 0);
  const totalOverdue = overdueDebts.reduce((sum, d) => sum + Number(d.minPayment), 0);

  // Сортировка долгов по срочности платежа
  const sortedDebts = [...debts].sort((a, b) => {
    // Сначала не оплаченные, потом оплаченные
    if (a.isPaidThisMonth !== b.isPaidThisMonth) return a.isPaidThisMonth ? 1 : -1;
    // Сортировка по дате
    return new Date(a.nextPaymentDate) - new Date(b.nextPaymentDate);
  });

  // Логика стратегии распределения свободных денег
  const strategyAllocation = useMemo(() => {
    let remainingMoney = Number(freeMoney);
    const allocation = {};
    
    // Берем только неоплаченные полностью долги
    let targetDebts = debts.filter(d => d.balance > 0);

    if (strategy === 'avalanche') {
      // Лавина: сортируем по убыванию ставки
      targetDebts.sort((a, b) => b.rate - a.rate);
    } else {
      // Снежный ком: сортируем по возрастанию остатка долга
      targetDebts.sort((a, b) => a.balance - b.balance);
    }

    targetDebts.forEach(debt => {
      if (remainingMoney > 0) {
        // Сколько можем направить в этот долг? Не больше, чем сам долг.
        const amountToDirect = Math.min(remainingMoney, debt.balance);
        allocation[debt.id] = amountToDirect;
        remainingMoney -= amountToDirect;
      } else {
        allocation[debt.id] = 0;
      }
    });

    return allocation;
  }, [debts, freeMoney, strategy]);

  // Действия пользователя
  const handleMarkPaid = (id) => {
    setDebts(debts.map(d => {
      if (d.id === id) {
        const newBalance = Math.max(0, d.balance - d.minPayment);
        return { ...d, isPaidThisMonth: true, balance: newBalance };
      }
      return d;
    }));
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
    setDebts([...debts, debtToAdd]);
    setIsAddModalOpen(false);
    setNewDebt({ name: '', type: 'loan', balance: '', rate: '', minPayment: '', nextPaymentDate: '', detailsSummary: '' });
  };

  const handleDeleteDebt = (id) => {
    setDebts(debts.filter(d => d.id !== id));
  };

  // Визуальные хелперы
  const getStatusColor = (days, isPaid) => {
    if (isPaid) return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
    if (days < 0) return 'bg-red-500/10 text-red-500 border-red-500/20'; // Просрочка
    if (days <= 3) return 'bg-orange-500/10 text-orange-500 border-orange-500/20'; // Скоро
    return 'bg-blue-500/10 text-blue-500 border-blue-500/20'; // Нормально
  };

  const formatMoney = (amount) => {
    return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(amount);
  };

  return (
    <div className="min-h-screen bg-[#F4F6F8] text-gray-800 font-sans flex overflow-hidden selection:bg-[#106A3C]/20">
      
      {/* Затемнение фона при открытом меню на мобильных */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-gray-900/20 backdrop-blur-sm z-40 lg:hidden" 
          onClick={() => setIsSidebarOpen(false)} 
        />
      )}

      {/* Боковое меню (Sidebar) */}
      <aside className={`fixed lg:static inset-y-0 left-0 w-[260px] bg-white border-r border-gray-100 z-50 transform transition-transform duration-300 flex flex-col ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="p-6 flex items-center gap-3">
          <div className="w-8 h-8 bg-[#106A3C] rounded-xl flex items-center justify-center text-white font-bold">
            <Wallet size={18} />
          </div>
          <span className="font-bold text-xl tracking-tight text-gray-900">Свобода.</span>
          <button className="ml-auto lg:hidden text-gray-500" onClick={() => setIsSidebarOpen(false)}>
            <X size={20} />
          </button>
        </div>

        <div className="px-4 py-2">
          <p className="text-xs font-semibold text-gray-400 mb-3 px-4 uppercase tracking-wider">Меню</p>
          <nav className="space-y-1">
            <a href="#" className="flex items-center gap-3 px-4 py-3 bg-[#106A3C]/5 text-[#106A3C] rounded-2xl relative font-medium">
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-8 bg-[#106A3C] rounded-r-full"></div>
              <LayoutDashboard size={20} />
              Дашборд
            </a>
            <a href="#" className="flex items-center gap-3 px-4 py-3 text-gray-500 hover:bg-gray-50 hover:text-gray-900 rounded-2xl font-medium transition-colors">
              <Calendar size={20} />
              Календарь
            </a>
            <a href="#" className="flex items-center gap-3 px-4 py-3 text-gray-500 hover:bg-gray-50 hover:text-gray-900 rounded-2xl font-medium transition-colors">
              <PieChart size={20} />
              Аналитика
            </a>
          </nav>
        </div>

        <div className="px-4 py-6 mt-auto">
          <p className="text-xs font-semibold text-gray-400 mb-3 px-4 uppercase tracking-wider">Общее</p>
          <nav className="space-y-1">
            <a href="#" className="flex items-center gap-3 px-4 py-3 text-gray-500 hover:bg-gray-50 hover:text-gray-900 rounded-2xl font-medium transition-colors">
              <Settings size={20} />
              Настройки
            </a>
            <a href="#" className="flex items-center gap-3 px-4 py-3 text-gray-500 hover:bg-gray-50 hover:text-gray-900 rounded-2xl font-medium transition-colors">
              <HelpCircle size={20} />
              Помощь
            </a>
          </nav>

          <div className="mt-8 bg-gray-900 rounded-3xl p-5 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/20 rounded-full blur-3xl -mr-10 -mt-10"></div>
            <div className="relative z-10">
              <h4 className="font-semibold mb-1 text-sm">Свобода от долгов</h4>
              <p className="text-xs text-gray-400 mb-4">Начните инвестировать после закрытия кредитов</p>
              <button className="w-full bg-[#106A3C] hover:bg-[#0c502d] text-white text-xs font-medium py-2 rounded-xl transition-colors">
                Читать план
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Основной контент */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        
        {/* Верхняя панель (Header) */}
        <header className="bg-white/60 backdrop-blur-md border-b border-gray-100 lg:border-none sticky top-0 z-30">
          <div className="flex items-center justify-between p-4 lg:px-8 lg:py-6">
            <div className="flex items-center gap-4 flex-1">
              <button className="p-2 -ml-2 text-gray-600 lg:hidden" onClick={() => setIsSidebarOpen(true)}>
                <Menu size={24} />
              </button>
              <div className="hidden md:flex items-center bg-white border border-gray-100 rounded-full px-4 py-2 w-72 shadow-sm">
                <Search size={18} className="text-gray-400" />
                <input type="text" placeholder="Поиск долгов..." className="bg-transparent border-none outline-none ml-2 text-sm w-full" />
                <div className="bg-gray-100 text-gray-500 text-[10px] px-2 py-0.5 rounded font-medium">⌘F</div>
              </div>
            </div>
            
            <div className="flex items-center gap-3 lg:gap-5">
              <button className="text-gray-500 hover:text-gray-900 hidden sm:block"><Mail size={20} /></button>
              <button className="text-gray-500 hover:text-gray-900 relative">
                <Bell size={20} />
                {overdueDebts.length > 0 && <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full"></span>}
              </button>
              <div className="flex items-center gap-3 pl-2 lg:pl-5 lg:border-l border-gray-200">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-semibold text-gray-900 leading-tight">Пользователь</p>
                  <p className="text-xs text-gray-500">Мой план</p>
                </div>
                <div className="w-10 h-10 bg-gray-200 rounded-full overflow-hidden flex items-center justify-center text-gray-500">
                  <Wallet size={20} />
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Скроллируемая область */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-8">
          <div className="max-w-6xl mx-auto">
            
            {/* Заголовок дашборда */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Дашборд</h1>
                <p className="text-sm text-gray-500 mt-1">Отслеживайте свои долги и планируйте их закрытие.</p>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => setIsAddModalOpen(true)}
                  className="bg-[#106A3C] hover:bg-[#0c502d] text-white px-5 py-2.5 rounded-full text-sm font-medium flex items-center gap-2 transition-colors shadow-lg shadow-[#106A3C]/20 w-full sm:w-auto justify-center"
                >
                  <PlusCircle size={18} />
                  Добавить долг
                </button>
              </div>
            </div>

            {/* Сетка метрик (Top Cards) */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {/* Card 1: Green Accent */}
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

              {/* Card 2 */}
              <div className="bg-white rounded-[24px] p-5 md:p-6 border border-gray-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.02)] flex flex-col justify-between relative">
                <div>
                  <p className="text-gray-500 text-sm font-medium">К оплате в месяц</p>
                  <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mt-2 tracking-tight">{formatMoney(totalMinPayment)}</h2>
                </div>
                <div className="absolute top-5 right-5 border border-gray-100 p-1.5 md:p-2 rounded-full text-gray-400">
                  <ArrowUpRight size={18} />
                </div>
                <div className="mt-4 text-xs text-gray-500 flex items-center gap-1.5">
                  Сумма всех мин. платежей
                </div>
              </div>

              {/* Card 3 */}
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

              {/* Card 4: Input */}
              <div className="bg-white rounded-[24px] p-5 md:p-6 border border-gray-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.02)] flex flex-col justify-between">
                <label className="text-gray-500 text-sm font-medium">Свободные средства</label>
                <div className="relative mt-2">
                  <input 
                    type="number" 
                    value={freeMoney} 
                    onChange={(e) => setFreeMoney(e.target.value)}
                    className="w-full bg-transparent text-2xl md:text-3xl font-bold text-[#106A3C] border-b-2 border-gray-100 focus:border-[#106A3C] outline-none pb-1 transition-colors"
                  />
                </div>
                <div className="mt-4 text-xs text-gray-500">
                  ₽ для стратегии досрочки
                </div>
              </div>
            </div>

            {/* Основная сетка контента */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Ближайшие платежи (Занимает 2 колонки) */}
              <div className="lg:col-span-2 bg-white rounded-[24px] p-6 border border-gray-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.02)]">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-bold text-gray-900">Ближайшие платежи</h3>
                  <button className="text-sm font-medium text-gray-500 border border-gray-200 px-3 py-1.5 rounded-full hover:bg-gray-50 transition-colors">
                    Все долги
                  </button>
                </div>
                
                <div className="space-y-4">
                  {sortedDebts.map(debt => {
                    const daysLeft = getDaysDiff(debt.nextPaymentDate);
                    
                    // Математика долга на текущий месяц
                    const monthlyInterest = debt.rate > 0 ? (Number(debt.balance) * (Number(debt.rate) / 100)) / 12 : 0;
                    const principalPayment = Math.max(0, Number(debt.minPayment) - monthlyInterest);
                    const totalCurrentDebt = Number(debt.balance) + monthlyInterest;
                    
                    // Расчет для визуальной полосы платежа (защита от деления на ноль)
                    const safeMinPayment = Number(debt.minPayment) || 1;
                    const interestPercent = Math.min(100, (monthlyInterest / safeMinPayment) * 100) || 0;
                    const principalPercent = Math.max(0, 100 - interestPercent);

                    // Цветовые стили в зависимости от статуса
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
                        
                        {/* Основная часть карточки (кликабельная) */}
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
                               {!debt.isPaidThisMonth && (
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

                        {/* Развернутые детали договора */}
                        {expandedId === debt.id && (
                          <div className="p-4 border-t border-gray-100 bg-[#F8FAFC] rounded-b-2xl cursor-default" onClick={e => e.stopPropagation()}>
                            
                            {/* Новый блок: Структура долга и платежа */}
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

                              {debt.rate > 0 && (
                                <div className="pt-4 border-t border-gray-50">
                                  <div className="flex justify-between items-end mb-2">
                                    <span className="block text-xs text-gray-500 font-medium">Куда уходит ваш платеж ({formatMoney(debt.minPayment)}):</span>
                                  </div>
                                  <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden flex shadow-inner">
                                    <div className="bg-red-400 h-full transition-all duration-500" style={{ width: `${interestPercent}%` }}></div>
                                    <div className="bg-[#106A3C] h-full transition-all duration-500" style={{ width: `${principalPercent}%` }}></div>
                                  </div>
                                  <div className="flex justify-between mt-2 text-[11px] font-medium">
                                    <span className="text-red-500 flex items-center gap-1">
                                      <div className="w-2 h-2 rounded-full bg-red-400"></div>
                                      {formatMoney(monthlyInterest)} (Проценты)
                                    </span>
                                    <span className="text-[#106A3C] flex items-center gap-1">
                                      <div className="w-2 h-2 rounded-full bg-[#106A3C]"></div>
                                      {formatMoney(principalPayment)} (В счет долга)
                                    </span>
                                  </div>
                                </div>
                              )}
                            </div>

                            <h5 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                              <FileText size={16} className="text-gray-400" />
                              Условия договора
                            </h5>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                              {debt.details?.gracePeriod && (
                                <div>
                                  <span className="text-gray-500 block text-xs mb-0.5">Беспроцентный период:</span>
                                  <span className="font-medium text-gray-900">{debt.details.gracePeriod}</span>
                                </div>
                              )}
                              {debt.details?.penalty && (
                                <div>
                                  <span className="text-gray-500 block text-xs mb-0.5">Штраф за просрочку:</span>
                                  <span className="font-medium text-red-600">{debt.details.penalty}</span>
                                </div>
                              )}
                              <div className="md:col-span-2">
                                <span className="text-gray-500 block text-xs mb-1">Краткая выжимка (AI-анализ):</span>
                                <p className="text-gray-700 leading-relaxed bg-white p-3 rounded-xl border border-gray-100 shadow-sm text-xs sm:text-sm">
                                  {debt.details?.summary || 'Условия не добавлены.'}
                                </p>
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

              {/* Стратегия погашения (Правая колонка) */}
              <div className="bg-white rounded-[24px] p-6 border border-gray-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.02)] flex flex-col">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-bold text-gray-900">Стратегия</h3>
                </div>

                {/* Переключатель стратегий */}
                <div className="bg-gray-50 p-1 rounded-xl flex mb-6">
                  <button 
                    onClick={() => setStrategy('avalanche')}
                    className={`flex-1 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all ${strategy === 'avalanche' ? 'bg-white text-gray-900 shadow-sm border border-gray-100' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    Лавина (Выгода)
                  </button>
                  <button 
                    onClick={() => setStrategy('snowball')}
                    className={`flex-1 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all ${strategy === 'snowball' ? 'bg-white text-gray-900 shadow-sm border border-gray-100' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    Снежный ком
                  </button>
                </div>

                <div className="flex-1 flex flex-col justify-center">
                  {Number(freeMoney) > 0 && totalDebt > 0 ? (
                    <div>
                      <p className="text-sm font-medium text-gray-500 mb-4 text-center">
                        Куда направить свободные средства:
                      </p>
                      <div className="space-y-3">
                        {Object.entries(strategyAllocation).map(([id, amount]) => {
                          if (amount <= 0) return null;
                          const debt = debts.find(d => d.id === parseInt(id));
                          return (
                            <div key={id} className="flex justify-between items-center p-3 bg-gray-50 rounded-xl border border-gray-100">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-[#106A3C]/10 text-[#106A3C] flex items-center justify-center">
                                  <TrendingDown size={14} />
                                </div>
                                <span className="text-sm font-medium text-gray-700 truncate max-w-[120px] sm:max-w-xs">{debt.name}</span>
                              </div>
                              <span className="font-bold text-[#106A3C]">+{formatMoney(amount)}</span>
                            </div>
                          );
                        })}
                      </div>
                      
                      {/* Визуальный круг (имитация Project Progress из референса) */}
                      <div className="mt-8 flex justify-center relative">
                        <svg className="w-32 h-32 transform -rotate-90">
                          <circle cx="64" cy="64" r="56" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-gray-100" />
                          <circle cx="64" cy="64" r="56" stroke="currentColor" strokeWidth="12" fill="transparent" strokeDasharray="351.8" strokeDashoffset="150" className="text-[#106A3C]" />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className="text-2xl font-bold text-gray-900">План</span>
                          <span className="text-xs text-gray-500">активен</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-300">
                        <Wallet size={32} />
                      </div>
                      <p className="text-sm text-gray-500">Добавьте свободные средства для расчета оптимального плана закрытия.</p>
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>
        </div>
      </main>

      {/* Модальное окно добавления (Светлая тема) */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-gray-100 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-6 md:p-8">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-900">Новый долг</h3>
                <button onClick={() => setIsAddModalOpen(false)} className="text-gray-400 hover:text-gray-900 bg-gray-50 p-2 rounded-full transition-colors">
                  <X size={20} />
                </button>
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
                    <span>Краткие условия (ИИ выжимка)</span>
                    <span className="text-xs text-gray-400 font-normal">Необязательно</span>
                  </label>
                  <textarea 
                    value={newDebt.detailsSummary} 
                    onChange={e => setNewDebt({...newDebt, detailsSummary: e.target.value})} 
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 text-gray-900 focus:outline-none focus:border-[#106A3C] focus:bg-white transition-colors resize-none h-24 text-sm" 
                    placeholder="Сюда можно вставить результат анализа договора. Например: Грейс 120 дней. При просрочке неустойка 20% годовых. Скрытая страховка 1.2%."
                  />
                </div>

                <div className="pt-2">
                  <button type="submit" className="w-full bg-[#106A3C] hover:bg-[#0c502d] text-white font-medium py-3.5 rounded-xl transition-colors shadow-lg shadow-[#106A3C]/20">
                    Добавить в дашборд
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
