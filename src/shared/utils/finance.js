export const calcAnnuitySchedule = (principal, annualRate, monthlyPayment, startDateStr) => {
  if (!principal || !monthlyPayment || principal <= 0 || monthlyPayment <= 0) return [];
  const r = annualRate / 100 / 12;
  const rows = [];
  let bal = principal, month = 1;
  let curDate = startDateStr ? new Date(startDateStr) : new Date();
  
  while (bal > 0.5 && month <= 600) {
    const interest = r > 0 ? bal * r : 0;
    const principal_ = Math.min(bal, monthlyPayment - interest);
    if (principal_ <= 0) break;
    bal = Math.max(0, bal - principal_);
    const dateLabel = curDate.toLocaleDateString('ru-RU', { month: 'short', year: '2-digit' });
    rows.push({ month, payment: monthlyPayment, interest, principal: principal_, balance: bal, dateLabel });
    curDate = new Date(curDate.getFullYear(), curDate.getMonth() + 1, curDate.getDate());
    month++;
  }
  return rows;
};

export const calcEarlyPayoff = (balance, annualRate, monthlyPayment, extraAmount) => {
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
  
  const base = simulate(monthlyPayment);
  const extra = simulate(monthlyPayment + extraAmount);
  
  return {
    baseMon: base.months, 
    extraMon: extra.months,
    savedMon: Math.max(0, base.months - extra.months),
    savedMoney: Math.max(0, base.totalPaid - extra.totalPaid),
    overpayBase: Math.max(0, base.totalPaid - balance),
    overpayExtra: Math.max(0, extra.totalPaid - balance),
  };
};

export const calcFV = (monthlyPayment, annualRate, months) => {
  const r = annualRate / 100 / 12;
  if (r === 0) return monthlyPayment * months;
  return monthlyPayment * (Math.pow(1 + r, months) - 1) / r;
};