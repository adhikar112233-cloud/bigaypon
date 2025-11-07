// Import the functions you need from the SDKs you need
import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
// Fix: Corrected Firebase import for 'getFirestore' and the 'Firestore' type.
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';

// =================================================================================
// 🔥 IMPORTANT: Firebase Configuration Required! 🔥
// =================================================================================
// To run this application, you must replace the placeholder values below with your
// actual Firebase project configuration. You can find these details in your
// Firebase project's settings page.
// The app will display an error message until this is done.
// =================================================================================
const firebaseConfig = {
  apiKey: "AIzaSyDUgj2_fQXm0dGzRtNY0_01axI_sDzfrGU",
  authDomain: "collab-68983.firebaseapp.com",
  projectId: "collab-68983",
  storageBucket: "collab-68983.appspot.com",
  messagingSenderId: "761701390053",
  appId: "1:761701390053:web:54c93a2d54bde9c505660c"
};

// This flag is used by the App to check if the default configuration is still in use.
export const isFirebaseConfigured = firebaseConfig.apiKey !== "YOUR_API_KEY_HERE" && firebaseConfig.projectId !== "YOUR_PROJECT_ID";

// Declare variables that will be conditionally assigned.
let auth: Auth;
let db: Firestore;
let storage: FirebaseStorage;

if (isFirebaseConfigured) {
  // Initialize Firebase if the config is valid.
  const app: FirebaseApp = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);

  // Fix: Increase the retry time for file uploads to prevent timeouts on slow networks.
  // The default is 10 minutes (600000ms). We are increasing it to 20 minutes.
  storage.maxUploadRetryTime = 1200000;
} else {
  // Add a developer-friendly error message in the console.
  console.error(
      "Firebase config is not set. Please replace placeholder values in services/firebase.ts with your actual Firebase project configuration. The app will not function correctly without it."
  );
  // Assign dummy objects if not configured, to prevent crashes on import.
  // The App component will render an error message, so these will not be used in a meaningful way.
  auth = {} as Auth;
  db = {} as Firestore;
  storage = {} as FirebaseStorage;
}

// Export the initialized or dummy instances.
export { auth, db, storage };