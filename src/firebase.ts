import { initializeApp, getApps } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const isFirebaseAuthReady = Object.values(firebaseConfig).every(Boolean);

const firebaseApp = isFirebaseAuthReady
  ? getApps()[0] ?? initializeApp(firebaseConfig)
  : null;

const auth = firebaseApp ? getAuth(firebaseApp) : null;
export const db = firebaseApp ? getFirestore(firebaseApp) : null;

export async function signInWithGoogle() {
  if (!auth) {
    throw new Error("Firebase Auth chua duoc cau hinh.");
  }

  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  const result = await signInWithPopup(auth, provider);

  return {
    email: result.user.email ?? "",
    displayName: result.user.displayName ?? "",
  };
}

export async function signOutGoogle() {
  if (auth) {
    await signOut(auth);
  }
}
