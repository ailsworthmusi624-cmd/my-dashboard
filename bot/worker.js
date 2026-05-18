import { GoogleGenerativeAI } from '@google/generative-ai';

const ALLOWED_USER_ID = 474602015;
const MASTERS_LIST = ['Анна', 'Юля', 'Оля', 'Елена', 'Вика'];

const FIRESTORE_BASE = 'https://firestore.googleapis.com/v1/projects/dashboard-27927/databases/(default)/documents';
const DOC_PATH = 'artifacts/dashboard-27927/public/data/appState/main';

// ── JWT / Google auth ──

function base64url(buf) {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function makeJWT(serviceAccount) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iss: serviceAccount.client_email,
    sub: serviceAccount.client_email,
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
    scope: 'https://www.googleapis.com/auth/datastore'
  };

  const enc = new TextEncoder();
  const headerB64 = base64url(enc.encode(JSON.stringify(header)));
  const payloadB64 = base64url(enc.encode(JSON.stringify(payload)));
  const sigInput = `${headerB64}.${payloadB64}`;

  // Import RSA private key
  const pemBody = serviceAccount.private_key
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\n/g, '');
  const keyDer = Uint8Array.from(atob(pemBody), c => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8', keyDer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false, ['sign']
  );

  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', cryptoKey, enc.encode(sigInput));
  return `${sigInput}.${base64url(sig)}`;
}

async function getAccessToken(serviceAccount) {
  const jwt = await makeJWT(serviceAccount);
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`
  });
  const data = await r.json();
  if (!data.access_token) throw new Error('Token error: ' + JSON.stringify(data));
  return data.access_token;
}

// ── Firestore REST helpers ──

function fsValue(v) {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (typeof v === 'string') return { stringValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(fsValue) } };
  if (typeof v === 'object') return { mapValue: { fields: Object.fromEntries(Object.entries(v).map(([k, val]) => [k, fsValue(val)])) } };
  return { stringValue: String(v) };
}

function fromFs(fields) {
  if (!fields) return {};
  const out = {};
  for (const [k, v] of Object.entries(fields)) {
    if (v.stringValue !== undefined) out[k] = v.stringValue;
    else if (v.integerValue !== undefined) out[k] = Number(v.integerValue);
    else if (v.doubleValue !== undefined) out[k] = v.doubleValue;
    else if (v.booleanValue !== undefined) out[k] = v.booleanValue;
    else if (v.nullValue !== undefined) out[k] = null;
    else if (v.arrayValue) out[k] = (v.arrayValue.values || []).map(i => fromFsValue(i));
    else if (v.mapValue) out[k] = fromFs(v.mapValue.fields || {});
  }
  return out;
}

function fromFsValue(v) {
  if (v.stringValue !== undefined) return v.stringValue;
  if (v.integerValue !== undefined) return Number(v.integerValue);
  if (v.doubleValue !== undefined) return v.doubleValue;
  if (v.booleanValue !== undefined) return v.booleanValue;
  if (v.nullValue !== undefined) return null;
  if (v.arrayValue) return (v.arrayValue.values || []).map(i => fromFsValue(i));
  if (v.mapValue) return fromFs(v.mapValue.fields || {});
  return null;
}

async function fsGet(token) {
  const r = await fetch(`${FIRESTORE_BASE}/${DOC_PATH}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (r.status === 404) return {};
  const doc = await r.json();
  return fromFs(doc.fields || {});
}

async function fsPatch(token, data) {
  const fields = Object.fromEntries(Object.entries(data).map(([k, v]) => [k, fsValue(v)]));
  await fetch(`${FIRESTORE_BASE}/${DOC_PATH}?updateMask.fieldPaths=${Object.keys(data).join('&updateMask.fieldPaths=')}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields })
  });
}

// ── Gemini parser ──

async function parseWithGemini(text, geminiModel) {
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

// ── Bot logic ──

function today() {
  return new Date().toISOString().split('T')[0];
}

async function writeJournal({ master, services, payment }, token) {
  const data = await fsGet(token);
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

  await fsPatch(token, { journal: [...journal, entry] });

  const total = services.reduce((s, i) => s + i.amount, 0);
  const payLabel = payment === 'cash' ? 'нал' : payment === 'card' ? 'карта' : 'СБП';
  const lines = services.map(s => `${s.title} ${s.amount.toLocaleString('ru')} ₽`).join(' + ');
  return `✅ Запись добавлена:\n👤 ${master} — ${lines}\n💰 Итого: ${total.toLocaleString('ru')} ₽ (${payLabel})`;
}

async function writeExpense({ category, amount }, token) {
  const data = await fsGet(token);
  const expenses = data.expenses || [];
  await fsPatch(token, {
    expenses: [...expenses, { id: Date.now(), date: today(), category, amount, comment: category }]
  });
  return `✅ Расход добавлен:\n📂 ${category} — ${amount.toLocaleString('ru')} ₽`;
}

async function writeAdvance({ master, amount, label }, token) {
  const data = await fsGet(token);
  const advances = data.advances || [];
  await fsPatch(token, {
    advances: [...advances, { id: Date.now(), date: today(), masterName: master, amount, type: label }]
  });
  return `✅ ${label} записан:\n👤 ${master} — ${amount.toLocaleString('ru')} ₽`;
}

async function sendMessage(chat_id, text, botToken) {
  await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id, text })
  });
}

async function handleUpdate(update, token, geminiModel, botToken) {
  const msg = update.message;
  if (!msg?.text) return;
  if (msg.from.id !== ALLOWED_USER_ID) return;

  const text = msg.text;
  const chatId = msg.chat.id;

  if (text === '/start') {
    await sendMessage(chatId, `👋 Freedom Bot!\n\nПримеры:\n• Юля маникюр 2000 нал\n• Аня маникюр 1800 педикюр 2500 сбп\n• Аренда 50000\n• Юля аванс 5000`, botToken);
    return;
  }

  try {
    const parsed = await parseWithGemini(text, geminiModel);
    let reply;
    if (parsed.type === 'journal') reply = await writeJournal(parsed, token);
    else if (parsed.type === 'expense') reply = await writeExpense(parsed, token);
    else if (parsed.type === 'advance') reply = await writeAdvance(parsed, token);
    else reply = `❓ ${parsed.msg}`;
    await sendMessage(chatId, reply, botToken);
  } catch (e) {
    console.error(e);
    await sendMessage(chatId, `⚠️ Ошибка: ${e.message}`, botToken);
  }
}

// ── Cloudflare Worker entry point ──

export default {
  async fetch(request, env) {
    if (request.method !== 'POST') return new Response('Freedom Bot OK');

    const serviceAccount = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT);
    const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
    const geminiModel = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const accessToken = await getAccessToken(serviceAccount);

    try {
      const update = await request.json();
      await handleUpdate(update, accessToken, geminiModel, env.BOT_TOKEN);
    } catch (e) {
      console.error(e);
    }

    return new Response('ok');
  }
};
