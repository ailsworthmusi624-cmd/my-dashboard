/**
 * Расчет аннуитетного платежа
 */
export const calculateAnnuity = (principal, annualRate, months) => {
  if (annualRate === 0) return principal / months;
  const monthlyRate = annualRate / 100 / 12;
  const x = Math.pow(1 + monthlyRate, months);
  return (principal * monthlyRate * x) / (x - 1);
};

export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
  }).format(amount);
};