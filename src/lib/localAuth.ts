import type { Profile } from '@/types';

const LOCAL_USERS_KEY = 'flip-local-users';
const LOCAL_SESSION_KEY = 'flip-local-session';

interface LocalUser {
  id: string;
  email: string;
  password: string;
  profile: Profile;
}

const ADMIN_EMAILS = [
  'adamufrank55@gmail.com',
  'ff7739537@gmail.com',
  'ff7739537-glitch@gmail.com',
  'fransiscomanongi@gmail.com',
];

function generateId(): string {
  return 'local-' + Math.random().toString(36).substring(2, 12) + Date.now().toString(36);
}

function getLocalUsers(): LocalUser[] {
  try {
    const raw = localStorage.getItem(LOCAL_USERS_KEY);
    return raw ? (JSON.parse(raw) as LocalUser[]) : [];
  } catch {
    return [];
  }
}

function saveLocalUsers(users: LocalUser[]): void {
  localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(users));
}

export function getLocalSession(): LocalUser | null {
  try {
    const raw = localStorage.getItem(LOCAL_SESSION_KEY);
    return raw ? (JSON.parse(raw) as LocalUser) : null;
  } catch {
    return null;
  }
}

export function setLocalSession(user: LocalUser | null): void {
  if (user) {
    localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(LOCAL_SESSION_KEY);
  }
}

export function localSignUp(email: string, password: string, displayName: string): { error: string | null; user: LocalUser | null } {
  const users = getLocalUsers();
  if (users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
    return { error: 'This email is already registered. Try signing in instead.', user: null };
  }

  const isAdmin = ADMIN_EMAILS.includes(email.toLowerCase());
  const now = new Date().toISOString();
  const profile: Profile = {
    id: generateId(),
    display_name: displayName,
    username: null,
    avatar_url: null,
    cover_photo_url: null,
    bio: '',
    coins: 100,
    role: isAdmin ? 'admin' : 'user',
    status: 'active',
    email,
    notif_enabled: true,
    theme: 'dark',
    is_verified: false,
    followers_count: 0,
    following_count: 0,
    created_at: now,
    updated_at: now,
  };

  const user: LocalUser = { id: profile.id, email, password, profile };
  users.push(user);
  saveLocalUsers(users);
  setLocalSession(user);
  return { error: null, user };
}

export function localSignIn(email: string, password: string): { error: string | null; user: LocalUser | null } {
  const users = getLocalUsers();
  const user = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (!user) {
    return { error: 'No account found with this email. Please sign up first.', user: null };
  }
  if (user.password !== password) {
    return { error: 'Wrong email or password. Please try again.', user: null };
  }
  setLocalSession(user);
  return { error: null, user };
}

export function localSignOut(): void {
  setLocalSession(null);
}

export function updateLocalProfile(userId: string, updates: Partial<Profile>): Profile | null {
  const users = getLocalUsers();
  const user = users.find((u) => u.id === userId);
  if (!user) return null;
  user.profile = { ...user.profile, ...updates, updated_at: new Date().toISOString() };
  saveLocalUsers(users);
  setLocalSession(user);
  return user.profile;
}

export type { LocalUser };
