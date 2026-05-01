import { useState } from 'react';
import { db } from './firebase'; // Проверь реальный путь к firebase.js
import { doc, updateDoc } from 'firebase/firestore';

export const useDebts = (user, initialDebts = []) => {
  const [debts, setDebts] = useState(initialDebts);

  const handleMarkPaid = async (id) => {
    const debt = debts.find(d => d.id === id);
    if (!debt || !debt.nextPaymentDate) return;

    // 1. Вычисляем следующую дату платежа
    const currentNextDate = new Date(debt.nextPaymentDate);
    const targetDay = currentNextDate.getDate();
    
    const nextMonthDate = new Date(currentNextDate);
    // Добавляем ровно 1 месяц
    nextMonthDate.setMonth(nextMonthDate.getMonth() + 1);

    // 2. Проверка на существование дня в следующем месяце
    // Если число изменилось (например, было 31, а стало 3 марта), 
    // значит дня не существует. setDate(0) вернет последний день предыдущего месяца.
    if (nextMonthDate.getDate() !== targetDay) {
      nextMonthDate.setDate(0);
    }

    const nextDateStr = nextMonthDate.toISOString().split('T')[0];

    // 3. Обновляем состояние (стейт)
    const updatedDebts = debts.map(d => 
      d.id === id ? { ...d, nextPaymentDate: nextDateStr, lastPaidAt: new Date().toISOString() } : d
    );
    setDebts(updatedDebts);

    // 4. Сохраняем в LocalStorage
    localStorage.setItem('debts', JSON.stringify(updatedDebts));

    // 5. Сохраняем в Firebase
    if (user?.uid) {
      try {
        const debtRef = doc(db, `users/${user.uid}/debts`, id);
        await updateDoc(debtRef, { 
          nextPaymentDate: nextDateStr,
          lastPaidAt: new Date().toISOString()
        });
      } catch (error) {
        console.error("Ошибка при обновлении даты платежа в Firebase:", error);
      }
    }
  };

  return { debts, handleMarkPaid, setDebts };
};