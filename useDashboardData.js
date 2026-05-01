import { useState, useEffect } from 'react';
import { db } from './firebase'; // Исправлен выход за пределы папки
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';

export const useDashboardData = (user) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, `users/${user.uid}/debts`), orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setData(items);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  return { data, loading };
};