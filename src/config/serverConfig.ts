export enum ServerKey {
  SUPABASE_URL = 'supabase_url',
  SUPABASE_ANON_KEY = 'supabase_anon_key',
  SUPABASE_SERVICE_KEY = 'supabase_service_key',
  WEBSOCKET_URL = 'websocket_url',
  AI_SERVICE_URL = 'ai_service_url',
  AI_SERVICE_KEY = 'ai_service_key',
  MEDIA_CDN_URL = 'media_cdn_url',
  PAYMENT_GATEWAY_URL = 'payment_gateway_url',
  PAYMENT_GATEWAY_KEY = 'payment_gateway_key',
  ANALYTICS_ENDPOINT = 'analytics_endpoint',
  PUSH_SERVER_URL = 'push_server_url',
}

export interface ServerConfigEntry {
  key: ServerKey;
  label: string;
  value: string;
  isSecret: boolean;
  placeholder: string;
  category: 'database' | 'realtime' | 'ai' | 'media' | 'payment' | 'analytics' | 'notification';
}

export const DEFAULT_SERVER_CONFIG: ServerConfigEntry[] = [
  {
    key: ServerKey.SUPABASE_URL,
    label: 'Supabase URL',
    value: import.meta.env.VITE_SUPABASE_URL || '',
    isSecret: false,
    placeholder: 'https://xxx.supabase.co',
    category: 'database',
  },
  {
    key: ServerKey.SUPABASE_ANON_KEY,
    label: 'Supabase Anon Key',
    value: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
    isSecret: true,
    placeholder: 'eyJ...',
    category: 'database',
  },
  {
    key: ServerKey.SUPABASE_SERVICE_KEY,
    label: 'Supabase Service Role Key',
    value: '',
    isSecret: true,
    placeholder: 'eyJ... (server-side only)',
    category: 'database',
  },
  {
    key: ServerKey.WEBSOCKET_URL,
    label: 'WebSocket Node URL',
    value: '',
    isSecret: false,
    placeholder: 'wss://realtime.example.com',
    category: 'realtime',
  },
  {
    key: ServerKey.AI_SERVICE_URL,
    label: 'AI Service Endpoint',
    value: '',
    isSecret: false,
    placeholder: 'https://api.openai.com/v1',
    category: 'ai',
  },
  {
    key: ServerKey.AI_SERVICE_KEY,
    label: 'AI Service API Key',
    value: '',
    isSecret: true,
    placeholder: 'sk-...',
    category: 'ai',
  },
  {
    key: ServerKey.MEDIA_CDN_URL,
    label: 'Media CDN Base URL',
    value: '',
    isSecret: false,
    placeholder: 'https://cdn.example.com',
    category: 'media',
  },
  {
    key: ServerKey.PAYMENT_GATEWAY_URL,
    label: 'Payment Gateway URL',
    value: '',
    isSecret: false,
    placeholder: 'https://api.stripe.com',
    category: 'payment',
  },
  {
    key: ServerKey.PAYMENT_GATEWAY_KEY,
    label: 'Payment Gateway Secret Key',
    value: '',
    isSecret: true,
    placeholder: 'sk_live_...',
    category: 'payment',
  },
  {
    key: ServerKey.ANALYTICS_ENDPOINT,
    label: 'Analytics Endpoint',
    value: '',
    isSecret: false,
    placeholder: 'https://analytics.example.com/ingest',
    category: 'analytics',
  },
  {
    key: ServerKey.PUSH_SERVER_URL,
    label: 'Push Notification Server',
    value: '',
    isSecret: false,
    placeholder: 'https://fcm.googleapis.com',
    category: 'notification',
  },
];

const STORAGE_KEY = 'flip-server-config';

export function loadServerConfig(): ServerConfigEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SERVER_CONFIG;
    const stored = JSON.parse(raw) as Partial<ServerConfigEntry>[];
    const merged = [...DEFAULT_SERVER_CONFIG];
    for (const entry of stored) {
      const idx = merged.findIndex((m) => m.key === entry.key);
      if (idx >= 0 && entry.value !== undefined) {
        merged[idx] = { ...merged[idx], value: entry.value };
      }
    }
    return merged;
  } catch {
    return DEFAULT_SERVER_CONFIG;
  }
}

export function saveServerConfig(entries: ServerConfigEntry[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

export function getServerConfigValue(key: ServerKey): string {
  const entries = loadServerConfig();
  return entries.find((e) => e.key === key)?.value || '';
}

export function updateServerConfig(key: ServerKey, value: string): void {
  const entries = loadServerConfig();
  const idx = entries.findIndex((e) => e.key === key);
  if (idx >= 0) {
    entries[idx].value = value;
    saveServerConfig(entries);
  }
}

export function resetServerConfig(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export const SERVER_CONFIG_CATEGORIES: { key: ServerConfigEntry['category']; label: string; icon: string }[] = [
  { key: 'database', label: 'Database & Backend', icon: 'Database' },
  { key: 'realtime', label: 'Realtime & WebSocket', icon: 'Radio' },
  { key: 'ai', label: 'AI Services', icon: 'Sparkles' },
  { key: 'media', label: 'Media & CDN', icon: 'Film' },
  { key: 'payment', label: 'Payment Gateway', icon: 'CreditCard' },
  { key: 'analytics', label: 'Analytics', icon: 'BarChart' },
  { key: 'notification', label: 'Push Notifications', icon: 'Bell' },
];
