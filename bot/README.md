# Freedom Bot — деплой

## 1. Получить serviceAccountKey.json
Firebase Console → Project Settings → Service Accounts → Generate new private key
Положить файл рядом: `bot/serviceAccountKey.json`

## 2. Установить зависимости
```
cd bot && npm install
```

## 3. Запустить локально (для теста через ngrok)
```
npm start
# В другом терминале:
npx ngrok http 3000
# Скопировать https URL и зарегистрировать webhook:
node setup-webhook.js https://xxxx.ngrok.io
```

## 4. Деплой на Railway / Render / VPS
- Загрузить папку `bot/` на сервер
- Установить переменную окружения `PORT` (Railway делает автоматически)
- Зарегистрировать webhook с публичным URL сервера

## Примеры команд в боте
```
Юля маникюр 2000 нал       → запись в журнал (нал/карта/сбп)
Аренда 50000                → расход
МТС 520                     → расход (категория = первое слово)
Юля аванс 5000              → аванс мастеру
Юля зп 15000                → выплата зарплаты
```

## Структура файлов
```
bot/
├── index.js              — основной сервер
├── setup-webhook.js      — регистрация webhook в Telegram
├── package.json
├── serviceAccountKey.json  ← НЕ коммитить в git!
└── README.md
```

## Важно — не трогать
- Все файлы фронтенда (`src/`, `*.jsx`, `useAppStore.js`, `firebase.js`)
- Структуру данных в Firestore (формат записей не менять)
- `package.json` основного проекта

`bot/` — полностью отдельный сервис со своим `package.json`.
