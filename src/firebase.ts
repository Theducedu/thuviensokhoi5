import { initializeApp, getApps } from "firebase/app";
import { getAuth, GoogleAuthProvider, getRedirectResult, signInWithPopup, signInWithRedirect, signOut } from "firebase/auth";
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

function googleProvider() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  return provider;
}

function toGoogleUser(user: { email: string | null; displayName: string | null }) {
  return {
    email: user.email ?? "",
    displayName: user.displayName ?? "",
  };
}

export async function signInWithGoogle() {
  if (!auth) {
    throw new Error("Firebase Auth chua duoc cau hinh.");
  }

  const result = await signInWithPopup(auth, googleProvider());
  return toGoogleUser(result.user);
}

export async function signInWithGoogleRedirect() {
  if (!auth) {
    throw new Error("Firebase Auth chua duoc cau hinh.");
  }

  await signInWithRedirect(auth, googleProvider());
}

export async function getGoogleRedirectUser() {
  if (!auth) return null;

  const result = await getRedirectResult(auth);
  return result ? toGoogleUser(result.user) : null;
}

export async function signOutGoogle() {
  if (auth) {
    await signOut(auth);
  }
}
