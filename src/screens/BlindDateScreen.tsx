import { useEffect, useState } from 'react';
import { HeartHandshake, Sparkles, X, MessageCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import type { BlindDate, Profile } from '@/types';

const TOPICS = ['Travel dreams', 'Favorite food', 'Hidden talents', 'Life goals', 'Perfect day', 'Music taste', 'Childhood memory', 'Biggest adventure'];

export default function BlindDateScreen() {
  const { profile } = useAuth();
  const [activeDate, setActiveDate] = useState<BlindDate | null>(null);
  const [matchedUser, setMatchedUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [topic, setTopic] = useState('');
  const [matching, setMatching] = useState(false);

  const fetchActiveDate = async () => {
    if (!profile) return;
    const { data } = await supabase
      .from('blind_dates')
      .select('*')
      .or(`user1_id.eq.${profile.id},user2_id.eq.${profile.id}`)
      .in('status', ['waiting', 'matched', 'active'])
      .order('created_at', { ascending: false })
      .maybeSingle();
    setActiveDate(data as BlindDate | null);
    if (data && (data as BlindDate).user2_id) {
      const otherId = (data as BlindDate).user1_id === profile.id ? (data as BlindDate).user2_id : (data as BlindDate).user1_id;
      const { data: other } = await supabase.from('profiles').select('*').eq('id', otherId!).maybeSingle();
      setMatchedUser(other as Profile | null);
    }
    setLoading(false);
  };

  useEffect(() => { fetchActiveDate(); }, [profile]);

  const handleStart = async () => {
    if (!profile) return;
    setMatching(true);
    // Try to find a waiting blind date from another user
    const { data: waiting } = await supabase
      .from('blind_dates')
      .select('*')
      .eq('status', 'waiting')
      .neq('user1_id', profile.id)
      .limit(1)
      .maybeSingle();

    if (waiting) {
      const w = waiting as BlindDate;
      await supabase.from('blind_dates').update({ user2_id: profile.id, status: 'matched' }).eq('id', w.id);
      const { data: other } = await supabase.from('profiles').select('*').eq('id', w.user1_id).maybeSingle();
      setMatchedUser(other as Profile | null);
      setActiveDate({ ...w, user2_id: profile.id, status: 'matched' });
    } else {
      const { data } = await supabase
        .from('blind_dates')
        .insert({ user1_id: profile.id, status: 'waiting', topic: topic || TOPICS[Math.floor(Math.random() * TOPICS.length)] })
        .select('*')
        .single();
      setActiveDate(data as BlindDate);
    }
    setMatching(false);
    setTopic('');
  };

  const handleEnd = async () => {
    if (!activeDate) return;
    await supabase.from('blind_dates').update({ status: 'completed' }).eq('id', activeDate.id);
    setActiveDate(null);
    setMatchedUser(null);
  };

  if (loading) return <div className="text-center py-12 text-slate-500 text-sm">Loading...</div>;

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <HeartHandshake size={20} className="text-rose-400" />
        <h2 className="text-xl font-bold">Blind Date</h2>
      </div>

      {!activeDate ? (
        <div className="text-center py-12">
          <div className="w-24 h-24 mx-auto bg-gradient-to-br from-rose-500/20 to-pink-500/10 rounded-full flex items-center justify-center mb-4">
            <Sparkles size={40} className="text-rose-400" />
          </div>
          <h3 className="text-lg font-bold mb-2">Ready for a Blind Date?</h3>
          <p className="text-slate-400 text-sm mb-6 max-w-xs mx-auto">Get matched with someone new. You won't see their profile until you're connected!</p>
          <div className="max-w-xs mx-auto mb-4">
            <select value={topic} onChange={(e) => setTopic(e.target.value)} className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/50">
              <option value="">Random topic</option>
              {TOPICS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <button onClick={handleStart} disabled={matching} className="bg-rose-500 hover:bg-rose-400 disabled:opacity-50 text-white font-semibold px-8 py-3 rounded-full transition-colors">
            {matching ? 'Finding a match...' : 'Start Blind Date'}
          </button>
        </div>
      ) : activeDate.status === 'waiting' ? (
        <div className="text-center py-16">
          <div className="w-20 h-20 mx-auto bg-rose-500/20 rounded-full flex items-center justify-center mb-4 animate-pulse">
            <HeartHandshake size={36} className="text-rose-400" />
          </div>
          <h3 className="text-lg font-bold mb-2">Waiting for a match...</h3>
          <p className="text-slate-400 text-sm mb-4">Topic: {activeDate.topic}</p>
          <button onClick={handleEnd} className="text-slate-400 hover:text-red-400 text-sm">Cancel</button>
        </div>
      ) : (
        <div className="bg-gradient-to-br from-rose-500/10 to-pink-500/5 rounded-3xl border border-rose-500/20 p-6 text-center">
          <div className="w-20 h-20 mx-auto bg-rose-500/20 rounded-full flex items-center justify-center mb-3">
            <Sparkles size={32} className="text-rose-400" />
          </div>
          <h3 className="text-lg font-bold mb-1">You're matched!</h3>
          <p className="text-slate-400 text-sm mb-2">Say hi to {matchedUser?.display_name || 'your date'}</p>
          <div className="bg-rose-500/10 rounded-xl p-3 mb-4">
            <p className="text-xs text-rose-300 mb-1">Today's topic</p>
            <p className="text-sm font-semibold">{activeDate.topic}</p>
          </div>
          <div className="flex gap-2 justify-center">
            <button className="flex items-center gap-1.5 bg-rose-500 hover:bg-rose-400 text-white text-sm font-semibold px-5 py-2.5 rounded-full transition-colors">
              <MessageCircle size={16} /> Start Chatting
            </button>
            <button onClick={handleEnd} className="bg-slate-800 text-slate-400 hover:text-white text-sm font-semibold px-5 py-2.5 rounded-full transition-colors">
              End Date
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
