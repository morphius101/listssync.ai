import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc, getDoc, updateDoc, deleteDoc, getDocs, query, where, onSnapshot, Timestamp, addDoc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, signOut } from 'firebase/auth';

// Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com`,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.appspot.com`,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

let app: any;
let db: any;
let storage: any;

export function initializeFirebase() {
  try {
    // Check if we already have a Firebase instance
    if (!app) {
      console.log("🔥 Initializing Firebase with config:", {
        projectId: firebaseConfig.projectId,
        appId: firebaseConfig.appId ? firebaseConfig.appId.substring(0, 5) + "..." : "missing"
      });
      
      // Check if Firebase config is valid
      if (!firebaseConfig.apiKey || !firebaseConfig.projectId || !firebaseConfig.appId) {
        console.error("⚠️ Invalid Firebase configuration. Some values are missing:", {
          hasApiKey: !!firebaseConfig.apiKey,
          hasProjectId: !!firebaseConfig.projectId,
          hasAppId: !!firebaseConfig.appId
        });
        throw new Error("Firebase configuration is incomplete");
      }
      
      // Connect to Firebase with persistence settings for better cross-domain support
      app = initializeApp(firebaseConfig);
      
      // Configure auth persistence to work better with Replit environment
      const auth = getAuth(app);
      auth.useDeviceLanguage(); // Use the browser's language
      
      // Initialize other Firebase services
      db = getFirestore(app);
      storage = getStorage(app);
      
      console.log("✅ Firebase initialized successfully");
    }
    return { app, db, storage };
  } catch (error) {
    console.error("❌ Error initializing Firebase:", error);
    
    // Create placeholders for recovery
    if (!app) app = { name: "recovery-app" };
    if (!db) db = { collection: () => ({}) };
    if (!storage) storage = {};
    
    return { app, db, storage };
  }
}

export function getFirebase() {
  try {
    if (!app) {
      return initializeFirebase();
    }
    return { app, db, storage };
  } catch (error) {
    console.error("❌ Error getting Firebase reference:", error);
    
    // Even in case of error, return something to prevent app crashes
    return initializeFirebase();
  }
}

// Auth helper functions
export function signInWithGoogle() {
  const auth = getAuth();
  const provider = new GoogleAuthProvider();
  
  // Add these settings to help with authentication across different environments
  provider.setCustomParameters({
    prompt: 'select_account',
    // This helps with session storage issues in certain browsers and environments
    auth_type: 'rerequest',
  });
  
  // Add better error handling
  return signInWithPopup(auth, provider)
    .catch((error) => {
      console.error("Login failed:", error);
      
      // Provide helpful error information
      if (error.code === 'auth/popup-blocked') {
        console.error("Unable to verify that the app domain is authorized");
      }
      
      throw error; // Rethrow for upstream handling
    });
}

export function signOutUser() {
  const auth = getAuth();
  return signOut(auth);
}

export {
  collection,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  onSnapshot,
  Timestamp,
  addDoc,
  ref,
  uploadBytes,
  getDownloadURL
};
