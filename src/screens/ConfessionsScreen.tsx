import { useEffect, useState } from 'react';
import { MessageSquare, Heart, Send, Plus, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { sanitizeFreeText } from '@/lib/security';
import type { Confession } from '@/types';

const MOODS = ['happy', 'sad', 'excited', 'anxious', 'grateful', 'lonely', 'neutral'];
const MOOD_COLORS: Record<string, string> = {
  happy: 'bg-amber-500/20 text-amber-400',
  sad: 'bg-blue-500/20 text-blue-400',
  excited: 'bg-emerald-500/20 text-emerald-400',
  anxious: 'bg-orange-500/20 text-orange-400',
  grateful: 'bg-teal-500/20 text-teal-400',
  lonely: 'bg-slate-500/20 text-slate-400',
  neutral: 'bg-slate-600/20 text-slate-300',
};

function timeAgo(date: string) {
  const mins = Math.floor((Date.now() - new Date(date).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

export default function ConfessionsScreen() {
  const { profile } = useAuth();
  const [confessions, setConfessions] = useState<Confession[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [content, setContent] = useState('');
  const [mood, setMood] = useState('neutral');

  const fetchConfessions = async () => {
    const { data } = await supabase
      .from('confessions')
      .select('*, author:profiles!confessions_user_id_fkey(*)')
      .order('created_at', { ascending: false })
      .limit(50);
    setConfessions((data as unknown as Confession[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchConfessions(); }, []);

  const handleCreate = async () => {
    if (!profile) return;
    const sanitized = sanitizeFreeText(content.trim());
    if (!sanitized) return;
    const safeMood = MOODS.includes(mood) ? mood : 'neutral';
    const { data } = await supabase
      .from('confessions')
      .insert({ user_id: profile.id, content: sanitized, mood: safeMood, is_anonymous: true })
      .select('*, author:profiles!confessions_user_id_fkey(*)')
      .single();
    if (data) {
      setConfessions([data as unknown as Confession, ...confessions]);
      setCreating(false);
      setContent('');
      setMood('neutral');
    }
  };

  const handleLike = async (conf: Confession) => {
    await supabase.from('confessions').update({ likes_count: conf.likes_count + 1 }).eq('id', conf.id);
    setConfessions((prev) => prev.map((c) => c.id === conf.id ? { ...c, likes_count: c.likes_count + 1 } : c));
  };

  if (loading) return <div className="text-center py-12 text-slate-500 text-sm">Loading confessions...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <MessageSquare size={20} className="text-cyan-400" />
          <h2 className="text-xl font-bold">Confessions</h2>
        </div>
        <button onClick={() => setCreating(true)} className="flex items-center gap-1.5 bg-cyan-500 hover:bg-cyan-400 text-white text-sm font-semibold px-4 py-2 rounded-full transition-colors">
          <Plus size={16} /> Confess
        </button>
      </div>

      {confessions.length === 0 ? (
        <p className="text-slate-500 text-sm text-center py-8">No confessions yet. Share something anonymously!</p>
      ) : (
        <div className="space-y-3">
          {confessions.map((conf) => (
            <div key={conf.id} className="bg-slate-900 rounded-2xl border border-white/5 p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center">
                  <span className="text-xs font-semibold text-slate-400">A</span>
                </div>
                <span className="text-xs text-slate-500">Anonymous · {timeAgo(conf.created_at)}</span>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${MOOD_COLORS[conf.mood] || MOOD_COLORS.neutral}`}>
                  {conf.mood}
                </span>
              </div>
              <p className="text-sm text-slate-200 whitespace-pre-wrap mb-3">{conf.content}</p>
              <button onClick={() => handleLike(conf)} className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-red-400 transition-colors">
                <Heart size={16} /> {conf.likes_count > 0 && conf.likes_count}
              </button>
            </div>
          ))}
        </div>
      )}

      {creating && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setCreating(false)}>
          <div className="bg-slate-900 rounded-3xl border border-white/10 p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">Anonymous Confession</h3>
              <button onClick={() => setCreating(false)}><X size={20} /></button>
            </div>
            <textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Share your secret..." rows={4} className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50 resize-none mb-3" />
            <div className="flex flex-wrap gap-2 mb-4">
              {MOODS.map((m) => (
                <button key={m} onClick={() => setMood(m)} className={`text-xs font-semibold px-3 py-1 rounded-full transition-all ${mood === m ? MOOD_COLORS[m] : 'bg-slate-800 text-slate-500'}`}>
                  {m}
                </button>
              ))}
            </div>
            <button onClick={handleCreate} disabled={!content.trim()} className="w-full bg-cyan-500 hover:bg-cyan-400 disabled:opacity-30 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2">
              <Send size={16} /> Post Anonymously
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
