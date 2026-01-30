import { initializeApp, FirebaseApp } from 'firebase/app';
import { 
  getAuth,
  Auth,
} from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import { getFunctions, Functions } from 'firebase/functions';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID!,
};

const app: FirebaseApp = initializeApp(firebaseConfig);

// Initialize Auth - use default persistence (works in React Native)
// AsyncStorage persistence causes token propagation issues with httpsCallable
export const auth: Auth = getAuth(app);

export const db: Firestore = getFirestore(app);
export const storage: FirebaseStorage = getStorage(app);
// Functions are deployed to europe-west1 region
export const functions: Functions = getFunctions(app, 'europe-west1');

export default app;
