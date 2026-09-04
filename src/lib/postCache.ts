/**
 * Local caching + shuffling helpers for the feed.
 * Recently viewed posts are stored in localStorage so the feed can render
 * instantly on the next visit, even before Supabase responds.
 */
import type { Post } from '@/types';

const CACHE_KEY = 'flip.recentPosts.v1';
const MAX_CACHED = 40;
const MAX_AGE_MS = 1000 * 60 * 60 * 12; // 12 hours

type CachedFeed = {
  savedAt: number;
  posts: Post[];
};

function safeParse(raw: string | null): CachedFeed | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as CachedFeed;
    if (!parsed || !Array.isArray(parsed.posts) || typeof parsed.savedAt !== 'number') return null;
    return parsed;
  } catch {
    return null;
  }
}

export function loadCachedPosts(): Post[] {
  if (typeof window === 'undefined') return [];
  const cached = safeParse(window.localStorage.getItem(CACHE_KEY));
  if (!cached) return [];
  if (Date.now() - cached.savedAt > MAX_AGE_MS) {
    clearCachedPosts();
    return [];
  }
  return cached.posts;
}

export function saveCachedPosts(posts: Post[]): void {
  if (typeof window === 'undefined') return;
  try {
    const payload: CachedFeed = { savedAt: Date.now(), posts: posts.slice(0, MAX_CACHED) };
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(payload));
  } catch {
    // storage full or blocked (private mode) — caching is best effort
  }
}

export function clearCachedPosts(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(CACHE_KEY);
  } catch {
    // ignore
  }
}

/** Fisher-Yates shuffle — returns a new array, never mutates the input. */
export function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Keeps the newest posts pinned near the top, then shuffles the rest so the
 * feed feels fresh on every load without hiding brand-new content.
 */
export function shuffleFeed<T>(posts: T[], keepNewest = 3): T[] {
  if (posts.length <= keepNewest + 1) return [...posts];
  const head = posts.slice(0, keepNewest);
  const tail = shuffle(posts.slice(keepNewest));
  return [...head, ...tail];
}
