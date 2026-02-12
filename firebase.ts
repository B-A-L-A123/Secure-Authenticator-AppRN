import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
const firebaseConfig = {
  apiKey: "AIzaSyCLMLPyNrTBrFTSUw3s1OHfg9KbmbGe2fE",
  authDomain: "authenticator-ddc8c.firebaseapp.com",
  projectId: "authenticator-ddc8c",
  storageBucket: "authenticator-ddc8c.firebasestorage.app",
  messagingSenderId: "821748760820",
  appId: "1:821748760820:web:37a4153874e31a211b9ea1",
  measurementId: "G-9F24TB1738"
};


const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);