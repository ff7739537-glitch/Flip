export interface ConfigEntry {
  key: string;
  label: string;
  value: string;
  category: 'core' | 'ai' | 'media' | 'analytics' | 'payment' | 'notification';
  isSecret: boolean;
  placeholder?: string;
}

const CONFIG_KEY = 'flip-system-config';

export const DEFAULT_CONFIG: ConfigEntry[] = [
  { key: 'supabase_url', label: 'Supabase URL', value: '', category: 'core', isSecret: false, placeholder: 'https://xxx.supabase.co' },
  { key: 'supabase_anon_key', label: 'Supabase Anon Key', value: '', category: 'core', isSecret: true, placeholder: 'eyJ...' },
  { key: 'supabase_service_key', label: 'Supabase Service Role Key', value: '', category: 'core', isSecret: true, placeholder: 'eyJ...' },
  { key: 'firebase_api_key', label: 'Firebase API Key', value: '', category: 'core', isSecret: true, placeholder: 'AIza...' },
  { key: 'firebase_project_id', label: 'Firebase Project ID', value: '', category: 'core', isSecret: false, placeholder: 'my-project' },
  { key: 'deepai_api_key', label: 'DeepAI API Key', value: '', category: 'ai', isSecret: true, placeholder: 'deepai-key' },
  { key: 'openai_api_key', label: 'OpenAI API Key', value: '', category: 'ai', isSecret: true, placeholder: 'sk-...' },
  { key: 'cloudinary_cloud_name', label: 'Cloudinary Cloud Name', value: '', category: 'media', isSecret: false, placeholder: 'my-cloud' },
  { key: 'cloudinary_api_key', label: 'Cloudinary API Key', value: '', category: 'media', isSecret: true, placeholder: '123...' },
  { key: 'cloudinary_api_secret', label: 'Cloudinary API Secret', value: '', category: 'media', isSecret: true, placeholder: 'secret' },
  { key: 'stripe_secret_key', label: 'Stripe Secret Key', value: '', category: 'payment', isSecret: true, placeholder: 'sk_live_...' },
  { key: 'stripe_webhook_secret', label: 'Stripe Webhook Secret', value: '', category: 'payment', isSecret: true, placeholder: 'whsec_...' },
  { key: 'google_analytics_id', label: 'Google Analytics ID', value: '', category: 'analytics', isSecret: false, placeholder: 'G-XXXXXXX' },
  { key: 'fcm_server_key', label: 'FCM Server Key', value: '', category: 'notification', isSecret: true, placeholder: 'AAAA...' },
  { key: 'onesignal_app_id', label: 'OneSignal App ID', value: '', category: 'notification', isSecret: false, placeholder: 'app-id' },
];

export function loadConfig(): ConfigEntry[] {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (!raw) return DEFAULT_CONFIG;
    const stored = JSON.parse(raw) as ConfigEntry[];
    const merged = [...DEFAULT_CONFIG];
    for (const entry of stored) {
      const idx = merged.findIndex((m) => m.key === entry.key);
      if (idx >= 0) {
        merged[idx] = { ...merged[idx], ...entry };
      } else {
        merged.push(entry);
      }
    }
    return merged;
  } catch {
    return DEFAULT_CONFIG;
  }
}

export function saveConfig(entries: ConfigEntry[]): void {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(entries));
}

export function getConfigValue(key: string): string | undefined {
  const entries = loadConfig();
  return entries.find((e) => e.key === key)?.value || undefined;
}

export function updateConfigValue(key: string, value: string): void {
  const entries = loadConfig();
  const idx = entries.findIndex((e) => e.key === key);
  if (idx >= 0) {
    entries[idx].value = value;
    saveConfig(entries);
  }
}

export const CONFIG_CATEGORIES: { key: ConfigEntry['category']; label: string }[] = [
  { key: 'core', label: 'Core Infrastructure' },
  { key: 'ai', label: 'AI Services' },
  { key: 'media', label: 'Media & Storage' },
  { key: 'payment', label: 'Payment Processing' },
  { key: 'analytics', label: 'Analytics' },
  { key: 'notification', label: 'Push Notifications' },
];
