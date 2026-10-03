// Firebase is fully lazily loaded — no static imports of firebase/auth or
// firebase/database. This prevents module-level crashes when Firebase env
// vars are missing in production builds.

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string | undefined,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL as string | undefined,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string | undefined,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string | undefined,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string | undefined,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID as string | undefined,
};

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.authDomain && firebaseConfig.databaseURL &&
  firebaseConfig.projectId && firebaseConfig.storageBucket &&
  firebaseConfig.messagingSenderId && firebaseConfig.appId
);

export type FirebaseApp = import('firebase/app').FirebaseApp;
export type FirebaseAuth = import('firebase/auth').Auth;
export type FirebaseDatabase = import('firebase/database').Database;

let firebaseApp: FirebaseApp | null = null;
let firebaseAuth: FirebaseAuth | null = null;
let firebaseDatabase: FirebaseDatabase | null = null;
let initPromise: Promise<void> | null = null;
let initDone = false;

export function ensureFirebaseInitialized(): Promise<void> {
  if (initDone) return Promise.resolve();
  if (!initPromise) {
    initPromise = (async () => {
      if (!isFirebaseConfigured) {
        console.warn('[FLIP] Firebase is not configured. Supabase compatibility mode remains active.');
        return;
      }
      try {
        // Use variable specifiers so Rollup doesn't try to statically resolve
        // the firebase package (it's an optional dependency).
        const appSpec = 'firebase/app';
        const authSpec = 'firebase/auth';
        const dbSpec = 'firebase/database';
        const appMod = await import(/* @vite-ignore */ appSpec);
        const authMod = await import(/* @vite-ignore */ authSpec);
        const dbMod = await import(/* @vite-ignore */ dbSpec);
        firebaseApp = appMod.getApps().length ? appMod.getApp() : appMod.initializeApp(firebaseConfig);
        firebaseAuth = authMod.getAuth(firebaseApp);
        firebaseDatabase = dbMod.getDatabase(firebaseApp);
      } catch (err) {
        console.warn('[FLIP] Firebase initialization failed, running without Firebase:', err);
      }
      initDone = true;
    })();
  }
  return initPromise;
}

// Kick off initialization immediately so it's ready by the time it's needed
if (isFirebaseConfigured) {
  ensureFirebaseInitialized();
}

export { firebaseApp as app, firebaseAuth as auth, firebaseDatabase as database };
