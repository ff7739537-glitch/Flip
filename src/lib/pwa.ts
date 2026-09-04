/**
 * Service worker registration wrapper.
 * Registration is refused in dev, inside iframes and on Lovable preview hosts,
 * where a cached app shell would serve stale HTML.
 */
const SW_URL = '/sw.js';

function isBlockedHost(hostname: string): boolean {
  return (
    hostname.startsWith('id-preview--') ||
    hostname.startsWith('preview--') ||
    hostname === 'lovableproject.com' ||
    hostname.endsWith('.lovableproject.com') ||
    hostname === 'lovableproject-dev.com' ||
    hostname.endsWith('.lovableproject-dev.com') ||
    hostname === 'beta.lovable.dev' ||
    hostname.endsWith('.beta.lovable.dev')
  );
}

function shouldRegister(): boolean {
  if (typeof window === 'undefined') return false;
  if (!('serviceWorker' in navigator)) return false;
  if (!import.meta.env.PROD) return false;
  if (window.self !== window.top) return false;
  if (isBlockedHost(window.location.hostname)) return false;
  if (new URLSearchParams(window.location.search).has('sw') && new URLSearchParams(window.location.search).get('sw') === 'off') return false;
  return true;
}

async function unregisterAppWorkers(): Promise<void> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.allSettled(
      registrations
        .filter((reg) => (reg.active?.scriptURL || reg.installing?.scriptURL || '').endsWith(SW_URL))
        .map((reg) => reg.unregister())
    );
  } catch {
    // ignore — nothing to clean up
  }
}

export function registerServiceWorker(): void {
  if (!shouldRegister()) {
    void unregisterAppWorkers();
    return;
  }
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(SW_URL).catch(() => {
      // registration failures must never break the app
    });
  });
}
