import { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

const DISMISS_KEY = 'flip.installPrompt.dismissedAt';
const DISMISS_WINDOW_MS = 1000 * 60 * 60 * 24 * 7; // ask again after a week

function recentlyDismissed(): boolean {
  try {
    const raw = window.localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    return Date.now() - Number(raw) < DISMISS_WINDOW_MS;
  } catch {
    return false;
  }
}

export default function InstallPrompt() {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const isStandalone =
      window.matchMedia?.('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    if (isStandalone || window.self !== window.top) return;

    const onPrompt = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as BeforeInstallPromptEvent);
      if (!recentlyDismissed()) setVisible(true);
    };
    const onInstalled = () => {
      setVisible(false);
      setPromptEvent(null);
    };

    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const dismiss = () => {
    setVisible(false);
    try {
      window.localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      // ignore
    }
  };

  const install = async () => {
    if (!promptEvent) return;
    try {
      await promptEvent.prompt();
      const choice = await promptEvent.userChoice;
      if (choice.outcome !== 'accepted') dismiss();
      else setVisible(false);
    } catch {
      dismiss();
    }
    setPromptEvent(null);
  };

  if (!visible || !promptEvent) return null;

  return (
    <div className="fixed bottom-20 left-0 right-0 z-50 px-4 pointer-events-none">
      <div className="pointer-events-auto mx-auto max-w-md bg-slate-900/95 backdrop-blur border border-emerald-500/20 rounded-2xl shadow-2xl p-3 flex items-center gap-3 animate-fade-in-up">
        <img
          src="/icons/icon-192.png"
          alt="FLIP app icon"
          width={48}
          height={48}
          loading="lazy"
          className="w-12 h-12 rounded-xl flex-shrink-0"
        />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white">Install FLIP</p>
          <p className="text-xs text-slate-400 truncate">Add FLIP to your home screen for a faster, full-screen experience.</p>
        </div>
        <button
          onClick={install}
          className="bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-semibold px-4 py-2 rounded-full transition-colors flex items-center gap-1.5 flex-shrink-0"
        >
          <Download size={15} /> Install
        </button>
        <button onClick={dismiss} aria-label="Dismiss install banner" className="text-slate-500 hover:text-white transition-colors flex-shrink-0">
          <X size={18} />
        </button>
      </div>
    </div>
  );
}
