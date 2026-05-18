import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, PieChart, Calendar as CalendarIcon, 
  Calculator, Target, Users, Plus, Wallet, Scissors, Receipt, PieChart as PieChartIcon,
  Cloud, CloudOff, Loader2
} from 'lucide-react';
import useAppStore, { initFirebaseSync } from './store/useAppStore';
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
  const [workspace, setWorkspace] = useState('personal'); // 'personal' | 'salon'
  const [activeTab, setActiveTab] = useState('dashboard');

  // Подключаем стор безопасно (с fallback на пустой массив)
  const debts = useAppStore(s => s.debts ?? []);
  const appointments = useAppStore(s => s.appointments ?? []);

  useEffect(() => {
    initFirebaseSync();
  }, []);

  const isLoading = useAppStore(s => s.isLoading);
  const isLocalFallback = useAppStore(s => s.isLocalFallback);

  // Сброс вкладки при смене рабочего пространства
  useEffect(() => {
    setActiveTab('dashboard');
  }, [workspace]);

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
    <div className="flex bg-black/5 backdrop-blur-md p-1 rounded-xl">
      <button 
        onClick={() => setWorkspace('personal')} 
        className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all ${workspace === 'personal' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
      >
        <Wallet size={16}/> Финансы
      </button>
      <button 
        onClick={() => setWorkspace('salon')} 
        className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all ${workspace === 'salon' ? 'bg-white shadow-sm text-purple-700' : 'text-slate-500 hover:text-slate-700'}`}
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
      
      {/* ─── DESKTOP SIDEBAR ─── */}
      <aside className="hidden lg:flex w-72 bg-white/40 backdrop-blur-2xl border-r border-white/40 flex-col z-20">
        <div className="p-6">
          <h1 className="text-2xl font-black tracking-tight text-slate-900 mb-6">Freedom.</h1>
          <WorkspaceSwitcher />
        </div>
        
        <nav className="flex-1 px-4 space-y-1">
          {currentTabs.map(tab => (
            <button 
              key={tab.id} 
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 p-4 rounded-2xl font-bold text-sm transition-all ${activeTab === tab.id ? (workspace === 'personal' ? 'bg-slate-900/90 backdrop-blur-sm text-white shadow-md' : 'bg-emerald-50/80 backdrop-blur-sm text-emerald-700') : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'}`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </nav>

        <div className="p-6 border-t border-slate-100">
          <button className={`w-full py-4 rounded-2xl font-bold text-white flex items-center justify-center gap-2 shadow-lg transition-transform hover:scale-[1.02] ${workspace === 'personal' ? 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-200' : 'bg-purple-600 shadow-purple-200'}`}>
            <Plus size={20}/> 
            {workspace === 'personal' ? 'Добавить долг' : 'Новая запись'}
          </button>
        </div>
      </aside>

      {/* ─── MAIN CONTENT AREA ─── */}
      <div className="flex-1 flex flex-col h-full relative overflow-hidden">
        
        {/* MOBILE HEADER */}
        <header className="lg:hidden bg-white/40 backdrop-blur-2xl border-b border-white/40 px-4 py-3 flex flex-col gap-3 z-20 shrink-0">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-black tracking-tight text-slate-900">Freedom.</h1>
          </div>
          <WorkspaceSwitcher />
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
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/70 backdrop-blur-xl border-t border-white/80 z-50 px-2 pb-[env(safe-area-inset-bottom)] flex justify-around items-center h-[72px] shadow-[0_-10px_20px_rgba(0,0,0,0.03)]">
          {currentTabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex flex-col items-center justify-center flex-1 gap-1.5 transition-colors ${activeTab === tab.id ? (workspace === 'personal' ? 'text-slate-900' : 'text-purple-600') : 'text-slate-400 hover:text-slate-500'}`}>
              {tab.icon}
              <span className="text-[9px] font-black truncate text-center">{tab.label}</span>
            </button>
          ))}

        </nav>

      </div>
    </div>
  );
}

export default App;
