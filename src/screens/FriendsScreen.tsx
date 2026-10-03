import { useEffect, useState } from 'react';
import { Users, UserPlus, Check, X, Clock, Search, MessageCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import type { Conversation, Friend, Profile } from '@/types';
import VerifiedBadge from '@/components/VerifiedBadge';

interface FriendsScreenProps {
  onOpenConversation?: (conv: Conversation) => void;
}

export default function FriendsScreen({ onOpenConversation }: FriendsScreenProps = {}) {
  const { profile } = useAuth();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [requests, setRequests] = useState<Friend[]>([]);
  const [allUsers, setAllUsers] = useState<Profile[]>([]);
  const [tab, setTab] = useState<'friends' | 'requests' | 'directory'>('friends');
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchData = async () => {
    if (!profile) return;
    const { data: allFriends } = await supabase
      .from('friends')
      .select('*, addressee:profiles!friends_addressee_id_fkey(*), requester:profiles!friends_requester_id_fkey(*)')
      .or(`requester_id.eq.${profile.id},addressee_id.eq.${profile.id}`);
    const all = (allFriends || []) as unknown as Array<Record<string, unknown>>;
    const accepted: Friend[] = [];
    const pending: Friend[] = [];
    all.forEach((f) => {
      const req = f.requester as Profile;
      const addr = f.addressee as Profile;
      const other = req?.id === profile.id ? addr : req;
      const friend = { ...f, profile: other } as Friend;
      if (f.status === 'accepted') accepted.push(friend);
      else if (f.status === 'pending' && f.addressee_id === profile.id) pending.push(friend);
    });
    setFriends(accepted);
    setRequests(pending);

    const friendIds = new Set(all.map((f) => (f.requester_id === profile.id ? f.addressee_id : f.requester_id)));
    const pendingSentIds = new Set(
      all.filter((f) => f.status === 'pending' && f.requester_id === profile.id).map((f) => f.addressee_id)
    );
    const { data: users } = await supabase.from('profiles').select('*').neq('id', profile.id).limit(100);
    setAllUsers((users as Profile[] || []).filter((u) => !friendIds.has(u.id) && !pendingSentIds.has(u.id)));
    setLoading(false);
  };

  useEffect(() => { if (profile) fetchData(); }, [profile]);

  const handleAddFriend = async (userId: string) => {
    if (!profile) return;
    await supabase.from('friends').insert({ requester_id: profile.id, addressee_id: userId, status: 'pending' });
    toast.success('Friend request sent!');
    fetchData();
  };

  const startConversationWith = async (otherUser: Profile): Promise<Conversation | null> => {
    if (!profile) return null;
    const u1 = profile.id < otherUser.id ? profile.id : otherUser.id;
    const u2 = profile.id < otherUser.id ? otherUser.id : profile.id;
    const { data } = await supabase
      .from('conversations')
      .upsert({ user1_id: u1, user2_id: u2 }, { onConflict: 'user1_id,user2_id' })
      .select('*, user1:profiles!conversations_user1_id_fkey(*), user2:profiles!conversations_user2_id_fkey(*)')
      .single();
    if (data) {
      const c = data as Record<string, unknown>;
      const u1p = c.user1 as Profile;
      const u2p = c.user2 as Profile;
      const other = u1p?.id === profile.id ? u2p : u1p;
      return { ...c, other_user: other } as Conversation;
    }
    return null;
  };

  const handleAccept = async (friendId: string, otherUser?: Profile) => {
    await supabase.from('friends').update({ status: 'accepted' }).eq('id', friendId);
    toast.success('Friend request accepted!');
    if (otherUser && onOpenConversation) {
      const conv = await startConversationWith(otherUser);
      if (conv) {
        toast.success(`You can now chat with ${otherUser.display_name}!`);
        onOpenConversation(conv);
      }
    }
    fetchData();
  };

  const handleReject = async (friendId: string) => {
    await supabase.from('friends').delete().eq('id', friendId);
    fetchData();
  };

  const handleMessageFriend = async (friend: Friend) => {
    if (!friend.profile || !onOpenConversation) return;
    const conv = await startConversationWith(friend.profile);
    if (conv) onOpenConversation(conv);
  };

  const filteredDirectory = allUsers.filter(
    (u) =>
      u.display_name.toLowerCase().includes(search.toLowerCase()) ||
      (u.bio || '').toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="text-center py-12 text-slate-500 text-sm">Loading friends...</div>;

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Users size={20} className="text-emerald-400" />
        <h2 className="text-xl font-bold">Friends</h2>
      </div>

      <div className="flex gap-2 mb-4">
        {(['friends', 'requests', 'directory'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold capitalize transition-all ${
              tab === t ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-400'
            }`}
          >
            {t} {t === 'requests' && requests.length > 0 && `(${requests.length})`}
          </button>
        ))}
      </div>

      {tab === 'friends' && (
        friends.length === 0 ? (
          <p className="text-slate-500 text-sm text-center py-8">No friends yet. Add some from the Directory!</p>
        ) : (
          <div className="space-y-2">
            {friends.map((f) => (
              <div key={f.id} className="bg-slate-900 rounded-xl border border-white/5 p-3 flex items-center gap-3">
                {f.profile?.avatar_url ? (
                  <img src={f.profile.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-sm font-semibold">
                    {f.profile?.display_name?.charAt(0) || 'U'}
                  </div>
                )}
                <div className="flex-1">
                  <div className="flex items-center gap-1">
                    <p className="text-sm font-semibold">{f.profile?.display_name || 'User'}</p>
                    <VerifiedBadge profile={f.profile} size={13} />
                  </div>
                  <p className="text-xs text-slate-500">{f.profile?.bio || 'No bio'}</p>
                </div>
                <button
                  onClick={() => handleMessageFriend(f)}
                  className="text-emerald-400 text-xs font-semibold px-3 py-1.5 rounded-full bg-emerald-500/10 hover:bg-emerald-500/20 transition-colors flex items-center gap-1"
                >
                  <MessageCircle size={14} /> Message
                </button>
              </div>
            ))}
          </div>
        )
      )}

      {tab === 'requests' && (
        requests.length === 0 ? (
          <p className="text-slate-500 text-sm text-center py-8">No pending requests.</p>
        ) : (
          <div className="space-y-2">
            {requests.map((r) => (
              <div key={r.id} className="bg-slate-900 rounded-xl border border-white/5 p-3 flex items-center gap-3">
                {r.profile?.avatar_url ? (
                  <img src={r.profile.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-sm font-semibold">
                    {r.profile?.display_name?.charAt(0) || 'U'}
                  </div>
                )}
                <div className="flex-1">
                  <div className="flex items-center gap-1">
                    <p className="text-sm font-semibold">{r.profile?.display_name || 'User'}</p>
                    <VerifiedBadge profile={r.profile} size={13} />
                  </div>
                  <p className="text-xs text-slate-500 flex items-center gap-1"><Clock size={10} /> Wants to be friends</p>
                </div>
                <button
                  onClick={() => handleAccept(r.id, r.profile || undefined)}
                  className="bg-emerald-500 hover:bg-emerald-400 p-2 rounded-full transition-colors"
                  title="Accept & chat"
                >
                  <Check size={16} />
                </button>
                <button onClick={() => handleReject(r.id)} className="bg-red-500/20 hover:bg-red-500/30 text-red-400 p-2 rounded-full transition-colors">
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
        )
      )}

      {tab === 'directory' && (
        <>
          <div className="relative mb-3">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search people on FLIP..."
              className="w-full bg-slate-800 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
          </div>
          {filteredDirectory.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-8">No people found.</p>
          ) : (
            <div className="space-y-2">
              {filteredDirectory.map((u) => (
                <div key={u.id} className="bg-slate-900 rounded-xl border border-white/5 p-3 flex items-center gap-3">
                  {u.avatar_url ? (
                    <img src={u.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-sm font-semibold">
                      {u.display_name.charAt(0)}
                    </div>
                  )}
                  <div className="flex-1">
                    <div className="flex items-center gap-1">
                      <p className="text-sm font-semibold">{u.display_name}</p>
                      <VerifiedBadge profile={u} size={13} />
                    </div>
                    <p className="text-xs text-slate-500">{u.bio || 'No bio'}</p>
                  </div>
                  <button
                    onClick={() => handleAddFriend(u.id)}
                    className="bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 text-xs font-semibold px-3 py-1.5 rounded-full flex items-center gap-1 transition-colors"
                  >
                    <UserPlus size={12} /> Add
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
