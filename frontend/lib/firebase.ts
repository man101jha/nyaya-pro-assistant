import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCEcSxYvXKrDurQQNYCQft-4D4nSgHZUqc",
  authDomain: "nyaya-pro.firebaseapp.com",
  projectId: "nyaya-pro",
  storageBucket: "nyaya-pro.firebasestorage.app",
  messagingSenderId: "35440746990",
  appId: "1:35440746990:web:7fefb3bc1a8c7d293f6eff"
};

// Prevent multiple initializations in Next.js development environment
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

export { app, auth, db, googleProvider };
