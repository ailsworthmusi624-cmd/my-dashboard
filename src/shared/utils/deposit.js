export const calcDepositIncome = (amount, annualRate, startDate, endDate, capitalization) => {
  if (!amount || !annualRate || !startDate || !endDate)
    return { income: 0, total: 0, months: 0, effectiveRate: 0 };
    
  const start = new Date(startDate), end = new Date(endDate);
  const days = Math.max(1, Math.ceil((end - start) / 86400000));
  const months = days / 30.44;
  const r = annualRate / 100;
  
  let income = 0;
  if (capitalization) {
    income = amount * Math.pow(1 + r / 12, Math.round(months)) - amount;
  } else {
    income = amount * r * (days / 365);
  }
  
  const effectiveRate = (income / amount) * (365 / days) * 100;
  return { income, total: amount + income, months, effectiveRate };
};