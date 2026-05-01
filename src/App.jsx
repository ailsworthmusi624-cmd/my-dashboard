import React, { useState, useEffect, useMemo } from 'react';
import Dashboard from './tabs/Dashboard';
import { useDashboardData } from './hooks/useDashboardData';
import { Download, Sparkles } from 'lucide-react';
import AdvisorChat from './shared/ai/AdvisorChat';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const { data: debts, loading } = useDashboardData();
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  useEffect(() => {
    const handler = (e) => {
      // Предотвращаем автоматический показ промпта
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  return (
    <div className="app-container">
      <nav>
        <button onClick={() => setActiveTab('dashboard')}>Дашборд</button>
        <button onClick={() => setActiveTab('analytics')}>Аналитика</button>
        <button 
          onClick={() => setIsAiOpen(true)}
          className="flex items-center gap-2 bg-emerald-50 text-emerald-600 px-4 py-2 rounded-2xl font-black text-xs hover:bg-emerald-100 transition-all border border-emerald-200 shadow-sm"
        >
          <Sparkles size={16} /> AI Советник
        </button>

        {isAiOpen && (
          <AdvisorChat 
            debts={debts} 
            freeMoney={freeMoney} 
            deposits={deposits} 
            onClose={() => setIsAiOpen(false)} 
          />
        )}
        {deferredPrompt && (
          <button 
            onClick={handleInstallClick}
            className="ml-auto flex items-center gap-2 bg-[#10b981] text-white px-3 py-1 rounded-md text-sm transition-opacity hover:opacity-90"
          >
            <Download size={16} /> Установить
          </button>
        )}
      </nav>

      <main>
        {loading && <p>Загрузка...</p>}
        {activeTab === 'dashboard' && <Dashboard debts={debts} />}
      </main>
    </div>
  );
}

export default App;