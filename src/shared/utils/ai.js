export const generateSalonInsights = async (metrics) => {
  const CACHE_KEY = 'freedom_salon_insights_' + new Date().toISOString().split('T')[0];
  const cached = sessionStorage.getItem(CACHE_KEY);
  if (cached) {
    try { return JSON.parse(cached); } catch (e) { sessionStorage.removeItem(CACHE_KEY); }
  }

  const API_KEY = import.meta.env.VITE_GEMINI_KEY;
  if (!API_KEY) return [{ type: 'warning', title: 'Нет ключа API', text: 'Укажите VITE_GEMINI_KEY в .env' }];

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;

  const prompt = `Ты — топовый финансовый директор и бизнес-консультант салона красоты. Проанализируй показатели текущего месяца:
  - Выручка: ${metrics.revenue} (План: ${metrics.planTotal}, Выполнено: ${metrics.planProgress.toFixed(1)}%)
  - Чистая прибыль: ${metrics.netProfit} (Маржинальность: ${metrics.margin.toFixed(1)}%)
  - Точка безубыточности: ${metrics.breakEven}
  - Средний чек: ${metrics.avgCheck.toFixed(0)} (Клиентов: ${metrics.clientsCount})
  - Прогноз выручки к концу месяца (Run Rate): ${metrics.runRate.toFixed(0)}

  Дай 3 коротких, мощных и конкретных бизнес-совета (без воды, 1-2 предложения каждый).
  Верни строго JSON массив объектов с полями:
  "type": "success" (если метрика отличная), "warning" (если есть угроза), или "tip" (совет по росту).
  "title": краткий заголовок (до 30 символов).
  "text": сам совет.`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "[]";
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    const insights = JSON.parse(jsonMatch ? jsonMatch[0] : "[]");

    sessionStorage.setItem(CACHE_KEY, JSON.stringify(insights));
    return insights;
  } catch (error) {
    console.error("AI Insights failed:", error);
    return [{ type: 'warning', title: 'Ошибка ИИ', text: 'Не удалось получить ответ от сервера.' }];
  }
};