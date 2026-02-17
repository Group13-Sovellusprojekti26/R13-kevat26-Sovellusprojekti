import { initializeApp, FirebaseApp } from 'firebase/app';
import { initializeAuth, Auth } from 'firebase/auth';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
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

let persistenceOption: unknown | undefined;
try {
  const rn = require('firebase/auth/react-native');
  if (rn && typeof rn.getReactNativePersistence === 'function') {
    persistenceOption = rn.getReactNativePersistence(ReactNativeAsyncStorage);
  }
} catch (e) {
  // ignore
}

export const auth: Auth = persistenceOption
  ? initializeAuth(app, { persistence: persistenceOption as any })
  : initializeAuth(app);

export const db: Firestore = getFirestore(app);
export const storage: FirebaseStorage = getStorage(app);
// Functions are deployed to europe-west1 region
export const functions: Functions = getFunctions(app, 'europe-west1');

export default app;
