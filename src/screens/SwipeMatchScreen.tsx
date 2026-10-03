import { useEffect, useState } from 'react';
import { Heart, X, Sparkles, Undo2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import type { Profile } from '@/types';

export default function SwipeMatchScreen() {
  const { profile } = useAuth();
  const [candidates, setCandidates] = useState<Profile[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [matchResult, setMatchResult] = useState<'like' | 'pass' | null>(null);
  const [matched, setMatched] = useState<Profile | null>(null);

  useEffect(() => {
    (async () => {
      if (!profile) return;
      // Get all users except self and existing friends
      const { data: friends } = await supabase
        .from('friends')
        .select('requester_id, addressee_id')
        .or(`requester_id.eq.${profile.id},addressee_id.eq.${profile.id}`);
      const friendIds = new Set<string>();
      (friends || []).forEach((f: { requester_id: string; addressee_id: string }) => {
        if (f.requester_id === profile.id) friendIds.add(f.addressee_id);
        else friendIds.add(f.requester_id);
      });
      friendIds.add(profile.id);

      const { data: users } = await supabase
        .from('profiles')
        .select('*')
        .neq('id', profile.id)
        .limit(20);
      const filtered = (users as Profile[] || []).filter((u) => !friendIds.has(u.id));
      setCandidates(filtered);
      setLoading(false);
    })();
  }, [profile]);

  const current = candidates[currentIdx];

  const handleSwipe = (action: 'like' | 'pass') => {
    if (!current || !profile) return;
    setMatchResult(action);

    if (action === 'like') {
      // Send a friend request as a "match"
      supabase.from('friends').insert({
        requester_id: profile.id,
        addressee_id: current.id,
        status: 'pending',
      }).then(() => {
        // 30% chance to show a "match" animation
        if (Math.random() > 0.7) {
          setMatched(current);
        }
      });
    }

    setTimeout(() => {
      setMatchResult(null);
      setCurrentIdx((prev) => prev + 1);
    }, 400);
  };

  const handleUndo = () => {
    if (currentIdx > 0) {
      setCurrentIdx(currentIdx - 1);
      setMatchResult(null);
    }
  };

  if (loading) return <div className="text-center py-12 text-slate-500 text-sm">Loading profiles...</div>;

  if (matched) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="w-32 h-32 rounded-full bg-gradient-to-br from-rose-500 to-pink-500 flex items-center justify-center mb-4 animate-pulse">
          <Sparkles size={48} className="text-white" />
        </div>
        <h2 className="text-2xl font-black mb-2">It's a Match!</h2>
        <p className="text-slate-400 text-sm mb-1">You liked {matched.display_name}</p>
        {matched.avatar_url && (
          <img src={matched.avatar_url} alt="" className="w-20 h-20 rounded-full object-cover mt-2" />
        )}
        <button
          onClick={() => { setMatched(null); setCurrentIdx(currentIdx + 1); }}
          className="mt-6 bg-rose-500 hover:bg-rose-400 text-white font-semibold px-8 py-3 rounded-full transition-colors"
        >
          Keep Swiping
        </button>
      </div>
    );
  }

  if (!current || currentIdx >= candidates.length) {
    return (
      <div className="text-center py-16">
        <Heart size={48} className="mx-auto text-slate-600 mb-3" />
        <p className="text-slate-500 text-sm mb-4">No more profiles to swipe. Check back later!</p>
        <button onClick={() => setCurrentIdx(0)} className="bg-slate-800 hover:bg-slate-700 text-white text-sm font-semibold px-6 py-2 rounded-full transition-colors">
          Refresh
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center pt-4">
      <div className="flex items-center gap-2 mb-6">
        <Heart size={20} className="text-rose-400" />
        <h2 className="text-xl font-bold">Swipe Match</h2>
      </div>

      {/* Card */}
      <div className="relative w-full max-w-sm">
        <div
          className={`relative aspect-[3/4] rounded-3xl overflow-hidden bg-slate-900 border border-white/10 transition-transform duration-300 ${
            matchResult === 'like' ? 'translate-x-[150%] rotate-12 opacity-0' :
            matchResult === 'pass' ? '-translate-x-[150%] -rotate-12 opacity-0' : ''
          }`}
        >
          {current.avatar_url ? (
            <img src={current.avatar_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-emerald-500/20 to-cyan-500/10 flex items-center justify-center">
              <span className="text-6xl font-black text-emerald-400/30">
                {current.display_name.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-5">
            <h3 className="text-xl font-bold text-white">{current.display_name}</h3>
            {current.bio && <p className="text-sm text-slate-300 mt-1 line-clamp-2">{current.bio}</p>}
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full">
                {current.coins} coins
              </span>
              <span className="text-xs text-slate-400">
                {Math.floor((Date.now() - new Date(current.created_at).getTime()) / 86400000)} days ago
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-4 mt-6">
        <button
          onClick={handleUndo}
          disabled={currentIdx === 0}
          className="w-12 h-12 rounded-full bg-slate-800 hover:bg-slate-700 disabled:opacity-30 flex items-center justify-center transition-colors"
        >
          <Undo2 size={20} className="text-slate-300" />
        </button>
        <button
          onClick={() => handleSwipe('pass')}
          className="w-16 h-16 rounded-full bg-red-500/20 hover:bg-red-500/30 border-2 border-red-500/40 flex items-center justify-center transition-all hover:scale-110"
        >
          <X size={28} className="text-red-400" />
        </button>
        <button
          onClick={() => handleSwipe('like')}
          className="w-16 h-16 rounded-full bg-emerald-500/20 hover:bg-emerald-500/30 border-2 border-emerald-500/40 flex items-center justify-center transition-all hover:scale-110"
        >
          <Heart size={28} className="text-emerald-400" />
        </button>
      </div>
    </div>
  );
}
