import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, setDoc } from "firebase/firestore";

// Config from src/firebase.js
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
const auth = getAuth(app);
const db = getFirestore(app);

const email = process.argv[2];
const password = process.argv[3];

if (!email || !password) {
    console.error("Usage: node scripts/seedAdmin.js <email> <password>");
    process.exit(1);
}

async function seedAdmin() {
    console.log(`Attempting to create admin: ${email}...`);

    let user;
    try {
        // Try creating user
        const credential = await createUserWithEmailAndPassword(auth, email, password);
        user = credential.user;
        console.log("Auth user created.");
    } catch (err) {
        if (err.code === 'auth/email-already-in-use') {
            console.log("User already exists, signing in...");
            const credential = await signInWithEmailAndPassword(auth, email, password);
            user = credential.user;
        } else {
            throw err;
        }
    }

    console.log("Setting up admin role in Firestore...");
    await setDoc(doc(db, "admins", email), {
        email: email,
        role: "ADMIN",
        createdAt: new Date().toISOString()
    });

    console.log("Success! Admin configured.");
    console.log("IMPORTANT: Please revert firestore.rules to 'allow write: if false' for /admins collection!");
    process.exit(0);
}

seedAdmin().catch(err => {
    console.error("Error:", err);
    process.exit(1);
});
