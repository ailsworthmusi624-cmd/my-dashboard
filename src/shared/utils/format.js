// src/shared/utils/format.js

export const fmt = (v) =>
  new Intl.NumberFormat('ru-RU', {
    style: 'currency', currency: 'RUB', maximumFractionDigits: 0
  }).format(v || 0);

export const fmtDate = (dateStr, opts = {}) => {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('ru-RU', opts);
};

export const getDaysDiff = (dateStr) => {
  if (!dateStr) return 0;
  const [y, m, d] = dateStr.split('-').map(Number);
  const today = new Date(); today.setHours(0,0,0,0);
  return Math.ceil((new Date(y, m-1, d) - today) / 86400000);
};

export const daysFrom = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  // Защита от смещения часовых поясов
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const MONTH_NAMES = [
  'Январь','Февраль','Март','Апрель','Май','Июнь',
  'Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'
];