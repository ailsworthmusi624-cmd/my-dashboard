import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { GoogleGenerativeAI } from '@google/generative-ai';

const BOT_TOKEN = '8809380077:AAGwvj3HN8cCJGOwQcHigUhtGTq8g1ga9Pw';
const ALLOWED_USER_ID = 474602015;
const API = `https://api.telegram.org/bot${BOT_TOKEN}`;

let db;
let geminiModel;

function initServices(env) {
  if (!getApps().length) {
    const serviceAccount = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT);
    initializeApp({ credential: cert(serviceAccount) });
  }
  db = getFirestore();
  const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
  geminiModel = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
}

const STATE_REF = () => db.doc('artifacts/dashboard-27927/public/data/appState/main');
const MASTERS_LIST = ['Анна', 'Юля', 'Оля', 'Елена', 'Вика'];

async function sendMessage(chat_id, text) {
  await fetch(`${API}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id, text })
  });
}

function today() {
  return new Date().toISOString().split('T')[0];
}

async function parseWithGemini(text) {
  const prompt = `Ты парсер для салона красоты. Верни ТОЛЬКО валидный JSON без markdown.

Мастера: ${MASTERS_LIST.join(', ')}
Услуги: Маникюр, Педикюр, Стрижка, Окрашивание, Брови, Прочее
Оплата: cash (нал), card (карта/безнал), sbp (сбп/перевод)

Сообщение: "${text}"

Варианты ответа:
{"type":"journal","master":"Имя","services":[{"title":"Услуга","amount":1000}],"payment":"cash"}
{"type":"expense","category":"Аренда","amount":50000}
{"type":"advance","master":"Имя","amount":5000,"label":"Аванс"}
{"type":"error","msg":"причина"}

Правила: имя мастера точно из списка, amount число, payment по умолчанию cash.`;

  const result = await geminiModel.generateContent(prompt);
  const raw = result.response.text().trim().replace(/```json|```/g, '').trim();
  return JSON.parse(raw);
}

async function writeJournal({ master, services, payment }) {
  const snap = await STATE_REF().get();
  const data = snap.exists ? snap.data() : {};
  const journal = data.journal || [];
  const masters = data.masters || [];
  const masterObj = masters.find(m => m.name === master);
  const rate = masterObj?.rate1 || 40;

  const entry = {
    id: Date.now(),
    date: today(),
    masterName: master,
    paymentMethod: payment,
    services: services.map(s => ({ id: Date.now() + Math.random(), title: s.title, amount: s.amount, rate })),
    goods: []
  };

  await STATE_REF().set({ journal: [...journal, entry] }, { merge: true });
  const total = services.reduce((s, i) => s + i.amount, 0);
  const payLabel = payment === 'cash' ? 'нал' : payment === 'card' ? 'карта' : 'СБП';
  const lines = services.map(s => `${s.title} ${s.amount.toLocaleString('ru')} ₽`).join(' + ');
  return `✅ Запись добавлена:\n👤 ${master} — ${lines}\n💰 Итого: ${total.toLocaleString('ru')} ₽ (${payLabel})`;
}

async function writeExpense({ category, amount }) {
  const snap = await STATE_REF().get();
  const data = snap.exists ? snap.data() : {};
  const expenses = data.expenses || [];
  await STATE_REF().set({ expenses: [...expenses, { id: Date.now(), date: today(), category, amount, comment: category }] }, { merge: true });
  return `✅ Расход добавлен:\n📂 ${category} — ${amount.toLocaleString('ru')} ₽`;
}

async function writeAdvance({ master, amount, label }) {
  const snap = await STATE_REF().get();
  const data = snap.exists ? snap.data() : {};
  const advances = data.advances || [];
  await STATE_REF().set({ advances: [...advances, { id: Date.now(), date: today(), masterName: master, amount, type: label }] }, { merge: true });
  return `✅ ${label} записан:\n👤 ${master} — ${amount.toLocaleString('ru')} ₽`;
}

async function handleUpdate(update) {
  const msg = update.message;
  if (!msg?.text) return;
  if (msg.from.id !== ALLOWED_USER_ID) return;

  const text = msg.text;
  const chatId = msg.chat.id;

  if (text === '/start') {
    await sendMessage(chatId, `👋 Freedom Bot!\n\nПримеры:\n• Юля маникюр 2000 нал\n• Аня маникюр 1800 педикюр 2500 сбп\n• Аренда 50000\n• Юля аванс 5000`);
    return;
  }

  try {
    const parsed = await parseWithGemini(text);
    let reply;
    if (parsed.type === 'journal') reply = await writeJournal(parsed);
    else if (parsed.type === 'expense') reply = await writeExpense(parsed);
    else if (parsed.type === 'advance') reply = await writeAdvance(parsed);
    else reply = `❓ ${parsed.msg}`;
    await sendMessage(chatId, reply);
  } catch (e) {
    console.error(e);
    await sendMessage(chatId, `⚠️ Ошибка: ${e.message}`);
  }
}

export default {
  async fetch(request, env) {
    if (request.method !== 'POST') return new Response('Freedom Bot OK');

    initServices(env);

    try {
      const update = await request.json();
      await handleUpdate(update);
    } catch (e) {
      console.error(e);
    }

    return new Response('ok');
  }
};
