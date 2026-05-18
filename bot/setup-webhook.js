const BOT_TOKEN = '8809380077:AAGwvj3HN8cCJGOwQcHigUhtGTq8g1ga9Pw';
const WEBHOOK_URL = process.argv[2];

if (!WEBHOOK_URL) {
  console.error('Usage: node setup-webhook.js https://your-domain.com');
  process.exit(1);
}

fetch(`https://api.telegram.org/bot${BOT_TOKEN}/setWebhook`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ url: `${WEBHOOK_URL}/webhook` })
})
  .then(r => r.json())
  .then(d => console.log('Webhook set:', d));
