// firebase.js
import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  GithubAuthProvider
} from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyA0kQ5rgU1iecdk7nnHRnwXwsbuWFx1_1Y",
  authDomain: "syncfleet-12166.firebaseapp.com",
  projectId: "syncfleet-12166",
  storageBucket: "syncfleet-12166.appspot.com",
  messagingSenderId: "321886879150",
  appId: "1:321886879150:web:2af9c1030eeb1dcee39c3f",
  measurementId: "G-ERMJFCL8JH"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Providers
const googleProvider = new GoogleAuthProvider();
const githubProvider = new GithubAuthProvider();

export { auth, googleProvider, githubProvider };
