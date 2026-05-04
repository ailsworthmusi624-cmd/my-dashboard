export const askSmartAssistant = async (query, contextData) => {
  const API_KEY = import.meta.env.VITE_GEMINI_KEY;
  if (!API_KEY) return 'Ошибка: не указан VITE_GEMINI_KEY в .env';

  const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' + API_KEY;

  // Считаем смены для каждого мастера (уникальные даты в журнале)
  const journal = contextData.rawJournal || [];
  const masters = contextData.rawMasters || [];
  const expenses = contextData.rawExpenses || [];

  const masterStats = {};
  masters.forEach(m => {
    const masterEntries = journal.filter(e => e.masterName === m.name);
    const uniqueDates = [...new Set(masterEntries.map(e => e.date))];
    let revenue = 0;
    let clientsCount = masterEntries.length;
    masterEntries.forEach(entry => {
      (entry.services || []).forEach(s => { revenue += Number(s.amount) || 0; });
    });
    masterStats[m.name] = {
      смены: uniqueDates.length,
      даты_смен: uniqueDates.sort(),
      выручка: revenue,
      чеков: clientsCount,
      средний_чек: clientsCount > 0 ? Math.round(revenue / clientsCount) : 0,
      процент_ставка: (m.rate1 || 0) + '%',
      оклад_за_смену: m.basePerShift || 0,
      зп_процент: Math.round(revenue * (m.rate1 || 0) / 100),
      зп_оклад: uniqueDates.length * (m.basePerShift || 0),
      зп_итого: Math.round(revenue * (m.rate1 || 0) / 100) + uniqueDates.length * (m.basePerShift || 0),
    };
  });

  // Статистика по дням
  const dayStats = {};
  journal.forEach(entry => {
    if (!dayStats[entry.date]) dayStats[entry.date] = { выручка: 0, чеков: 0 };
    (entry.services || []).forEach(s => {
      dayStats[entry.date].выручка += Number(s.amount) || 0;
    });
    dayStats[entry.date].чеков++;
  });

  // Статистика по категориям расходов
  const expenseStats = {};
  expenses.forEach(e => {
    if (!expenseStats[e.category]) expenseStats[e.category] = 0;
    expenseStats[e.category] += Number(e.amount) || 0;
  });

  const totalRevenue = Object.values(dayStats).reduce((s, d) => s + d.выручка, 0);
  const totalExpenses = expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);
  const totalPayroll = Object.values(masterStats).reduce((s, m) => s + m.зп_итого, 0);

  const fullContext = `
ДАННЫЕ САЛОНА (полный анализ):

ВЫРУЧКА И КЛИЕНТЫ:
- Итого выручка: ${totalRevenue} ₽
- Итого расходы: ${totalExpenses} ₽
- Итого ФОТ мастеров: ${totalPayroll} ₽
- Чистая прибыль: ${totalRevenue - totalExpenses - totalPayroll} ₽

СТАТИСТИКА ПО МАСТЕРАМ:
${JSON.stringify(masterStats, null, 2)}

ВЫРУЧКА ПО ДНЯМ:
${JSON.stringify(dayStats, null, 2)}

РАСХОДЫ ПО КАТЕГОРИЯМ:
${JSON.stringify(expenseStats, null, 2)}

СЫРЫЕ ДАННЫЕ ЖУРНАЛА (все записи):
${JSON.stringify(journal.slice(0, 50), null, 2)}

ФИНАНСОВЫЕ ПОКАЗАТЕЛИ:
${JSON.stringify(contextData.finance || {}, null, 2)}
`;

  const prompt = `Ты — умный финансовый директор и аналитик салона красоты.
Тебе доступны ВСЕ данные салона включая журнал записей, смены мастеров и расходы.

${fullContext}

Вопрос: ${query}

Правила ответа:
- Отвечай ТОЛЬКО по данным выше — не выдумывай цифры
- Если данных нет — так и скажи честно
- Давай конкретные числа из данных
- Указывай на проблемы и слабые места если видишь
- Давай практические рекомендации
- Отвечай по-русски, кратко и чётко
- Максимум 5 предложений`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 500,
        }
      })
    });
    const data = await response.json();
    if (data.error) return '❌ Ошибка API: ' + data.error.message;
    return data.candidates?.[0]?.content?.parts?.[0]?.text || 'Нет ответа от AI';
  } catch (error) {
    return '❌ Ошибка соединения: ' + error.message;
  }
};