// Import the functions you need from the SDKs you need
import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBxqtqQ8QH6vQ_VIiu7bapLCnHveldxSP0",
  authDomain: "bigyapon2-cfa39.firebaseapp.com",
  projectId: "bigyapon2-cfa39",
  storageBucket: "bigyapon2-cfa39.appspot.com",
  messagingSenderId: "994071463799",
  appId: "1:994071463799:web:08618ba8206bbff2fd0372",
  measurementId: "G-QW74JFCEQ3"
};

// Initialize Firebase
let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let storage: FirebaseStorage;
let isFirebaseConfigured = false;

try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);

    // Increase the retry time for file uploads to prevent timeouts on slow networks.
    // The default is 10 minutes (600000ms). We are increasing it to 20 minutes.
    storage.maxUploadRetryTime = 1200000;
    
    // Flag to indicate that firebase is configured.
    isFirebaseConfigured = true;

} catch (e) {
    console.error("Firebase initialization failed. Make sure the config is valid.", e)
}


export { auth, db, storage, isFirebaseConfigured, firebaseConfig };