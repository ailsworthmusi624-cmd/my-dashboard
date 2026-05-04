import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Calendar, User, Scissors } from 'lucide-react';
import useAppStore from '../../store/useAppStore';

export default function AddJournalModal({ isOpen, onClose, editData }) {
  const masters = useAppStore(s => s.masters ?? []);
  const addJournalEntry = useAppStore(s => s.addJournalEntry);
  const updateJournalEntry = useAppStore(s => s.updateJournalEntry);
  
  // Состояние формы
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [masterName, setMasterName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('card');
  
  const SERVICES_OPTIONS = ["Маникюр", "Педикюр", "Стрижка", "Окрашивание", "Брови", "Прочее"];
  
  const [services, setServices] = useState([
    { id: Date.now(), title: SERVICES_OPTIONS[0], amount: '', rate: '' }
  ]);
  const [goods, setGoods] = useState([]);

  // Установка данных при открытии
  useEffect(() => {
    if (isOpen) {
      if (editData) {
        setDate(editData.date || new Date().toISOString().split('T')[0]);
        setMasterName(editData.masterName || (masters[0]?.name || ''));
        setPaymentMethod(editData.paymentMethod || 'card');
        
        const defaultRate = editData.masterName 
          ? (masters.find(m => m.name === editData.masterName)?.rate1 || '') 
          : (masters.length > 0 ? masters[0].rate1 : '');
          
        setServices(editData.services?.length ? editData.services : [{ id: Date.now(), title: SERVICES_OPTIONS[0], amount: '', rate: defaultRate }]);
        setGoods(editData.goods || []);
      } else {
        setDate(new Date().toISOString().split('T')[0]);
        setMasterName(masters.length > 0 ? masters[0].name : '');
        setPaymentMethod('card');
        setServices([{ id: Date.now(), title: SERVICES_OPTIONS[0], amount: '', rate: masters.length > 0 ? masters[0].rate1 : '' }]);
        setGoods([]);
      }
    }
  }, [isOpen, editData, masters]);

  if (!isOpen) return null;

  // Обработчик смены мастера (чтобы менять ставку по умолчанию)
  const handleMasterChange = (name) => {
    setMasterName(name);
    const selectedMaster = masters.find(m => m.name === name);
    if (selectedMaster) {
      setServices(prev => prev.map(s => s.amount === '' ? { ...s, rate: selectedMaster.rate1 } : s));
    }
  };

  const addService = () => {
    const selectedMaster = masters.find(m => m.name === masterName);
    const defaultRate = selectedMaster ? selectedMaster.rate1 : 0;
    setServices([...services, { id: Date.now(), title: SERVICES_OPTIONS[0], amount: '', rate: defaultRate }]);
  };

  const removeService = (id) => {
    if (services.length > 1) {
      setServices(services.filter(s => s.id !== id));
    }
  };

  const updateService = (id, field, value) => {
    setServices(services.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const addGood = () => {
    setGoods([...goods, { id: Date.now(), title: '', amount: '', cogs: '', rate: '10' }]);
  };
  const removeGood = (id) => setGoods(goods.filter(g => g.id !== id));
  const updateGood = (id, field, value) => setGoods(goods.map(g => g.id === id ? { ...g, [field]: value } : g));

  const totalAmount = services.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0) + goods.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);

  const handleSave = () => {
    // Валидация
    if (!masterName || services.some(s => !s.amount) || goods.some(g => !g.title || !g.amount || !g.cogs)) {
      alert('Заполните суммы для услуг и данные для товаров (название, цена, себестоимость)');
      return;
    }

    const entryData = {
      date,
      masterName,
      paymentMethod,
      services: services.map(s => ({ ...s, amount: Number(s.amount), rate: Number(s.rate) })),
      goods: goods.map(g => ({ ...g, title: g.title, amount: Number(g.amount), cogs: Number(g.cogs), rate: Number(g.rate) }))
    };

    if (editData && !editData.isNew) {
      updateJournalEntry({ ...entryData, id: editData.id });
    } else {
      addJournalEntry({ ...entryData, id: Date.now() });
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-end md:items-center justify-center p-0 md:p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-t-[32px] md:rounded-[32px] w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Шапка модалки */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100 shrink-0">
          <h3 className="text-xl font-black text-slate-900">{(editData && !editData.isNew) ? 'Редактировать запись' : 'Новая запись'}</h3>
          <button onClick={onClose} className="w-10 h-10 flex items-center justify-center bg-slate-50 text-slate-400 hover:text-slate-900 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Тело (Скроллится если услуг много) */}
        <div className="p-6 overflow-y-auto space-y-6">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Дата</label>
              <div className="relative">
                <Calendar size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="date" 
                  value={date} 
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-100 text-slate-900 text-sm font-bold rounded-2xl pl-11 pr-4 py-3.5 focus:outline-none focus:border-purple-300 focus:bg-white transition-colors"
                />
              </div>
            </div>
            
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Мастер</label>
              <div className="relative">
                <Scissors size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <select 
                  value={masterName} 
                  onChange={(e) => handleMasterChange(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-100 text-slate-900 text-sm font-bold rounded-2xl pl-11 pr-4 py-3.5 appearance-none focus:outline-none focus:border-purple-300 focus:bg-white transition-colors"
                >
                  {masters.map(m => (
                    <option key={m.id} value={m.name}>{m.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Оказанные услуги (Чек)</label>
            <div className="space-y-3">
              {services.map((srv, index) => (
                <div key={srv.id} className="flex gap-2 items-start relative bg-slate-50 p-3 rounded-2xl border border-slate-100">
                  <div className="flex-1 space-y-2">
                    <select 
                      value={srv.title} 
                      onChange={(e) => updateService(srv.id, 'title', e.target.value)}
                      className="w-full bg-white border border-slate-100 text-sm font-bold rounded-xl px-3 py-2.5 focus:outline-none focus:border-purple-300"
                    >
                      {SERVICES_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                    <div className="flex gap-2">
                      <input 
                        type="number" 
                        placeholder="Сумма, ₽" 
                        value={srv.amount}
                        onChange={(e) => updateService(srv.id, 'amount', e.target.value)}
                        className="w-2/3 bg-white border border-slate-100 text-sm font-bold rounded-xl px-3 py-2.5 focus:outline-none focus:border-purple-300"
                      />
                      <div className="relative w-1/3">
                        <input 
                          type="number" 
                          placeholder="%" 
                          value={srv.rate}
                          onChange={(e) => updateService(srv.id, 'rate', e.target.value)}
                          className="w-full bg-white border border-slate-100 text-sm font-bold rounded-xl px-3 py-2.5 pr-8 focus:outline-none focus:border-purple-300"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">%</span>
                      </div>
                    </div>
                  </div>
                  
                  {services.length > 1 && (
                    <button onClick={() => removeService(srv.id)} className="w-10 h-10 mt-1 shrink-0 flex items-center justify-center text-slate-300 hover:text-red-500 bg-white rounded-xl shadow-sm transition-colors">
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <button onClick={addService} className="mt-3 w-full py-3.5 border-2 border-dashed border-slate-200 text-slate-400 font-bold text-sm rounded-2xl flex items-center justify-center gap-2 hover:bg-slate-50 hover:border-purple-300 hover:text-purple-600 transition-colors">
              <Plus size={18} /> Добавить услугу
            </button>
          </div>
        </div>

        {/* Блок добавления товаров */}
        <div className="px-6 pb-2 mt-2 border-t border-slate-100 pt-6">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Проданные товары</label>
          
          {goods.length > 0 && (
            <div className="space-y-3 mb-3">
              {goods.map((g) => (
                <div key={g.id} className="flex gap-2 items-start relative bg-slate-50 p-3 rounded-2xl border border-slate-100">
                  <div className="flex-1 space-y-2">
                    <input type="text" placeholder="Название товара (Шампунь и т.д.)" value={g.title} onChange={e => updateGood(g.id, 'title', e.target.value)} className="w-full bg-white border border-slate-100 text-sm font-bold rounded-xl px-3 py-2.5 focus:outline-none focus:border-purple-300" />
                    <div className="flex gap-2">
                      <div className="w-1/3 relative">
                        <input type="number" placeholder="Себест." value={g.cogs} onChange={e => updateGood(g.id, 'cogs', e.target.value)} className="w-full bg-white border border-slate-100 text-sm font-bold rounded-xl px-3 py-2.5 focus:outline-none focus:border-purple-300" />
                      </div>
                      <div className="w-1/3 relative">
                        <input type="number" placeholder="Цена" value={g.amount} onChange={e => updateGood(g.id, 'amount', e.target.value)} className="w-full bg-white border border-slate-100 text-sm font-bold rounded-xl px-3 py-2.5 focus:outline-none focus:border-purple-300" />
                      </div>
                      <div className="relative w-1/3">
                        <input type="number" placeholder="% мастеру" value={g.rate} onChange={e => updateGood(g.id, 'rate', e.target.value)} className="w-full bg-white border border-slate-100 text-sm font-bold rounded-xl px-3 py-2.5 pr-6 focus:outline-none focus:border-purple-300" />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 text-[10px] font-bold">%</span>
                      </div>
                    </div>
                  </div>
                  <button onClick={() => removeGood(g.id)} className="w-10 h-10 mt-1 shrink-0 flex items-center justify-center text-slate-300 hover:text-red-500 bg-white rounded-xl shadow-sm transition-colors">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <button onClick={addGood} className="w-full py-3.5 border-2 border-dashed border-slate-200 text-slate-400 font-bold text-sm rounded-2xl flex items-center justify-center gap-2 hover:bg-slate-50 hover:border-purple-300 hover:text-purple-600 transition-colors">
            <Plus size={18} /> Добавить товар
          </button>
        </div>

        <div className="px-6 pb-2 mt-4">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Способ оплаты</label>
          <select 
            value={paymentMethod} 
            onChange={(e) => setPaymentMethod(e.target.value)}
            className="w-full bg-slate-50 border border-slate-100 text-slate-900 text-sm font-bold rounded-2xl px-4 py-3.5 focus:outline-none focus:border-purple-300 focus:bg-white transition-colors"
          >
            <option value="card">💳 Карта терминал (2.9%)</option>
            <option value="sbp">📱 СБП / QR-код (0.7%)</option>
            <option value="cash">💵 Наличные (0%)</option>
          </select>
        </div>

        {/* Футер */}
        <div className="p-6 border-t border-slate-100 shrink-0 bg-white md:rounded-b-[32px] flex items-center justify-between">
          <div>
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Итого чек</div>
            <div className="text-xl font-black text-slate-900">{totalAmount} ₽</div>
          </div>
          <button onClick={handleSave} className="px-8 py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-lg shadow-indigo-200 transition-transform hover:scale-105 active:scale-95">
            {(editData && !editData.isNew) ? 'Сохранить изменения' : 'Сохранить'}
          </button>
        </div>

      </div>
    </div>
  );
}