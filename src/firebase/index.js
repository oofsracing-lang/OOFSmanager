import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// REPLACE THIS WITH YOUR CONFIG FROM THE CONSOLE
const firebaseConfig = {
  apiKey: "AIzaSyDtc3vg5ST87frt_oFi-m09EN_gxOM4Rxk",
  authDomain: "oofs-manager.firebaseapp.com",
  projectId: "oofs-manager",
  storageBucket: "oofs-manager.firebasestorage.app",
  messagingSenderId: "86894390970",
  appId: "1:86894390970:web:6a71e5426e5b761f509c83"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;
