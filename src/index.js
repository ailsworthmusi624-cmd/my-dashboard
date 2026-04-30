import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import {
  PlusCircle, Wallet, AlertCircle, Calendar, TrendingDown,
  CheckCircle2, X, Menu, Bell, LayoutDashboard,
  PieChart, ChevronDown, ChevronUp, Target, WifiOff,
  RotateCcw, Edit3, Save, Calculator, RefreshCw, Upload,
  TrendingUp, Info
} from 'lucide-react';

// ─── FIREBASE ────────────────────────────────────────────────────────────────
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, onSnapshot } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAYNPCG4DHFTAwWkARHGyYmiU0GTklQ6_Q",
  authDomain: "dashboard-27927.firebaseapp.com",
  projectId: "dashboard-27927",
  storageBucket: "dashboard-27927.firebasestorage.app",
  messagingSenderId: "428248986605",
  appId: "1:428248986605:web:95b3ccf9ffa65d0e68ade4"
};

const fbApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const auth  = getAuth(fbApp);
const db    = getFirestore(fbApp);
const APP_ID = "dashboard-27927";

// ─── ERROR BOUNDARY ───────────────────────────────────────────────────────────
class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(e) { return { hasError: true, error: e }; }
  render() {
    if (this.state.hasError) return (
      <div className="min-h-screen flex items-center justify-center bg-red-50 p-6">
        <div className="bg-white p-8 rounded-3xl shadow-xl text-center max-w-md">
          <AlertCircle className="mx-auto text-red-500 mb-4" size={48} />
          <h1 className="text-xl font-bold text-slate-900 mb-2">Сбой</h1>
          <p className="text-sm text-slate-500 mb-6">{this.state.error?.toString()}</p>
          <button onClick={() => { localStorage.clear(); window.location.reload(); }}
            className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold">Сбросить и перезагрузить</button>
        </div>
      </div>
    );
    return this.props.children;
  }
}

// ─── ДАННЫЕ ──────────────────────────────────────────────────────────────────
const todayDate = () => { const d = new Date(); d.setHours(0,0,0,0); return d; };
const daysFrom = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().split('T')[0]; };

const initialDebts = [
  { id:1, name:'Сбер (Кредитка)',          balance:85000,  rate:25.9, minPayment:3500,  nextPaymentDate:daysFrom(5),  isPaidThisMonth:false, loanType:'credit_card', details:{ gracePeriod:'до 120 дней', penalty:'36% годовых', summary:'Грейс возобновляется только после полного погашения. Снятие наличных — 390 ₽ + 3.9%.' } },
  { id:2, name:'ВТБ (Кредитка)',            balance:120000, rate:29.9, minPayment:5000,  nextPaymentDate:daysFrom(12), isPaidThisMonth:false, loanType:'credit_card', details:{ gracePeriod:'до 200 дней', penalty:'0.1% в день',  summary:'При пропуске платежа льготный период сгорает.' } },
  { id:3, name:'Альфа (Кредитка)',          balance:45000,  rate:34.9, minPayment:2000,  nextPaymentDate:daysFrom(2),  isPaidThisMonth:false, loanType:'credit_card', details:{ gracePeriod:'Год без %',   penalty:'20% годовых',   summary:'Проверьте скрытую страховку (~1.2%/мес).' } },
  { id:4, name:'Т-Банк (Кредитка)',         balance:60000,  rate:28.5, minPayment:3000,  nextPaymentDate:daysFrom(-1), isPaidThisMonth:false, loanType:'credit_card', details:{ gracePeriod:'до 55 дней',  penalty:'20% год. + 590 ₽', summary:'Штраф за неоплату — 590 ₽ фиксированно.' } },
  { id:5, name:'ОТП Банк (Кредит)',         balance:250000, rate:18.0, minPayment:12500, nextPaymentDate:daysFrom(20), isPaidThisMonth:false, loanType:'loan',        details:{ penalty:'0.1% в день',    summary:'Досрочное погашение без штрафов через приложение.' } },
  { id:6, name:'Яндекс (Кредит)',           balance:150000, rate:21.5, minPayment:8500,  nextPaymentDate:daysFrom(8),  isPaidThisMonth:false, loanType:'loan',        details:{ penalty:'20% год.',       summary:'Досрочное погашение только в дату платежа.' } },
  { id:7, name:'Яндекс Сплит (Рассрочка)', balance:25000,  rate:0,    minPayment:6250,  nextPaymentDate:daysFrom(4),  isPaidThisMonth:false, loanType:'installment', details:{ penalty:'Разовый штраф',  summary:'Процентов нет. Просрочка — разовая комиссия.' } },
];

// ─── УТИЛИТЫ ─────────────────────────────────────────────────────────────────
const fmt = (v) => new Intl.NumberFormat('ru-RU', { style:'currency', currency:'RUB', maximumFractionDigits:0 }).format(v || 0);

const getDaysDiff = (dateStr) => {
  if (!dateStr) return 0;
  const [y,m,d] = dateStr.split('-').map(Number);
  return Math.ceil((new Date(y,m-1,d) - todayDate()) / 86400000);
};

const fmtDate = (dateStr, opts={}) => {
  if (!dateStr) return '';
  const [y,m,d] = dateStr.split('-').map(Number);
  return new Date(y,m-1,d).toLocaleDateString('ru-RU', opts);
};

// Аннуитетный график платежей
const calcAnnuitySchedule = (principal, annualRate, monthlyPayment) => {
  if (!principal || !monthlyPayment || principal <= 0 || monthlyPayment <= 0) return [];
  const r = annualRate / 100 / 12;
  const rows = [];
  let bal = principal;
  let month = 1;
  while (bal > 0.5 && month <= 600) {
    const interest   = r > 0 ? bal * r : 0;
    const principal_ = Math.min(bal, monthlyPayment - interest);
    if (principal_ <= 0) break;
    bal = Math.max(0, bal - principal_);
    rows.push({ month, payment: monthlyPayment, interest, principal: principal_, balance: bal });
    month++;
  }
  return rows;
};

// Калькулятор досрочного погашения
const calcEarlyPayoff = (balance, annualRate, monthlyPayment, extraAmount) => {
  const r = annualRate / 100 / 12;
  const simulate = (pmt) => {
    let bal = balance, months = 0, totalPaid = 0;
    while (bal > 0.5 && months < 600) {
      const interest = r > 0 ? bal * r : 0;
      const p = Math.min(bal, pmt - interest);
      if (p <= 0) return { months: Infinity, totalPaid: Infinity };
      bal = Math.max(0, bal - p);
      totalPaid += pmt;
      months++;
    }
    return { months, totalPaid };
  };
  const base  = simulate(monthlyPayment);
  const extra = simulate(monthlyPayment + extraAmount);
  return {
    baseMon:    base.months,
    extraMon:   extra.months,
    savedMon:   Math.max(0, base.months - extra.months),
    savedMoney: Math.max(0, base.totalPaid - extra.totalPaid),
    overpayBase:  Math.max(0, base.totalPaid - balance),
    overpayExtra: Math.max(0, extra.totalPaid - balance),
  };
};

// ─── МЕЛКИЕ КОМПОНЕНТЫ ───────────────────────────────────────────────────────
function DaysBadge({ days, paid }) {
  if (paid)       return <span className="text-[10px] font-black px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-600 uppercase tracking-widest">Оплачено</span>;
  if (days < 0)   return <span className="text-[10px] font-black px-3 py-1.5 rounded-xl bg-red-50 text-red-600 uppercase tracking-widest">Просрочка {Math.abs(days)} дн.</span>;
  if (days === 0) return <span className="text-[10px] font-black px-3 py-1.5 rounded-xl bg-orange-50 text-orange-600 uppercase tracking-widest">Сегодня!</span>;
  if (days <= 3)  return <span className="text-[10px] font-black px-3 py-1.5 rounded-xl bg-orange-50 text-orange-500 uppercase tracking-widest">{days} дн.</span>;
  return           <span className="text-[10px] font-black px-3 py-1.5 rounded-xl bg-slate-50 text-slate-500 uppercase tracking-widest">{days} дн.</span>;
}

function MiniBar({ label, pct, color }) {
  return (
    <div>
      <div className="flex justify-between text-xs font-bold mb-1.5">
        <span className="text-slate-700 truncate mr-2">{label}</span>
        <span className="text-slate-400 shrink-0">{Math.round(pct)}%</span>
      </div>
      <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
        <div className={`${color} h-full rounded-full transition-all duration-700`} style={{ width:`${pct}%` }} />
      </div>
    </div>
  );
}

// SVG-линейный график (без recharts)
function LineChart({ data }) {
  if (!data || data.length < 2) return (
    <div className="text-center py-12 bg-slate-50 rounded-2xl">
      <TrendingDown size={32} className="text-slate-300 mx-auto mb-3" />
      <p className="text-sm text-slate-400 font-medium">График появится после нескольких месяцев</p>
      <p className="text-xs text-slate-300 mt-1">Снимок делается автоматически каждый месяц</p>
    </div>
  );
  const W=560, H=180, padL=70, padB=36, padT=16, padR=16;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  const maxV = Math.max(...data.map(d=>d.value));
  const minV = Math.min(...data.map(d=>d.value));
  const range = maxV - minV || 1;
  const pts = data.map((d,i) => ({
    x: padL + (i/(data.length-1))*innerW,
    y: padT + innerH - ((d.value-minV)/range)*innerH,
    ...d,
  }));
  const pathD = pts.map((p,i)=>`${i===0?'M':'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const areaD = `${pathD} L${pts[pts.length-1].x},${padT+innerH} L${pts[0].x},${padT+innerH} Z`;
  const yTicks = [0,0.5,1].map(t=>({ val:minV+t*range, y:padT+innerH-t*innerH }));
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
      <defs>
        <linearGradient id="lg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#10b981" stopOpacity="0.25"/>
          <stop offset="100%" stopColor="#10b981" stopOpacity="0"/>
        </linearGradient>
      </defs>
      {yTicks.map((t,i)=>(
        <g key={i}>
          <line x1={padL} y1={t.y} x2={padL+innerW} y2={t.y} stroke="#f1f5f9" strokeWidth="1"/>
          <text x={padL-8} y={t.y+4} textAnchor="end" fontSize="11" fill="#94a3b8" fontFamily="sans-serif">
            {(t.val/1000).toFixed(0)}к
          </text>
        </g>
      ))}
      <path d={areaD} fill="url(#lg)"/>
      <path d={pathD} fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      {pts.map((p,i)=>(
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="4" fill="white" stroke="#10b981" strokeWidth="2"/>
          <text x={p.x} y={padT+innerH+22} textAnchor="middle" fontSize="10" fill="#94a3b8" fontFamily="sans-serif">{p.label}</text>
        </g>
      ))}
    </svg>
  );
}

// ─── ВКЛАДКА: КАЛЕНДАРЬ ──────────────────────────────────────────────────────
function CalendarTab({ debts }) {
  const now   = new Date();
  const year  = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = new Date(year, month+1, 0).getDate();
  const startOffset = (new Date(year, month, 1).getDay() + 6) % 7;
  const todayDay = now.getDate();
  const monthNames = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];

  const byDay = useMemo(() => {
    const map = {};
    debts.forEach(d => {
      if (!d.nextPaymentDate) return;
      const [y,m,day] = d.nextPaymentDate.split('-').map(Number);
      if (y===year && m-1===month) { if (!map[day]) map[day]=[]; map[day].push(d); }
    });
    return map;
  }, [debts, year, month]);

  const cells = [...Array(startOffset).fill(null), ...Array.from({length:daysInMonth},(_,i)=>i+1)];
  const upcoming = [...debts].sort((a,b)=>getDaysDiff(a.nextPaymentDate)-getDaysDiff(b.nextPaymentDate));

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <h2 className="text-3xl font-black text-slate-900 flex items-center gap-3"><Calendar className="text-emerald-600" size={30}/> Календарь платежей</h2>
      <div className="bg-white rounded-[32px] border border-slate-100 p-6 md:p-8 shadow-sm">
        <div className="text-xl font-black text-slate-900 mb-6">{monthNames[month]} {year}</div>
        <div className="grid grid-cols-7 mb-2">
          {['Пн','Вт','Ср','Чт','Пт','Сб','Вс'].map(d=>(
            <div key={d} className="text-center text-[10px] font-black text-slate-300 uppercase tracking-widest py-2">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((day,idx)=>{
            if (!day) return <div key={`e${idx}`}/>;
            const isToday = day===todayDay;
            const has = byDay[day];
            const isPaid    = has && has.every(d=>d.isPaidThisMonth);
            const isOverdue = has && has.some(d=>!d.isPaidThisMonth && getDaysDiff(d.nextPaymentDate)<0);
            const isUrgent  = has && has.some(d=>!d.isPaidThisMonth && getDaysDiff(d.nextPaymentDate)>=0 && getDaysDiff(d.nextPaymentDate)<=3);
            let cls = 'relative aspect-square flex flex-col items-center justify-start pt-1.5 rounded-2xl text-sm font-bold transition-all select-none';
            if (isToday) cls += ' ring-2 ring-emerald-500 ring-offset-1';
            cls += has ? (isPaid ? ' bg-emerald-50 text-emerald-700' : isOverdue ? ' bg-red-50 text-red-700' : isUrgent ? ' bg-orange-50 text-orange-700' : ' bg-slate-50 text-slate-700') : ' text-slate-300';
            return (
              <div key={day} className={cls}>
                <span>{day}</span>
                {has && <div className="flex flex-wrap justify-center gap-0.5 mt-1">{has.map(d=><div key={d.id} className={`w-1.5 h-1.5 rounded-full ${d.isPaidThisMonth?'bg-emerald-500':isOverdue?'bg-red-500':'bg-orange-400'}`}/>)}</div>}
              </div>
            );
          })}
        </div>
      </div>
      <div className="bg-white rounded-[32px] border border-slate-100 p-6 md:p-8 shadow-sm">
        <h3 className="font-black text-lg text-slate-900 mb-6">Все платежи по датам</h3>
        <div className="space-y-3">
          {upcoming.map(d=>{
            const days = getDaysDiff(d.nextPaymentDate);
            return (
              <div key={d.id} className={`flex items-center justify-between p-4 rounded-2xl border ${d.isPaidThisMonth?'border-slate-100 opacity-40':days<0?'border-red-100 bg-red-50/30':days<=3?'border-orange-100 bg-orange-50/30':'border-slate-100'}`}>
                <div className="flex items-center gap-4">
                  <div className={`w-14 h-10 rounded-xl flex items-center justify-center text-[11px] font-black shrink-0 ${d.isPaidThisMonth?'bg-emerald-100 text-emerald-700':days<0?'bg-red-100 text-red-700':'bg-slate-100 text-slate-700'}`}>
                    {fmtDate(d.nextPaymentDate,{day:'numeric',month:'short'})}
                  </div>
                  <div>
                    <div className="font-bold text-slate-900 text-sm">{d.name}</div>
                    <div className="text-[11px] text-slate-400 font-medium">{d.rate>0?`${d.rate}%`:'Рассрочка 0%'}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="font-black text-slate-900">{fmt(d.minPayment)}</div>
                  <DaysBadge days={days} paid={d.isPaidThisMonth}/>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── ВКЛАДКА: АНАЛИТИКА ──────────────────────────────────────────────────────
function AnalyticsTab({ debts, totalDebt, totalMinPaymentAll, debtHistory }) {
  const barColors = ['bg-emerald-500','bg-teal-400','bg-cyan-400','bg-sky-400','bg-blue-400','bg-indigo-400','bg-violet-400'];
  const totalMonthlyInterest = debts.reduce((s,d)=>s+(d.rate>0?(d.balance*d.rate/100/12):0),0);
  const totalOverpay = debts.reduce((s,d)=>{
    if (!d.rate||!d.minPayment||!d.balance) return s;
    const r = d.rate/100/12; if (r===0) return s;
    const m = Math.ceil(Math.log(d.minPayment/Math.max(0.01,d.minPayment-r*d.balance))/Math.log(1+r));
    return s+(isFinite(m)&&m>0?Math.max(0,d.minPayment*m-d.balance):0);
  },0);
  const mostExpensive = [...debts].sort((a,b)=>b.rate-a.rate)[0];
  const mostUrgent    = [...debts].filter(d=>!d.isPaidThisMonth).sort((a,b)=>getDaysDiff(a.nextPaymentDate)-getDaysDiff(b.nextPaymentDate))[0];
  const chartData = debtHistory.slice(-12).map(h=>({ label:h.label, value:h.total }));

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h2 className="text-3xl font-black text-slate-900 flex items-center gap-3"><PieChart className="text-emerald-600" size={30}/> Аналитика</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label:'Всего долгов',    val:debts.length,                                                                                                    unit:'обязательств',      cls:'text-slate-900' },
          { label:'Проценты / мес',  val:fmt(totalMonthlyInterest),                                                                                       unit:'сгорает на %',      cls:'text-red-500' },
          { label:'КПД платежа',     val:totalMinPaymentAll>0?`${Math.round((totalMinPaymentAll-totalMonthlyInterest)/totalMinPaymentAll*100)}%`:'0%',     unit:'идёт в долг',       cls:'text-emerald-600' },
          { label:'Переплата итого', val:fmt(Math.max(0,totalOverpay)),                                                                                   unit:'при мин. платежах', cls:'text-orange-500' },
        ].map(k=>(
          <div key={k.label} className="bg-white p-5 rounded-[28px] border border-slate-100 shadow-sm">
            <div className="text-[9px] text-slate-400 font-black uppercase tracking-widest mb-2">{k.label}</div>
            <div className={`text-2xl font-black ${k.cls}`}>{k.val}</div>
            <div className="text-[11px] text-slate-400 mt-1 font-medium">{k.unit}</div>
          </div>
        ))}
      </div>

      {/* Динамика долга */}
      <div className="bg-white p-7 rounded-[32px] border border-slate-100 shadow-sm">
        <h3 className="font-black text-slate-900 text-lg mb-1 flex items-center gap-2"><TrendingDown className="text-emerald-500" size={20}/> Динамика общего долга</h3>
        <p className="text-xs text-slate-400 font-medium mb-5">Снижение долга по месяцам (факт)</p>
        <LineChart data={chartData}/>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-7 rounded-[32px] border border-slate-100 shadow-sm">
          <h3 className="font-black text-slate-900 text-lg mb-6">Структура долга</h3>
          {totalDebt===0?<p className="text-sm text-slate-400 text-center py-8">Нет данных</p>:(
            <div className="space-y-4">
              {[...debts].sort((a,b)=>b.balance-a.balance).map((d,i)=>(
                <MiniBar key={d.id} label={d.name} pct={totalDebt>0?(d.balance/totalDebt)*100:0} color={barColors[i%barColors.length]}/>
              ))}
            </div>
          )}
        </div>
        <div className="bg-white p-7 rounded-[32px] border border-slate-100 shadow-sm">
          <h3 className="font-black text-slate-900 text-lg mb-6">Куда уходит платёж</h3>
          <div className="space-y-4">
            {debts.map(d=>{
              const interest = d.rate>0?(d.balance*d.rate/100/12):0;
              const principal = Math.max(0,d.minPayment-interest);
              const pct = d.minPayment>0?Math.min(100,(interest/d.minPayment)*100):0;
              return (
                <div key={d.id}>
                  <div className="flex justify-between text-xs font-bold mb-1.5">
                    <span className="text-slate-700 truncate mr-2">{d.name}</span>
                    <span className="text-red-400 shrink-0">{Math.round(pct)}% %</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden flex">
                    <div className="bg-red-400 h-full" style={{width:`${pct}%`}}/>
                    <div className="bg-emerald-500 h-full" style={{width:`${100-pct}%`}}/>
                  </div>
                  <div className="flex justify-between text-[10px] font-medium mt-1">
                    <span className="text-red-400">%: {fmt(interest)}</span>
                    <span className="text-emerald-600">Долг: {fmt(principal)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {mostExpensive&&(
          <div className="bg-red-50 p-7 rounded-[32px] border border-red-100">
            <div className="text-[9px] text-red-400 font-black uppercase tracking-widest mb-3">🔥 Самый дорогой</div>
            <div className="font-black text-xl text-slate-900 mb-1">{mostExpensive.name}</div>
            <div className="text-4xl font-black text-red-500 mb-2">{mostExpensive.rate}%</div>
            <p className="text-sm text-red-700 font-medium">Сжигает {fmt(mostExpensive.balance*mostExpensive.rate/100/12)}/мес. По Лавине — гасить первым.</p>
          </div>
        )}
        {mostUrgent&&(
          <div className="bg-orange-50 p-7 rounded-[32px] border border-orange-100">
            <div className="text-[9px] text-orange-400 font-black uppercase tracking-widest mb-3">⏰ Ближайший платёж</div>
            <div className="font-black text-xl text-slate-900 mb-1">{mostUrgent.name}</div>
            <div className="text-4xl font-black text-orange-500 mb-2">{(()=>{const d=getDaysDiff(mostUrgent.nextPaymentDate);return d<0?`−${Math.abs(d)} дн.`:d===0?'Сегодня':`${d} дн.`;})()}</div>
            <p className="text-sm text-orange-700 font-medium">{fmt(mostUrgent.minPayment)} — {getDaysDiff(mostUrgent.nextPaymentDate)<0?'Просрочка! Срочно оплатите.':'Пополните счёт заранее.'}</p>
          </div>
        )}
      </div>

      <div className="bg-white p-7 rounded-[32px] border border-slate-100 shadow-sm">
        <h3 className="font-black text-slate-900 text-lg mb-5">Как снизить переплату</h3>
        <div className="space-y-3">
          {[
            ['⚡','Частичное досрочное погашение','Любая сумма сверх платежа напрямую снижает тело долга.'],
            ['🔄','Рефинансирование','Ставка на 3%+ ниже — считайте в разделе Калькуляторы.'],
            ['❌','Отключите страховку','Скрытые страховки — 1–1.5% в месяц. Ищите в настройках банковских приложений.'],
            ['📆','Грейс-период по кредиткам','Полностью гасите долг до конца беспроцентного периода.'],
            ['📉','Уменьшайте срок, не платёж','При досрочке выгоднее уменьшить срок, а не размер платежа.'],
          ].map(([icon,title,desc])=>(
            <div key={title} className="flex gap-4 p-4 bg-slate-50 rounded-2xl">
              <span className="text-2xl shrink-0">{icon}</span>
              <div><div className="font-bold text-slate-900 text-sm mb-0.5">{title}</div><div className="text-xs text-slate-500 leading-relaxed">{desc}</div></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── ВКЛАДКА: КАЛЬКУЛЯТОРЫ ───────────────────────────────────────────────────
function CalcTab({ debts }) {
  const [tab, setTab] = useState('early');

  // Досрочное погашение
  const [epDebtId, setEpDebtId] = useState(debts[0]?.id||'');
  const [epExtra,  setEpExtra]  = useState('5000');
  const epDebt   = debts.find(d=>d.id==epDebtId);
  const epResult = epDebt && Number(epExtra)>0 && epDebt.minPayment>0
    ? calcEarlyPayoff(epDebt.balance, epDebt.rate, epDebt.minPayment, Number(epExtra))
    : null;

  // Рефинансирование
  const [refiDebtId, setRefiDebtId] = useState(debts[0]?.id||'');
  const [refiRate,   setRefiRate]   = useState('');
  const [refiTerm,   setRefiTerm]   = useState('');
  const refiDebt = debts.find(d=>d.id==refiDebtId);
  const refiResult = useMemo(()=>{
    if (!refiDebt||!refiRate) return null;
    const bal=refiDebt.balance, pmt=refiDebt.minPayment;
    const simCur = calcAnnuitySchedule(bal, refiDebt.rate, pmt);
    const totalCur = simCur.reduce((s,r)=>s+r.payment,0);
    const r2 = Number(refiRate)/100/12;
    let newPmt = pmt;
    if (refiTerm) {
      const n=Number(refiTerm);
      newPmt = r2>0 ? (bal*r2*Math.pow(1+r2,n))/(Math.pow(1+r2,n)-1) : bal/n;
    }
    const simNew = calcAnnuitySchedule(bal, Number(refiRate), newPmt);
    const totalNew = simNew.reduce((s,r)=>s+r.payment,0);
    return {
      curMonths:simCur.length, newMonths:simNew.length,
      curOverpay:Math.max(0,totalCur-bal), newOverpay:Math.max(0,totalNew-bal),
      saved:Math.max(0,(totalCur-bal)-(totalNew-bal)), newPayment:newPmt,
    };
  },[refiDebt,refiRate,refiTerm]);

  // Аннуитетный график
  const [annDebtId,    setAnnDebtId]    = useState('');
  const [showAllRows,  setShowAllRows]  = useState(false);
  const annDebt    = debts.find(d=>d.id==annDebtId);
  const annSchedule = useMemo(()=> annDebt ? calcAnnuitySchedule(annDebt.balance,annDebt.rate,annDebt.minPayment) : [], [annDebt]);
  const visibleRows = showAllRows ? annSchedule : annSchedule.slice(0,12);

  const inCls = "w-full bg-slate-50 p-3.5 rounded-2xl outline-none font-bold text-slate-900 border border-transparent focus:border-emerald-300 focus:ring-2 ring-emerald-100 transition-all text-sm";
  const selCls = "w-full bg-slate-50 p-3.5 rounded-2xl outline-none font-bold text-slate-900 border border-transparent focus:border-emerald-300 transition-all text-sm";
  const lCls = "text-[9px] uppercase font-black text-slate-400 ml-1 mb-1.5 block tracking-widest";

  const tabs = [
    { id:'early',  label:'🚀 Досрочка' },
    { id:'refi',   label:'🔄 Рефи' },
    { id:'annuity',label:'📋 График' },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h2 className="text-3xl font-black text-slate-900 flex items-center gap-3"><Calculator className="text-emerald-600" size={30}/> Калькуляторы</h2>

      <div className="flex bg-white border border-slate-100 p-1.5 rounded-2xl gap-1 shadow-sm">
        {tabs.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-black transition-all ${tab===t.id?'bg-emerald-600 text-white shadow-md':'text-slate-400 hover:text-slate-600'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── ДОСРОЧНОЕ ПОГАШЕНИЕ ── */}
      {tab==='early'&&(
        <div className="bg-white rounded-[32px] border border-slate-100 p-7 shadow-sm">
          <h3 className="font-black text-xl text-slate-900 mb-1">Досрочное погашение</h3>
          <p className="text-xs text-slate-400 mb-6 font-medium">Введите сумму сверх обязательного — узнайте экономию и новый срок</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className={lCls}>Кредит</label>
              <select className={selCls} value={epDebtId} onChange={e=>setEpDebtId(e.target.value)}>
                {debts.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div>
              <label className={lCls}>Доп. взнос в месяц ₽</label>
              <input type="number" className={inCls} value={epExtra} onChange={e=>setEpExtra(e.target.value)} placeholder="5000"/>
            </div>
          </div>
          {epDebt&&epResult&&isFinite(epResult.baseMon)&&(
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
                {[
                  { label:'Срок сейчас',     val:`${epResult.baseMon} мес`,   sub:`${Math.floor(epResult.baseMon/12)}г ${epResult.baseMon%12}м`,  cls:'text-slate-900' },
                  { label:'С досрочкой',     val:`${epResult.extraMon} мес`,  sub:`${Math.floor(epResult.extraMon/12)}г ${epResult.extraMon%12}м`, cls:'text-emerald-600' },
                  { label:'Сэкономлено мес', val:`−${epResult.savedMon} мес`, sub:'сокращение срока',                                             cls:'text-emerald-600' },
                  { label:'Экономия ₽',      val:fmt(epResult.savedMoney),    sub:`переплата: ${fmt(epResult.overpayExtra)}`,                     cls:'text-emerald-600' },
                ].map(c=>(
                  <div key={c.label} className="bg-slate-50 p-4 rounded-2xl">
                    <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">{c.label}</div>
                    <div className={`text-xl font-black ${c.cls}`}>{c.val}</div>
                    <div className="text-[10px] text-slate-400 font-medium mt-1">{c.sub}</div>
                  </div>
                ))}
              </div>
              {epResult.savedMoney>0&&(
                <div className="bg-emerald-50 p-4 rounded-2xl text-sm text-emerald-700 font-medium flex items-start gap-2">
                  <CheckCircle2 size={16} className="shrink-0 mt-0.5"/>
                  Досрочный взнос {fmt(Number(epExtra))}/мес сэкономит вам {fmt(epResult.savedMoney)} и закроет кредит на {epResult.savedMon} мес. раньше!
                </div>
              )}
            </>
          )}
          {epDebt&&epDebt.rate===0&&<div className="bg-emerald-50 p-4 rounded-2xl text-sm text-emerald-700 font-medium">Рассрочка 0% — переплаты нет. Досрочка освобождает лимит, но экономии на % не даёт.</div>}
          {epDebt&&epResult&&!isFinite(epResult.baseMon)&&<div className="bg-red-50 p-4 rounded-2xl text-sm text-red-700 font-medium">Платёж не покрывает проценты — долг не будет гаситься. Увеличьте платёж.</div>}
        </div>
      )}

      {/* ── РЕФИНАНСИРОВАНИЕ ── */}
      {tab==='refi'&&(
        <div className="bg-white rounded-[32px] border border-slate-100 p-7 shadow-sm">
          <h3 className="font-black text-xl text-slate-900 mb-1">Рефинансирование</h3>
          <p className="text-xs text-slate-400 mb-6 font-medium">Сравните текущую ставку с новым предложением банка</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
            <div>
              <label className={lCls}>Кредит</label>
              <select className={selCls} value={refiDebtId} onChange={e=>setRefiDebtId(e.target.value)}>
                {debts.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div>
              <label className={lCls}>Новая ставка % год.</label>
              <input type="number" step="0.1" className={inCls} value={refiRate} onChange={e=>setRefiRate(e.target.value)} placeholder="14.5"/>
            </div>
            <div>
              <label className={lCls}>Новый срок мес. (необяз.)</label>
              <input type="number" className={inCls} value={refiTerm} onChange={e=>setRefiTerm(e.target.value)} placeholder="Оставить текущий"/>
            </div>
          </div>
          {refiDebt&&(
            <div className="bg-slate-50 p-4 rounded-2xl mb-5 flex flex-wrap gap-4 text-sm">
              <div><span className="text-slate-400 text-xs">Текущая ставка: </span><span className="font-black">{refiDebt.rate}%</span></div>
              <div><span className="text-slate-400 text-xs">Остаток: </span><span className="font-black">{fmt(refiDebt.balance)}</span></div>
              <div><span className="text-slate-400 text-xs">Платёж: </span><span className="font-black">{fmt(refiDebt.minPayment)}</span></div>
            </div>
          )}
          {refiResult&&(
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
                {[
                  { label:'Срок сейчас',   val:`${refiResult.curMonths} мес`, cls:'text-slate-900' },
                  { label:'Срок после',    val:`${refiResult.newMonths} мес`, cls:'text-emerald-600' },
                  { label:'Переплата до',  val:fmt(refiResult.curOverpay),    cls:'text-red-500' },
                  { label:'Экономия',      val:fmt(refiResult.saved),         cls:refiResult.saved>0?'text-emerald-600':'text-red-500' },
                ].map(c=>(
                  <div key={c.label} className="bg-slate-50 p-4 rounded-2xl">
                    <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">{c.label}</div>
                    <div className={`text-xl font-black ${c.cls}`}>{c.val}</div>
                  </div>
                ))}
              </div>
              {refiResult.saved>0
                ? <div className="bg-emerald-50 p-4 rounded-2xl text-sm text-emerald-700 font-medium flex items-start gap-2"><CheckCircle2 size={16} className="shrink-0 mt-0.5"/> Рефи выгодно! Экономия {fmt(refiResult.saved)}, новый платёж: {fmt(refiResult.newPayment)}/мес.</div>
                : <div className="bg-red-50 p-4 rounded-2xl text-sm text-red-700 font-medium flex items-start gap-2"><Info size={16} className="shrink-0 mt-0.5"/> Рефи при данных условиях невыгодно. Нужна ставка ниже {refiDebt?.rate}%.</div>
              }
            </>
          )}
        </div>
      )}

      {/* ── АННУИТЕТНЫЙ ГРАФИК ── */}
      {tab==='annuity'&&(
        <div className="bg-white rounded-[32px] border border-slate-100 p-7 shadow-sm">
          <h3 className="font-black text-xl text-slate-900 mb-1">График платежей (аннуитет)</h3>
          <p className="text-xs text-slate-400 mb-6 font-medium">Точное разложение каждого платежа: проценты и тело долга по месяцам</p>
          <div className="mb-6">
            <label className={lCls}>Выберите кредит</label>
            <select className={selCls} value={annDebtId} onChange={e=>{ setAnnDebtId(e.target.value); setShowAllRows(false); }}>
              <option value="">— выберите кредит —</option>
              {debts.filter(d=>d.rate>0).map(d=><option key={d.id} value={d.id}>{d.name} ({d.rate}%)</option>)}
            </select>
          </div>
          {annDebt&&annSchedule.length>0&&(
            <>
              <div className="flex flex-wrap gap-3 mb-5">
                {[
                  { lbl:'Месяцев', val:`${annSchedule.length}`, cls:'text-slate-900' },
                  { lbl:'Переплата', val:fmt(annSchedule.reduce((s,r)=>s+r.interest,0)), cls:'text-red-500' },
                  { lbl:'Итого выплатите', val:fmt(annSchedule.reduce((s,r)=>s+r.payment,0)), cls:'text-slate-900' },
                ].map(c=>(
                  <div key={c.lbl} className="bg-slate-50 px-5 py-3 rounded-2xl">
                    <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{c.lbl}</div>
                    <div className={`font-black ${c.cls}`}>{c.val}</div>
                  </div>
                ))}
              </div>
              <div className="overflow-x-auto rounded-2xl border border-slate-100">
                <table className="w-full text-sm min-w-[480px]">
                  <thead>
                    <tr className="bg-slate-50">
                      {['Мес.','Платёж','Проценты','Тело долга','Остаток'].map(h=>(
                        <th key={h} className="text-left p-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {visibleRows.map(row=>(
                      <tr key={row.month} className="border-t border-slate-50 hover:bg-slate-50/60 transition-colors">
                        <td className="p-3 font-bold text-slate-400">{row.month}</td>
                        <td className="p-3 font-black text-slate-900">{fmt(row.payment)}</td>
                        <td className="p-3 font-bold text-red-500">{fmt(row.interest)}</td>
                        <td className="p-3 font-bold text-emerald-600">{fmt(row.principal)}</td>
                        <td className="p-3 font-bold text-slate-600">{fmt(row.balance)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {annSchedule.length>12&&(
                <button onClick={()=>setShowAllRows(v=>!v)} className="mt-4 w-full py-3 border border-slate-200 rounded-2xl text-xs font-black text-slate-500 hover:bg-slate-50 transition-colors">
                  {showAllRows?'Свернуть':`Показать все ${annSchedule.length} месяцев`}
                </button>
              )}
            </>
          )}
          {annDebt&&annSchedule.length===0&&(
            <div className="bg-red-50 p-4 rounded-2xl text-sm text-red-700 font-medium">
              Платёж {fmt(annDebt.minPayment)} не покрывает проценты при ставке {annDebt.rate}%. Увеличьте платёж.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── МОДАЛКА: РЕДАКТИРОВАНИЕ ─────────────────────────────────────────────────
function EditModal({ debt, onSave, onClose }) {
  const [form, setForm] = useState({
    name:           debt.name||'',
    balance:        String(debt.balance||''),
    rate:           String(debt.rate||''),
    minPayment:     String(debt.minPayment||''),
    nextPaymentDate:debt.nextPaymentDate||'',
    loanType:       debt.loanType||'loan',
    gracePeriod:    debt.details?.gracePeriod||'',
    penalty:        debt.details?.penalty||'',
    summary:        debt.details?.summary||'',
  });
  const set = (k,v) => setForm(f=>({...f,[k]:v}));

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ ...debt, name:form.name, balance:Number(form.balance), rate:Number(form.rate),
      minPayment:Number(form.minPayment), nextPaymentDate:form.nextPaymentDate, loanType:form.loanType,
      details:{ gracePeriod:form.gracePeriod, penalty:form.penalty, summary:form.summary } });
  };

  const inCls = "w-full bg-slate-50 p-4 rounded-2xl outline-none font-bold text-slate-900 border border-transparent focus:border-emerald-300 focus:ring-2 ring-emerald-100 transition-all";
  const lCls  = "text-[9px] uppercase font-black text-slate-400 ml-1 mb-1.5 block tracking-widest";

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto">
      <form onSubmit={handleSubmit} className="bg-white rounded-t-[40px] sm:rounded-[40px] p-8 w-full sm:max-w-md shadow-2xl space-y-4 my-auto">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-2xl font-black text-slate-900 flex items-center gap-2"><Edit3 size={22}/> Редактировать</h3>
          <button type="button" onClick={onClose} className="w-10 h-10 flex items-center justify-center bg-slate-50 text-slate-400 rounded-full hover:bg-slate-100 transition-colors"><X size={20}/></button>
        </div>
        <div><label className={lCls}>Название</label><input required className={inCls} value={form.name} onChange={e=>set('name',e.target.value)}/></div>
        <div className="grid grid-cols-2 gap-4">
          <div><label className={lCls}>Остаток ₽</label><input required type="number" className={inCls} value={form.balance} onChange={e=>set('balance',e.target.value)}/></div>
          <div><label className={lCls}>Ставка % год.</label><input required type="number" step="0.1" className={inCls} value={form.rate} onChange={e=>set('rate',e.target.value)}/></div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div><label className={lCls}>Платёж ₽/мес</label><input required type="number" className={inCls} value={form.minPayment} onChange={e=>set('minPayment',e.target.value)}/></div>
          <div><label className={lCls}>Дата платежа</label><input required type="date" className={inCls+' text-slate-500'} value={form.nextPaymentDate} onChange={e=>set('nextPaymentDate',e.target.value)}/></div>
        </div>
        <div>
          <label className={lCls}>Тип</label>
          <select className={inCls} value={form.loanType} onChange={e=>set('loanType',e.target.value)}>
            <option value="credit_card">Кредитная карта</option>
            <option value="loan">Кредит / займ</option>
            <option value="installment">Рассрочка</option>
          </select>
        </div>
        <div><label className={lCls}>Грейс-период</label><input className={inCls} value={form.gracePeriod} onChange={e=>set('gracePeriod',e.target.value)} placeholder="до 120 дней"/></div>
        <div><label className={lCls}>Штраф за просрочку</label><input className={inCls} value={form.penalty} onChange={e=>set('penalty',e.target.value)} placeholder="0.1% в день"/></div>
        <div><label className={lCls}>Заметки / условия</label><textarea rows={3} className={inCls+' resize-none text-sm'} value={form.summary} onChange={e=>set('summary',e.target.value)}/></div>
        <button type="submit" className="w-full bg-emerald-600 text-white p-5 rounded-2xl font-black shadow-lg hover:bg-emerald-700 transition-all flex items-center justify-center gap-2">
          <Save size={18}/> Сохранить изменения
        </button>
      </form>
    </div>
  );
}

// ─── ГЛАВНЫЙ КОМПОНЕНТ ───────────────────────────────────────────────────────
function App() {
  const [activeTab, setActiveTab]             = useState('dashboard');
  const [user, setUser]                       = useState(null);
  const [isLoading, setIsLoading]             = useState(true);
  const [isLocalFallback, setIsLocalFallback] = useState(false);

  const [debts, setDebts]                   = useState([]);
  const [freeMoney, setFreeMoney]           = useState(15000);
  const [freeMoneyInput, setFreeMoneyInput] = useState('15000');
  const [strategy, setStrategy]             = useState('avalanche');
  const [debtHistory, setDebtHistory]       = useState([]);

  const [isSidebarOpen, setIsSidebarOpen]           = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen]         = useState(false);
  const [editingDebt, setEditingDebt]               = useState(null);
  const [expandedId, setExpandedId]                 = useState(null);
  const [newDebt, setNewDebt] = useState({ name:'', balance:'', rate:'', minPayment:'', nextPaymentDate:'', detailsSummary:'' });

  // Auth
  useEffect(()=>{
    const unsub = onAuthStateChanged(auth, u=>{ if(u) setUser(u); });
    signInAnonymously(auth).catch(()=>enableLocalMode());
    return ()=>unsub();
  },[]);

  // Firestore
  useEffect(()=>{
    if (isLocalFallback||!user) return;
    const ref = doc(db,'artifacts',APP_ID,'public','data','appState','main');
    const timer = setTimeout(()=>{ if(isLoading) enableLocalMode(); },5000);
    const unsub = onSnapshot(ref, snap=>{
      clearTimeout(timer);
      if (snap.exists()) {
        const data=snap.data();
        setDebts(data.debts||[]);
        const f=data.freeMoney??15000;
        setFreeMoney(f); setFreeMoneyInput(String(f));
        setStrategy(data.strategy||'avalanche');
        setDebtHistory(data.debtHistory||[]);
      } else {
        setDoc(ref,{ debts:initialDebts, freeMoney:15000, strategy:'avalanche', debtHistory:[] });
      }
      setIsLoading(false);
    },()=>{ clearTimeout(timer); enableLocalMode(); });
    return ()=>{ clearTimeout(timer); unsub(); };
  },[user,isLocalFallback]); // eslint-disable-line

  const enableLocalMode = useCallback(()=>{
    setIsLocalFallback(true); setIsLoading(false);
    try {
      const sd=localStorage.getItem('localDebts');
      const sf=localStorage.getItem('localFreeMoney');
      setDebts(sd?JSON.parse(sd):initialDebts);
      const f=sf?Number(sf):15000; setFreeMoney(f); setFreeMoneyInput(String(f));
      setStrategy(localStorage.getItem('localStrategy')||'avalanche');
      const sh=localStorage.getItem('localDebtHistory');
      setDebtHistory(sh?JSON.parse(sh):[]);
    } catch { setDebts(initialDebts); }
  },[]);

  const saveData = useCallback((nd,nf,ns,nh)=>{
    const history=nh||debtHistory;
    if (isLocalFallback||!user) {
      localStorage.setItem('localDebts',JSON.stringify(nd));
      localStorage.setItem('localFreeMoney',String(nf));
      localStorage.setItem('localStrategy',ns);
      localStorage.setItem('localDebtHistory',JSON.stringify(history));
    } else {
      const ref=doc(db,'artifacts',APP_ID,'public','data','appState','main');
      setDoc(ref,{debts:nd,freeMoney:Number(nf),strategy:ns,debtHistory:history},{merge:true}).catch(console.error);
    }
  },[isLocalFallback,user,debtHistory]);

  // Снимок истории
  useEffect(()=>{
    if (debts.length===0) return;
    const label = new Date().toLocaleDateString('ru-RU',{month:'short',year:'2-digit'});
    const total = debts.reduce((s,d)=>s+Number(d.balance||0),0);
    setDebtHistory(prev=>{
      if (prev.length>0&&prev[prev.length-1].label===label) return prev;
      const next=[...prev,{label,total,ts:Date.now()}].slice(-24);
      if (isLocalFallback||!user) localStorage.setItem('localDebtHistory',JSON.stringify(next));
      else { const ref=doc(db,'artifacts',APP_ID,'public','data','appState','main'); setDoc(ref,{debtHistory:next},{merge:true}).catch(console.error); }
      return next;
    });
  },[debts.length]); // eslint-disable-line

  // Вычисления
  const totalDebt           = debts.reduce((a,d)=>a+Number(d.balance||0),0);
  const totalMinPaymentAll  = debts.reduce((a,d)=>a+Number(d.minPayment||0),0);
  const totalMinPaymentLeft = debts.reduce((a,d)=>a+(d.isPaidThisMonth?0:Number(d.minPayment||0)),0);
  const paidThisMonthAmount = debts.filter(d=>d.isPaidThisMonth).reduce((a,d)=>a+Number(d.minPayment||0),0);
  const progressPercent     = totalMinPaymentAll===0?0:Math.round((paidThisMonthAmount/totalMinPaymentAll)*100);
  const overdueDebts        = debts.filter(d=>!d.isPaidThisMonth&&getDaysDiff(d.nextPaymentDate)<0);
  const totalOverdue        = overdueDebts.reduce((a,d)=>a+Number(d.minPayment||0),0);

  const sortedDebts = useMemo(()=>[...debts].sort((a,b)=>{
    if (a.isPaidThisMonth!==b.isPaidThisMonth) return a.isPaidThisMonth?1:-1;
    return getDaysDiff(a.nextPaymentDate)-getDaysDiff(b.nextPaymentDate);
  }),[debts]);

  const strategyAllocation = useMemo(()=>{
    let remain=Number(freeMoney)||0; const alloc={};
    const targets=[...debts.filter(d=>d.balance>0)];
    targets.sort((a,b)=>strategy==='avalanche'?(b.rate||0)-(a.rate||0):(a.balance||0)-(b.balance||0));
    targets.forEach(d=>{ const take=Math.min(remain,d.balance); alloc[d.id]=take; remain-=take; });
    return alloc;
  },[debts,freeMoney,strategy]);

  const notifications = useMemo(()=>{
    const list=[];
    overdueDebts.forEach(d=>list.push({id:d.id,type:'overdue',title:'Просрочка',text:`"${d.name}" — платёж просрочен!`}));
    debts.filter(d=>!d.isPaidThisMonth&&getDaysDiff(d.nextPaymentDate)>=0&&getDaysDiff(d.nextPaymentDate)<=3)
      .forEach(d=>list.push({id:d.id,type:'soon',title:'Скоро платёж',text:`"${d.name}" — через ${getDaysDiff(d.nextPaymentDate)} дн.`}));
    return list;
  },[debts,overdueDebts]);

  // Экшены
  const handleMarkPaid  = (id)=>{ const next=debts.map(d=>d.id===id?{...d,isPaidThisMonth:true,balance:Math.max(0,Number(d.balance)-Number(d.minPayment||0)),_prevBalance:d.balance}:d); setDebts(next); saveData(next,freeMoney,strategy); };
  const handleUndoPaid  = (id)=>{ const next=debts.map(d=>d.id===id?{...d,isPaidThisMonth:false,balance:d._prevBalance!==undefined?d._prevBalance:Number(d.balance)+Number(d.minPayment||0)}:d); setDebts(next); saveData(next,freeMoney,strategy); };
  const handleResetMonth= ()=>{ if(!window.confirm('Сбросить статусы оплат?')) return; const next=debts.map(d=>({...d,isPaidThisMonth:false})); setDebts(next); saveData(next,freeMoney,strategy); };
  const handleAdd       = (e)=>{ e.preventDefault(); const item={...newDebt,id:Date.now(),isPaidThisMonth:false,loanType:'loan',balance:Number(newDebt.balance),rate:Number(newDebt.rate),minPayment:Number(newDebt.minPayment),details:{summary:newDebt.detailsSummary||''}}; const next=[...debts,item]; setDebts(next); saveData(next,freeMoney,strategy); setIsAddModalOpen(false); setNewDebt({name:'',balance:'',rate:'',minPayment:'',nextPaymentDate:'',detailsSummary:''}); };
  const handleSaveEdit  = (upd)=>{ const next=debts.map(d=>d.id===upd.id?upd:d); setDebts(next); saveData(next,freeMoney,strategy); setEditingDebt(null); };
  const handleDelete    = (id)=>{ if(!window.confirm('Удалить?')) return; const next=debts.filter(d=>d.id!==id); setDebts(next); saveData(next,freeMoney,strategy); };
  const handleFreeMoneyBlur = ()=>{ const v=Number(freeMoneyInput)||0; setFreeMoney(v); saveData(debts,v,strategy); };
  const handleStrategyChange= (s)=>{ setStrategy(s); saveData(debts,freeMoney,s); };

  if (isLoading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8FAFC] text-emerald-700">
      <div className="relative w-16 h-16 mb-4">
        <div className="absolute inset-0 border-4 border-emerald-100 rounded-full"/>
        <div className="absolute inset-0 border-4 border-emerald-600 rounded-full border-t-transparent animate-spin"/>
      </div>
      <p className="font-bold tracking-tight">Подключение...</p>
    </div>
  );

  const nav = [
    { id:'dashboard',   icon:<LayoutDashboard size={20}/>, label:'Дашборд' },
    { id:'calendar',    icon:<Calendar size={20}/>,        label:'Календарь' },
    { id:'analytics',   icon:<PieChart size={20}/>,        label:'Аналитика' },
    { id:'calculators', icon:<Calculator size={20}/>,      label:'Калькуляторы' },
    { id:'investing',   icon:<Target size={20}/>,          label:'После долгов' },
  ];

  const inCls = "w-full bg-slate-50 p-4 rounded-2xl outline-none font-bold text-slate-900 border border-transparent focus:border-emerald-300 focus:ring-2 ring-emerald-100 transition-all";

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 font-sans flex overflow-hidden">
      {isSidebarOpen&&<div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden" onClick={()=>setIsSidebarOpen(false)}/>}

      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 w-64 bg-white border-r border-slate-100 z-50 transition-transform duration-300 flex flex-col ${isSidebarOpen?'translate-x-0':'-translate-x-full lg:translate-x-0'}`}>
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-200"><Wallet size={20}/></div>
          <span className="font-black text-xl tracking-tight text-slate-900">Свобода.</span>
        </div>
        <nav className="flex-1 px-4 space-y-1 mt-2">
          {nav.map(item=>(
            <button key={item.id} onClick={()=>{setActiveTab(item.id);setIsSidebarOpen(false);}}
              className={`w-full flex items-center gap-3 p-3.5 rounded-2xl font-bold text-sm transition-all ${activeTab===item.id?'bg-emerald-50 text-emerald-700':'text-slate-400 hover:bg-slate-50 hover:text-slate-600'}`}>
              {item.icon} {item.label}
            </button>
          ))}
        </nav>
        <div className="px-4 pb-6">
          <div className="bg-slate-900 p-5 rounded-[24px] text-white">
            <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1 text-center">Прогресс месяца</div>
            <div className="text-[11px] text-emerald-400 font-bold text-center mb-4">{fmt(paidThisMonthAmount)} / {fmt(totalMinPaymentAll)}</div>
            <div className="flex justify-center relative">
              <svg className="w-24 h-24 -rotate-90">
                <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="9" fill="transparent" className="text-slate-800"/>
                <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="9" fill="transparent"
                  strokeDasharray="251.3" strokeDashoffset={251.3-(progressPercent/100)*251.3}
                  strokeLinecap="round" className="text-emerald-500 transition-all duration-1000"/>
              </svg>
              <div className="absolute inset-0 flex items-center justify-center font-black text-2xl">{progressPercent}%</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="bg-white/80 backdrop-blur-md border-b border-slate-100 sticky top-0 z-30">
          <div className="flex items-center justify-between px-4 lg:px-8 py-4">
            <button className="lg:hidden p-2 -ml-2 text-slate-500" onClick={()=>setIsSidebarOpen(true)}><Menu size={22}/></button>
            <div className="flex items-center gap-3 ml-auto">
              {isLocalFallback
                ?<div className="hidden sm:flex items-center gap-2 bg-orange-50 text-orange-600 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest"><WifiOff size={13}/> Локальный</div>
                :<div className="hidden sm:flex items-center gap-2 text-emerald-600 text-[10px] font-black uppercase tracking-widest"><div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"/> Облако</div>
              }
              <div className="relative">
                <button onClick={()=>setIsNotificationsOpen(v=>!v)} className="p-2 text-slate-500 hover:bg-slate-100 rounded-full relative transition-colors">
                  <Bell size={22}/>
                  {notifications.length>0&&<span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 border-2 border-white rounded-full"/>}
                </button>
                {isNotificationsOpen&&(
                  <><div className="fixed inset-0 z-40" onClick={()=>setIsNotificationsOpen(false)}/>
                    <div className="absolute right-0 mt-2 w-72 bg-white rounded-[24px] shadow-2xl border border-slate-100 p-2 z-50">
                      <div className="p-3 font-black text-sm border-b border-slate-50 text-slate-900">Уведомления</div>
                      <div className="max-h-64 overflow-y-auto">
                        {notifications.length===0?<div className="p-5 text-xs text-slate-400 text-center font-medium">Всё спокойно ✓</div>
                          :notifications.map((n,i)=>(
                            <div key={i} className={`p-3 border-b border-slate-50 last:border-0 text-xs ${n.type==='overdue'?'bg-red-50/50':''}`}>
                              <div className={`font-black mb-0.5 ${n.type==='overdue'?'text-red-600':'text-orange-500'}`}>{n.title}</div>
                              <div className="text-slate-600 font-medium">{n.text}</div>
                            </div>
                          ))
                        }
                      </div>
                    </div>
                  </>
                )}
              </div>
              <div className="w-9 h-9 bg-slate-100 rounded-full flex items-center justify-center text-slate-400"><Wallet size={18}/></div>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 lg:p-8">
          <div className="max-w-5xl mx-auto">

            {/* ДАШБОРД */}
            {activeTab==='dashboard'&&(<>
              <div className="flex justify-between items-end mb-8">
                <div>
                  <h1 className="text-3xl lg:text-4xl font-black tracking-tight text-slate-900">Дашборд</h1>
                  <p className="text-sm text-slate-400 mt-1 font-medium">Закрыть: {debts.length} кредитов · {fmt(totalDebt)}</p>
                </div>
                <button onClick={()=>setIsAddModalOpen(true)} className="bg-emerald-600 text-white px-5 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-emerald-200 hover:scale-105 transition-transform">
                  <PlusCircle size={20}/><span className="hidden sm:inline">Добавить</span>
                </button>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <div className="bg-emerald-600 p-6 rounded-[32px] text-white shadow-xl shadow-emerald-100">
                  <div className="text-[9px] opacity-70 font-black uppercase tracking-widest mb-2">Общий долг</div>
                  <div className="text-2xl md:text-3xl font-black truncate">{fmt(totalDebt)}</div>
                  <div className="text-[10px] opacity-60 mt-2">{debts.length} обязательств</div>
                </div>
                <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
                  <div className="text-[9px] text-slate-400 font-black uppercase tracking-widest mb-2">К оплате в мес.</div>
                  <div className="text-2xl md:text-3xl font-black text-slate-900 truncate">{fmt(totalMinPaymentLeft)}</div>
                  <div className="text-[10px] text-slate-400 mt-2">осталось оплатить</div>
                </div>
                <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
                  <div className="text-[9px] text-slate-400 font-black uppercase tracking-widest mb-2">Просрочено</div>
                  <div className={`text-2xl md:text-3xl font-black truncate ${totalOverdue>0?'text-red-500':'text-slate-900'}`}>{fmt(totalOverdue)}</div>
                  <div className={`text-[10px] mt-2 ${totalOverdue>0?'text-red-400':'text-emerald-500'}`}>{totalOverdue>0?`${overdueDebts.length} просроченных`:'Всё по графику ✓'}</div>
                </div>
                <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm focus-within:ring-2 ring-emerald-500 transition-all">
                  <div className="text-[9px] text-slate-400 font-black uppercase tracking-widest mb-2">Свободные деньги</div>
                  <div className="relative">
                    <input type="number" value={freeMoneyInput} onChange={e=>setFreeMoneyInput(e.target.value)} onBlur={handleFreeMoneyBlur}
                      className="text-2xl md:text-3xl font-black text-emerald-600 bg-transparent border-b border-emerald-100 outline-none w-full pb-1"/>
                    <span className="absolute right-0 bottom-2 text-emerald-300 font-black text-lg">₽</span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-2">для досрочного погашения</div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Список */}
                <div className="lg:col-span-2 space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="font-black text-xl text-slate-900">Список платежей</h3>
                    <button onClick={handleResetMonth} className="text-[10px] font-black text-slate-400 border border-slate-200 px-3 py-1.5 rounded-xl flex items-center gap-1 hover:bg-slate-50 transition-colors uppercase tracking-widest">
                      <RotateCcw size={13}/> Новый месяц
                    </button>
                  </div>

                  {sortedDebts.length===0&&(
                    <div className="text-center py-16 bg-white rounded-[32px] border border-dashed border-slate-200">
                      <div className="text-4xl mb-4">🎉</div>
                      <p className="font-bold text-slate-500">Долгов нет — вы свободны!</p>
                    </div>
                  )}

                  {sortedDebts.map(d=>{
                    const days=getDaysDiff(d.nextPaymentDate);
                    const mInterest=d.rate>0?(Number(d.balance)*Number(d.rate)/100/12):0;
                    const mPrincipal=Math.max(0,Number(d.minPayment)-mInterest);
                    const isExpanded=expandedId===d.id;
                    const extra=strategyAllocation[d.id]||0;
                    let cardCls='bg-white border-slate-100';
                    if (d.isPaidThisMonth) cardCls='bg-white border-slate-100 opacity-40 grayscale';
                    else if (days<0)   cardCls='bg-red-50/30 border-red-200';
                    else if (days<=3)  cardCls='bg-orange-50/30 border-orange-200';

                    return (
                      <div key={d.id} className={`rounded-[32px] border transition-all shadow-sm ${cardCls} ${!d.isPaidThisMonth&&days>=0?'hover:shadow-xl hover:shadow-slate-200/50':''}`}>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-5 md:p-6 gap-4 cursor-pointer" onClick={()=>setExpandedId(isExpanded?null:d.id)}>
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-300 shrink-0"><Wallet size={24}/></div>
                            <div>
                              <h4 className="font-black text-base text-slate-900 flex items-center gap-2">
                                {d.name}
                                {isExpanded?<ChevronUp size={16} className="text-slate-300"/>:<ChevronDown size={16} className="text-slate-300"/>}
                              </h4>
                              <p className="text-xs text-slate-400 font-medium mt-0.5">{d.rate>0?`${d.rate}% год.`:'Рассрочка 0%'} · Остаток {fmt(d.balance)}</p>
                              {extra>0&&!d.isPaidThisMonth&&<p className="text-[10px] text-emerald-600 font-black mt-1 flex items-center gap-1"><TrendingDown size={12}/> Досрочно +{fmt(extra)}</p>}
                            </div>
                          </div>
                          <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
                            <div className="text-left sm:text-right">
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Платёж</p>
                              <p className="text-xl font-black text-slate-900">{fmt(d.minPayment)}</p>
                            </div>
                            <DaysBadge days={days} paid={d.isPaidThisMonth}/>
                            <div className="flex gap-1" onClick={e=>e.stopPropagation()}>
                              <button onClick={()=>setEditingDebt(d)}
                                className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-emerald-600 bg-slate-50 hover:bg-emerald-50 rounded-2xl transition-colors"
                                title="Редактировать"><Edit3 size={16}/></button>
                              {d.isPaidThisMonth
                                ?<button onClick={()=>handleUndoPaid(d.id)} className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-orange-500 bg-slate-50 hover:bg-orange-50 rounded-2xl transition-colors" title="Отменить"><RotateCcw size={18}/></button>
                                :<button onClick={()=>handleMarkPaid(d.id)} className="bg-slate-900 text-white px-4 h-10 rounded-2xl text-[10px] font-black flex items-center gap-2 hover:bg-emerald-600 transition-colors shadow-md"><CheckCircle2 size={16}/><span className="hidden sm:inline">ОПЛАТИТЬ</span></button>
                              }
                            </div>
                          </div>
                        </div>

                        {isExpanded&&(
                          <div className="px-5 md:px-6 pb-6 pt-2 border-t border-slate-100 cursor-default" onClick={e=>e.stopPropagation()}>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 mb-5">
                              {[
                                {lbl:'% в месяц',    val:fmt(mInterest),   cls:'text-red-500'},
                                {lbl:'Тело долга',   val:fmt(mPrincipal),  cls:'text-emerald-600'},
                                {lbl:'Дата платежа', val:fmtDate(d.nextPaymentDate,{day:'numeric',month:'short'}), cls:'text-slate-900'},
                                {lbl:'До платежа',   val:days<0?`−${Math.abs(days)} дн.`:days===0?'Сегодня':`${days} дн.`, cls:days<0?'text-red-500':days<=3?'text-orange-500':'text-slate-900'},
                              ].map(c=>(
                                <div key={c.lbl} className="bg-slate-50 p-4 rounded-2xl">
                                  <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">{c.lbl}</span>
                                  <span className={`font-black text-base ${c.cls}`}>{c.val}</span>
                                </div>
                              ))}
                            </div>
                            {d.rate>0&&d.minPayment>0&&(
                              <div className="mb-4">
                                <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Структура платежа</div>
                                <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden flex">
                                  <div className="bg-red-400 h-full" style={{width:`${Math.min(100,mInterest/d.minPayment*100)}%`}}/>
                                  <div className="bg-emerald-500 h-full" style={{width:`${Math.max(0,100-mInterest/d.minPayment*100)}%`}}/>
                                </div>
                                <div className="flex justify-between text-[10px] font-bold mt-1.5">
                                  <span className="text-red-400">Проценты: {fmt(mInterest)}</span>
                                  <span className="text-emerald-600">Тело: {fmt(mPrincipal)}</span>
                                </div>
                              </div>
                            )}
                            {d.details?.summary&&(
                              <div className="bg-amber-50 text-amber-900 p-4 rounded-2xl text-xs font-medium border border-amber-100 mb-4">
                                <div className="flex items-center gap-2 mb-1.5 text-amber-600 font-black text-[10px] uppercase tracking-widest"><AlertCircle size={14}/> Условия банка</div>
                                {d.details.gracePeriod&&<div className="mb-1"><span className="font-black">Грейс: </span>{d.details.gracePeriod}</div>}
                                {d.details.penalty&&<div className="mb-1"><span className="font-black">Штраф: </span><span className="text-red-700">{d.details.penalty}</span></div>}
                                <div className="mt-1">{d.details.summary}</div>
                              </div>
                            )}
                            <div className="flex gap-3 justify-between">
                              <button onClick={()=>setActiveTab('calculators')}
                                className="text-xs font-black text-emerald-600 bg-emerald-50 hover:bg-emerald-100 px-4 py-2.5 rounded-xl transition-colors flex items-center gap-2">
                                <Calculator size={14}/> Калькулятор
                              </button>
                              <button onClick={()=>handleDelete(d.id)} className="text-xs font-black text-red-400 bg-red-50 hover:bg-red-100 px-4 py-2.5 rounded-xl transition-colors flex items-center gap-2">
                                <X size={14}/> Удалить
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Стратегия */}
                <div className="space-y-5">
                  <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
                    <h3 className="font-black text-lg text-slate-900 mb-5 flex items-center gap-2"><TrendingDown className="text-emerald-600" size={20}/> Стратегия</h3>
                    <div className="flex bg-slate-50 p-1.5 rounded-2xl mb-4">
                      {[['avalanche','🔥 Лавина'],['snowball','⛄ Снежный ком']].map(([s,label])=>(
                        <button key={s} onClick={()=>handleStrategyChange(s)}
                          className={`flex-1 py-2.5 rounded-xl text-[10px] font-black transition-all ${strategy===s?'bg-white shadow-sm text-emerald-700':'text-slate-400 hover:text-slate-600'}`}>
                          {label}
                        </button>
                      ))}
                    </div>
                    <p className="text-[10px] text-slate-400 font-medium mb-4 leading-relaxed">
                      {strategy==='avalanche'?'Гасим самый дорогой % первым. Максимальная экономия.':'Закрываем наименьший долг первым. Психологически легче.'}
                    </p>
                    <div className="space-y-2">
                      {Object.entries(strategyAllocation).some(([,a])=>a>0)
                        ?Object.entries(strategyAllocation).map(([id,amt])=>{
                          if (amt<=0) return null;
                          const debt=debts.find(d=>d.id==id);
                          return (
                            <div key={id} className="flex justify-between items-center p-3 bg-slate-50 rounded-2xl">
                              <span className="text-xs font-bold text-slate-700 truncate mr-2">{debt?.name}</span>
                              <span className="font-black text-sm text-emerald-600 shrink-0">+{fmt(amt)}</span>
                            </div>
                          );
                        })
                        :<p className="text-center text-xs text-slate-400 py-4 font-medium">Введите свободные деньги выше</p>
                      }
                    </div>
                  </div>
                </div>
              </div>
            </>)}

            {activeTab==='calendar'    && <CalendarTab debts={debts}/>}
            {activeTab==='analytics'   && <AnalyticsTab debts={debts} totalDebt={totalDebt} totalMinPaymentAll={totalMinPaymentAll} debtHistory={debtHistory}/>}
            {activeTab==='calculators' && <CalcTab debts={debts}/>}

            {/* После долгов */}
            {activeTab==='investing'&&(
              <div className="max-w-3xl mx-auto text-center py-10 md:py-16">
                <div className="w-24 h-24 bg-emerald-50 text-emerald-600 rounded-[32px] flex items-center justify-center mx-auto mb-8 shadow-inner"><Target size={48}/></div>
                <h2 className="text-4xl md:text-5xl font-black mb-6 text-slate-900 tracking-tight">Жизнь после долгов</h2>
                <p className="text-slate-500 mb-10 leading-relaxed text-lg max-w-2xl mx-auto">
                  Как только кредиты закроются, сумма <span className="font-black text-emerald-600">{fmt(totalMinPaymentAll+Number(freeMoney))}</span> станет вашей ежемесячной инвестицией.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 text-left">
                  {[{y:5,k:1.816},{y:10,k:3.300},{y:20,k:10.892}].map(({y,k})=>{
                    const monthly=totalMinPaymentAll+Number(freeMoney);
                    return (
                      <div key={y} className="bg-white p-7 rounded-[32px] border border-slate-100 shadow-sm">
                        <div className="text-[9px] text-slate-400 font-black uppercase tracking-widest mb-2">через {y} лет</div>
                        <div className="text-2xl font-black text-slate-900 mb-1">{fmt(monthly*k*12)}</div>
                        <div className="text-[10px] text-slate-400 font-medium">при 12% год.</div>
                      </div>
                    );
                  })}
                </div>
                <div className="bg-white p-10 rounded-[48px] border border-slate-100 shadow-2xl shadow-slate-100">
                  <div className="text-[9px] text-slate-400 font-black uppercase tracking-widest mb-4">Капитал через 10 лет</div>
                  <div className="text-5xl md:text-7xl font-black text-slate-900 tracking-tighter mb-4">{fmt((totalMinPaymentAll+Number(freeMoney))*120*1.6)}</div>
                  <div className="inline-block bg-emerald-50 text-emerald-700 px-4 py-2 rounded-xl text-xs font-black">* При средней доходности 12% годовых</div>
                </div>
              </div>
            )}

          </div>
        </div>
      </main>

      {/* Модалка: Добавить */}
      {isAddModalOpen&&(
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto">
          <form onSubmit={handleAdd} className="bg-white rounded-t-[40px] sm:rounded-[40px] p-8 w-full sm:max-w-md shadow-2xl space-y-4 my-auto">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-2xl font-black text-slate-900">Новый долг</h3>
              <button type="button" onClick={()=>setIsAddModalOpen(false)} className="w-10 h-10 flex items-center justify-center bg-slate-50 text-slate-400 rounded-full hover:bg-slate-100 transition-colors"><X size={20}/></button>
            </div>
            <div><label className="text-[9px] uppercase font-black text-slate-400 ml-1 mb-1.5 block tracking-widest">Название</label>
              <input required placeholder="Кредитка Альфа" className={inCls} value={newDebt.name} onChange={e=>setNewDebt({...newDebt,name:e.target.value})}/></div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="text-[9px] uppercase font-black text-slate-400 ml-1 mb-1.5 block tracking-widest">Остаток ₽</label>
                <input required type="number" placeholder="100000" className={inCls} value={newDebt.balance} onChange={e=>setNewDebt({...newDebt,balance:e.target.value})}/></div>
              <div><label className="text-[9px] uppercase font-black text-slate-400 ml-1 mb-1.5 block tracking-widest">Ставка %</label>
                <input required type="number" step="0.1" placeholder="24.9" className={inCls} value={newDebt.rate} onChange={e=>setNewDebt({...newDebt,rate:e.target.value})}/></div>
            </div>
            <div><label className="text-[9px] uppercase font-black text-slate-400 ml-1 mb-1.5 block tracking-widest">Ежемесячный платёж ₽</label>
              <input required type="number" placeholder="5000" className={inCls} value={newDebt.minPayment} onChange={e=>setNewDebt({...newDebt,minPayment:e.target.value})}/></div>
            <div><label className="text-[9px] uppercase font-black text-slate-400 ml-1 mb-1.5 block tracking-widest">Ближайшая дата</label>
              <input required type="date" className={inCls+' text-slate-500'} value={newDebt.nextPaymentDate} onChange={e=>setNewDebt({...newDebt,nextPaymentDate:e.target.value})}/></div>
            <div><label className="text-[9px] uppercase font-black text-slate-400 ml-1 mb-1.5 block tracking-widest">Условия / заметка</label>
              <textarea rows={2} placeholder="Грейс 120 дней. Штраф 590₽..." className={inCls+' resize-none text-sm'} value={newDebt.detailsSummary} onChange={e=>setNewDebt({...newDebt,detailsSummary:e.target.value})}/></div>
            <button type="submit" className="w-full bg-slate-900 text-white p-5 rounded-2xl font-black shadow-xl hover:bg-emerald-600 transition-all uppercase tracking-widest">Добавить в дашборд</button>
          </form>
        </div>
      )}

      {/* Модалка: Редактировать */}
      {editingDebt&&<EditModal debt={editingDebt} onSave={handleSaveEdit} onClose={()=>setEditingDebt(null)}/>}
    </div>
  );
}

const root = createRoot(document.getElementById('root'));
root.render(<ErrorBoundary><App/></ErrorBoundary>);
