import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { Profile } from '@/types';
import { auth as firebaseAuth, isFirebaseConfigured, ensureFirebaseInitialized } from '@/lib/firebase';
import {
  normalizeEmail,
  validateEmail,
  validatePassword,
  rateLimit,
  sanitizeFreeText,
} from '@/lib/security';

// Lazy-load Firebase auth functions only when Firebase is configured
// This prevents crashes when Firebase env vars are missing
async function getFirebaseAuthFns() {
  if (!isFirebaseConfigured) return null;
  try {
    await ensureFirebaseInitialized();
    if (!firebaseAuth) return null;
    const mod = await import('firebase/auth');
    return {
      createUserWithEmailAndPassword: mod.createUserWithEmailAndPassword,
      signInWithEmailAndPassword: mod.signInWithEmailAndPassword,
      signOut: mod.signOut,
      auth: firebaseAuth,
    };
  } catch (err) {
    console.warn('[FLIP] Firebase auth module failed to load:', err);
    return null;
  }
}

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signUp: (email: string, password: string, displayName: string) => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function mirrorSupabaseUserToFirebase(email: string, password: string): Promise<void> {
  const fns = await getFirebaseAuthFns();
  if (!fns) return;
  try {
    await fns.signInWithEmailAndPassword(fns.auth, email, password);
  } catch (error) {
    const code = (error as { code?: string }).code;
    if (code === 'auth/user-not-found' || code === 'auth/invalid-credential') {
      try {
        await fns.createUserWithEmailAndPassword(fns.auth, email, password);
      } catch (createError) {
        const createCode = (createError as { code?: string }).code;
        if (createCode !== 'auth/email-already-in-use') throw createError;
      }
    } else {
      throw error;
    }
  }
}


export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string, retries = 0): Promise<Profile | null> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (data) {
        setProfile(data as Profile);
        return data as Profile;
      }

      if (retries < 4) {
        await new Promise((r) => setTimeout(r, 600));
        return fetchProfile(userId, retries + 1);
      }

      if (!error && !data) {
        const userEmail = session?.user?.email ?? user?.email ?? '';
        const displayName = sanitizeFreeText(
          (session?.user?.user_metadata?.display_name as string) ?? 'New User'
        );
        const { data: created, error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: userId,
            display_name: displayName,
            email: userEmail,
            coins: 100,
          })
          .select('*')
          .single();

        if (created) {
          setProfile(created as Profile);
          return created as Profile;
        }
        if (insertError) {
          console.error('Profile creation failed:', insertError.message);
        }
      }

      setProfile(null);
      return null;
    } catch {
      if (retries < 2) {
        await new Promise((r) => setTimeout(r, 800));
        return fetchProfile(userId, retries + 1);
      }
      setProfile(null);
      return null;
    }
  };

  useEffect(() => {
    let mounted = true;

    if (!isSupabaseConfigured) {
      console.error('[Flip] Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.warn('Session fetch error:', error.message);
      }
      if (!mounted) return;
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    }).catch(() => {
      if (mounted) setLoading(false);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        (async () => {
          await fetchProfile(session.user.id);
          setLoading(false);
        })();
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signUp = async (email: string, password: string, displayName: string) => {
    const cleanEmail = normalizeEmail(email);
    const cleanName = sanitizeFreeText(displayName);
    const passwordCheck = validatePassword(password);

    if (!validateEmail(cleanEmail)) {
      return { error: 'Please enter a valid email address' };
    }
    if (!passwordCheck.valid) {
      return { error: passwordCheck.message || 'Invalid password' };
    }
    if (!cleanName || cleanName.length < 2) {
      return { error: 'Display name must be at least 2 characters' };
    }
    if (!rateLimit('signUp', 5, 60000)) {
      return { error: 'Too many attempts. Please try again later.' };
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: { data: { display_name: cleanName } },
      });
      if (error) {
        return { error: error.message };
      }
      if (data.user) {
        try {
          await mirrorSupabaseUserToFirebase(cleanEmail, password);
        } catch (firebaseError) {
          console.warn('[Flip] Firebase account sync deferred:', (firebaseError as Error).message);
        }
        await new Promise((r) => setTimeout(r, 1000));
        await fetchProfile(data.user.id);
      }
      return { error: null };
    } catch (err) {
      console.error('[Flip] Sign up failed:', err);
      return { error: 'Unable to reach the server. Please check your connection and try again.' };
    }
  };

  const signIn = async (email: string, password: string) => {
    const cleanEmail = normalizeEmail(email);
    const passwordCheck = validatePassword(password);

    if (!validateEmail(cleanEmail)) {
      return { error: 'Please enter a valid email address' };
    }
    if (!passwordCheck.valid) {
      return { error: passwordCheck.message || 'Invalid password' };
    }
    if (!rateLimit('signIn', 8, 60000)) {
      return { error: 'Too many attempts. Please try again later.' };
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
      if (error) {
        return { error: error.message };
      }
      if (data.user) {
        try {
          await mirrorSupabaseUserToFirebase(cleanEmail, password);
        } catch (firebaseError) {
          console.warn('[Flip] Firebase account sync deferred:', (firebaseError as Error).message);
        }
        await fetchProfile(data.user.id);
      }
      return { error: null };
    } catch (err) {
      console.error('[Flip] Sign in failed:', err);
      return { error: 'Unable to reach the server. Please check your connection and try again.' };
    }
  };

  const signOut = async () => {
    try {
      const fns = await getFirebaseAuthFns();
      await Promise.all([
        supabase.auth.signOut(),
        fns ? fns.signOut(fns.auth) : Promise.resolve(),
      ]);
    } catch {
      // ignore
    }
    setSession(null);
    setUser(null);
    setProfile(null);
  };

  const refreshProfile = async () => {
    const currentUser = user ?? (await supabase.auth.getUser()).data.user;
    if (currentUser) await fetchProfile(currentUser.id);
  };

  return (
    <AuthContext.Provider
      value={{ session, user, profile, loading, signUp, signIn, signOut, refreshProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
