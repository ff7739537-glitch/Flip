import { useEffect, useState, useCallback } from 'react';
import { Bell, Check, Trash2, Users, Heart, Coins, Megaphone, Settings, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import type { Notification } from '@/types';

const NOTIF_ICONS: Record<string, React.ReactNode> = {
  admin_broadcast: <Megaphone size={18} className="text-amber-400" />,
  friend_activity: <Users size={18} className="text-cyan-400" />,
  social_interaction: <Heart size={18} className="text-rose-400" />,
  marketplace: <Coins size={18} className="text-emerald-400" />,
  coin: <Coins size={18} className="text-amber-400" />,
  system: <Bell size={18} className="text-slate-400" />,
};

const NOTIF_LABELS: Record<string, string> = {
  admin_broadcast: 'Broadcast',
  friend_activity: 'Friend Activity',
  social_interaction: 'Social',
  marketplace: 'Marketplace',
  coin: 'Coins',
  system: 'System',
};

export function useNotifications() {
  const { profile } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const fetchNotifications = useCallback(async () => {
    if (!profile) return;
    const { data } = await supabase.from('notifications').select('*').eq('user_id', profile.id).order('created_at', { ascending: false }).limit(50);
    setNotifications((data as Notification[]) || []);
    const unread = (data as Notification[])?.filter((n) => !n.is_read).length || 0;
    setUnreadCount(unread);
  }, [profile]);

  useEffect(() => {
    fetchNotifications();
    if (!profile) return;
    const channel = supabase.channel('notifications')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${profile.id}` }, () => fetchNotifications())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchNotifications, profile]);

  const markAsRead = async (id: string) => {
    await supabase.from('notifications').update({ is_read: true, read_at: new Date().toISOString() }).eq('id', id);
    fetchNotifications();
  };

  const markAllRead = async () => {
    if (!profile) return;
    await supabase.from('notifications').update({ is_read: true, read_at: new Date().toISOString() }).eq('user_id', profile.id).eq('is_read', false);
    fetchNotifications();
  };

  const deleteNotification = async (id: string) => {
    await supabase.from('notifications').delete().eq('id', id);
    fetchNotifications();
  };

  return { notifications, unreadCount, fetchNotifications, markAsRead, markAllRead, deleteNotification };
}

export function NotificationCenter({ onClose }: { onClose: () => void }) {
  const { notifications, unreadCount, markAsRead, markAllRead, deleteNotification } = useNotifications();
  const [filter, setFilter] = useState<string>('all');

  const filtered = filter === 'all' ? notifications : notifications.filter((n) => n.type === filter);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-slate-900 rounded-3xl border border-white/10 w-full max-w-md max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-white/5">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Bell size={18} className="text-emerald-400" /> Notifications
            {unreadCount > 0 && <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{unreadCount}</span>}
          </h2>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="text-xs text-emerald-400 hover:text-emerald-300 font-medium">
                Mark all read
              </button>
            )}
            <button onClick={onClose}><X size={18} /></button>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1.5 p-3 overflow-x-auto border-b border-white/5">
          {['all', 'admin_broadcast', 'friend_activity', 'social_interaction', 'marketplace', 'coin'].map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-2.5 py-1 rounded-full text-[10px] font-semibold whitespace-nowrap transition-all ${filter === f ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-400'}`}>
              {f === 'all' ? 'All' : NOTIF_LABELS[f] || f}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {filtered.length === 0 ? (
            <div className="text-center py-12">
              <Bell size={40} className="mx-auto text-slate-600 mb-2" />
              <p className="text-slate-500 text-sm">No notifications yet.</p>
            </div>
          ) : (
            filtered.map((notif) => (
              <div key={notif.id} className={`rounded-xl border p-3 flex items-start gap-3 transition-all ${notif.is_read ? 'bg-slate-900 border-white/5' : 'bg-emerald-500/5 border-emerald-500/20'}`}>
                <div className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center flex-shrink-0">
                  {NOTIF_ICONS[notif.type] || <Bell size={18} className="text-slate-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold truncate">{notif.title}</p>
                    {!notif.is_read && <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">{notif.body}</p>
                  <p className="text-[10px] text-slate-600 mt-1">{new Date(notif.created_at).toLocaleString()}</p>
                </div>
                <div className="flex flex-col gap-1">
                  {!notif.is_read && (
                    <button onClick={() => markAsRead(notif.id)} className="p-1 rounded hover:bg-white/10 transition-colors">
                      <Check size={14} className="text-emerald-400" />
                    </button>
                  )}
                  <button onClick={() => deleteNotification(notif.id)} className="p-1 rounded hover:bg-white/10 transition-colors">
                    <Trash2 size={14} className="text-slate-500" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export function NotificationToggles() {
  const { profile } = useAuth();
  const [toggles, setToggles] = useState({
    admin_broadcast: true,
    friend_activity: true,
    social_interaction: true,
    marketplace: true,
    coin: true,
  });

  useEffect(() => {
    if (profile) {
      try {
        const stored = localStorage.getItem(`flip-notif-toggles-${profile.id}`);
        if (stored) setToggles(JSON.parse(stored));
      } catch { /* ignore */ }
    }
  }, [profile]);

  const handleToggle = (key: keyof typeof toggles) => {
    const newToggles = { ...toggles, [key]: !toggles[key] };
    setToggles(newToggles);
    if (profile) {
      localStorage.setItem(`flip-notif-toggles-${profile.id}`, JSON.stringify(newToggles));
    }
  };

  const toggleConfig = [
    { key: 'admin_broadcast' as const, label: 'Admin Broadcasts', icon: <Megaphone size={16} className="text-amber-400" />, desc: 'Platform-wide announcements' },
    { key: 'friend_activity' as const, label: 'Friend Activity', icon: <Users size={16} className="text-cyan-400" />, desc: 'New posts and stories from friends' },
    { key: 'social_interaction' as const, label: 'Social Interactions', icon: <Heart size={16} className="text-rose-400" />, desc: 'Likes, comments, and messages' },
    { key: 'marketplace' as const, label: 'Marketplace', icon: <Coins size={16} className="text-emerald-400" />, desc: 'P2P sales and listing updates' },
    { key: 'coin' as const, label: 'Coin Updates', icon: <Coins size={16} className="text-amber-400" />, desc: 'Coin transactions and rewards' },
  ];

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-1">
        <Settings size={14} className="text-slate-400" />
        <h3 className="text-xs font-bold text-slate-500 uppercase">Notification Preferences</h3>
      </div>
      {toggleConfig.map((cfg) => (
        <div key={cfg.key} className="flex items-center gap-3 bg-slate-900 rounded-xl border border-white/5 p-3">
          {cfg.icon}
          <div className="flex-1">
            <p className="text-sm font-medium">{cfg.label}</p>
            <p className="text-xs text-slate-500">{cfg.desc}</p>
          </div>
          <button onClick={() => handleToggle(cfg.key)}
            className={`w-10 h-6 rounded-full transition-colors relative ${toggles[cfg.key] ? 'bg-emerald-500' : 'bg-slate-700'}`}>
            <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${toggles[cfg.key] ? 'left-4' : 'left-0.5'}`} />
          </button>
        </div>
      ))}
    </div>
  );
}
