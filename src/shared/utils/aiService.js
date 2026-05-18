// Stub for header AI search — returns a plain text answer
export const askSmartAssistant = async (question, state) => {
  const API_KEY = import.meta.env.VITE_GEMINI_KEY;
  if (!API_KEY) return [{ text: 'Нет ключа VITE_GEMINI_KEY в .env' }];

  const journal = state.journal ?? [];
  const expenses = state.expenses ?? [];
  const masters = state.masters ?? [];

  const totalRevenue = journal.reduce((s, e) => {
    const rev = [...(e.services||[]), ...(e.goods||[])].reduce((a, x) => a + (Number(x.amount)||0), 0);
    return s + rev;
  }, 0);
  const totalExpenses = expenses.reduce((s, e) => s + (Number(e.amount)||0), 0);

  const context = `Данные салона — выручка: ${Math.round(totalRevenue)} ₽, расходы: ${Math.round(totalExpenses)} ₽, мастеров: ${masters.length}, записей: ${journal.length}.`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: `${context}\n\nВопрос: ${question}\n\nОтветь коротко (1-3 предложения) на русском языке.` }] }] })
    });
    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Нет ответа';
    return [{ text }];
  } catch {
    return [{ text: 'Ошибка запроса к AI' }];
  }
};
