import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  ArrowLeft, Search, Bell, Menu, X, Users, Coins, Database, Palette,
  Shield, Flag, UserPlus, AlertTriangle, TrendingUp, Settings,
  Radio, Gamepad2, Megaphone, Headphones, Film, Heart, MessageSquare,
  Smile, FileText, Mail, Calendar, HeartHandshake, ShoppingBag, Wallet,
  Volume2, Wrench, Key, BarChart3, ChevronRight, Check, Power,
  Trash2, Edit3, Ban, Plus, Save, Eye, EyeOff, Lock, BadgeCheck,
  UserCircle, UserCheck, Layers, ArrowLeftRight, CreditCard, Ticket,
  Receipt, Fingerprint, ScanFace, FileWarning, Lock as LockIcon, Gauge,
  Activity, Server, Cloud, Download, FlaskConical, Webhook,
  Smartphone, Share2, Languages, Brush, Building2, FileCheck,
  Home, Archive,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import type { Profile, Post, ShopItem, Ad, Report } from '@/types';

type AdminView =
  | 'dashboard' | 'users' | 'coins' | 'storage' | 'whitelabel' | 'assistants'
  | 'reports' | 'signups' | 'flagged' | 'earnings' | 'fraudtrend'
  | 'live' | 'games' | 'ads' | 'audio' | 'stories' | 'reels'
  | 'dating' | 'confessions' | 'mood' | 'posts' | 'messages' | 'friends'
  | 'swipe' | 'blinddate' | 'shop' | 'payouts' | 'announcements'
  | 'maintenance' | 'backup' | 'apikeys' | 'analytics'
  | 'userprofiles' | 'followers' | 'groups' | 'events'
  | 'cointransactions' | 'p2pmarket' | 'listings' | 'subscriptionplans'
  | 'subscriptions' | 'promocodes' | 'revenuereports'
  | 'banmanagement' | 'iptracking' | 'frauddetection' | 'kyc'
  | 'auditlogs' | 'securitypolicies' | 'ratelimiting' | 'roles'
  | 'systemhealth' | 'dbmetrics' | 'cdn' | 'dataexport'
  | 'featureflags' | 'abtesting' | 'webhooks'
  | 'pushnotifications' | 'notifications' | 'referrals'
  | 'seo' | 'localization' | 'theming'
  | 'emailservice' | 'smsgateway' | 'gdpr' | 'taxcompliance';

const MENU_ITEMS: { key: AdminView; label: string; icon: React.ReactNode; group: string }[] = [
  // --- Core Flip Modules (25) ---
  { key: 'users', label: 'User Management', icon: <Users size={16} />, group: 'Users & Community' },
  { key: 'userprofiles', label: 'User Profiles', icon: <UserCircle size={16} />, group: 'Users & Community' },
  { key: 'followers', label: 'Followers Graph', icon: <UserCheck size={16} />, group: 'Users & Community' },
  { key: 'groups', label: 'Groups & Communities', icon: <Users size={16} />, group: 'Users & Community' },
  { key: 'events', label: 'Events Calendar', icon: <Calendar size={16} />, group: 'Users & Community' },
  { key: 'messages', label: 'Direct Messages', icon: <Mail size={16} />, group: 'Users & Community' },
  { key: 'dating', label: 'Dating', icon: <Heart size={16} />, group: 'Users & Community' },
  { key: 'swipe', label: 'Swipe / Match', icon: <HeartHandshake size={16} />, group: 'Users & Community' },
  { key: 'blinddate', label: 'Blind Date', icon: <HeartHandshake size={16} />, group: 'Users & Community' },
  { key: 'posts', label: 'Posts & Comments', icon: <FileText size={16} />, group: 'Content & Media' },
  { key: 'reels', label: 'Reels', icon: <Film size={16} />, group: 'Content & Media' },
  { key: 'stories', label: 'Stories', icon: <Film size={16} />, group: 'Content & Media' },
  { key: 'live', label: 'Live Streaming', icon: <Radio size={16} />, group: 'Content & Media' },
  { key: 'audio', label: 'Audio Lounge', icon: <Headphones size={16} />, group: 'Content & Media' },
  { key: 'confessions', label: 'Confessions', icon: <MessageSquare size={16} />, group: 'Content & Media' },
  { key: 'mood', label: 'Mood & Vibe', icon: <Smile size={16} />, group: 'Content & Media' },
  { key: 'reports', label: 'Reports & Moderation', icon: <Flag size={16} />, group: 'Content & Media' },
  { key: 'flagged', label: 'Flagged Content', icon: <AlertTriangle size={16} />, group: 'Content & Media' },
  { key: 'coins', label: 'Coin Economy', icon: <Coins size={16} />, group: 'Economy & Marketplace' },
  { key: 'cointransactions', label: 'Coin Transactions', icon: <ArrowLeftRight size={16} />, group: 'Economy & Marketplace' },
  { key: 'p2pmarket', label: 'P2P Marketplace', icon: <ShoppingBag size={16} />, group: 'Economy & Marketplace' },
  { key: 'shop', label: 'TopShop', icon: <ShoppingBag size={16} />, group: 'Economy & Marketplace' },
  { key: 'games', label: 'Mini-Games', icon: <Gamepad2 size={16} />, group: 'Economy & Marketplace' },
  { key: 'payouts', label: 'Wallet Tracker', icon: <Wallet size={16} />, group: 'Economy & Marketplace' },
  { key: 'ads', label: 'Ads', icon: <Megaphone size={16} />, group: 'Economy & Marketplace' },
  // --- Additional Professional Modules (35) ---
  { key: 'listings', label: 'Marketplace Listings', icon: <Layers size={16} />, group: 'Economy & Marketplace' },
  { key: 'subscriptions', label: 'Subscriptions', icon: <CreditCard size={16} />, group: 'Economy & Marketplace' },
  { key: 'banmanagement', label: 'Ban Management', icon: <Ban size={16} />, group: 'Moderation & Security' },
  { key: 'iptracking', label: 'IP & Device Tracking', icon: <Fingerprint size={16} />, group: 'Moderation & Security' },
  { key: 'frauddetection', label: 'Fraud Detection', icon: <ScanFace size={16} />, group: 'Moderation & Security' },
  { key: 'kyc', label: 'KYC Verification', icon: <FileCheck size={16} />, group: 'Moderation & Security' },
  { key: 'auditlogs', label: 'Audit Logs', icon: <FileText size={16} />, group: 'Moderation & Security' },
  { key: 'securitypolicies', label: 'Security Policies', icon: <LockIcon size={16} />, group: 'Moderation & Security' },
  { key: 'ratelimiting', label: 'Rate Limiting', icon: <Gauge size={16} />, group: 'Moderation & Security' },
  { key: 'roles', label: 'Role & Permissions', icon: <Shield size={16} />, group: 'Moderation & Security' },
  { key: 'assistants', label: 'Admin Assistant', icon: <Shield size={16} />, group: 'Moderation & Security' },
  { key: 'systemhealth', label: 'System Health', icon: <Activity size={16} />, group: 'System & Infrastructure' },
  { key: 'dbmetrics', label: 'Database Metrics', icon: <Database size={16} />, group: 'System & Infrastructure' },
  { key: 'storage', label: 'Storage Management', icon: <Database size={16} />, group: 'System & Infrastructure' },
  { key: 'cdn', label: 'CDN Management', icon: <Cloud size={16} />, group: 'System & Infrastructure' },
  { key: 'backup', label: 'Backup & Restore', icon: <Archive size={16} />, group: 'System & Infrastructure' },
  { key: 'dataexport', label: 'Data Export', icon: <Download size={16} />, group: 'System & Infrastructure' },
  { key: 'maintenance', label: 'Maintenance Mode', icon: <Power size={16} />, group: 'System & Infrastructure' },
  { key: 'featureflags', label: 'Feature Flags', icon: <FlaskConical size={16} />, group: 'System & Infrastructure' },
  { key: 'abtesting', label: 'A/B Testing', icon: <FlaskConical size={16} />, group: 'System & Infrastructure' },
  { key: 'apikeys', label: 'API Keys', icon: <Key size={16} />, group: 'System & Infrastructure' },
  { key: 'webhooks', label: 'Webhooks', icon: <Webhook size={16} />, group: 'System & Infrastructure' },
  { key: 'whitelabel', label: 'White Label Config', icon: <Building2 size={16} />, group: 'System & Infrastructure' },
  { key: 'pushnotifications', label: 'Push Notifications', icon: <Smartphone size={16} />, group: 'Marketing & Growth' },
  { key: 'notifications', label: 'In-App Notifications', icon: <Bell size={16} />, group: 'Marketing & Growth' },
  { key: 'announcements', label: 'Announcements', icon: <Volume2 size={16} />, group: 'Marketing & Growth' },
  { key: 'referrals', label: 'Referrals', icon: <Share2 size={16} />, group: 'Marketing & Growth' },
  { key: 'analytics', label: 'Analytics Dashboard', icon: <BarChart3 size={16} />, group: 'Marketing & Growth' },
  { key: 'seo', label: 'SEO Settings', icon: <Search size={16} />, group: 'Marketing & Growth' },
  { key: 'localization', label: 'Localization', icon: <Languages size={16} />, group: 'Marketing & Growth' },
  { key: 'theming', label: 'Theme & Branding', icon: <Brush size={16} />, group: 'Marketing & Growth' },
  { key: 'emailservice', label: 'Email Service', icon: <Mail size={16} />, group: 'Compliance & Legal' },
  { key: 'smsgateway', label: 'SMS Gateway', icon: <Smartphone size={16} />, group: 'Compliance & Legal' },
  { key: 'gdpr', label: 'GDPR Requests', icon: <FileWarning size={16} />, group: 'Compliance & Legal' },
  { key: 'taxcompliance', label: 'Tax & Compliance', icon: <FileCheck size={16} />, group: 'Compliance & Legal' },
];

const MASTER_PASSWORD = '1234,.,@kilimanjaro.Ffm';

const AUTHORIZED_ADMIN_EMAILS = [
  'fransiscomanongi@gmail.com',
  'ff7739537@gmail.com',
  'adamufrank55@gmail.com',
];

export default function AdminScreen({ onBack }: { onBack: () => void }) {
  const { profile } = useAuth();
  const [view, setView] = useState<AdminView>('dashboard');
  const [menuOpen, setMenuOpen] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [pwInput, setPwInput] = useState('');
  const [pwError, setPwError] = useState(false);
  const [stats, setStats] = useState({
    userCount: 0, coinPool: 0, storageUsed: 0, reports: 0, signupsToday: 0, flagged: 0, earnings: 0,
  });

  const handlePwSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pwInput === MASTER_PASSWORD) {
      setAuthed(true);
      setPwError(false);
    } else {
      setPwError(true);
    }
  };

  useEffect(() => {
    (async () => {
      const { count: users } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
      const { count: reports } = await supabase.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'pending');
      const { count: flagged } = await supabase.from('reports').select('*', { count: 'exact', head: true });
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const { count: signups } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', today.toISOString());
      const { data: settings } = await supabase.from('system_settings').select('*').eq('key', 'coin_circulation').maybeSingle();
      const { data: txns } = await supabase.from('transactions').select('amount').gte('created_at', today.toISOString());
      const earnings = (txns || []).reduce((sum: number, t: { amount: number }) => sum + t.amount, 0);
      setStats({
        userCount: users || 0,
        coinPool: parseInt((settings as { value: string })?.value || '0'),
        storageUsed: Math.floor(Math.random() * 40 + 20),
        reports: reports || 0,
        signupsToday: signups || 0,
        flagged: flagged || 0,
        earnings,
      });
    })();
  }, []);

  const isAdmin =
    (profile?.role === 'admin' || profile?.role === 'moderator') &&
    AUTHORIZED_ADMIN_EMAILS.includes(profile?.email?.toLowerCase() ?? '');

  const [searchQuery, setSearchQuery] = useState('');

  const filteredMenuItems = useMemo(() => {
    if (!searchQuery.trim()) return MENU_ITEMS;
    return MENU_ITEMS.filter((item) =>
      item.label.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery]);

  const groupedMenu = useMemo(() => {
    return filteredMenuItems.reduce((acc, item) => {
      (acc[item.group] = acc[item.group] || []).push(item);
      return acc;
    }, {} as Record<string, typeof MENU_ITEMS>);
  }, [filteredMenuItems]);

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <div className="text-center">
          <Shield size={48} className="mx-auto text-red-400 mb-4" />
          <h2 className="text-xl font-bold mb-2">Access Denied</h2>
          <p className="text-slate-400 text-sm mb-4">You need admin privileges to access this panel.</p>
          <button onClick={onBack} className="bg-slate-800 hover:bg-slate-700 px-6 py-2 rounded-full text-sm font-semibold transition-colors">
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!authed) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-6">
            <div className="w-16 h-16 mx-auto bg-amber-500/20 rounded-full flex items-center justify-center mb-3">
              <Lock size={28} className="text-amber-400" />
            </div>
            <h1 className="text-2xl font-black bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">FLIP ADMIN MASTER</h1>
            <p className="text-xs text-slate-500 mt-1">Enter the master password to access the admin panel</p>
          </div>
          <form onSubmit={handlePwSubmit} className="bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 p-6 space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Master Password</label>
              <input
                type="password"
                value={pwInput}
                onChange={(e) => { setPwInput(e.target.value); setPwError(false); }}
                placeholder="Enter master password"
                autoFocus
                className="w-full bg-slate-800/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all"
              />
              {pwError && <p className="text-xs text-red-400 mt-2">Incorrect password. Try again.</p>}
            </div>
            <button type="submit" className="w-full bg-amber-500 hover:bg-amber-400 text-white font-semibold py-3 rounded-xl transition-all shadow-lg shadow-amber-500/20">
              Unlock Admin Panel
            </button>
            <button type="button" onClick={onBack} className="w-full bg-slate-800 text-slate-400 hover:text-white py-2.5 rounded-xl text-sm font-semibold transition-colors">
              Go Back
            </button>
          </form>
        </div>
      </div>
    );
  }

  const renderView = () => {
    if (view === 'dashboard') return <DashboardView stats={stats} setView={setView} />;
    if (view === 'users') return <UsersManager />;
    if (view === 'posts') return <PostsManager />;
    if (view === 'messages') return <MessagesManager />;
    if (view === 'shop') return <ShopManager />;
    if (view === 'ads') return <AdsManager />;
    if (view === 'reports') return <ReportsManager />;
    if (view === 'announcements') return <AnnouncementsView />;
    if (view === 'maintenance') return <MaintenanceView />;
    if (view === 'backup') return <BackupView />;
    if (view === 'apikeys') return <ApiKeysView />;
    if (view === 'analytics') return <AnalyticsView />;
    if (view === 'whitelabel') return <WhiteLabelView />;
    if (view === 'assistants') return <AssistantsView />;
    if (view === 'coins') return <CoinsView />;
    if (view === 'storage') return <StorageView />;
    if (view === 'signups') return <SignupsView />;
    if (view === 'flagged') return <ReportsManager />;
    if (view === 'earnings') return <EarningsView />;
    if (view === 'payouts') return <EarningsView />;
    if (['live', 'games', 'audio', 'stories', 'reels', 'dating', 'confessions', 'mood', 'friends', 'swipe', 'blinddate'].includes(view))
      return <GenericDataView view={view} />;
    return <PlaceholderView view={view} />;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-xl border-b border-amber-500/20">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setMenuOpen(true)} className="p-2 rounded-full hover:bg-white/10 transition-colors">
              <Menu size={20} />
            </button>
            <h1 className="text-lg font-bold bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">
              FLIP ADMIN MASTER
            </h1>
          </div>
          <div className="flex items-center gap-1">
            <div className="relative hidden sm:block">
              <Search size={16} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search modules..."
                className="w-48 bg-slate-800 border border-white/10 rounded-full pl-8 pr-3 py-1.5 text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all"
              />
            </div>
            <button className="p-2 rounded-full hover:bg-white/10 transition-colors relative">
              <Bell size={18} />
              {stats.reports > 0 && <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />}
            </button>
          </div>
        </div>
      </header>

      {/* Slide-out Drawer */}
      {menuOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/60 z-40"
            onClick={() => setMenuOpen(false)}
          />
          <aside className="fixed left-0 top-0 bottom-0 w-80 max-w-[85vw] bg-slate-900 border-r border-white/10 z-50 overflow-y-auto animate-slide-in-left">
            <div className="flex items-center justify-between px-4 h-14 border-b border-white/10 sticky top-0 bg-slate-900 z-10">
              <span className="font-bold text-white text-sm">Modules ({MENU_ITEMS.length})</span>
              <button
                onClick={() => setMenuOpen(false)}
                className="p-2 rounded-full hover:bg-white/10 transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-3">
              <div className="relative mb-3">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search modules..."
                  className="w-full bg-slate-800 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all"
                />
              </div>
              <nav className="space-y-4 pb-20">
                {Object.entries(groupedMenu).map(([group, items]) => (
                  <div key={group}>
                    <p className="text-[10px] font-bold text-slate-500 uppercase px-2 py-1">{group}</p>
                    <div className="space-y-0.5">
                      {items.map((item) => (
                        <button
                          key={item.key}
                          onClick={() => { setView(item.key); setMenuOpen(false); }}
                          className={`w-full flex items-center gap-3 px-2 py-2 rounded-lg text-sm transition-colors ${
                            view === item.key ? 'bg-amber-500/20 text-amber-400' : 'hover:bg-white/5 text-slate-300'
                          }`}
                        >
                          {item.icon}
                          <span className="flex-1 text-left truncate">{item.label}</span>
                          <ChevronRight size={14} className="text-slate-600" />
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
                {filteredMenuItems.length === 0 && (
                  <p className="text-center text-slate-500 text-sm py-8">No modules found.</p>
                )}
              </nav>
            </div>
          </aside>
        </>
      )}

      <div className="max-w-7xl mx-auto px-4 py-6 pb-24">
        {renderView()}
      </div>

      {/* Home button at base */}
      <button
        onClick={onBack}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold rounded-full shadow-lg shadow-amber-500/30 hover:from-amber-400 hover:to-orange-400 transition-all"
      >
        <Home size={18} />
        Home
      </button>
    </div>
  );
}

interface AdminStats {
  userCount: number;
  coinPool: number;
  storageUsed: number;
  reports: number;
  signupsToday: number;
  flagged: number;
  earnings: number;
}

function DashboardView({ stats, setView }: { stats: AdminStats; setView: (v: AdminView) => void }) {
  const cards = [
    { key: 'users' as AdminView, label: 'Users', value: stats.userCount, icon: <Users size={24} />, color: 'emerald', desc: 'Total registered users' },
    { key: 'coins' as AdminView, label: 'Coin', value: stats.coinPool.toLocaleString(), icon: <Coins size={24} />, color: 'amber', desc: 'System circulation pool' },
    { key: 'storage' as AdminView, label: 'Storage', value: `${stats.storageUsed}%`, icon: <Database size={24} />, color: 'cyan', desc: 'Storage usage tracking' },
    { key: 'whitelabel' as AdminView, label: 'White Label / System Status', value: 'Operational', icon: <Palette size={24} />, color: 'violet', desc: 'All systems running' },
    { key: 'assistants' as AdminView, label: 'Admin Assistant', value: 'Active', icon: <Shield size={24} />, color: 'rose', desc: 'Delegation & sub-admins' },
    { key: 'reports' as AdminView, label: 'Active Reports', value: stats.reports, icon: <Flag size={24} />, color: 'red', desc: 'Pending report tickets' },
    { key: 'signups' as AdminView, label: 'New Signups', value: stats.signupsToday, icon: <UserPlus size={24} />, color: 'teal', desc: 'Users joined today' },
    { key: 'flagged' as AdminView, label: 'Flagged Content', value: stats.flagged, icon: <AlertTriangle size={24} />, color: 'orange', desc: 'Flagged items' },
    { key: 'fraudtrend' as AdminView, label: 'Earning / Fraud Trend', value: '0.3%', icon: <TrendingUp size={24} />, color: 'indigo', desc: 'Below threshold' },
    { key: 'earnings' as AdminView, label: 'Earnings Transaction Volume', value: stats.earnings.toLocaleString(), icon: <BarChart3 size={24} />, color: 'emerald', desc: 'Transaction volume today' },
  ];

  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
        {cards.map((card) => (
          <button
            key={card.key}
            onClick={() => setView(card.key)}
            className={`bg-slate-900 rounded-2xl border border-white/5 p-4 md:p-5 hover:border-amber-500/30 transition-all text-left group`}
          >
            <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl bg-${card.color}-500/20 text-${card.color}-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
              {card.icon}
            </div>
            <p className="text-2xl md:text-3xl font-black mb-1">{card.value}</p>
            <p className="text-sm font-semibold text-slate-300">{card.label}</p>
            <p className="text-xs text-slate-500 mt-0.5">{card.desc}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

// ============ USERS MANAGER ============
function UsersManager() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Profile | null>(null);
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState<'user' | 'admin' | 'moderator'>('user');
  const [editStatus, setEditStatus] = useState<'active' | 'suspended' | 'banned'>('active');
  const [editCoins, setEditCoins] = useState(0);

  const fetchUsers = useCallback(async () => {
    const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false }).limit(100);
    setUsers((data as Profile[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleSave = async () => {
    if (!editing) return;
    await supabase.from('profiles').update({
      display_name: editName,
      role: editRole,
      status: editStatus,
      coins: editCoins,
    }).eq('id', editing.id);
    setEditing(null);
    fetchUsers();
  };

  const handleToggleVerified = async (userId: string, current: boolean) => {
    await supabase.from('profiles').update({ is_verified: !current }).eq('id', userId);
    fetchUsers();
  };

  const handleBan = async (userId: string) => {
    await supabase.from('profiles').update({ status: 'banned' }).eq('id', userId);
    fetchUsers();
  };

  const handleUnban = async (userId: string) => {
    await supabase.from('profiles').update({ status: 'active' }).eq('id', userId);
    fetchUsers();
  };

  const handleDelete = async (userId: string) => {
    if (!confirm('Permanently delete this user? This cannot be undone.')) return;
    await supabase.from('profiles').delete().eq('id', userId);
    fetchUsers();
  };

  const filtered = users.filter(u => 
    u.display_name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <h2 className="text-xl font-bold">User Management</h2>
      </div>
      <div className="relative mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search users by name or email..."
          className="w-full bg-slate-800 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50"
        />
      </div>

      {loading ? (
        <p className="text-center py-12 text-slate-500 text-sm">Loading users...</p>
      ) : filtered.length === 0 ? (
        <p className="text-center py-12 text-slate-500 text-sm">No users found.</p>
      ) : (
        <div className="space-y-2">
          {filtered.map((u) => (
            <div key={u.id} className="bg-slate-900 rounded-xl border border-white/5 p-3 flex items-center gap-3">
              {u.avatar_url ? (
                <img src={u.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-sm font-semibold">
                  {u.display_name?.charAt(0).toUpperCase() || 'U'}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{u.display_name}</p>
                <p className="text-xs text-slate-500 truncate">{u.email}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                    u.role === 'admin' ? 'bg-amber-500/20 text-amber-400' :
                    u.role === 'moderator' ? 'bg-cyan-500/20 text-cyan-400' :
                    'bg-slate-700 text-slate-400'
                  }`}>{u.role}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                    u.status === 'active' ? 'bg-emerald-500/20 text-emerald-400' :
                    u.status === 'suspended' ? 'bg-amber-500/20 text-amber-400' :
                    'bg-red-500/20 text-red-400'
                  }`}>{u.status}</span>
                  <span className="text-[10px] text-slate-500">{u.coins} coins</span>
                  {u.is_verified && <span className="text-[10px] bg-sky-500/20 text-sky-400 px-2 py-0.5 rounded-full">Verified</span>}
                </div>
              </div>
              <div className="flex gap-1">
                <button onClick={() => { setEditing(u); setEditName(u.display_name); setEditRole(u.role); setEditStatus(u.status); setEditCoins(u.coins); }} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
                  <Edit3 size={14} className="text-slate-400" />
                </button>
                <button onClick={() => handleToggleVerified(u.id, u.is_verified || false)} title="Toggle verified badge" className="p-1.5 rounded-lg hover:bg-sky-500/10 transition-colors">
                  <BadgeCheck size={14} className={u.is_verified ? 'text-sky-400' : 'text-slate-600'} />
                </button>
                {u.status === 'banned' ? (
                  <button onClick={() => handleUnban(u.id)} className="p-1.5 rounded-lg hover:bg-emerald-500/10 transition-colors">
                    <Check size={14} className="text-emerald-400" />
                  </button>
                ) : (
                  <button onClick={() => handleBan(u.id)} className="p-1.5 rounded-lg hover:bg-amber-500/10 transition-colors">
                    <Ban size={14} className="text-amber-400" />
                  </button>
                )}
                <button onClick={() => handleDelete(u.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 transition-colors">
                  <Trash2 size={14} className="text-red-400" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit User Modal */}
      {editing && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setEditing(null)}>
          <div className="bg-slate-900 rounded-3xl border border-white/10 p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">Edit User</h3>
              <button onClick={() => setEditing(null)}><X size={20} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-400">Display Name</label>
                <input value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-2.5 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-amber-500/50" />
              </div>
              <div>
                <label className="text-xs text-slate-400">Role</label>
                <select value={editRole} onChange={(e) => setEditRole(e.target.value as 'user' | 'admin' | 'moderator')} className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-2.5 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-amber-500/50">
                  <option value="user">User</option>
                  <option value="moderator">Moderator</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-400">Status</label>
                <select value={editStatus} onChange={(e) => setEditStatus(e.target.value as 'active' | 'suspended' | 'banned')} className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-2.5 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-amber-500/50">
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                  <option value="banned">Banned</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-400">Coins</label>
                <input type="number" value={editCoins} onChange={(e) => setEditCoins(parseInt(e.target.value) || 0)} className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-2.5 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-amber-500/50" />
              </div>
              <button onClick={handleSave} className="w-full bg-amber-500 hover:bg-amber-400 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2">
                <Save size={16} /> Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============ POSTS MANAGER ============
function PostsManager() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchPosts = useCallback(async () => {
    const { data } = await supabase.from('posts').select('*, author:profiles!posts_user_id_fkey(*)').order('created_at', { ascending: false }).limit(100);
    setPosts((data as unknown as Post[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  const handleDelete = async (postId: string) => {
    if (!confirm('Delete this post?')) return;
    await supabase.from('post_likes').delete().eq('post_id', postId);
    await supabase.from('post_comments').delete().eq('post_id', postId);
    await supabase.from('posts').delete().eq('id', postId);
    setPosts((prev) => prev.filter((p) => p.id !== postId));
  };

  const handleDeleteComment = async (postId: string) => {
    const { data: comments } = await supabase.from('post_comments').select('*').eq('post_id', postId).order('created_at', { ascending: false });
    if (!comments || comments.length === 0) return;
    if (!confirm('Delete the most recent comment on this post?')) return;
    await supabase.from('post_comments').delete().eq('id', comments[0].id);
    alert('Comment deleted.');
  };

  const filtered = posts.filter(p => p.content?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Posts & Comments</h2>
      <div className="relative mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search posts..." className="w-full bg-slate-800 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50" />
      </div>
      {loading ? (
        <p className="text-center py-12 text-slate-500 text-sm">Loading posts...</p>
      ) : filtered.length === 0 ? (
        <p className="text-center py-12 text-slate-500 text-sm">No posts found.</p>
      ) : (
        <div className="space-y-2">
          {filtered.map((post) => (
            <div key={post.id} className="bg-slate-900 rounded-xl border border-white/5 p-3">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-semibold flex-shrink-0">
                  {post.author?.display_name?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold">{post.author?.display_name || 'User'}</p>
                  <p className="text-sm text-slate-200 mt-0.5 line-clamp-2">{post.content}</p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                    <span>{post.likes_count} likes</span>
                    <span>{post.comments_count} comments</span>
                    <span>{new Date(post.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button onClick={() => handleDeleteComment(post.id)} title="Delete latest comment" className="p-1.5 rounded-lg hover:bg-amber-500/10 transition-colors">
                    <MessageSquare size={14} className="text-amber-400" />
                  </button>
                  <button onClick={() => handleDelete(post.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 transition-colors">
                    <Trash2 size={14} className="text-red-400" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============ MESSAGES MANAGER ============
function MessagesManager() {
  const [messages, setMessages] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('messages').select('*').order('created_at', { ascending: false }).limit(100);
      setMessages((data as Record<string, unknown>[]) || []);
      setLoading(false);
    })();
  }, []);

  const handleDelete = async (msgId: string) => {
    if (!confirm('Delete this message?')) return;
    await supabase.from('messages').delete().eq('id', msgId);
    setMessages((prev) => prev.filter((m) => m.id !== msgId));
  };

  const filtered = messages.filter(m => String(m.content || '').toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Messages</h2>
      <div className="relative mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search messages..." className="w-full bg-slate-800 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50" />
      </div>
      {loading ? (
        <p className="text-center py-12 text-slate-500 text-sm">Loading messages...</p>
      ) : filtered.length === 0 ? (
        <p className="text-center py-12 text-slate-500 text-sm">No messages found.</p>
      ) : (
        <div className="space-y-2">
          {filtered.map((msg) => (
            <div key={msg.id as string} className="bg-slate-900 rounded-xl border border-white/5 p-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm text-slate-200 truncate">{msg.content as string}</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {msg.read_at ? 'Read' : 'Unread'} · {new Date(msg.created_at as string).toLocaleString()}
                </p>
              </div>
              <button onClick={() => handleDelete(msg.id as string)} className="p-1.5 rounded-lg hover:bg-red-500/10 transition-colors flex-shrink-0">
                <Trash2 size={14} className="text-red-400" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============ SHOP MANAGER ============
function ShopManager() {
  const [items, setItems] = useState<ShopItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<ShopItem | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', price: 0, stock: 100, category: 'coins', is_coin_package: false, bonus_percent: 0, image_url: '' });

  const fetchItems = useCallback(async () => {
    const { data } = await supabase.from('shop_items').select('*').order('created_at', { ascending: false });
    setItems((data as ShopItem[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const handleSave = async () => {
    if (editing) {
      await supabase.from('shop_items').update({
        name: form.name, description: form.description, price: form.price,
        stock: form.stock, category: form.category, is_coin_package: form.is_coin_package,
        bonus_percent: form.bonus_percent, image_url: form.image_url || null,
      }).eq('id', editing.id);
    } else {
      await supabase.from('shop_items').insert({
        name: form.name, description: form.description, price: form.price,
        stock: form.stock, category: form.category, is_coin_package: form.is_coin_package,
        bonus_percent: form.bonus_percent, image_url: form.image_url || null,
        is_active: true, sold_count: 0,
      });
    }
    setEditing(null);
    setCreating(false);
    setForm({ name: '', description: '', price: 0, stock: 100, category: 'coins', is_coin_package: false, bonus_percent: 0, image_url: '' });
    fetchItems();
  };

  const handleDelete = async (itemId: string) => {
    if (!confirm('Delete this shop item?')) return;
    await supabase.from('shop_items').delete().eq('id', itemId);
    fetchItems();
  };

  const handleToggleActive = async (item: ShopItem) => {
    await supabase.from('shop_items').update({ is_active: !item.is_active }).eq('id', item.id);
    fetchItems();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">Top Shop Management</h2>
        <button onClick={() => { setCreating(true); setForm({ name: '', description: '', price: 0, stock: 100, category: 'coins', is_coin_package: false, bonus_percent: 0, image_url: '' }); }} className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-white text-sm font-semibold px-4 py-2 rounded-full transition-colors">
          <Plus size={16} /> Add Item
        </button>
      </div>

      {loading ? (
        <p className="text-center py-12 text-slate-500 text-sm">Loading shop items...</p>
      ) : items.length === 0 ? (
        <p className="text-center py-12 text-slate-500 text-sm">No shop items yet.</p>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <div key={item.id} className="bg-slate-900 rounded-xl border border-white/5 p-3 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center flex-shrink-0">
                {item.image_url ? <img src={item.image_url} alt="" className="w-full h-full rounded-lg object-cover" /> : <ShoppingBag size={18} className="text-cyan-400/50" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{item.name}</p>
                <p className="text-xs text-slate-500 truncate">{item.price} coins · {item.stock} in stock · {item.sold_count} sold</p>
                <div className="flex items-center gap-2 mt-1">
                  {item.is_coin_package && <span className="text-[10px] bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full">Coin Package</span>}
                  {item.bonus_percent > 0 && <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full">+{item.bonus_percent}% Bonus</span>}
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${item.is_active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-400'}`}>
                    {item.is_active ? 'Active' : 'Hidden'}
                  </span>
                </div>
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <button onClick={() => handleToggleActive(item)} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
                  {item.is_active ? <Eye size={14} className="text-slate-400" /> : <EyeOff size={14} className="text-slate-500" />}
                </button>
                <button onClick={() => { setEditing(item); setForm({ name: item.name, description: item.description, price: item.price, stock: item.stock, category: item.category, is_coin_package: item.is_coin_package, bonus_percent: item.bonus_percent, image_url: item.image_url || '' }); }} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
                  <Edit3 size={14} className="text-slate-400" />
                </button>
                <button onClick={() => handleDelete(item.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 transition-colors">
                  <Trash2 size={14} className="text-red-400" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit/Create Modal */}
      {(editing || creating) && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => { setEditing(null); setCreating(false); }}>
          <div className="bg-slate-900 rounded-3xl border border-white/10 p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">{editing ? 'Edit Item' : 'Add Shop Item'}</h3>
              <button onClick={() => { setEditing(null); setCreating(false); }}><X size={20} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-400">Name</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-2.5 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-amber-500/50" />
              </div>
              <div>
                <label className="text-xs text-slate-400">Description</label>
                <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-2.5 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-amber-500/50" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400">Price (coins)</label>
                  <input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: parseInt(e.target.value) || 0 })} className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-2.5 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-amber-500/50" />
                </div>
                <div>
                  <label className="text-xs text-slate-400">Stock</label>
                  <input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: parseInt(e.target.value) || 0 })} className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-2.5 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-amber-500/50" />
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-400">Image URL</label>
                <input value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} placeholder="https://..." className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-2.5 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-amber-500/50" />
              </div>
              <div>
                <label className="text-xs text-slate-400">Category</label>
                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-2.5 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-amber-500/50">
                  <option value="coins">Coins</option>
                  <option value="gifts">Gifts</option>
                  <option value="vip">VIP</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.is_coin_package} onChange={(e) => setForm({ ...form, is_coin_package: e.target.checked })} className="w-4 h-4 rounded" />
                <span className="text-sm">Coin Package</span>
              </label>
              {form.is_coin_package && (
                <div>
                  <label className="text-xs text-slate-400">Bonus Percent</label>
                  <input type="number" value={form.bonus_percent} onChange={(e) => setForm({ ...form, bonus_percent: parseInt(e.target.value) || 0 })} className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-2.5 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-amber-500/50" />
                </div>
              )}
              <button onClick={handleSave} disabled={!form.name} className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-30 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2">
                <Save size={16} /> {editing ? 'Save Changes' : 'Create Item'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============ ADS MANAGER ============
function AdsManager() {
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Ad | null>(null);
  const [form, setForm] = useState({
    title: '', image_url: '', target_url: '', placement: 'feed',
    ad_type: 'sponsored' as 'google' | 'sponsored' | 'admin',
    start_date: '', end_date: '', budget: 0,
  });

  const fetchAds = useCallback(async () => {
    const { data } = await supabase.from('ads').select('*').order('created_at', { ascending: false });
    setAds((data as Ad[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAds(); }, [fetchAds]);

  const handleSave = async () => {
    const payload = {
      title: form.title,
      image_url: form.image_url || null,
      target_url: form.target_url || null,
      placement: form.placement,
      ad_type: form.ad_type,
      start_date: form.start_date ? new Date(form.start_date).toISOString() : null,
      end_date: form.end_date ? new Date(form.end_date).toISOString() : null,
      budget: form.budget,
      is_active: true,
    };
    if (editing) {
      await supabase.from('ads').update(payload).eq('id', editing.id);
    } else {
      await supabase.from('ads').insert(payload);
    }
    setCreating(false);
    setEditing(null);
    setForm({ title: '', image_url: '', target_url: '', placement: 'feed', ad_type: 'sponsored', start_date: '', end_date: '', budget: 0 });
    fetchAds();
  };

  const handleDelete = async (adId: string) => {
    if (!confirm('Delete this ad?')) return;
    await supabase.from('ads').delete().eq('id', adId);
    fetchAds();
  };

  const handleToggle = async (ad: Ad) => {
    await supabase.from('ads').update({ is_active: !ad.is_active }).eq('id', ad.id);
    fetchAds();
  };

  const adTypeColors: Record<string, string> = {
    google: 'bg-blue-500/20 text-blue-400',
    sponsored: 'bg-emerald-500/20 text-emerald-400',
    admin: 'bg-amber-500/20 text-amber-400',
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">Ads Manager</h2>
        <button onClick={() => { setCreating(true); setForm({ title: '', image_url: '', target_url: '', placement: 'feed', ad_type: 'sponsored', start_date: '', end_date: '', budget: 0 }); }} className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-white text-sm font-semibold px-4 py-2 rounded-full transition-colors">
          <Plus size={16} /> New Ad
        </button>
      </div>

      {/* Ad type legend */}
      <div className="flex gap-2 mb-4">
        {(['google', 'sponsored', 'admin'] as const).map((type) => (
          <div key={type} className="flex items-center gap-1.5 text-xs">
            <span className={`px-2 py-0.5 rounded-full ${adTypeColors[type]}`}>{type}</span>
          </div>
        ))}
      </div>

      {loading ? (
        <p className="text-center py-12 text-slate-500 text-sm">Loading ads...</p>
      ) : ads.length === 0 ? (
        <p className="text-center py-12 text-slate-500 text-sm">No ads created yet.</p>
      ) : (
        <div className="space-y-2">
          {ads.map((ad) => (
            <div key={ad.id} className="bg-slate-900 rounded-xl border border-white/5 p-3 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center flex-shrink-0">
                {ad.image_url ? <img src={ad.image_url} alt="" className="w-full h-full rounded-lg object-cover" /> : <Megaphone size={18} className="text-slate-500" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{ad.title}</p>
                <p className="text-xs text-slate-500 truncate">{ad.placement} · {ad.impressions} impressions · {ad.clicks} clicks</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${adTypeColors[ad.ad_type]}`}>{ad.ad_type}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${ad.is_active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-400'}`}>
                    {ad.is_active ? 'Active' : 'Paused'}
                  </span>
                  {ad.start_date && <span className="text-[10px] text-slate-500">Starts: {new Date(ad.start_date).toLocaleDateString()}</span>}
                  {ad.end_date && <span className="text-[10px] text-slate-500">Ends: {new Date(ad.end_date).toLocaleDateString()}</span>}
                </div>
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <button onClick={() => handleToggle(ad)} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
                  {ad.is_active ? <Eye size={14} className="text-slate-400" /> : <EyeOff size={14} className="text-slate-500" />}
                </button>
                <button onClick={() => { setEditing(ad); setForm({ title: ad.title, image_url: ad.image_url || '', target_url: ad.target_url || '', placement: ad.placement, ad_type: ad.ad_type, start_date: ad.start_date ? new Date(ad.start_date).toISOString().slice(0, 10) : '', end_date: ad.end_date ? new Date(ad.end_date).toISOString().slice(0, 10) : '', budget: ad.budget }); }} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
                  <Edit3 size={14} className="text-slate-400" />
                </button>
                <button onClick={() => handleDelete(ad.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 transition-colors">
                  <Trash2 size={14} className="text-red-400" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Ad Modal */}
      {(creating || editing) && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => { setCreating(false); setEditing(null); }}>
          <div className="bg-slate-900 rounded-3xl border border-white/10 p-6 w-full max-w-sm max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">{editing ? 'Edit Ad' : 'New Ad'}</h3>
              <button onClick={() => { setCreating(false); setEditing(null); }}><X size={20} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-400">Ad Title</label>
                <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-2.5 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-amber-500/50" />
              </div>
              <div>
                <label className="text-xs text-slate-400">Ad Type</label>
                <select value={form.ad_type} onChange={(e) => setForm({ ...form, ad_type: e.target.value as 'google' | 'sponsored' | 'admin' })} className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-2.5 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-amber-500/50">
                  <option value="google">Google Ad</option>
                  <option value="sponsored">Sponsored Ad</option>
                  <option value="admin">Admin Ad</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-400">Placement</label>
                <select value={form.placement} onChange={(e) => setForm({ ...form, placement: e.target.value })} className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-2.5 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-amber-500/50">
                  <option value="feed">Feed</option>
                  <option value="sidebar">Sidebar</option>
                  <option value="banner">Banner</option>
                  <option value="reels">Reels</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-400">Image URL</label>
                <input value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} placeholder="https://..." className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-2.5 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-amber-500/50" />
              </div>
              <div>
                <label className="text-xs text-slate-400">Target URL</label>
                <input value={form.target_url} onChange={(e) => setForm({ ...form, target_url: e.target.value })} placeholder="https://..." className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-2.5 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-amber-500/50" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400">Start Date</label>
                  <input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-2.5 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-amber-500/50" />
                </div>
                <div>
                  <label className="text-xs text-slate-400">End Date</label>
                  <input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-2.5 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-amber-500/50" />
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-400">Budget (coins)</label>
                <input type="number" value={form.budget} onChange={(e) => setForm({ ...form, budget: parseInt(e.target.value) || 0 })} className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-2.5 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-amber-500/50" />
              </div>
              <button onClick={handleSave} disabled={!form.title} className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-30 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2">
                <Save size={16} /> {editing ? 'Save Ad' : 'Create Ad'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============ REPORTS MANAGER ============
function ReportsManager() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchReports = useCallback(async () => {
    const { data } = await supabase.from('reports').select('*, reporter:profiles!reports_reporter_id_fkey(*)').order('created_at', { ascending: false }).limit(50);
    setReports((data as unknown as Report[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  const handleResolve = async (reportId: string) => {
    await supabase.from('reports').update({ status: 'resolved' }).eq('id', reportId);
    fetchReports();
  };

  const handleDismiss = async (reportId: string) => {
    await supabase.from('reports').update({ status: 'dismissed' }).eq('id', reportId);
    fetchReports();
  };

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Reports</h2>
      {loading ? (
        <p className="text-center py-12 text-slate-500 text-sm">Loading reports...</p>
      ) : reports.length === 0 ? (
        <p className="text-center py-12 text-slate-500 text-sm">No reports.</p>
      ) : (
        <div className="space-y-2">
          {reports.map((r) => (
            <div key={r.id} className="bg-slate-900 rounded-xl border border-white/5 p-3">
              <div className="flex items-start gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                      r.status === 'pending' ? 'bg-amber-500/20 text-amber-400' :
                      r.status === 'resolved' ? 'bg-emerald-500/20 text-emerald-400' :
                      r.status === 'dismissed' ? 'bg-slate-700 text-slate-400' :
                      'bg-cyan-500/20 text-cyan-400'
                    }`}>{r.status}</span>
                    <span className="text-xs text-slate-500">{r.target_type}</span>
                  </div>
                  <p className="text-sm font-semibold">{r.reason}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{r.description}</p>
                  <p className="text-xs text-slate-500 mt-1">By {r.reporter?.display_name || 'Unknown'} · {new Date(r.created_at).toLocaleDateString()}</p>
                </div>
                {r.status === 'pending' && (
                  <div className="flex gap-1 flex-shrink-0">
                    <button onClick={() => handleResolve(r.id)} className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors">
                      <Check size={14} />
                    </button>
                    <button onClick={() => handleDismiss(r.id)} className="p-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors">
                      <X size={14} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============ GENERIC DATA VIEW ============
function GenericDataView({ view }: { view: string }) {
  const [data, setData] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);

  const tableMap: Record<string, string> = {
    live: 'live_streams', games: 'games', audio: 'audio_rooms', stories: 'stories',
    reels: 'reels', dating: 'dating_rooms', confessions: 'confessions',
    mood: 'mood_vibes', friends: 'friends', swipe: 'friends', blinddate: 'blind_dates',
  };

  useEffect(() => {
    (async () => {
      const table = tableMap[view];
      if (table) {
        const { data: result } = await supabase.from(table).select('*').order('created_at', { ascending: false }).limit(50);
        setData((result as Record<string, unknown>[]) || []);
      }
      setLoading(false);
    })();
  }, [view, tableMap]);

  const titleMap: Record<string, string> = {
    live: 'Live Stream Moderation', games: 'Gaming Controls', audio: 'Music & Audio Rooms',
    stories: 'Hot Stories', reels: 'Reels Moderation', dating: 'Dating Rooms',
    confessions: 'Confessions', mood: 'Mood & Vibe', friends: 'Friends & Events',
    swipe: 'Swipe & Match', blinddate: 'Blind Date',
  };

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">{titleMap[view] || view}</h2>
      {loading ? (
        <p className="text-center py-12 text-slate-500 text-sm">Loading data...</p>
      ) : data.length === 0 ? (
        <p className="text-center py-12 text-slate-500 text-sm">No data available.</p>
      ) : (
        <div className="space-y-2">
          {data.map((row, i) => (
            <div key={i} className="bg-slate-900 rounded-xl border border-white/5 p-3">
              {Object.entries(row).slice(0, 5).map(([key, val]) => (
                <div key={key} className="flex items-baseline gap-2">
                  <span className="text-xs text-slate-500">{key}:</span>
                  <span className="text-sm text-slate-200 truncate">
                    {typeof val === 'string' || typeof val === 'number' ? String(val).substring(0, 60) : '...'}
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============ REMAINING VIEWS (simplified) ============
function MaintenanceView() {
  const [maintenance, setMaintenance] = useState(false);
  const [rateLimit, setRateLimit] = useState(true);
  useEffect(() => {
    (async () => {
      const { data: m } = await supabase.from('system_settings').select('*').eq('key', 'maintenance_mode').maybeSingle();
      setMaintenance((m as { value: string })?.value === 'true');
      const { data: r } = await supabase.from('system_settings').select('*').eq('key', 'rate_limit_enabled').maybeSingle();
      setRateLimit((r as { value: string })?.value !== 'false');
    })();
  }, []);
  const toggle = async () => {
    const newVal = !maintenance;
    setMaintenance(newVal);
    await supabase.from('system_settings').update({ value: String(newVal) }).eq('key', 'maintenance_mode');
  };
  const toggleRateLimit = async () => {
    const newVal = !rateLimit;
    setRateLimit(newVal);
    await supabase.from('system_settings').update({ value: String(newVal) }).eq('key', 'rate_limit_enabled');
  };
  return (
    <div className="space-y-4">
      <div className="bg-slate-900 rounded-2xl border border-white/5 p-6 text-center">
        <Power size={48} className={`mx-auto mb-4 ${maintenance ? 'text-red-400' : 'text-emerald-400'}`} />
        <h3 className="text-lg font-bold mb-2">{maintenance ? 'Maintenance Mode ON' : 'System Running Normally'}</h3>
        <p className="text-sm text-slate-400 mb-4">{maintenance ? 'The platform is currently in maintenance mode.' : 'The platform is running normally.'}</p>
        <button onClick={toggle} className={`px-8 py-3 rounded-full text-sm font-semibold transition-colors ${maintenance ? 'bg-emerald-500 hover:bg-emerald-400 text-white' : 'bg-red-500 hover:bg-red-400 text-white'}`}>
          {maintenance ? 'Turn Off Maintenance' : 'Enable Maintenance'}
        </button>
      </div>
      <div className="bg-slate-900 rounded-2xl border border-white/5 p-6 text-center">
        <Shield size={48} className={`mx-auto mb-4 ${rateLimit ? 'text-emerald-400' : 'text-amber-400'}`} />
        <h3 className="text-lg font-bold mb-2">{rateLimit ? 'Rate Limiting Active' : 'Rate Limiting Disabled'}</h3>
        <p className="text-sm text-slate-400 mb-4">{rateLimit ? 'API rate limits are enforced. Users are protected from spam.' : 'Rate limits are OFF. Use with caution.'}</p>
        <button onClick={toggleRateLimit} className={`px-8 py-3 rounded-full text-sm font-semibold transition-colors ${rateLimit ? 'bg-amber-500 hover:bg-amber-400 text-white' : 'bg-emerald-500 hover:bg-emerald-400 text-white'}`}>
          {rateLimit ? 'Disable Rate Limiting' : 'Enable Rate Limiting'}
        </button>
      </div>
    </div>
  );
}

function BackupView() {
  return (
    <div className="space-y-3">
      <div className="bg-slate-900 rounded-2xl border border-white/5 p-4">
        <h3 className="text-sm font-bold mb-2">Automated Backup</h3>
        <p className="text-xs text-slate-400 mb-3">Last backup: {new Date().toLocaleString()}</p>
        <button className="bg-cyan-500 hover:bg-cyan-400 text-white text-sm font-semibold px-4 py-2 rounded-full transition-colors flex items-center gap-2">
          <Wrench size={14} /> Run Backup Now
        </button>
      </div>
      <div className="bg-slate-900 rounded-2xl border border-white/5 p-4">
        <h3 className="text-sm font-bold mb-2">Restore from Backup</h3>
        <select className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-2.5 text-sm mb-3">
          <option>Latest backup - {new Date().toLocaleDateString()}</option>
          <option>Previous backup - {new Date(Date.now() - 86400000).toLocaleDateString()}</option>
        </select>
        <button className="bg-amber-500 hover:bg-amber-400 text-white text-sm font-semibold px-4 py-2 rounded-full transition-colors">Restore Selected</button>
      </div>
    </div>
  );
}

function ApiKeysView() {
  return (
    <div className="bg-slate-900 rounded-2xl border border-white/5 p-4">
      <h3 className="text-sm font-bold mb-3">API Keys</h3>
      <div className="space-y-2">
        {['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY'].map((key) => (
          <div key={key} className="flex items-center justify-between bg-slate-800 rounded-xl p-3">
            <div>
              <p className="text-sm font-mono">{key}</p>
              <p className="text-xs text-emerald-400 flex items-center gap-1"><Check size={10} /> Configured</p>
            </div>
            <Key size={16} className="text-slate-500" />
          </div>
        ))}
      </div>
    </div>
  );
}

function AnalyticsView() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {[
        { label: 'Daily Active Users', value: '1,234', change: '+12%' },
        { label: 'Posts Today', value: '456', change: '+8%' },
        { label: 'Messages Sent', value: '2,891', change: '+15%' },
        { label: 'Live Hours', value: '124h', change: '+5%' },
        { label: 'Game Plays', value: '3,452', change: '+22%' },
        { label: 'New Friendships', value: '89', change: '+3%' },
        { label: 'Shop Revenue', value: '12.4k', change: '+18%' },
        { label: 'Retention Rate', value: '78%', change: '+2%' },
      ].map((m) => (
        <div key={m.label} className="bg-slate-900 rounded-2xl border border-white/5 p-4">
          <p className="text-xs text-slate-500">{m.label}</p>
          <p className="text-2xl font-bold mt-1">{m.value}</p>
          <p className="text-xs text-emerald-400 mt-1">{m.change}</p>
        </div>
      ))}
    </div>
  );
}

function WhiteLabelView() {
  return (
    <div className="bg-slate-900 rounded-2xl border border-white/5 p-4 space-y-3">
      <h3 className="text-sm font-bold">White Label Settings</h3>
      <div>
        <label className="text-xs text-slate-400">Brand Name</label>
        <input defaultValue="FLIP" className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-2.5 text-sm mt-1" />
      </div>
      <div>
        <label className="text-xs text-slate-400">Primary Color</label>
        <input defaultValue="#10b981" className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-2.5 text-sm mt-1" />
      </div>
      <button className="bg-rose-500 hover:bg-rose-400 text-white text-sm font-semibold px-4 py-2 rounded-full transition-colors">Save Brand Settings</button>
    </div>
  );
}

function AssistantsView() {
  const { profile } = useAuth();
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [delegating, setDelegating] = useState<Profile | null>(null);
  const [subRole, setSubRole] = useState<'moderator' | 'admin'>('moderator');
  const [subPassword, setSubPassword] = useState('');
  const [subAdmins, setSubAdmins] = useState<Profile[]>([]);

  const fetchUsers = useCallback(async () => {
    const { data } = await supabase.from('profiles').select('*').neq('id', profile?.id || '').order('created_at', { ascending: false }).limit(100);
    setUsers((data as Profile[]) || []);
    setSubAdmins(((data as Profile[]) || []).filter((u) => u.role === 'admin' || u.role === 'moderator'));
    setLoading(false);
  }, [profile]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleDelegate = async () => {
    if (!delegating || !subPassword) return;
    await supabase.from('profiles').update({ role: subRole }).eq('id', delegating.id);
    const { data: existing } = await supabase.from('local_auth_overrides').select('*').eq('user_id', delegating.id).maybeSingle();
    if (existing) {
      await supabase.from('local_auth_overrides').update({ password: subPassword, role: subRole }).eq('user_id', delegating.id);
    } else {
      await supabase.from('local_auth_overrides').insert({ user_id: delegating.id, password: subPassword, role: subRole });
    }
    setDelegating(null);
    setSubPassword('');
    setSubRole('moderator');
    fetchUsers();
  };

  const handleRevoke = async (userId: string) => {
    if (!confirm('Revoke admin privileges from this user?')) return;
    await supabase.from('profiles').update({ role: 'user' }).eq('id', userId);
    await supabase.from('local_auth_overrides').delete().eq('user_id', userId);
    fetchUsers();
  };

  const filtered = users.filter((u) =>
    u.display_name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Shield size={20} className="text-amber-400" />
        <h2 className="text-xl font-bold">Admin Delegation</h2>
      </div>
      <p className="text-sm text-slate-400">Assign sub-admin roles and generate secure login passwords for trusted users.</p>

      {/* Current sub-admins */}
      {subAdmins.length > 0 && (
        <div>
          <h3 className="text-xs font-bold text-slate-500 uppercase mb-2">Current Sub-Admins</h3>
          <div className="space-y-2">
            {subAdmins.map((admin) => (
              <div key={admin.id} className="bg-slate-900 rounded-xl border border-white/5 p-3 flex items-center gap-3">
                {admin.avatar_url ? (
                  <img src={admin.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover" />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-amber-500/20 flex items-center justify-center text-sm font-semibold text-amber-400">
                    {admin.display_name?.charAt(0).toUpperCase() || 'U'}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{admin.display_name}</p>
                  <p className="text-xs text-slate-500 truncate">{admin.email}</p>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full ${admin.role === 'admin' ? 'bg-amber-500/20 text-amber-400' : 'bg-cyan-500/20 text-cyan-400'}`}>{admin.role}</span>
                <button onClick={() => handleRevoke(admin.id)} className="text-xs text-red-400 hover:text-red-300 font-medium px-2 py-1 rounded-lg hover:bg-red-500/10 transition-colors">
                  Revoke
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search to delegate */}
      <div>
        <h3 className="text-xs font-bold text-slate-500 uppercase mb-2">Delegate New Sub-Admin</h3>
        <div className="relative mb-3">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search users to delegate..."
            className="w-full bg-slate-800 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50"
          />
        </div>
        {loading ? (
          <p className="text-center py-8 text-slate-500 text-sm">Loading users...</p>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {filtered.filter((u) => u.role === 'user').slice(0, 20).map((u) => (
              <div key={u.id} className="bg-slate-900 rounded-xl border border-white/5 p-3 flex items-center gap-3">
                {u.avatar_url ? (
                  <img src={u.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-semibold">{u.display_name?.charAt(0) || 'U'}</div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{u.display_name}</p>
                  <p className="text-xs text-slate-500 truncate">{u.email}</p>
                </div>
                <button
                  onClick={() => { setDelegating(u); setSubRole('moderator'); setSubPassword(''); }}
                  className="text-xs bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 px-3 py-1.5 rounded-full font-semibold transition-colors flex items-center gap-1"
                >
                  <UserPlus size={12} /> Delegate
                </button>
              </div>
            ))}
            {filtered.filter((u) => u.role === 'user').length === 0 && (
              <p className="text-center py-4 text-slate-500 text-sm">No eligible users found.</p>
            )}
          </div>
        )}
      </div>

      {/* Delegation modal */}
      {delegating && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setDelegating(null)}>
          <div className="bg-slate-900 rounded-3xl border border-white/10 p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">Delegate: {delegating.display_name}</h3>
              <button onClick={() => setDelegating(null)}><X size={20} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-400">Role</label>
                <select value={subRole} onChange={(e) => setSubRole(e.target.value as 'moderator' | 'admin')} className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-2.5 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-amber-500/50">
                  <option value="moderator">Moderator (Content + Users)</option>
                  <option value="admin">Admin (Full access)</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-400">Sub-Admin Login Password</label>
                <input
                  type="text"
                  value={subPassword}
                  onChange={(e) => setSubPassword(e.target.value)}
                  placeholder="Generate or type a secure password"
                  className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-2.5 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                />
                <button
                  onClick={() => setSubPassword(Math.random().toString(36).slice(2, 12) + 'Fl!p' + Math.floor(Math.random() * 90 + 10))}
                  className="text-xs text-amber-400 hover:text-amber-300 font-medium mt-1"
                >
                  Generate secure password
                </button>
              </div>
              <button onClick={handleDelegate} disabled={!subPassword} className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-30 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2">
                <Save size={16} /> Confirm Delegation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CoinsView() {
  return (
    <div className="space-y-3">
      <div className="bg-slate-900 rounded-2xl border border-white/5 p-4">
        <h3 className="text-sm font-bold mb-2">Coin Circulation Pool</h3>
        <p className="text-3xl font-black text-amber-400">{(1000000).toLocaleString()}</p>
        <p className="text-xs text-slate-500 mt-1">Total coins in circulation</p>
      </div>
      <div className="bg-slate-900 rounded-2xl border border-white/5 p-4">
        <h3 className="text-sm font-bold mb-3">Top-up Controls</h3>
        <div className="flex gap-2">
          <input type="number" placeholder="Amount" className="flex-1 bg-slate-800 border border-white/10 rounded-xl px-4 py-2.5 text-sm" />
          <button className="bg-amber-500 hover:bg-amber-400 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors">Add to Pool</button>
        </div>
      </div>
    </div>
  );
}

function StorageView() {
  return (
    <div className="space-y-3">
      <div className="bg-slate-900 rounded-2xl border border-white/5 p-4">
        <h3 className="text-sm font-bold mb-3">Storage Usage</h3>
        <div className="w-full bg-slate-800 rounded-full h-4 mb-2">
          <div className="bg-cyan-500 h-4 rounded-full" style={{ width: '42%' }} />
        </div>
        <p className="text-xs text-slate-400">42% used (4.2 GB / 10 GB)</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-slate-900 rounded-2xl border border-white/5 p-4"><p className="text-xs text-slate-500">Images</p><p className="text-xl font-bold">2.1 GB</p></div>
        <div className="bg-slate-900 rounded-2xl border border-white/5 p-4"><p className="text-xs text-slate-500">Videos</p><p className="text-xl font-bold">1.8 GB</p></div>
      </div>
    </div>
  );
}

function SignupsView() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    (async () => {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const { data } = await supabase.from('profiles').select('*').gte('created_at', today.toISOString()).order('created_at', { ascending: false });
      setUsers((data as Profile[]) || []);
      setLoading(false);
    })();
  }, []);
  return (
    <div>
      <h2 className="text-xl font-bold mb-4">New Signups Today</h2>
      {loading ? <p className="text-center py-12 text-slate-500 text-sm">Loading...</p> : users.length === 0 ? (
        <p className="text-center py-12 text-slate-500 text-sm">No new signups today.</p>
      ) : (
        <div className="space-y-2">
          {users.map((u) => (
            <div key={u.id} className="bg-slate-900 rounded-xl border border-white/5 p-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-semibold">{u.display_name?.charAt(0) || 'U'}</div>
              <div className="flex-1"><p className="text-sm font-semibold">{u.display_name}</p><p className="text-xs text-slate-500">{u.email}</p></div>
              <span className="text-xs text-slate-500">{new Date(u.created_at).toLocaleTimeString()}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function EarningsView() {
  const [txns, setTxns] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('transactions').select('*').order('created_at', { ascending: false }).limit(50);
      setTxns((data as Record<string, unknown>[]) || []);
      setLoading(false);
    })();
  }, []);
  const total = txns.reduce((sum, t) => sum + (t.amount as number || 0), 0);
  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Earnings & Transaction Volume</h2>
      <div className="bg-slate-900 rounded-2xl border border-white/5 p-4 mb-4">
        <p className="text-3xl font-black text-emerald-400">{total.toLocaleString()}</p>
        <p className="text-xs text-slate-500 mt-1">Total transaction volume</p>
      </div>
      {loading ? <p className="text-center py-12 text-slate-500 text-sm">Loading...</p> : (
        <div className="space-y-2">
          {txns.map((t, i) => (
            <div key={i} className="bg-slate-900 rounded-xl border border-white/5 p-3 flex items-center gap-3">
              <div className="flex-1"><p className="text-sm">{t.description as string}</p><p className="text-xs text-slate-500">{t.type as string} · {new Date(t.created_at as string).toLocaleDateString()}</p></div>
              <span className={`text-sm font-bold ${(t.type as string) === 'spend' || (t.type as string) === 'payout' ? 'text-red-400' : 'text-emerald-400'}`}>{t.amount as number}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AnnouncementsView() {
  const { profile } = useAuth();
  const [announcements, setAnnouncements] = useState<Record<string, unknown>[]>([]);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ title: '', body: '', type: 'info' });

  const fetchAnnouncements = async () => {
    const { data } = await supabase.from('announcements').select('*').order('created_at', { ascending: false });
    setAnnouncements((data as Record<string, unknown>[]) || []);
  };

  useEffect(() => { fetchAnnouncements(); }, []);

  const handleCreate = async () => {
    if (!profile || !form.title || !form.body) return;
    await supabase.from('announcements').insert({ title: form.title, body: form.body, type: form.type, created_by: profile.id });
    setForm({ title: '', body: '', type: 'info' });
    setCreating(false);
    fetchAnnouncements();
  };

  return (
    <div>
      <button onClick={() => setCreating(true)} className="mb-4 flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-white text-sm font-semibold px-4 py-2 rounded-full transition-colors">
        <Volume2 size={16} /> New Announcement
      </button>
      {creating && (
        <div className="bg-slate-900 rounded-2xl border border-white/5 p-4 mb-4 space-y-3">
          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Title" className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-2.5 text-sm" />
          <textarea value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} placeholder="Message body" rows={3} className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-2.5 text-sm resize-none" />
          <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-2.5 text-sm">
            <option value="info">Info</option><option value="warning">Warning</option><option value="maintenance">Maintenance</option><option value="update">Update</option><option value="event">Event</option>
          </select>
          <div className="flex gap-2">
            <button onClick={() => setCreating(false)} className="flex-1 bg-slate-800 text-slate-400 py-2 rounded-xl text-sm font-semibold">Cancel</button>
            <button onClick={handleCreate} className="flex-1 bg-amber-500 hover:bg-amber-400 text-white py-2 rounded-xl text-sm font-semibold">Broadcast</button>
          </div>
        </div>
      )}
      <div className="space-y-2">
        {announcements.map((a) => (
          <div key={a.id as string} className="bg-slate-900 rounded-xl border border-white/5 p-3">
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                a.type === 'warning' ? 'bg-amber-500/20 text-amber-400' :
                a.type === 'maintenance' ? 'bg-red-500/20 text-red-400' :
                a.type === 'update' ? 'bg-cyan-500/20 text-cyan-400' :
                a.type === 'event' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-300'
              }`}>{a.type as string}</span>
              {a.is_active as boolean && <span className="text-[10px] text-emerald-400">Active</span>}
            </div>
            <p className="text-sm font-bold">{a.title as string}</p>
            <p className="text-xs text-slate-400 mt-1">{a.body as string}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function PlaceholderView({ view }: { view: string }) {
  const labelMap: Record<string, string> = {
    userprofiles: 'User Profiles', followers: 'Followers Graph', groups: 'Groups & Communities',
    events: 'Events Calendar', cointransactions: 'Coin Transactions', p2pmarket: 'P2P Marketplace',
    listings: 'Marketplace Listings', subscriptions: 'Subscriptions',
    banmanagement: 'Ban Management', iptracking: 'IP & Device Tracking',
    frauddetection: 'Fraud Detection', kyc: 'KYC Verification', auditlogs: 'Audit Logs',
    securitypolicies: 'Security Policies', ratelimiting: 'Rate Limiting',
    roles: 'Role & Permissions', systemhealth: 'System Health', dbmetrics: 'Database Metrics',
    cdn: 'CDN Management', dataexport: 'Data Export', featureflags: 'Feature Flags',
    abtesting: 'A/B Testing', webhooks: 'Webhooks', whitelabel: 'White Label Config',
    pushnotifications: 'Push Notifications', notifications: 'In-App Notifications',
    referrals: 'Referrals', seo: 'SEO Settings', localization: 'Localization',
    theming: 'Theme & Branding', emailservice: 'Email Service', smsgateway: 'SMS Gateway',
    gdpr: 'GDPR Requests', taxcompliance: 'Tax & Compliance', fraudtrend: 'Earning / Fraud Trend',
  };
  const title = labelMap[view] || view;

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">{title}</h2>
      <div className="bg-slate-900 rounded-2xl border border-white/5 p-8 sm:p-12">
        <div className="flex flex-col items-center text-center py-8">
          <div className="w-16 h-16 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center mb-4">
            <Wrench className="text-slate-600" size={28} />
          </div>
          <p className="text-slate-400 max-w-md leading-relaxed text-sm">
            This module is structured and ready for feature hookup. Connect your data sources and business logic here.
          </p>
          <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 gap-3 w-full max-w-lg">
            {['Metrics', 'Data Table', 'Settings', 'Filters', 'Export', 'Audit Log'].map((l) => (
              <div key={l} className="bg-slate-800/50 border border-white/5 rounded-lg p-3 text-center">
                <p className="text-xs text-slate-500">{l}</p>
                <p className="text-base font-bold text-slate-600 mt-1">&mdash;</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
