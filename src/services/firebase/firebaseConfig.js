// src/services/firebase/firebaseConfig.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

// Firebase configuration - replace with your actual config
const firebaseConfig = {
  /*apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID*/
  apiKey: "AIzaSyD6I6i9Y8l_xY6V5fo8qPzHG5ehpRshrvY",
  authDomain: "sustainable-development-b9b71.firebaseapp.com",
  projectId: "sustainable-development-b9b71",
  storageBucket: "sustainable-development-b9b71.appspot.com",
  messagingSenderId: "376619880598",
  appId: "1:376619880598:web:ace27ea7d4031d0e0eb2b7",
  measurementId: "G-31866E2M3Z"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

export { db, auth, storage };