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
    <div className="flex bg-slate-100 p-1 rounded-xl">
      <button 
        onClick={() => setWorkspace('personal')} 
        className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all ${workspace === 'personal' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
      >
        <Wallet size={16}/> Финансы
      </button>
      <button 
        onClick={() => setWorkspace('salon')} 
        className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all ${workspace === 'salon' ? 'bg-white text-purple-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
      >
        <Scissors size={16}/> Салон
      </button>
    </div>
  );

  return (
    <div className="h-[100svh] bg-slate-50 flex overflow-hidden font-sans text-slate-900">
      
      {/* ─── DESKTOP SIDEBAR ─── */}
      <aside className="hidden lg:flex w-72 bg-white border-r border-slate-100 flex-col z-20">
        <div className="p-6">
          <h1 className="text-2xl font-black tracking-tight text-slate-900 mb-6">Freedom.</h1>
          <WorkspaceSwitcher />
        </div>
        
        <nav className="flex-1 px-4 space-y-1">
          {currentTabs.map(tab => (
            <button 
              key={tab.id} 
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 p-4 rounded-2xl font-bold text-sm transition-all ${activeTab === tab.id ? (workspace === 'personal' ? 'bg-slate-900 text-white shadow-md' : 'bg-purple-50 text-purple-700') : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'}`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </nav>

        <div className="p-6 border-t border-slate-100">
          <button className={`w-full py-4 rounded-2xl font-bold text-white flex items-center justify-center gap-2 shadow-lg transition-transform hover:scale-[1.02] ${workspace === 'personal' ? 'bg-emerald-600 shadow-emerald-200' : 'bg-purple-600 shadow-purple-200'}`}>
            <Plus size={20}/> 
            {workspace === 'personal' ? 'Добавить долг' : 'Новая запись'}
          </button>
        </div>
      </aside>

      {/* ─── MAIN CONTENT AREA ─── */}
      <div className="flex-1 flex flex-col h-full relative overflow-hidden">
        
        {/* MOBILE HEADER */}
        <header className="lg:hidden bg-white border-b border-slate-100 px-4 py-3 flex flex-col gap-3 z-20 shrink-0">
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
              <div className="bg-white p-10 rounded-[32px] border border-slate-100 shadow-sm border-dashed text-center mt-4">
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
            <div className="mt-8 p-5 bg-white border border-slate-100 rounded-3xl text-xs text-slate-500 font-bold text-center flex items-center justify-center gap-2 shadow-sm">
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
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-slate-100 z-50 px-2 pb-[env(safe-area-inset-bottom)] flex justify-around items-center h-[72px] shadow-[0_-10px_20px_rgba(0,0,0,0.03)]">
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
