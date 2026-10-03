const RATE_LIMIT_KEY = 'flip-rate-limit';

export function sanitizeInput(input: string): string {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .trim();
}

export function sanitizeForDisplay(input: string): string {
  const div = document.createElement('div');
  div.textContent = input;
  return div.innerHTML;
}

export function containsProfanity(text: string): boolean {
  const banned = ['spam', 'scam', 'phishing'];
  const lower = text.toLowerCase();
  return banned.some((word) => lower.includes(word));
}

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

export function rateLimit(action: string, maxActions: number = 10, windowMs: number = 60000): boolean {
  try {
    const raw = localStorage.getItem(RATE_LIMIT_KEY);
    const limits: Record<string, RateLimitEntry> = raw ? JSON.parse(raw) : {};
    const now = Date.now();
    const entry = limits[action];

    if (!entry || now > entry.resetAt) {
      limits[action] = { count: 1, resetAt: now + windowMs };
      localStorage.setItem(RATE_LIMIT_KEY, JSON.stringify(limits));
      return true;
    }

    if (entry.count >= maxActions) {
      return false;
    }

    entry.count++;
    localStorage.setItem(RATE_LIMIT_KEY, JSON.stringify(limits));
    return true;
  } catch {
    return true;
  }
}

export function getDeviceFingerprint(): string {
  const nav = navigator;
  const screen = window.screen;
  const fingerprint = [
    nav.userAgent,
    nav.language,
    screen.width + 'x' + screen.height,
    screen.colorDepth,
    new Date().getTimezoneOffset(),
    nav.hardwareConcurrency || 0,
  ].join('|');
  let hash = 0;
  for (let i = 0; i < fingerprint.length; i++) {
    const char = fingerprint.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return 'fp_' + Math.abs(hash).toString(36);
}

const BLOCKED_KEY = 'flip-blocked-devices';

export function isDeviceBlocked(): boolean {
  try {
    const raw = localStorage.getItem(BLOCKED_KEY);
    if (!raw) return false;
    const blocked: string[] = JSON.parse(raw);
    return blocked.includes(getDeviceFingerprint());
  } catch {
    return false;
  }
}

export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function validatePassword(password: string): { valid: boolean; message?: string } {
  if (password.length < 6) return { valid: false, message: 'Password must be at least 6 characters' };
  if (password.length > 128) return { valid: false, message: 'Password is too long' };
  return { valid: true };
}

export function truncateText(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.substring(0, maxLen - 3) + '...';
}

export function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

export function sanitizeFreeText(input: string): string {
  return input
    .replace(/</g, '')
    .replace(/>/g, '')
    .replace(/"/g, '')
    .replace(/'/g, '')
    .trim();
}

export function validateAmount(
  amount: string | number,
  max?: number
): { valid: boolean; value?: number; error?: string } {
  const raw = typeof amount === 'string' ? amount.trim() : String(amount);
  const num = Number(raw);
  if (!raw || !Number.isFinite(num) || Number.isNaN(num)) {
    return { valid: false, error: 'Enter a valid amount' };
  }
  if (num <= 0) return { valid: false, error: 'Amount must be greater than zero' };
  if (!Number.isInteger(num)) return { valid: false, error: 'Amount must be a whole number' };
  if (max !== undefined && num > max) return { valid: false, error: 'Amount exceeds available balance' };
  if (num > 1_000_000) return { valid: false, error: 'Amount is too large' };
  return { valid: true, value: num };
}
