import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyD1qaygNIztf5gtFKcVzeBJH8jLSQW-0bI",
    authDomain: "techotsav-1694f.firebaseapp.com",
    projectId: "techotsav-1694f",
    storageBucket: "techotsav-1694f.firebasestorage.app",
    messagingSenderId: "367797959019",
    appId: "1:367797959019:web:e35bb3108c43f98ae5f42e",
    measurementId: "G-Z3FGNG8XGG"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
