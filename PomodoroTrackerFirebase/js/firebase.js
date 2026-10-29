import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDJ_UYXIyQwxaHgVt_rcAcM5I-wcg8c-_g",
  authDomain: "pomodoro-tracker-b01b1.firebaseapp.com",
  projectId: "pomodoro-tracker-b01b1",
  storageBucket: "pomodoro-tracker-b01b1.firebasestorage.app",
  messagingSenderId: "817198480129",
  appId: "1:817198480129:web:0964823a6254d27b443900",
  measurementId: "G-3J066D6FQP"
};

const isConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);
let db = null;

try {
  if (isConfigured) {
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
  }
} catch (error) {
  console.error("Firebase gagal diinisialisasi:", error);
}

export { db, isConfigured };
