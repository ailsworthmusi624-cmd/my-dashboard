import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard, PieChart, Calendar as CalendarIcon,
  Calculator, Target, Users, Plus, Wallet, Scissors, Receipt, PieChart as PieChartIcon,
  Cloud, CloudOff, Loader2, Sparkles
} from 'lucide-react';
import useAppStore, { initFirebaseSync } from './store/useAppStore';
import { askSmartAssistant } from './shared/utils/aiService';

const GEMINI_KEY = import.meta.env.VITE_GEMINI_KEY;

const AiSearchBarInline = () => {
  const [q, setQ] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [answer, setAnswer] = React.useState('');
  const [open, setOpen] = React.useState(false);

  const ask = async () => {
    if (!q.trim() || !GEMINI_KEY) { setAnswer('Нет API ключа (VITE_GEMINI_KEY)'); setOpen(true); return; }
    setLoading(true); setOpen(true); setAnswer('');
    try {
      const state = useAppStore.getState();
      const journal = state.journal || [];
      const expenses = state.expenses || [];
      let revenue = 0, payroll = 0;
      journal.forEach(e => {
        (e.services||[]).forEach(s => { const a = Number(s.amount)||0; revenue += a; payroll += a*(Number(s.rate)||0)/100; });
      });
      const totalExpenses = expenses.reduce((s,e) => s + (Number(e.amount)||0), 0);
      const net = revenue - payroll - totalExpenses;

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: `Ты финансовый ассистент салона красоты Freedom. Данные за месяц: Выручка ${revenue.toLocaleString('ru')}₽, ФОТ ${payroll.toLocaleString('ru')}₽, Расходы ${totalExpenses.toLocaleString('ru')}₽, Чистая прибыль ~${net.toLocaleString('ru')}₽. Вопрос пользователя: "${q}". Ответь кратко по-русски, 2-3 предложения.` }] }]
          })
        }
      );
      const data = await res.json();
      setAnswer(data.candidates?.[0]?.content?.parts?.[0]?.text || 'Нет ответа');
    } catch(e) { setAnswer('Ошибка запроса к AI'); }
    setLoading(false);
  };

  return (
    <div className="flex-1 min-w-0 relative">
      <div className="flex items-center bg-slate-100 rounded-xl px-3 py-1.5 gap-2">
        <Sparkles size={12} className="text-purple-400 shrink-0"/>
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && ask()}
          placeholder="Спросить AI..."
          className="bg-transparent text-xs font-medium outline-none flex-1 min-w-0 text-slate-700 placeholder-slate-400"
        />
        {loading && <Loader2 size={12} className="animate-spin text-purple-400 shrink-0"/>}
      </div>
      {open && answer && (
        <div className="absolute top-full mt-1 left-0 right-0 bg-white border border-slate-200 rounded-2xl p-3 shadow-xl z-50 text-xs text-slate-700 leading-relaxed">
          {answer}
          <button onClick={() => { setOpen(false); setQ(''); setAnswer(''); }} className="block mt-2 text-slate-400 font-bold text-[10px]">✕ Закрыть</button>
        </div>
      )}
    </div>
  );
};

const SafeWithdrawalBadge = () => {
  const journal = useAppStore(s => s.journal ?? []);
  const expenses = useAppStore(s => s.expenses ?? []);

  const safe = React.useMemo(() => {
    let revenue = 0, payroll = 0, bankComm = 0;
    journal.forEach(e => {
      let rev = 0;
      (e.services||[]).forEach(s => { const a = Number(s.amount)||0; rev += a; payroll += a*(Number(s.rate)||0)/100; });
      (e.goods||[]).forEach(g => { const a = Number(g.amount)||0; rev += a; payroll += a*(Number(g.rate)||0)/100; });
      revenue += rev;
      if (e.paymentMethod === 'card') bankComm += rev * 0.029;
      else if (e.paymentMethod === 'sbp') bankComm += rev * 0.007;
    });
    const fixed = expenses.reduce((s, e) => s + (Number(e.amount)||0), 0);
    const variable = payroll + bankComm + revenue * 0.06;
    const net = revenue - fixed - variable;
    const tax = revenue * 0.03;
    const ins = net > 0 ? net * 0.1 : 0;
    return Math.max(0, net - tax - ins);
  }, [journal, expenses]);

  return (
    <div className="flex items-center gap-1.5 bg-emerald-500 text-white rounded-xl px-3 py-1.5 shrink-0">
      <Wallet size={12}/>
      <span className="text-xs font-black hidden sm:inline">{Math.round(safe).toLocaleString('ru')} ₽</span>
      <span className="text-xs font-black sm:hidden">{Math.round(safe/1000)}к ₽</span>
    </div>
  );
};
import Calculators from './workspaces/personal/tabs/Calculators';
import Investing from './workspaces/personal/tabs/Investing';
import Analytics from './workspaces/personal/tabs/Analytics';
import SalonDashboard from './workspaces/salon/tabs/SalonDashboard';
import Journal from './workspaces/salon/tabs/Journal';
import Masters from './workspaces/salon/tabs/Masters';
import Expenses from './workspaces/salon/tabs/Expenses';
import PnL from './workspaces/salon/tabs/PnL';

function App() {
  const [isAuthed, setIsAuthed] = useState(() => localStorage.getItem('freedom_auth') === 'true');
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [authError, setAuthError] = useState(false);

  const handleLogin = () => {
    if (login === 'admin' && password === '5712') {
      if (remember) localStorage.setItem('freedom_auth', 'true');
      setIsAuthed(true);
    } else {
      setAuthError(true);
    }
  };

  // Глобальный роутер
  const getInitialState = () => {
    const hash = window.location.hash.replace('#', '');
    const [ws, tab] = hash.split('/');
    const validWs = ['personal', 'salon'].includes(ws) ? ws : 'salon';
    const validTabs = { personal: ['dashboard','analytics','calculators','investing'], salon: ['dashboard','appointments','expenses','pnl','masters'] };
    const validTab = validTabs[validWs]?.includes(tab) ? tab : 'dashboard';
    return { workspace: validWs, activeTab: validTab };
  };

  const initial = getInitialState();
  const [workspace, setWorkspace] = useState(initial.workspace);
  const [activeTab, setActiveTab] = useState(initial.activeTab);

  // Подключаем стор безопасно (с fallback на пустой массив)
  const debts = useAppStore(s => s.debts ?? []);
  const appointments = useAppStore(s => s.appointments ?? []);

  useEffect(() => {
    initFirebaseSync();
  }, []);

  const isLoading = useAppStore(s => s.isLoading);
  const isLocalFallback = useAppStore(s => s.isLocalFallback);

  // Синхронизация URL при смене вкладки
  useEffect(() => {
    window.location.hash = `${workspace}/${activeTab}`;
  }, [workspace, activeTab]);

  // Обработка кнопки "Назад"
  useEffect(() => {
    const onPop = () => {
      const { workspace: ws, activeTab: tab } = getInitialState();
      setWorkspace(ws);
      setActiveTab(tab);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const navigate = (ws, tab = 'dashboard') => {
    const newHash = `${ws}/${tab}`;
    if (window.location.hash !== '#' + newHash) {
      window.history.pushState(null, '', '#' + newHash);
    }
    setWorkspace(ws);
    setActiveTab(tab);
  };

  const personalTabs = [
    { id: 'dashboard', icon: <LayoutDashboard size={22} />, label: 'Дашборд' },
    { id: 'analytics', icon: <PieChart size={22} />, label: 'Аналитика' },
    { id: 'calculators', icon: <Calculator size={22} />, label: 'Расчёты' },
    { id: 'investing', icon: <Target size={22} />, label: 'Капитал' },
  ];

  const salonTabs = [
    { id: 'dashboard', icon: <LayoutDashboard size={22} />, label: 'Сводка' },
    { id: 'appointments', icon: <CalendarIcon size={22} />, label: 'Записи' },
    { id: 'expenses', icon: <Receipt size={22} />, label: 'Расходы' },
    { id: 'pnl', icon: <PieChartIcon size={22} />, label: 'P&L' },
    { id: 'masters', icon: <Users size={22} />, label: 'Мастера' },
  ];

  const currentTabs = workspace === 'personal' ? personalTabs : salonTabs;
  const activeTabData = currentTabs.find(t => t.id === activeTab) || currentTabs[0];

  // Переключатель рабочих пространств (используется и в мобильной шапке, и в десктопном сайдбаре)
  const WorkspaceSwitcher = () => (
    <div className="glass-inner rounded-full p-1 flex items-center">
      <button
        onClick={() => navigate('personal')}
        className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 text-xs font-bold transition-all ${workspace === 'personal' ? 'bg-white text-primary shadow-sm rounded-full' : 'text-on-surface-variant rounded-full'}`}
      >
        <Wallet size={16}/> Финансы
      </button>
      <button
        onClick={() => navigate('salon')}
        className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 text-xs font-bold transition-all ${workspace === 'salon' ? 'bg-white text-primary shadow-sm rounded-full' : 'text-on-surface-variant rounded-full'}`}
      >
        <Scissors size={16}/> Салон
      </button>
    </div>
  );

  if (!isAuthed) {
    return (
      <div className="h-[100svh] flex items-center justify-center bg-gradient-to-br from-slate-100 via-blue-50/40 to-slate-200">
        <div className="w-full max-w-sm mx-4 bg-white/70 backdrop-blur-2xl border border-white/80 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-8 flex flex-col items-center gap-5">

          <div className="w-16 h-16 rounded-2xl bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-200">
            <span className="text-white text-2xl font-black">F</span>
          </div>

          <div className="text-center">
            <h1 className="text-2xl font-black text-slate-900">Freedom</h1>
            <p className="text-sm text-slate-400 mt-1">Управление салоном красоты</p>
          </div>

          <div className="w-full flex flex-col gap-3">
            <input
              type="text"
              placeholder="Логин"
              value={login}
              onChange={e => { setLogin(e.target.value); setAuthError(false); }}
              className="w-full bg-white/80 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-emerald-400 transition-colors"
            />
            <input
              type="password"
              placeholder="Пароль"
              value={password}
              onChange={e => { setPassword(e.target.value); setAuthError(false); }}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              className="w-full bg-white/80 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-emerald-400 transition-colors"
            />
          </div>

          {authError && <p className="text-xs text-red-400 font-medium -mt-1">Неверный логин или пароль</p>}

          <label className="flex items-center gap-2 text-sm text-slate-500 cursor-pointer self-start">
            <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)}
              className="accent-emerald-500 w-4 h-4 rounded" />
            Запомнить меня
          </label>

          <button onClick={handleLogin}
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl py-3.5 transition-colors shadow-md shadow-emerald-100">
            Войти
          </button>

          <p className="text-[11px] text-slate-300 text-center">Данные синхронизируются через Telegram бот</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[100svh] flex overflow-hidden font-sans text-slate-900 bg-slate-50">

      {/* Ambient Background */}
      <div className="fixed inset-0 z-[-1] pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-primary/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-[20%] left-[-20%] w-[600px] h-[600px] bg-[#4fdbc8]/10 rounded-full blur-[120px]" />
      </div>

      {/* ─── DESKTOP SIDEBAR ─── */}
      <aside className="hidden lg:flex w-72 border-r border-white/20 flex-col z-20" style={{background: 'rgba(255,255,255,0.45)', backdropFilter: 'blur(24px)'}}>
        <div className="p-6">
          <h1 className="text-2xl font-black tracking-tight text-slate-900 mb-6">Freedom.</h1>
          <WorkspaceSwitcher />
        </div>
        
        <nav className="flex-1 px-4 space-y-1">
          {currentTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => navigate(workspace, tab.id)}
              className={`w-full flex items-center gap-3 p-4 rounded-2xl font-bold text-sm transition-all ${activeTab === tab.id ? 'bg-primary-container/80 text-on-primary-container shadow-sm' : 'text-on-surface-variant hover:bg-white/40'}`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </nav>

        <div className="p-6 border-t border-slate-100">
          <button className="w-full py-4 rounded-2xl font-bold text-white flex items-center justify-center gap-2 shadow-lg bg-primary hover:bg-primary/90 transition-all hover:scale-[1.02]">
            <Plus size={20}/> 
            {workspace === 'personal' ? 'Добавить долг' : 'Новая запись'}
          </button>
        </div>
      </aside>

      {/* ─── MAIN CONTENT AREA ─── */}
      <div className="flex-1 flex flex-col h-full relative overflow-hidden">
        
        {/* MOBILE HEADER */}
        <header className="glass-header lg:hidden px-6 py-4 flex flex-col gap-3 sticky top-0 z-50 shrink-0">
          <WorkspaceSwitcher />
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative flex-1 min-w-0">
              <input
                placeholder="Спросить AI..."
                className="w-full bg-white/40 border border-white/20 text-on-surface placeholder:text-on-surface-variant/60 rounded-full py-2.5 pl-10 pr-4 outline-none focus:ring-2 focus:ring-primary/50 transition-shadow text-sm font-medium"
                readOnly
              />
              <Sparkles size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-primary/70" />
            </div>
            <SafeWithdrawalBadge />
          </div>
        </header>

        {/* PAGE CONTENT */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-8 pb-24 lg:pb-8">
          <div className="max-w-5xl mx-auto">
            {workspace === 'personal' && activeTab === 'calculators' && <Calculators />}
            {workspace === 'personal' && activeTab === 'investing' && <Investing />}
            {workspace === 'personal' && activeTab === 'analytics' && <Analytics />}

            {/* Рендеринг контента Салон красоты */}
            {workspace === 'salon' && activeTab === 'dashboard' && <SalonDashboard />}
            {workspace === 'salon' && activeTab === 'appointments' && <Journal />}
            {workspace === 'salon' && activeTab === 'expenses' && <Expenses />}
            {workspace === 'salon' && activeTab === 'pnl' && <PnL />}
            {workspace === 'salon' && activeTab === 'masters' && <Masters />}

            {/* Placeholder для контента */}
            {!(workspace === 'personal' && ['calculators', 'investing', 'analytics'].includes(activeTab)) &&
             !(workspace === 'salon' && ['dashboard', 'appointments', 'expenses', 'pnl', 'masters'].includes(activeTab)) && (
              <div className="bg-white/50 backdrop-blur-md p-10 rounded-[32px] border border-white/70 shadow-sm border-dashed text-center mt-4">
                <div className={`w-20 h-20 mx-auto mb-5 rounded-[24px] flex items-center justify-center ${workspace === 'personal' ? 'bg-slate-50 text-slate-400' : 'bg-purple-50 text-purple-400'}`}>
                  {activeTabData.icon}
                </div>
                <h2 className="text-2xl font-black text-slate-900 mb-2">
                  {activeTabData.label}
                </h2>
                <p className="text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
                  Здесь будет интерфейс для вкладки «{activeTabData.label}» рабочей среды «{workspace === 'personal' ? 'Личные финансы' : 'Салон красоты'}».
                </p>
              </div>
            )}
            
            {/* Статус синхронизации */}
            <div className="mt-8 p-5 bg-white/50 backdrop-blur-md border border-white/70 rounded-3xl text-xs text-slate-500 font-bold text-center flex items-center justify-center gap-2 shadow-sm">
              {isLoading ? (
                <><Loader2 size={16} className="animate-spin text-indigo-500" /> Синхронизация с облаком...</>
              ) : isLocalFallback ? (
                <><CloudOff size={16} className="text-orange-500" /> Офлайн режим (Данные сохранены локально)</>
              ) : (
                <><Cloud size={16} className="text-emerald-500" /> Подключено к Firebase (Автосохранение активно)</>
              )}
            </div>
          </div>
        </main>

        {/* ─── MOBILE BOTTOM TAB BAR ─── */}
        <nav className="glass-card lg:hidden fixed bottom-6 left-6 right-6 z-50 flex justify-around items-center h-[72px] px-2 shadow-xl">
          {currentTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => navigate(workspace, tab.id)}
              className={`flex flex-col items-center justify-center px-4 py-2 rounded-2xl transition-all active:scale-95 ${
                activeTab === tab.id
                  ? 'bg-primary-container/90 text-on-primary-container scale-105'
                  : 'text-on-surface-variant/70 hover:bg-white/20'
              }`}
            >
              {tab.icon}
              <span className="text-[11px] font-medium mt-1">{tab.label}</span>
            </button>
          ))}
        </nav>

      </div>
    </div>
  );
}

export default App;
