import { useEffect, useState } from 'react';
import { ArrowLeft, Edit, Coins, Calendar, Settings, Shield, LogOut, Save, X, Camera, Bell, Bug, Ban, Trash2, BookOpen, Heart, Check } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { NotificationToggles } from '@/components/NotificationCenter';
import type { Post, Profile, Story, BlockedUser } from '@/types';
import VerifiedBadge from '@/components/VerifiedBadge';

type ProfileTab = 'posts' | 'stories' | 'bookmarks';

export default function ProfileScreen({ onBack, onOpenAdmin }: { onBack: () => void; onOpenAdmin: () => void }) {
  const { profile, signOut, refreshProfile } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [myStories, setMyStories] = useState<Story[]>([]);
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [tab, setTab] = useState<ProfileTab>('posts');
  const [bookmarkedPosts, setBookmarkedPosts] = useState<Post[]>([]);
  const [bugReportOpen, setBugReportOpen] = useState(false);
  const [bugTitle, setBugTitle] = useState('');
  const [bugDesc, setBugDesc] = useState('');
  const [bugCategory, setBugCategory] = useState<'bug' | 'feature' | 'security' | 'other'>('bug');
  const [bugSubmitted, setBugSubmitted] = useState(false);
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [showBlocked, setShowBlocked] = useState(false);
  const [notifEnabled, setNotifEnabled] = useState(true);
  const [saveMsg, setSaveMsg] = useState('');

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name);
      setBio(profile.bio);
      setCoverUrl(profile.cover_photo_url || '');
      setAvatarUrl(profile.avatar_url || '');
      setNotifEnabled(profile.notif_enabled);
      (async () => {
        const { data: postData } = await supabase
          .from('posts')
          .select('*')
          .eq('user_id', profile.id)
          .order('created_at', { ascending: false });
        setPosts((postData as Post[]) || []);

        const { data: storyData } = await supabase
          .from('stories')
          .select('*')
          .eq('user_id', profile.id)
          .order('created_at', { ascending: false });
        setMyStories((storyData as unknown as Story[]) || []);

        const { data: bookmarks } = await supabase
          .from('post_bookmarks')
          .select('post:posts(*)')
          .eq('user_id', profile.id)
          .order('created_at', { ascending: false });
        setBookmarkedPosts(((bookmarks as unknown as { post: Post }[]) || []).map((b) => b.post));

        const { data: blocked } = await supabase
          .from('blocked_users')
          .select('*, profile:profiles!blocked_users_blocked_id_fkey(*)')
          .eq('blocker_id', profile.id);
        setBlockedUsers((blocked as unknown as BlockedUser[]) || []);
      })();
    }
  }, [profile]);

  const handleSave = async () => {
    if (!profile) return;
    await supabase.from('profiles').update({
      display_name: displayName,
      bio,
      cover_photo_url: coverUrl,
      avatar_url: avatarUrl,
      notif_enabled: notifEnabled,
    }).eq('id', profile.id);
    await refreshProfile();
    setEditing(false);
    setSaveMsg('Profile updated!');
    setTimeout(() => setSaveMsg(''), 2000);
  };

  const handleUnblock = async (blockedId: string) => {
    if (!profile) return;
    await supabase.from('blocked_users').delete().eq('blocker_id', profile.id).eq('blocked_id', blockedId);
    setBlockedUsers((prev) => prev.filter((b) => b.blocked_id !== blockedId));
  };

  const handleBugReport = async () => {
    if (!profile || !bugTitle.trim() || !bugDesc.trim()) return;
    await supabase.from('bug_reports').insert({
      reporter_id: profile.id,
      title: bugTitle.trim(),
      description: bugDesc.trim(),
      category: bugCategory,
    });
    setBugSubmitted(true);
    setTimeout(() => {
      setBugReportOpen(false);
      setBugSubmitted(false);
      setBugTitle('');
      setBugDesc('');
      setBugCategory('bug');
    }, 1500);
  };

  const handleDeletePost = async (postId: string) => {
    if (!profile) return;
    await supabase.from('posts').delete().eq('id', postId).eq('user_id', profile.id);
    setPosts((prev) => prev.filter((p) => p.id !== postId));
  };

  if (!profile) return null;

  const AUTHORIZED_ADMIN_EMAILS = [
    'fransiscomanongi@gmail.com',
    'ff7739537@gmail.com',
    'adamufrank55@gmail.com',
  ];
  const isAdmin =
    (profile.role === 'admin' || profile.role === 'moderator') &&
    AUTHORIZED_ADMIN_EMAILS.includes(profile.email?.toLowerCase() ?? '');

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="sticky top-0 z-40 bg-slate-900/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-3">
          <button onClick={onBack} className="p-2 rounded-full hover:bg-white/10 transition-colors">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-lg font-bold flex-1">Profile</h1>
          <button onClick={() => setEditing(!editing)} className="p-2 rounded-full hover:bg-white/10 transition-colors">
            {editing ? <X size={20} /> : <Edit size={20} />}
          </button>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6 pb-24">
        {/* Cover photo */}
        <div className="relative h-32 rounded-3xl overflow-hidden bg-gradient-to-r from-emerald-500/30 to-cyan-500/20 mb-12">
          {coverUrl ? (
            <img src={coverUrl} alt="" className="w-full h-full object-cover" />
          ) : null}
          {editing && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <input
                value={coverUrl}
                onChange={(e) => setCoverUrl(e.target.value)}
                placeholder="Cover photo URL..."
                className="bg-slate-800/80 border border-white/20 rounded-full px-4 py-2 text-xs w-48 focus:outline-none"
              />
            </div>
          )}
        </div>

        {/* Avatar + info */}
        <div className="flex items-end gap-4 -mt-20 mb-4 relative">
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="w-24 h-24 rounded-full object-cover border-4 border-slate-950" />
          ) : (
            <div className="w-24 h-24 rounded-full bg-emerald-500/20 flex items-center justify-center text-3xl font-bold text-emerald-400 border-4 border-slate-950">
              {profile.display_name.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="flex-1 pb-2">
            {editing ? (
              <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/50 mb-1" />
            ) : (
              <h2 className="text-xl font-bold flex items-center gap-1">{profile.display_name} <VerifiedBadge profile={profile} size={16} /></h2>
            )}
            <p className="text-sm text-slate-400">{profile.email}</p>
          </div>
        </div>

        {/* Role badges */}
        <div className="flex items-center gap-2 mb-4">
          <span className={`text-xs px-2 py-0.5 rounded-full ${
            profile.role === 'admin' ? 'bg-amber-500/20 text-amber-400' :
            profile.role === 'moderator' ? 'bg-cyan-500/20 text-cyan-400' :
            'bg-slate-700 text-slate-400'
          }`}>{profile.role}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full ${
            profile.status === 'active' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
          }`}>{profile.status}</span>
        </div>

        {/* Bio */}
        {editing ? (
          <>
            <textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Bio" rows={2} className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 resize-none mb-3" />
            <div className="mb-3">
              <label className="text-xs text-slate-400">Avatar URL</label>
              <input value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} placeholder="https://..." className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-emerald-500/50" />
            </div>
            <button onClick={handleSave} className="w-full bg-emerald-500 hover:bg-emerald-400 text-white font-semibold py-2 rounded-xl text-sm transition-colors flex items-center justify-center gap-2">
              <Save size={16} /> Save Changes
            </button>
          </>
        ) : (
          <p className="text-sm text-slate-300 mb-4">{profile.bio || 'No bio yet. Click edit to add one.'}</p>
        )}

        {saveMsg && <p className="text-center text-sm text-emerald-400 font-medium mb-3">{saveMsg}</p>}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-slate-900 rounded-2xl border border-white/5 p-4 text-center">
            <p className="text-2xl font-bold text-emerald-400">{posts.length}</p>
            <p className="text-xs text-slate-500">Posts</p>
          </div>
          <div className="bg-slate-900 rounded-2xl border border-white/5 p-4 text-center">
            <p className="text-2xl font-bold text-amber-400">{profile.coins}</p>
            <p className="text-xs text-slate-500">Coins</p>
          </div>
          <div className="bg-slate-900 rounded-2xl border border-white/5 p-4 text-center">
            <p className="text-2xl font-bold text-cyan-400">
              {Math.floor((Date.now() - new Date(profile.created_at).getTime()) / 86400000)}
            </p>
            <p className="text-xs text-slate-500">Days</p>
          </div>
        </div>

        {/* Content tabs */}
        <div className="flex gap-2 mb-4">
          {([
            { key: 'posts', label: 'Posts', icon: <Edit size={14} /> },
            { key: 'stories', label: 'Stories', icon: <BookOpen size={14} /> },
            { key: 'bookmarks', label: 'Bookmarks', icon: <Heart size={14} /> },
          ] as { key: ProfileTab; label: string; icon: React.ReactNode }[]).map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                tab === t.key ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-400'
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {tab === 'posts' && (
          <div className="space-y-2 mb-4">
            {posts.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-8">No posts yet.</p>
            ) : posts.map((post) => (
              <div key={post.id} className="bg-slate-900 rounded-xl border border-white/5 p-3 group">
                <p className="text-sm text-slate-200">{post.content}</p>
                <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                  <span>{post.likes_count} likes</span>
                  <span>{post.comments_count} comments</span>
                  <span>{new Date(post.created_at).toLocaleDateString()}</span>
                  <button onClick={() => handleDeletePost(post.id)} className="ml-auto opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 transition-all">
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'stories' && (
          <div className="space-y-2 mb-4">
            {myStories.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-8">No stories yet.</p>
            ) : myStories.map((story) => (
              <div key={story.id} className="bg-slate-900 rounded-xl border border-white/5 p-3">
                <p className="text-sm font-semibold">{story.caption}</p>
                <div className="flex items-center gap-2 mt-1">
                  {story.is_draft ? (
                    <span className="text-[10px] bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full">Draft</span>
                  ) : (
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full">Published</span>
                  )}
                  <span className="text-xs text-slate-500">{story.views_count} views</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'bookmarks' && (
          <div className="space-y-2 mb-4">
            {bookmarkedPosts.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-8">No bookmarked posts.</p>
            ) : bookmarkedPosts.map((post) => (
              <div key={post.id} className="bg-slate-900 rounded-xl border border-white/5 p-3">
                <p className="text-sm text-slate-200">{post.content}</p>
                <p className="text-xs text-slate-500 mt-1">{post.likes_count} likes · {new Date(post.created_at).toLocaleDateString()}</p>
              </div>
            ))}
          </div>
        )}

        {/* Settings section */}
        <div className="space-y-2 mb-4">
          <h3 className="text-xs font-bold text-slate-500 uppercase px-1">Settings</h3>

          {/* Notification toggle */}
          <div className="flex items-center gap-3 bg-slate-900 rounded-xl border border-white/5 p-3">
            <Bell size={18} className="text-emerald-400" />
            <span className="text-sm flex-1">Notifications</span>
            <button
              onClick={async () => {
                const newVal = !notifEnabled;
                setNotifEnabled(newVal);
                await supabase.from('profiles').update({ notif_enabled: newVal }).eq('id', profile.id);
              }}
              className={`w-10 h-6 rounded-full transition-colors relative ${notifEnabled ? 'bg-emerald-500' : 'bg-slate-700'}`}
            >
              <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${notifEnabled ? 'left-4' : 'left-0.5'}`} />
            </button>
          </div>

          {/* Granular notification toggles */}
          <NotificationToggles />

          {/* Bug report */}
          <button
            onClick={() => setBugReportOpen(true)}
            className="w-full flex items-center gap-3 bg-slate-900 rounded-xl border border-white/5 p-3 hover:bg-slate-800 transition-colors"
          >
            <Bug size={18} className="text-orange-400" />
            <span className="text-sm flex-1 text-left">Report a Bug</span>
          </button>

          {/* Blocked users */}
          <button
            onClick={() => setShowBlocked(!showBlocked)}
            className="w-full flex items-center gap-3 bg-slate-900 rounded-xl border border-white/5 p-3 hover:bg-slate-800 transition-colors"
          >
            <Ban size={18} className="text-red-400" />
            <span className="text-sm flex-1 text-left">Blocked Users ({blockedUsers.length})</span>
          </button>
          {showBlocked && (
            <div className="bg-slate-900 rounded-xl border border-white/5 p-3 space-y-2">
              {blockedUsers.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-2">No blocked users.</p>
              ) : blockedUsers.map((b) => (
                <div key={b.id} className="flex items-center gap-2">
                  {b.profile?.avatar_url ? (
                    <img src={b.profile.avatar_url} alt="" className="w-7 h-7 rounded-full object-cover" />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center text-xs font-semibold">
                      {b.profile?.display_name?.charAt(0) || 'U'}
                    </div>
                  )}
                  <span className="text-sm flex-1">{b.profile?.display_name || 'User'}</span>
                  <button onClick={() => handleUnblock(b.blocked_id)} className="text-xs text-emerald-400 hover:text-emerald-300 font-medium">
                    Unblock
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Coin balance */}
          <div className="flex items-center gap-3 bg-slate-900 rounded-xl border border-white/5 p-3">
            <Coins size={18} className="text-amber-400" />
            <span className="text-sm flex-1">Coin Balance</span>
            <span className="text-sm font-semibold">{profile.coins}</span>
          </div>

          {/* Joined date */}
          <div className="flex items-center gap-3 bg-slate-900 rounded-xl border border-white/5 p-3">
            <Calendar size={18} className="text-cyan-400" />
            <span className="text-sm flex-1">Joined</span>
            <span className="text-xs text-slate-500">{new Date(profile.created_at).toLocaleDateString()}</span>
          </div>

          {/* Admin button */}
          {isAdmin && (
            <button onClick={onOpenAdmin} className="w-full flex items-center gap-3 bg-gradient-to-r from-amber-500/10 to-orange-500/10 rounded-xl border border-amber-500/20 p-3 hover:border-amber-500/40 transition-all">
              <Shield size={18} className="text-amber-400" />
              <span className="text-sm font-semibold flex-1 text-left">FLIP Admin Master</span>
              <Settings size={16} className="text-amber-400" />
            </button>
          )}

          {/* Sign out */}
          <button onClick={signOut} className="w-full flex items-center gap-3 bg-red-500/10 rounded-xl border border-red-500/20 p-3 hover:bg-red-500/20 transition-colors">
            <LogOut size={18} className="text-red-400" />
            <span className="text-sm font-semibold text-red-400">Sign Out</span>
          </button>
        </div>
      </div>

      {/* Bug Report Modal */}
      {bugReportOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setBugReportOpen(false)}>
          <div className="bg-slate-900 rounded-3xl border border-white/10 p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            {bugSubmitted ? (
              <div className="text-center py-6">
                <div className="w-16 h-16 mx-auto bg-emerald-500/20 rounded-full flex items-center justify-center mb-3">
                  <Check size={32} className="text-emerald-400" />
                </div>
                <h3 className="text-lg font-bold">Report Submitted!</h3>
                <p className="text-sm text-slate-400 mt-1">Thank you for your feedback.</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold flex items-center gap-2">
                    <Bug size={18} className="text-orange-400" /> Report a Bug
                  </h3>
                  <button onClick={() => setBugReportOpen(false)}><X size={20} /></button>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-slate-400">Title</label>
                    <input value={bugTitle} onChange={(e) => setBugTitle(e.target.value)} placeholder="Brief title..." className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-2.5 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-emerald-500/50" />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400">Category</label>
                    <select value={bugCategory} onChange={(e) => setBugCategory(e.target.value as 'bug' | 'feature' | 'security' | 'other')} className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-2.5 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-emerald-500/50">
                      <option value="bug">Bug</option>
                      <option value="feature">Feature Request</option>
                      <option value="security">Security Issue</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-slate-400">Description</label>
                    <textarea value={bugDesc} onChange={(e) => setBugDesc(e.target.value)} placeholder="Describe the issue..." rows={4} className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-2.5 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 resize-none" />
                  </div>
                  <button onClick={handleBugReport} disabled={!bugTitle.trim() || !bugDesc.trim()} className="w-full bg-orange-500 hover:bg-orange-400 disabled:opacity-30 text-white font-semibold py-3 rounded-xl transition-colors">
                    Submit Report
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
