import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { ProxyAgent, setGlobalDispatcher } from 'undici';

const PROXY = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
if (PROXY) setGlobalDispatcher(new ProxyAgent(PROXY));
const BOT_TOKEN = '8809380077:AAGwvj3HN8cCJGOwQcHigUhtGTq8g1ga9Pw';
const ALLOWED_USER_ID = 474602015;
const API = `https://api.telegram.org/bot${BOT_TOKEN}`;

initializeApp({ credential: cert('./dashboard-27927-firebase-adminsdk-fbsvc-fb67b6846e.json') });
const db = getFirestore();
const STATE_REF = db.doc('artifacts/dashboard-27927/public/data/appState/main');

// ── ПАРСЕР СООБЩЕНИЙ ──

const MASTERS = ['анна', 'юля', 'оля', 'елена', 'вика'];
const SERVICES = ['маникюр', 'педикюр', 'стрижка', 'окрашивание', 'брови', 'прочее'];
const PAYMENT_MAP = {
  'нал': 'cash', 'кэш': 'cash', 'нали': 'cash',
  'карта': 'card', 'безнал': 'card',
  'сбп': 'sbp', 'перевод': 'sbp'
};
const EXPENSE_KEYWORDS = ['расход', 'аренда', 'жку', 'мтс', 'закупка', 'реклама', 'прочее'];
const ADVANCE_KEYWORDS = ['аванс', 'зп', 'зарплата', 'выплата'];

function today() {
  return new Date().toISOString().split('T')[0];
}

function parseAmount(tokens) {
  for (const t of tokens) {
    const n = parseInt(t.replace(/\D/g, ''));
    if (!isNaN(n) && n > 0) return n;
  }
  return null;
}

function parseMaster(tokens) {
  for (const t of tokens) {
    const match = MASTERS.find(m => m === t.toLowerCase());
    if (match) return match.charAt(0).toUpperCase() + match.slice(1);
  }
  return null;
}

function parseService(tokens) {
  for (const t of tokens) {
    const match = SERVICES.find(s => s === t.toLowerCase());
    if (match) return match.charAt(0).toUpperCase() + match.slice(1);
  }
  return 'Прочее';
}

function parsePayment(tokens) {
  for (const t of tokens) {
    const key = t.toLowerCase();
    if (PAYMENT_MAP[key]) return PAYMENT_MAP[key];
  }
  return 'cash';
}

function parseMessage(text) {
  const tokens = text.trim().split(/\s+/);
  const lower = text.toLowerCase();

  // АВАНС/ЗП: "Юля аванс 5000" / "Юля зп 10000"
  if (ADVANCE_KEYWORDS.some(k => lower.includes(k))) {
    const master = parseMaster(tokens);
    const amount = parseAmount(tokens);
    const isZp = lower.includes('зп') || lower.includes('зарплата');
    if (master && amount) {
      return { type: 'advance', master, amount, label: isZp ? 'ЗП' : 'Аванс' };
    }
    return { type: 'error', msg: `Не распознал. Пример: "Юля аванс 5000"` };
  }

  // РАСХОД: "Аренда 50000" / "Расход МТС 500"
  if (EXPENSE_KEYWORDS.some(k => lower.includes(k)) || lower.startsWith('расход')) {
    const amount = parseAmount(tokens);
    const name = tokens.find(t => !parseInt(t) && !['расход'].includes(t.toLowerCase())) || 'Прочее';
    const category = name.charAt(0).toUpperCase() + name.slice(1);
    if (amount) {
      return { type: 'expense', category, amount };
    }
    return { type: 'error', msg: `Не распознал расход. Пример: "Аренда 50000"` };
  }

  // ЗАПИСЬ В ЖУРНАЛ: "Юля маникюр 2000 нал"
  const master = parseMaster(tokens);
  const service = parseService(tokens);
  const amount = parseAmount(tokens);
  const payment = parsePayment(tokens);

  if (master && amount) {
    return { type: 'journal', master, service, amount, payment };
  }

  return {
    type: 'error',
    msg: `Не распознал. Примеры:\n• Юля маникюр 2000 нал\n• Аренда 50000\n• Юля аванс 5000`
  };
}

// ── ЗАПИСЬ В FIRESTORE ──

async function writeJournal({ master, service, amount, payment }) {
  const snap = await STATE_REF.get();
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
    services: [{ id: Date.now(), title: service, amount, rate }],
    goods: []
  };

  await STATE_REF.set({ journal: [...journal, entry] }, { merge: true });
  return `✅ Запись добавлена:\n👤 ${master} — ${service}\n💰 ${amount.toLocaleString('ru')} ₽ (${payment === 'cash' ? 'нал' : payment === 'card' ? 'карта' : 'СБП'})`;
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
    await sendMessage(chatId, `👋 Freedom Bot запущен!\n\nПримеры команд:\n• <b>Юля маникюр 2000 нал</b> — запись в журнал\n• <b>Аренда 50000</b> — расход\n• <b>Юля аванс 5000</b> — аванс мастеру\n• <b>Юля зп 15000</b> — выплата зарплаты`);
    return;
  }

  try {
    const parsed = parseMessage(text);

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

async function poll(offset = 0) {
  try {
    const r = await fetch(`${API}/getUpdates?offset=${offset}&timeout=30`);
    const data = await r.json();
    for (const update of data.result || []) {
      await handleUpdate(update);
      offset = update.update_id + 1;
    }
  } catch (e) {
    console.error('Poll error:', e.message);
  }
  setTimeout(() => poll(offset), 1000);
}

fetch(`${API}/deleteWebhook`).then(() => {
  console.log('Freedom Bot started (polling mode)');
  poll();
});
