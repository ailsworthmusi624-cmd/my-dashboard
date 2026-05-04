import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Calendar, ChevronDown, ChevronUp } from 'lucide-react';
import useAppStore from '../../../store/useAppStore';
import AddJournalModal from '../../../shared/modals/AddJournalModal';
import AiSearchBar from '../../../shared/components/AiSearchBar';

export default function Journal() {
  const journal = useAppStore(s => s.journal || []);
  const deleteJournalEntry = useAppStore(s => s.deleteJournalEntry);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [expandedMasters, setExpandedMasters] = useState({});

  // 1. Группировка по датам
  const grouped = journal.reduce((acc, entry) => {
    const d = entry.date;
    if (!acc[d]) acc[d] = [];
    acc[d].push(entry);
    return acc;
  }, {});

  // Сортировка дат по убыванию (новые сверху)
  const sortedDates = Object.keys(grouped).sort((a, b) => new Date(b) - new Date(a));

  const handleEdit = (entry) => {
    setEditingEntry(entry);
    setIsModalOpen(true);
  };

  const handleNew = () => {
    setEditingEntry(null);
    setIsModalOpen(true);
  };

  const handleNewWithMaster = (date, masterName) => {
    setEditingEntry({ isNew: true, date, masterName });
    setIsModalOpen(true);
  };

  const toggleMaster = (date, masterName) => {
    const key = `${date}_${masterName}`;
    setExpandedMasters(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleDelete = (id) => {
    if (window.confirm('Вы уверены, что хотите удалить эту запись?')) {
      deleteJournalEntry(id);
    }
  };

  // 2. Форматирование заголовка карточки дня (например: "2 мая, четверг")
  const formatDate = (dateString) => {
    const d = new Date(dateString);
    return new Intl.DateTimeFormat('ru-RU', { 
      day: 'numeric', 
      month: 'long', 
      weekday: 'long' 
    }).format(d);
  };

  return (
    <div className="space-y-6 pb-8">
      <AiSearchBar />
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black text-slate-900 tracking-tight">Журнал</h2>
        <button 
          onClick={handleNew}
          className="flex items-center gap-2 bg-purple-600 text-white px-5 py-3 rounded-2xl font-bold shadow-lg shadow-purple-200 hover:bg-purple-700 transition-all active:scale-95"
        >
          <Plus size={20} /> <span className="hidden sm:inline">Новая запись</span>
        </button>
      </div>

      <div className="space-y-6">
        {sortedDates.map((date) => {
          const entries = grouped[date];
          
          // Группировка по мастерам внутри дня
          const mastersGroup = entries.reduce((acc, entry) => {
            if (!acc[entry.masterName]) acc[entry.masterName] = [];
            acc[entry.masterName].push(entry);
            return acc;
          }, {});
          
          let totalRevenue = 0;
          let totalPayroll = 0;

          entries.forEach(entry => {
            const srvTotal = (entry.services || []).reduce((acc, s) => acc + Number(s.amount || 0), 0);
            const goodsTotal = (entry.goods || []).reduce((acc, g) => acc + Number(g.amount || 0), 0);
            totalRevenue += (srvTotal + goodsTotal);

            const srvPay = (entry.services || []).reduce((acc, s) => acc + (Number(s.amount || 0) * (Number(s.rate || 0) / 100)), 0);
            const goodsPay = (entry.goods || []).reduce((acc, g) => acc + (Number(g.amount || 0) * (Number(g.rate || 0) / 100)), 0);
            totalPayroll += (srvPay + goodsPay);
          });
          
          return (
            <div key={date} className="bg-white rounded-[32px] p-5 sm:p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 animate-in fade-in slide-in-from-bottom-2 duration-300">
              
              {/* Заголовок карточки дня со сводной статистикой */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-5 pb-5 border-b border-slate-100">
                <h3 className="text-lg font-black text-slate-900 capitalize tracking-tight">
                  {formatDate(date)}
                </h3>
                <div className="flex flex-wrap items-center gap-3 text-xs font-bold text-slate-600 bg-slate-50 px-4 py-2.5 rounded-2xl border border-slate-100/50">
                  <span>Выручка: <span className="text-emerald-600 ml-1">{totalRevenue.toLocaleString()} ₽</span></span>
                  <span className="text-slate-300">|</span>
                  <span>Чеков: <span className="text-slate-900 ml-1">{entries.length}</span></span>
                  <span className="text-slate-300">|</span>
                  <span>ФОТ: <span className="text-rose-500 ml-1">{totalPayroll.toLocaleString()} ₽</span></span>
                </div>
              </div>

              {/* 3. Список мастеров внутри дня */}
              <div className="space-y-3">
                {Object.entries(mastersGroup).map(([masterName, mEntries]) => {
                  const key = `${date}_${masterName}`;
                  const isExpanded = expandedMasters[key];

                  let mRev = 0;
                  let mPay = 0;
                  mEntries.forEach(entry => {
                    const entryRev = (entry.services || []).reduce((a, s) => a + Number(s.amount || 0), 0) + (entry.goods || []).reduce((a, g) => a + Number(g.amount || 0), 0);
                    const entryPay = (entry.services || []).reduce((a, s) => a + (Number(s.amount || 0) * (Number(s.rate || 0) / 100)), 0) + (entry.goods || []).reduce((a, g) => a + (Number(g.amount || 0) * (Number(g.rate || 0) / 100)), 0);
                    mRev += entryRev;
                    mPay += entryPay;
                  });

                  return (
                    <div key={masterName} className="bg-slate-50 rounded-[24px] border border-slate-100 overflow-hidden transition-all">
                      <div 
                        onClick={() => toggleMaster(date, masterName)}
                        className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-100/80 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${isExpanded ? 'bg-indigo-100 text-indigo-600' : 'bg-white text-slate-400 shadow-sm'}`}>
                             {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </div>
                          <div className="flex flex-col">
                            <h4 className="font-bold text-slate-900">{masterName}</h4>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{mEntries.length} {mEntries.length === 1 ? 'чек' : 'чеков'}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-black text-indigo-600">{mRev.toLocaleString()} ₽</div>
                          <div className="text-[10px] font-bold text-rose-500 mt-0.5">ФОТ: {mPay.toLocaleString()} ₽</div>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="p-2 border-t border-slate-100 bg-white">
                          <div className="space-y-1">
                            {mEntries.map((entry, idx) => {
                              const entryRev = (entry.services || []).reduce((a, s) => a + Number(s.amount || 0), 0) + (entry.goods || []).reduce((a, g) => a + Number(g.amount || 0), 0);
                              const entryPay = (entry.services || []).reduce((a, s) => a + (Number(s.amount || 0) * (Number(s.rate || 0) / 100)), 0) + (entry.goods || []).reduce((a, g) => a + (Number(g.amount || 0) * (Number(g.rate || 0) / 100)), 0);
                              const servicesStr = (entry.services || []).map(s => s.title).join(', ');
                              
                              return (
                                <div key={entry.id}>
                                  <div 
                                    onClick={() => handleEdit(entry)}
                                    className="group flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-3 rounded-2xl hover:bg-slate-50 cursor-pointer transition-colors"
                                  >
                                    <div className="flex-1 grid grid-cols-2 lg:grid-cols-3 gap-4 items-center">
                                      <div className="flex flex-col col-span-2 lg:col-span-1">
                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Услуги</span>
                                        <span className="text-sm font-bold text-slate-900 truncate">{servicesStr || 'Товары'}</span>
                                      </div>
                                      <div className="flex flex-col">
                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Оплата</span>
                                        <span className="text-sm font-semibold text-slate-700 truncate">
                                          {entry.paymentMethod === 'card' ? '💳 Карта' : entry.paymentMethod === 'sbp' ? '📱 СБП' : '💵 Наличные'}
                                        </span>
                                      </div>
                                      <div className="flex flex-col lg:items-end">
                                        <span className="text-sm font-black text-emerald-600">{entryRev.toLocaleString()} ₽</span>
                                        <span className="text-[10px] font-bold text-rose-500 mt-0.5">ФОТ: {entryPay.toLocaleString()} ₽</span>
                                      </div>
                                    </div>
                                    
                                    <div className="flex items-center justify-end gap-1.5 opacity-100 lg:opacity-0 group-hover:opacity-100 transition-opacity">
                                      <button 
                                        onClick={(e) => { e.stopPropagation(); handleEdit(entry); }}
                                        className="p-2 text-slate-400 hover:bg-white hover:text-indigo-600 rounded-xl shadow-sm border border-transparent hover:border-slate-200 transition-all bg-slate-50 lg:bg-transparent"
                                      >
                                        <Edit2 size={16} />
                                      </button>
                                      <button 
                                        onClick={(e) => { e.stopPropagation(); handleDelete(entry.id); }}
                                        className="p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600 rounded-xl shadow-sm border border-transparent hover:border-rose-100 transition-all bg-slate-50 lg:bg-transparent"
                                      >
                                        <Trash2 size={16} />
                                      </button>
                                    </div>
                                  </div>
                                  {idx !== mEntries.length - 1 && <div className="h-px bg-slate-100/70 mx-3 my-1" />}
                                </div>
                              );
                            })}
                          </div>
                          <div className="p-2 mt-1">
                            <button 
                              onClick={() => handleNewWithMaster(date, masterName)}
                              className="w-full py-3 bg-indigo-50/50 hover:bg-indigo-100/50 text-indigo-600 border border-indigo-100 border-dashed rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors"
                            >
                              <Plus size={14} /> Добавить чек мастеру {masterName}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
        {sortedDates.length === 0 && (
          <div className="text-center py-16 bg-white rounded-[32px] border border-slate-100 border-dashed animate-in fade-in">
            <div className="w-20 h-20 mx-auto mb-5 rounded-[24px] flex items-center justify-center bg-purple-50 text-purple-400">
              <Calendar size={32} />
            </div>
            <h3 className="text-xl font-black text-slate-900 mb-2">Журнал пуст</h3>
            <p className="text-sm text-slate-500 max-w-sm mx-auto">
              Нажмите кнопку «Новая запись», чтобы добавить первый визит клиента.
            </p>
          </div>
        )}
      </div>

      {/* 4. Функционал модалки (Интеграция существующей AddJournalModal) */}
      <AddJournalModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        editData={editingEntry}
      />
    </div>
  );
}