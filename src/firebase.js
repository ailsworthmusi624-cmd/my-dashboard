import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAYNPCG4DHFTAwWkARHGyYmiU0GTklQ6_Q",
  authDomain: "dashboard-27927.firebaseapp.com",
  projectId: "dashboard-27927",
  storageBucket: "dashboard-27927.firebasestorage.app",
  messagingSenderId: "428248986605",
  appId: "1:428248986605:web:95b3ccf9ffa65d0e68ade4"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const APP_ID = "dashboard-27927";