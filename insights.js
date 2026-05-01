export const generateInsights = async (debts = [], deposits = [], freeMoney = 0) => {
  const CACHE_KEY = 'freedom_app_insights';
  
  // Проверяем кэш в sessionStorage
  const cached = sessionStorage.getItem(CACHE_KEY);
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch (e) {
      sessionStorage.removeItem(CACHE_KEY);
    }
  }

  const API_KEY = import.meta.env.VITE_GEMINI_KEY;
  if (!API_KEY) {
    console.error("Gemini API Key is missing. Check your environment variables.");
    return [];
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;

  const debtsContext = debts.map(d => 
    `- ${d.name}: остаток ${d.balance}₽, ставка ${d.rate}%, платеж ${d.minPayment}₽, дата ${d.nextPaymentDate}, оплачен: ${d.isPaidThisMonth ? 'Да' : 'Нет'}`
  ).join('\n');

  const depositsContext = deposits.map(d => 
    `- ${d.name}: ${d.amount}₽ (${d.rate}%)`
  ).join('\n');

  const prompt = `Ты — финансовый аналитик. Проанализируй состояние пользователя:
Свободные деньги в месяц: ${freeMoney}₽.
Долги:
${debtsContext || 'Нет долгов'}
Вклады:
${depositsContext || 'Нет вкладов'}

Верни ТОЛЬКО JSON массив из 2-3 объектов. Поля:
type: 'warning' (высокие %, просрочки), 'tip' (советы по выгоде), 'success' (достижения).
title: краткий заголовок (до 40 символов).
text: конкретный совет или факт.

Примеры: "Просрочка по карте", "Закрой кредит быстрее", "Все платежи выполнены".
Ответ должен быть валидным JSON без лишнего текста.`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });

    const data = await response.json();
    let text = data.candidates?.[0]?.content?.parts?.[0]?.text || "[]";
    
    // Более надежное извлечение JSON из markdown-разметки
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    const jsonString = jsonMatch ? jsonMatch[0] : "[]";
    
    const insights = JSON.parse(jsonString);

    // Сохраняем в кэш
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(insights));
    return insights;
  } catch (error) {
    console.error("AI Insights failed:", error);
    return [];
  }
};