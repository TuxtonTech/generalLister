// app/src/lib/firebase.ts
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyB64djwdK58ZCckSx9eZVuD2T9aADM2fzo",
  authDomain: "central-fe982.firebaseapp.com",
  projectId: "central-fe982",
  storageBucket: "central-fe982.firebasestorage.app",
  messagingSenderId: "43388747463",
  appId: "1:43388747463:web:8c5a02b45c86fa033848e2",
  measurementId: "G-2HZBRRY1JV"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
const auth = getAuth(app);
const database = getDatabase(app);

export { auth, database };