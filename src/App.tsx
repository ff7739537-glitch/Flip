import { useState } from 'react';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { ThemeProvider } from '@/context/ThemeContext';
import ErrorBoundary from '@/components/ErrorBoundary';
import AppShell, { type NavTab, type PillTag } from '@/components/AppShell';
import AuthScreen from '@/screens/AuthScreen';
import FeedPage from '@/screens/FeedPage';
import StoriesScreen from '@/screens/StoriesScreen';
import ReelsScreen from '@/screens/ReelsScreen';
import LiveScreen from '@/screens/LiveScreen';
import GamesScreen from '@/screens/GamesScreen';
import WalletScreen from '@/screens/WalletScreen';
import MessagesScreen from '@/screens/MessagesScreen';
import FriendsScreen from '@/screens/FriendsScreen';
import type { Conversation } from '@/types';
import EventsScreen from '@/screens/EventsScreen';
import DatingScreen from '@/screens/DatingScreen';
import BlindDateScreen from '@/screens/BlindDateScreen';
import ConfessionsScreen from '@/screens/ConfessionsScreen';
import AudioLoungeScreen from '@/screens/AudioLoungeScreen';
import MoodVibeScreen from '@/screens/MoodVibeScreen';
import TopShopScreen from '@/screens/TopShopScreen';
import AdsScreen from '@/screens/AdsScreen';
import ProfileScreen from '@/screens/ProfileScreen';
import AdminScreen from '@/screens/AdminScreen';
import SwipeMatchScreen from '@/screens/SwipeMatchScreen';
import InstallPrompt from '@/components/InstallPrompt';

type AppView = 'main' | 'profile' | 'admin';

function AppContent() {
  const { user, loading } = useAuth();
  const [view, setView] = useState<AppView>('main');
  const [activeTab, setActiveTab] = useState<NavTab>('home');
  const [activePill, setActivePill] = useState<PillTag | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [pendingConversation, setPendingConversation] = useState<Conversation | null>(null);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 dark:bg-slate-950 light:bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-black tracking-tighter bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent mb-2">FLIP</h1>
          <p className="text-slate-500 text-sm animate-pulse">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) return <AuthScreen />;

  if (view === 'profile') {
    return (
      <ErrorBoundary fallbackLabel="Profile failed to load">
        <ProfileScreen onBack={() => setView('main')} onOpenAdmin={() => setView('admin')} />
      </ErrorBoundary>
    );
  }

  if (view === 'admin') {
    return (
      <ErrorBoundary fallbackLabel="Admin panel failed to load">
        <AdminScreen onBack={() => setView('main')} />
      </ErrorBoundary>
    );
  }

  const renderContent = () => {
    if (activePill) {
      switch (activePill) {
        case 'live': return <ErrorBoundary fallbackLabel="Live failed to load"><LiveScreen /></ErrorBoundary>;
        case 'game': return <ErrorBoundary fallbackLabel="Games failed to load"><GamesScreen /></ErrorBoundary>;
        case 'ads': return <ErrorBoundary fallbackLabel="Ads failed to load"><AdsScreen /></ErrorBoundary>;
        case 'topshop': return <ErrorBoundary fallbackLabel="Shop failed to load"><TopShopScreen /></ErrorBoundary>;
        case 'wallet': return <ErrorBoundary fallbackLabel="Wallet failed to load"><WalletScreen /></ErrorBoundary>;
        case 'audio': return <ErrorBoundary fallbackLabel="Audio Lounge failed to load"><AudioLoungeScreen /></ErrorBoundary>;
        case 'dating': return <ErrorBoundary fallbackLabel="Dating failed to load"><DatingScreen /></ErrorBoundary>;
        case 'cupid': return <ErrorBoundary fallbackLabel="Live failed to load"><LiveScreen /></ErrorBoundary>;
        case 'confession': return <ErrorBoundary fallbackLabel="Confessions failed to load"><ConfessionsScreen /></ErrorBoundary>;
        case 'mood': return <ErrorBoundary fallbackLabel="Mood & Vibe failed to load"><MoodVibeScreen /></ErrorBoundary>;
        default: return <ErrorBoundary fallbackLabel="Feed failed to load"><FeedPage searchQuery={searchQuery} /></ErrorBoundary>;
      }
    }
    switch (activeTab) {
      case 'home': return <ErrorBoundary fallbackLabel="Feed failed to load"><FeedPage searchQuery={searchQuery} /></ErrorBoundary>;
      case 'messages': return <ErrorBoundary fallbackLabel="Messages failed to load"><MessagesScreen initialConversation={pendingConversation} /></ErrorBoundary>;
      case 'friends': return <ErrorBoundary fallbackLabel="Friends failed to load"><FriendsScreen onOpenConversation={(conv: Conversation) => { setPendingConversation(conv); setActiveTab('messages'); setActivePill(null); }} /></ErrorBoundary>;
      case 'events': return <ErrorBoundary fallbackLabel="Events failed to load"><EventsScreen /></ErrorBoundary>;
      case 'reels': return <ErrorBoundary fallbackLabel="Reels failed to load"><ReelsScreen /></ErrorBoundary>;
      case 'stories': return <ErrorBoundary fallbackLabel="Stories failed to load"><StoriesScreen /></ErrorBoundary>;
      case 'swipematch': return <ErrorBoundary fallbackLabel="Swipe Match failed to load"><SwipeMatchScreen /></ErrorBoundary>;
      case 'blinddate': return <ErrorBoundary fallbackLabel="Blind Date failed to load"><BlindDateScreen /></ErrorBoundary>;
      default: return <ErrorBoundary fallbackLabel="Feed failed to load"><FeedPage searchQuery={searchQuery} /></ErrorBoundary>;
    }
  };

  return (
    <>
      <AppShell
        activeTab={activeTab}
        onTabChange={(tab) => { setActiveTab(tab); setActivePill(null); if (tab !== 'messages') setPendingConversation(null); }}
        activePill={activePill}
        onPillChange={setActivePill}
        onOpenProfile={() => setView('profile')}
        onOpenAdmin={() => setView('admin')}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      >
        {renderContent()}
      </AppShell>
    </>
  );
}

export default function App() {
  if (typeof window !== 'undefined' && window.__flipClearFallback) {
    window.__flipClearFallback();
  }

  return (
    <ThemeProvider>
      <AuthProvider>
        <ErrorBoundary>
          <AppContent />
        </ErrorBoundary>
        <InstallPrompt />
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 2500,
            style: {
              background: '#1e293b',
              color: '#f1f5f9',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '12px',
              fontSize: '13px',
            },
            success: { iconTheme: { primary: '#10b981', secondary: '#1e293b' } },
            error: { iconTheme: { primary: '#ef4444', secondary: '#1e293b' } },
          }}
        />
      </AuthProvider>
    </ThemeProvider>
  );
}
