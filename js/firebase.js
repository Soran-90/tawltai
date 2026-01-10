import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

// TODO: ضع إعدادات مشروعك من Firebase Console
const firebaseConfig = {
  apiKey: "AIzaSyDgMmhFIjnLWl4cclM2V5-M4EvaPG-QtfE",
  authDomain: "tawltai.firebaseapp.com",
  projectId: "tawltai",
  storageBucket: "tawltai.firebasestorage.app",
  messagingSenderId: "232076374782",
  appId: "1:232076374782:web:df11501e8a73b667d72baf"
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
