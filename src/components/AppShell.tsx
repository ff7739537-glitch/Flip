import { useEffect, useState } from 'react';
import {
  Search, Bell, Menu, User, X,
  Radio, Gamepad2, Megaphone, ShoppingBag, Wallet,
  Headphones, Heart, MessageSquare, Smile,
  Home, MessageCircle, Users, Calendar, Video, Film, HeartHandshake, BadgeCheck, Sun, Moon,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { supabase } from '@/lib/supabase';
import { NotificationCenter, useNotifications } from '@/components/NotificationCenter';
import VerifiedBadge from '@/components/VerifiedBadge';

export type NavTab = 'home' | 'messages' | 'friends' | 'events' | 'reels' | 'stories' | 'swipematch' | 'blinddate';
export type PillTag = 'live' | 'game' | 'ads' | 'topshop' | 'wallet' | 'audio' | 'dating' | 'cupid' | 'confession' | 'mood';

export interface ShellProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  activePill: PillTag | null;
  onPillChange: (pill: PillTag | null) => void;
  onOpenProfile: () => void;
  onOpenAdmin: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  children: React.ReactNode;
}

const PILLS: { key: PillTag; label: string; icon: React.ReactNode }[] = [
  { key: 'live', label: 'Live', icon: <Radio size={14} /> },
  { key: 'game', label: 'Game', icon: <Gamepad2 size={14} /> },
  { key: 'ads', label: 'Ads', icon: <Megaphone size={14} /> },
  { key: 'topshop', label: 'Top Shop', icon: <ShoppingBag size={14} /> },
  { key: 'wallet', label: 'Wallet', icon: <Wallet size={14} /> },
  { key: 'audio', label: 'Audio Lounge', icon: <Headphones size={14} /> },
  { key: 'dating', label: 'Dating', icon: <Heart size={14} /> },
  { key: 'cupid', label: 'Cupid Live', icon: <Radio size={14} /> },
  { key: 'confession', label: 'Confession', icon: <MessageSquare size={14} /> },
  { key: 'mood', label: 'Mood & Vibe', icon: <Smile size={14} /> },
];

const BOTTOM_NAV: { key: NavTab; label: string; icon: React.ReactNode }[] = [
  { key: 'home', label: 'Home', icon: <Home size={20} /> },
  { key: 'messages', label: 'Message', icon: <MessageCircle size={20} /> },
  { key: 'friends', label: 'Friends', icon: <Users size={20} /> },
  { key: 'events', label: 'Events', icon: <Calendar size={20} /> },
  { key: 'reels', label: 'Reels', icon: <Video size={20} /> },
  { key: 'stories', label: 'Hot Stories', icon: <Film size={20} /> },
  { key: 'swipematch', label: 'Swipe Match', icon: <Heart size={20} /> },
  { key: 'blinddate', label: 'Blind Date', icon: <HeartHandshake size={20} /> },
];

export default function AppShell({
  activeTab, onTabChange, activePill, onPillChange,
  onOpenProfile, onOpenAdmin, searchQuery, onSearchChange, children,
}: ShellProps) {
  const { profile, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const isAdmin = profile?.role === 'admin' || profile?.role === 'moderator';
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [showNotifCenter, setShowNotifCenter] = useState(false);
  const [unreadMsgs, setUnreadMsgs] = useState(0);
  const [pendingFriends, setPendingFriends] = useState(0);
  const [notifCount, setNotifCount] = useState(0);
  const { unreadCount: notifUnread } = useNotifications();

  useEffect(() => {
    if (!profile) return;
    (async () => {
      const { count: msgCount } = await supabase.from('messages')
        .select('*', { count: 'exact', head: true })
        .neq('sender_id', profile.id)
        .is('read_at', null);
      setUnreadMsgs(msgCount || 0);

      const { count: friendCount } = await supabase.from('friends')
        .select('*', { count: 'exact', head: true })
        .eq('addressee_id', profile.id)
        .eq('status', 'pending');
      setPendingFriends(friendCount || 0);

      setNotifCount((msgCount || 0) + (friendCount || 0) + notifUnread);
    })();
  }, [profile, notifUnread]);

  return (
    <div className="min-h-screen bg-slate-950 dark:bg-slate-950 light:bg-slate-50 text-white dark:text-white light:text-slate-900 flex flex-col">
      {/* Top Bar */}
      <header className="sticky top-0 z-40 bg-slate-900/80 dark:bg-slate-900/80 light:bg-white/80 backdrop-blur-xl border-b border-white/5 dark:border-white/5 light:border-slate-200">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tighter bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
              FLIP
            </h1>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-full hover:bg-white/10 light:hover:bg-slate-100 transition-colors active:scale-90"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <button
              onClick={() => setSearchOpen(!searchOpen)}
              className="p-2 rounded-full hover:bg-white/10 light:hover:bg-slate-100 transition-colors active:scale-90"
              aria-label="Search"
            >
              <Search size={20} />
            </button>
            <button
              onClick={() => setShowNotifCenter(true)}
              className="p-2 rounded-full hover:bg-white/10 transition-colors relative active:scale-90"
              aria-label="Notifications"
            >
              <Bell size={20} />
              {notifCount > 0 && (
                <span className="absolute top-1 right-1 min-w-[16px] h-[16px] px-1 bg-red-500 rounded-full text-[10px] font-bold flex items-center justify-center">
                  {notifCount > 9 ? '9+' : notifCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-2 rounded-full hover:bg-white/10 transition-colors active:scale-90"
              aria-label="Menu"
            >
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <button
              onClick={onOpenProfile}
              className="p-2 rounded-full hover:bg-white/10 transition-colors active:scale-90"
              aria-label="Profile"
            >
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="w-7 h-7 rounded-full object-cover" />
              ) : (
                <User size={20} />
              )}
            </button>
          </div>
        </div>

        {/* Search dropdown */}
        {searchOpen && (
          <div className="max-w-6xl mx-auto px-4 pb-3 animate-fade-in-up">
            <input
              autoFocus
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search posts, people, rooms..."
              className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-2.5 text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
          </div>
        )}



        {/* Menu dropdown */}
        {menuOpen && (
          <div className="absolute right-4 top-14 w-64 bg-slate-800 border border-white/10 rounded-2xl shadow-2xl p-2 animate-fade-in-up">
            <div className="flex items-center gap-3 px-3 py-2.5 mb-1">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-sm font-semibold">
                  {profile?.display_name?.charAt(0) || 'U'}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <p className="text-sm font-semibold truncate">{profile?.display_name || 'User'}</p>
                  <VerifiedBadge profile={profile} size={13} />
                </div>
                <p className="text-xs text-slate-500 truncate">{profile?.email}</p>
              </div>
            </div>
            <div className="h-px bg-white/5 my-1" />
            <button
              onClick={() => { onOpenProfile(); setMenuOpen(false); }}
              className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-white/10 text-sm font-medium transition-colors flex items-center gap-3"
            >
              <User size={16} /> My Profile
            </button>
            {isAdmin && (
              <button
                onClick={() => { onOpenAdmin(); setMenuOpen(false); }}
                className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-white/10 text-sm font-medium transition-colors flex items-center gap-3"
              >
                <Megaphone size={16} /> FLIP Admin Master
              </button>
            )}
            <div className="h-px bg-white/5 my-1" />
            <button
              onClick={() => { signOut(); setMenuOpen(false); }}
              className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-red-500/10 text-sm font-medium text-red-400 transition-colors"
            >
              Sign Out
            </button>
          </div>
        )}
      </header>

      {/* Top Bar 2 - Scrollable Pills */}
      <div className="sticky top-14 z-30 bg-slate-900/80 dark:bg-slate-900/80 light:bg-white/80 backdrop-blur-xl border-b border-white/5 dark:border-white/5 light:border-slate-200">
        <div className="max-w-6xl mx-auto px-2 overflow-x-auto scrollbar-hide">
          <div className="flex gap-2 py-2.5 px-2">
            <button
              onClick={() => onPillChange(null)}
              className={`flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold transition-all active:scale-95 ${
                activePill === null
                  ? 'bg-emerald-500 text-white'
                  : 'bg-slate-800 dark:bg-slate-800 light:bg-slate-100 text-slate-400 dark:text-slate-400 light:text-slate-500 hover:text-white dark:hover:text-white light:hover:text-slate-900'
              }`}
            >
              For You
            </button>
            {PILLS.map((pill) => (
              <button
                key={pill.key}
                onClick={() => onPillChange(pill.key)}
                className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold transition-all active:scale-95 ${
                  activePill === pill.key
                    ? 'bg-emerald-500 text-white'
                    : 'bg-slate-800 dark:bg-slate-800 light:bg-slate-100 text-slate-400 dark:text-slate-400 light:text-slate-500 hover:text-white dark:hover:text-white light:hover:text-slate-900'
                }`}
              >
                {pill.icon}
                {pill.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-4 pb-24">
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-slate-900/90 dark:bg-slate-900/90 light:bg-white/90 backdrop-blur-xl border-t border-white/5 dark:border-white/5 light:border-slate-200">
        <div className="max-w-6xl mx-auto px-2 overflow-x-auto scrollbar-hide">
          <div className="flex justify-between items-center h-16 min-w-max">
            {BOTTOM_NAV.map((item) => {
              const showBadge =
                (item.key === 'messages' && unreadMsgs > 0) ||
                (item.key === 'friends' && pendingFriends > 0);
              return (
                <button
                  key={item.key}
                  onClick={() => onTabChange(item.key)}
                  className={`relative flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-all min-w-[60px] active:scale-90 ${
                    activeTab === item.key && activePill === null
                      ? 'text-emerald-400'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  <div className="relative">
                    {item.icon}
                    {showBadge && (
                      <span className="absolute -top-1.5 -right-2 min-w-[14px] h-[14px] px-1 bg-red-500 rounded-full text-[9px] font-bold flex items-center justify-center text-white">
                        {item.key === 'messages' ? (unreadMsgs > 9 ? '9+' : unreadMsgs) : (pendingFriends > 9 ? '9+' : pendingFriends)}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] font-medium">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {showNotifCenter && <NotificationCenter onClose={() => setShowNotifCenter(false)} />}
    </div>
  );
}
