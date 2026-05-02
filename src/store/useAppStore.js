import { create } from 'zustand';
import { daysFrom } from '../shared/utils/format';

const INITIAL_DEBTS = [
  { id:1, name:'Сбер (Кредитка)', balance:85000, rate:25.9,
    minPayment:3500, nextPaymentDate: daysFrom(5),
    isPaidThisMonth:false, loanType:'credit_card', status:'active',
    details:{ gracePeriod:'до 120 дней', penalty:'36% годовых',
    summary:'Грейс возобновляется только после полного погашения.' }},
  { id:2, name:'ВТБ (Кредитка)', balance:120000, rate:29.9,
    minPayment:5000, nextPaymentDate: daysFrom(12),
    isPaidThisMonth:false, loanType:'credit_card', status:'active',
    details:{ gracePeriod:'до 200 дней', penalty:'0.1% в день',
    summary:'При пропуске платежа льготный период сгорает.' }},
  { id:3, name:'Альфа (Кредитка)', balance:45000, rate:34.9,
    minPayment:2000, nextPaymentDate: daysFrom(2),
    isPaidThisMonth:false, loanType:'credit_card', status:'active',
    details:{ gracePeriod:'Год без %', penalty:'20% годовых',
    summary:'Проверьте скрытую страховку (~1.2%/мес).' }},
  { id:4, name:'Т-Банк (Кредитка)', balance:60000, rate:28.5,
    minPayment:3000, nextPaymentDate: daysFrom(-1),
    isPaidThisMonth:false, loanType:'credit_card', status:'active',
    details:{ gracePeriod:'до 55 дней', penalty:'20% год. + 590 ₽',
    summary:'Штраф за неоплату — 590 ₽ фиксированно.' }},
  { id:5, name:'ОТП Банк (Кредит)', balance:250000, rate:18.0,
    minPayment:12500, nextPaymentDate: daysFrom(20),
    isPaidThisMonth:false, loanType:'loan', status:'active',
    details:{ penalty:'0.1% в день',
    summary:'Досрочное погашение без штрафов через приложение.' }},
  { id:6, name:'Яндекс (Кредит)', balance:150000, rate:21.5,
    minPayment:8500, nextPaymentDate: daysFrom(8),
    isPaidThisMonth:false, loanType:'loan', status:'active',
    details:{ penalty:'20% год.',
    summary:'Досрочное погашение только в дату платежа.' }},
  { id:7, name:'Яндекс Сплит', balance:25000, rate:0,
    minPayment:6250, nextPaymentDate: daysFrom(4),
    isPaidThisMonth:false, loanType:'installment', status:'active',
    details:{ penalty:'Разовый штраф',
    summary:'Процентов нет. Просрочка — разовая комиссия.' }},
];

const INITIAL_DEPOSITS = [
  { id:'d1', name:'Вклад Сбер', type:'deposit', amount:100000,
    rate:16.0, startDate:'2025-01-15', endDate:'2026-01-15',
    capitalization:true, payoutPeriod:'monthly', notes:'Автопролонгация' },
];

const INITIAL_MASTERS = [
  { id:'m1', name:'Анна',  role:'Мастер', rate1:40, plan: 180000 },
  { id:'m2', name:'Юля',   role:'Мастер', rate1:35, plan: 140000 },
  { id:'m3', name:'Оля',   role:'Мастер', rate1:38, plan: 150000 },
  { id:'m4', name:'Елена', role:'Мастер', rate1:40, plan: 200000 },
  { id:'m5', name:'Вика',  role:'Мастер', rate1:35, plan: 120000 },
];

const useAppStore = create((set, get) => ({
  // ── Личные финансы ──
  debts: INITIAL_DEBTS,
  deposits: INITIAL_DEPOSITS,
  debtHistory: [],
  freeMoney: 15000,
  strategy: 'avalanche',

  // ── Салон ──
  masters: INITIAL_MASTERS,
  journal: [],
  expenses: [],
  advances: [],
  appointments: [],

  salon: {
    globalPlans: {
      revenue: 500000,
      clients: 150,
      avgCheck: 3300
    }
  },

  // ── Firebase ──
  isLoading: true,
  isLocalFallback: false,
  user: null,

  // ── Действия: долги ──
  setDebts: (debts) => set({ debts }),
  setDeposits: (deposits) => set({ deposits }),
  setFreeMoney: (freeMoney) => set({ freeMoney }),
  setStrategy: (strategy) => set({ strategy }),
  setDebtHistory: (debtHistory) => set({ debtHistory }),

  markPaid: (id) => {
    const debts = get().debts.map(d => {
      if (d.id !== id) return d;
      // Сдвигаем дату на +1 месяц
      const date = new Date(d.nextPaymentDate);
      date.setMonth(date.getMonth() + 1);
      const nextDate = date.toISOString().split('T')[0];
      const newBalance = Math.max(0, Number(d.balance) - Number(d.minPayment));
      return {
        ...d,
        isPaidThisMonth: true,
        balance: newBalance,
        nextPaymentDate: nextDate,
        _prevBalance: d.balance,
        status: newBalance <= 0 ? 'archived' : d.status,
      };
    });
    set({ debts });
  },

  undoPaid: (id) => {
    const debts = get().debts.map(d => {
      if (d.id !== id) return d;
      const date = new Date(d.nextPaymentDate);
      date.setMonth(date.getMonth() - 1);
      const prevDate = date.toISOString().split('T')[0];
      return {
        ...d,
        isPaidThisMonth: false,
        balance: d._prevBalance !== undefined ? d._prevBalance : d.balance + d.minPayment,
        nextPaymentDate: prevDate,
      };
    });
    set({ debts });
  },

  resetMonth: () => {
    const debts = get().debts.map(d => ({ ...d, isPaidThisMonth: false }));
    set({ debts });
  },

  addDebt: (debt) => set(s => ({ debts: [...s.debts, debt] })),
  updateDebt: (upd) => set(s => ({ debts: s.debts.map(d => d.id === upd.id ? upd : d) })),
  deleteDebt: (id) => set(s => ({ debts: s.debts.filter(d => d.id !== id) })),

  addDeposit: (dep) => set(s => ({ deposits: [...s.deposits, dep] })),
  updateDeposit: (upd) => set(s => ({ deposits: s.deposits.map(d => d.id === upd.id ? upd : d) })),
  deleteDeposit: (id) => set(s => ({ deposits: s.deposits.filter(d => d.id !== id) })),

  // ── Действия: салон ──
  addJournalEntry: (entry) => set(s => ({ journal: [...s.journal, entry] })),
  updateJournalEntry: (upd) => set(s => ({ journal: s.journal.map(e => e.id === upd.id ? upd : e) })),
  deleteJournalEntry: (id) => set(s => ({ journal: s.journal.filter(e => e.id !== id) })),

  addExpense: (exp) => set(s => ({ expenses: [...s.expenses, exp] })),
  deleteExpense: (id) => set(s => ({ expenses: s.expenses.filter(e => e.id !== id) })),

  addAdvance: (adv) => set(s => ({ advances: [...s.advances, adv] })),

  updateGlobalPlans: (plans) => set(s => ({ salon: { ...s.salon, globalPlans: { ...s.salon.globalPlans, ...plans } } })),
  
  addMaster: (master) => set(s => ({ masters: [...s.masters, { id: `m${Date.now()}`, ...master }] })),
  updateMaster: (id, updatedData) => set(s => ({ masters: s.masters.map(m => m.id === id ? { ...m, ...updatedData } : m) })),
  removeMaster: (id) => set(s => ({ masters: s.masters.filter(m => m.id !== id) })),

  // ── Системные ──
  setUser: (user) => set({ user }),
  setIsLoading: (isLoading) => set({ isLoading }),
  setIsLocalFallback: (isLocalFallback) => set({ isLocalFallback }),
}));

export default useAppStore;