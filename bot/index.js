import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { ProxyAgent, fetch as undiciFetch } from 'undici';
import { GoogleGenerativeAI } from '@google/generative-ai';

const PROXY = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
const proxyAgent = PROXY ? new ProxyAgent(PROXY) : undefined;

function fetch(url, opts = {}) {
  return undiciFetch(url, proxyAgent ? { ...opts, dispatcher: proxyAgent } : opts);
}

// Gemini SDK использует globalThis.fetch — патчим чтобы он тоже шёл через прокси
if (proxyAgent) globalThis.fetch = fetch;

const BOT_TOKEN = '8809380077:AAGwvj3HN8cCJGOwQcHigUhtGTq8g1ga9Pw';
const ALLOWED_USER_ID = 474602015;
const API = `https://api.telegram.org/bot${BOT_TOKEN}`;

const GEMINI_API_KEY = 'AIzaSyCyhji5FcNjl8Xlj2s255ZGUl6gB9pBlJg';
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const geminiModel = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

initializeApp({ credential: cert('./dashboard-27927-firebase-adminsdk-fbsvc-fb67b6846e.json') });
const db = getFirestore();
const STATE_REF = db.doc('artifacts/dashboard-27927/public/data/appState/main');

// ── ПАРСЕР НА GEMINI ──

const MASTERS_LIST = ['Анна', 'Юля', 'Оля', 'Елена', 'Вика'];

async function parseWithGemini(text, attempt = 1) {
  const prompt = `
Ты парсер сообщений для салона красоты. Извлеки данные из сообщения и верни ТОЛЬКО валидный JSON без markdown и пояснений.

Мастера салона: ${MASTERS_LIST.join(', ')}
Услуги: Маникюр, Педикюр, Стрижка, Окрашивание, Брови, Прочее
Способы оплаты: cash (нал, наличные), card (карта, безнал), sbp (сбп, перевод, qr)
Категории расходов: Аренда, ЖКУ, Материалы, Реклама, Зарплата, Прочее

Сообщение: "${text}"

Определи тип и верни один из вариантов:

Если это запись клиента (мастер + услуга + сумма):
{"type":"journal","master":"Имя","services":[{"title":"Услуга","amount":1000}],"payment":"cash"}

Если несколько услуг у одного мастера одним чеком:
{"type":"journal","master":"Имя","services":[{"title":"Маникюр","amount":1800},{"title":"Педикюр","amount":2500}],"payment":"sbp"}

Если это расход салона:
{"type":"expense","category":"Аренда","amount":50000}

Если это аванс или зарплата мастеру:
{"type":"advance","master":"Имя","amount":5000,"label":"Аванс"}

Если не удалось распознать:
{"type":"error","msg":"Поясни почему"}

Правила:
- Имя мастера всегда с заглавной буквы точно как в списке
- amount всегда число без пробелов
- payment по умолчанию "cash" если не указано
- Для аванса label = "Аванс", для зарплаты label = "ЗП"
`;

  try {
    const result = await geminiModel.generateContent(prompt);
    const raw = result.response.text().trim();
    const clean = raw.replace(/```json|```/g, '').trim();
    return JSON.parse(clean);
  } catch (e) {
    const isQuota = e.message?.includes('429') || e.status === 429;
    console.error(`Gemini attempt ${attempt} error:`, e.message);
    if (!isQuota && attempt < 3) {
      await new Promise(r => setTimeout(r, 1000 * attempt));
      return parseWithGemini(text, attempt + 1);
    }
    return { type: 'error', msg: isQuota ? '⚠️ Лимит Gemini API исчерпан. Пополни баланс на ai.google.dev' : 'Не удалось распознать. Попробуй ещё раз.' };
  }
}

// ── ВСПОМОГАТЕЛЬНАЯ ФУНКЦИЯ ──

function today() {
  return new Date().toISOString().split('T')[0];
}

// ── ЗАПИСЬ В FIRESTORE ──

async function writeJournal({ master, services, payment }) {
  const snap = await STATE_REF.get();
  const data = snap.exists ? snap.data() : {};
  const journal = data.journal || [];

  const masters = data.masters || [];
  const masterObj = masters.find(m => m.name === master);
  const rate = masterObj?.rate1 || 40;

  const entryServices = services.map(s => ({
    id: Date.now() + Math.random(),
    title: s.title,
    amount: s.amount,
    rate
  }));

  const totalAmount = entryServices.reduce((sum, s) => sum + s.amount, 0);
  const payLabel = payment === 'cash' ? 'нал' : payment === 'card' ? 'карта' : 'СБП';

  const entry = {
    id: Date.now(),
    date: today(),
    masterName: master,
    paymentMethod: payment,
    services: entryServices,
    goods: []
  };

  await STATE_REF.set({ journal: [...journal, entry] }, { merge: true });

  const servicesSummary = services.map(s => `${s.title} ${s.amount.toLocaleString('ru')} ₽`).join(' + ');
  return `✅ Запись добавлена:\n👤 ${master} — ${servicesSummary}\n💰 Итого: ${totalAmount.toLocaleString('ru')} ₽ (${payLabel})`;
}

async function writeExpense({ category, amount }) {
  const snap = await STATE_REF.get();
  const data = snap.exists ? snap.data() : {};
  const expenses = data.expenses || [];

  const entry = {
    id: Date.now(),
    date: today(),
    category,
    amount,
    comment: category
  };

  await STATE_REF.set({ expenses: [...expenses, entry] }, { merge: true });
  return `✅ Расход добавлен:\n📂 ${category} — ${amount.toLocaleString('ru')} ₽`;
}

async function writeAdvance({ master, amount, label }) {
  const snap = await STATE_REF.get();
  const data = snap.exists ? snap.data() : {};
  const advances = data.advances || [];

  const entry = {
    id: Date.now(),
    date: today(),
    masterName: master,
    amount,
    type: label
  };

  await STATE_REF.set({ advances: [...advances, entry] }, { merge: true });
  return `✅ ${label} записан:\n👤 ${master} — ${amount.toLocaleString('ru')} ₽`;
}

// ── TELEGRAM: отправка ответа ──

async function sendMessage(chat_id, text) {
  await fetch(`${API}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id, text, parse_mode: 'HTML' })
  });
}

// ── ОБРАБОТКА ОБНОВЛЕНИЙ ──

async function handleUpdate(update) {
  const uid = update.update_id;

  // Локальная проверка
  if (processedUpdates.has(uid)) return;

  // Проверка через Firestore (защита от нескольких процессов)
  const lockRef = db.doc(`artifacts/dashboard-27927/public/data/botLocks/${uid}`);
  const lockSnap = await lockRef.get();
  if (lockSnap.exists) return;

  // Устанавливаем lock
  await lockRef.set({ ts: Date.now() });
  processedUpdates.set(uid, Date.now());

  // Чистим старые локи (старше 1 часа)
  if (processedUpdates.size > 200) {
    const hour = Date.now() - 3600000;
    for (const [id, ts] of processedUpdates) {
      if (ts < hour) processedUpdates.delete(id);
    }
  }

  const msg = update.message;
  if (!msg || !msg.text) return;

  const userId = msg.from.id;
  const chatId = msg.chat.id;
  const text = msg.text;

  if (userId !== ALLOWED_USER_ID) {
    await sendMessage(chatId, '❌ Доступ запрещён');
    return;
  }

  if (text === '/start') {
    await sendMessage(chatId, `👋 Freedom Bot запущен!\n\nТеперь понимаю любые фразы:\n• <b>Аня сделала маникюр и педикюр, клиент заплатил 4300 по сбп</b>\n• <b>Оплата аренды 50000</b>\n• <b>Юля получила аванс пять тысяч</b>\n• <b>брови оля 1500 нал</b>`);
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
    await sendMessage(chatId, `⚠️ Ошибка сервера: ${e.message}`);
  }
}

const processedUpdates = new Map(); // update_id -> timestamp
let isPolling = false;

async function poll(offset = 0) {
  if (isPolling) return;
  isPolling = true;

  while (true) {
    try {
      const r = await fetch(`${API}/getUpdates?offset=${offset}&timeout=25&allowed_updates=["message"]`);
      const data = await r.json();

      for (const update of data.result || []) {
        if (!processedUpdates.has(update.update_id)) {
          await handleUpdate(update);
        }
        offset = update.update_id + 1;
      }
    } catch (e) {
      console.error('Poll error:', e.message);
      await new Promise(r => setTimeout(r, 3000));
    }
  }
}

fetch(`${API}/deleteWebhook`).then(() => {
  console.log('Freedom Bot started (polling mode)');
  poll();
});
