import React, { useState, useRef, useEffect } from 'react';
import { Send, X, Loader2, Sparkles } from 'lucide-react';

const AdvisorChat = ({ debts = [], freeMoney = 0, deposits = [], onClose }) => {
  const [messages, setMessages] = useState([
    { role: 'ai', text: 'Привет! Я твой финансовый ассистент «Свобода». Я проанализировал твои данные. Какой у тебя вопрос по долгам или накоплениям?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const generateSystemPrompt = () => {
    const debtsInfo = debts.map(d => 
      `- ${d.name}: долг ${d.balance}₽, ставка ${d.rate}%, платёж ${d.minPayment}₽, дата ${d.nextPaymentDate}${d.isPaidThisMonth ? ' (оплачен в этом месяце)' : ''}`
    ).join('\n');

    const depositsInfo = deposits.map(d => 
      `- ${d.name}: сумма ${d.amount}₽, ставка ${d.rate}%`
    ).join('\n');

    return `Ты — профессиональный финансовый консультант приложения «Свобода». 
Твоя цель: помогать пользователю эффективно гасить долги и управлять накоплениями.

ТЕКУЩИЕ ДАННЫЕ ПОЛЬЗОВАТЕЛЯ:
- Свободные деньги для досрочного погашения: ${freeMoney}₽/мес.
- Список долгов:\n${debtsInfo || 'Долгов нет.'}
- Список вкладов:\n${depositsInfo || 'Вкладов нет.'}

ТВОИ ПРАВИЛА:
1. Отвечай ТОЛЬКО на вопросы о финансах, кредитах, долгах, экономии и инвестициях.
2. Если пользователь спрашивает о чем-то другом (погода, код, жизнь), вежливо ответь: «Я специализируюсь только на финансовых вопросах и анализе ваших долгов».
3. Рекомендуй стратегии «Лавина» (сначала высокие %) или «Снежный ком» (сначала мелкие долги).
4. Будь лаконичен, используй дружелюбный, но деловой тон.`;
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMsg = { role: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const API_KEY = import.meta.env.VITE_GEMINI_KEY || "YOUR_API_KEY";
      const systemPrompt = generateSystemPrompt();
      
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            { role: 'user', parts: [{ text: systemPrompt }] },
            { role: 'model', parts: [{ text: "Принято. Я буду давать советы только по вашим финансам на основе этих данных." }] },
            ...messages.map(m => ({
              role: m.role === 'ai' ? 'model' : 'user',
              parts: [{ text: m.text }]
            })),
            { role: 'user', parts: [{ text: input }] }
          ]
        })
      });

      const data = await response.json();
      const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || "Не удалось получить ответ от системы.";
      
      setMessages(prev => [...prev, { role: 'ai', text: aiResponse }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'ai', text: "Произошла ошибка при обращении к AI. Проверьте ключ API." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white rounded-t-[40px] sm:rounded-[32px] w-full sm:max-w-2xl h-[92vh] sm:h-[80vh] flex flex-col shadow-2xl border border-slate-100 overflow-hidden">
        {/* Header */}
        <div className="p-6 bg-emerald-600 text-white flex justify-between items-center shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center shadow-inner">
              <Sparkles size={24} />
            </div>
            <div>
              <h3 className="font-black text-xl leading-tight">AI Консультант</h3>
              <p className="text-[10px] uppercase font-bold text-emerald-100 tracking-[0.2em] opacity-80">Система анализа «Свобода»</p>
            </div>
          </div>
          <button onClick={onClose} className="w-10 h-10 flex items-center justify-center hover:bg-black/10 rounded-full transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Chat History */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2`}>
              <div className={`max-w-[85%] p-5 rounded-[28px] text-sm shadow-sm font-medium leading-relaxed
                ${m.role === 'user' 
                  ? 'bg-emerald-600 text-white rounded-tr-none' 
                  : 'bg-white text-slate-800 rounded-tl-none border border-slate-100'}`}>
                <div className="whitespace-pre-wrap">{m.text}</div>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white p-4 rounded-[24px] rounded-tl-none border border-slate-100 flex items-center gap-3 shadow-sm">
                <Loader2 size={18} className="animate-spin text-emerald-500" />
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Анализирую стратегию...</span>
              </div>
            </div>
          )}
        </div>

        {/* Input Area */}
        <form onSubmit={handleSend} className="p-6 bg-white border-t border-slate-100">
          <div className="relative group">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Как мне лучше распределить 15 000₽?"
              className="w-full bg-slate-50 p-5 pr-16 rounded-2xl outline-none font-bold text-slate-900 border-2 border-transparent focus:border-emerald-500/20 focus:bg-white transition-all shadow-inner text-sm"
            />
            <button 
              type="submit"
              disabled={!input.trim() || isLoading}
              className="absolute right-2 top-2 w-11 h-11 bg-emerald-600 text-white rounded-xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:grayscale shadow-md"
            >
              <Send size={20} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdvisorChat;