import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBEN7Sn5kkH4mcnXO0zqaQqvWK5oObzc_A",
  authDomain: "kaoukabi-c5ad9.firebaseapp.com",
  projectId: "kaoukabi-c5ad9",
  storageBucket: "kaoukabi-c5ad9.firebasestorage.app",
  messagingSenderId: "844569229301",
  appId: "1:844569229301:web:162cc5f9b06325446892bc",
  measurementId: "G-NDM27XFWJG"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);