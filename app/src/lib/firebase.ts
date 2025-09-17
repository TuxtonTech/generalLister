import { initializeApp, getApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyB64djwdK58ZCckSx9eZVuD2T9aADM2fzo",
  authDomain: "central-fe982.firebaseapp.com",
  projectId: "central-fe982",
  storageBucket: "central-fe982.firebasestorage.app",
  messagingSenderId: "43388747463",
  appId: "1:43388747463:web:8c5a02b45c86fa033848e2",
  measurementId: "G-2HZBRRY1JV"
};


const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const firestore = getFirestore(app);
const auth = getAuth(app);

export { app, firestore, auth };