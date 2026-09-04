import { useEffect, useState } from 'react';
import { Smile, Send } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import type { MoodVibe } from '@/types';

const MOODS = [
  { key: 'happy', label: 'Happy', color: '#f59e0b', emoji: '😊' },
  { key: 'excited', label: 'Excited', color: '#10b981', emoji: '🤩' },
  { key: 'calm', label: 'Calm', color: '#06b6d4', emoji: '😌' },
  { key: 'grateful', label: 'Grateful', color: '#14b8a6', emoji: '🙏' },
  { key: 'sad', label: 'Sad', color: '#3b82f6', emoji: '😢' },
  { key: 'anxious', label: 'Anxious', color: '#f97316', emoji: '😰' },
  { key: 'angry', label: 'Angry', color: '#ef4444', emoji: '😠' },
  { key: 'tired', label: 'Tired', color: '#64748b', emoji: '😴' },
];

const VIBES = ['chill', 'energetic', 'romantic', 'adventurous', 'creative', 'focused', 'social', 'cozy'];

function timeAgo(date: string) {
  const mins = Math.floor((Date.now() - new Date(date).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

export default function MoodVibeScreen() {
  const { profile } = useAuth();
  const [entries, setEntries] = useState<MoodVibe[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMood, setSelectedMood] = useState('happy');
  const [selectedVibe, setSelectedVibe] = useState('chill');
  const [note, setNote] = useState('');

  const fetchEntries = async () => {
    const { data } = await supabase
      .from('mood_vibes')
      .select('*, author:profiles!mood_vibes_user_id_fkey(*)')
      .order('created_at', { ascending: false })
      .limit(50);
    setEntries((data as unknown as MoodVibe[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchEntries(); }, []);

  const handleSubmit = async () => {
    if (!profile) return;
    const mood = MOODS.find((m) => m.key === selectedMood)!;
    const { data } = await supabase
      .from('mood_vibes')
      .insert({ user_id: profile.id, mood: selectedMood, vibe: selectedVibe, note: note.trim(), color: mood.color })
      .select('*, author:profiles!mood_vibes_user_id_fkey(*)')
      .single();
    if (data) {
      setEntries([data as unknown as MoodVibe, ...entries]);
      setNote('');
    }
  };

  if (loading) return <div className="text-center py-12 text-slate-500 text-sm">Loading mood vibes...</div>;

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Smile size={20} className="text-amber-400" />
        <h2 className="text-xl font-bold">Mood & Vibe</h2>
      </div>

      {/* Mood selector */}
      <div className="bg-slate-900 rounded-2xl border border-white/5 p-4 mb-4">
        <p className="text-xs font-semibold text-slate-400 mb-3">How are you feeling?</p>
        <div className="grid grid-cols-4 gap-2 mb-4">
          {MOODS.map((m) => (
            <button
              key={m.key}
              onClick={() => setSelectedMood(m.key)}
              className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${
                selectedMood === m.key ? 'bg-slate-800 ring-2' : 'hover:bg-slate-800'
              }`}
              style={selectedMood === m.key ? { boxShadow: `0 0 0 2px ${m.color}` } : {}}
            >
              <span className="text-2xl">{m.emoji}</span>
              <span className="text-[10px] text-slate-400">{m.label}</span>
            </button>
          ))}
        </div>
        <p className="text-xs font-semibold text-slate-400 mb-2">What's your vibe?</p>
        <div className="flex flex-wrap gap-2 mb-3">
          {VIBES.map((v) => (
            <button
              key={v}
              onClick={() => setSelectedVibe(v)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-full capitalize transition-all ${
                selectedVibe === v ? 'bg-amber-500 text-white' : 'bg-slate-800 text-slate-400'
              }`}
            >
              {v}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            placeholder="Add a note (optional)"
            className="flex-1 bg-slate-800 border border-white/10 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50"
          />
          <button onClick={handleSubmit} className="bg-amber-500 hover:bg-amber-400 rounded-full p-2.5 transition-colors">
            <Send size={16} />
          </button>
        </div>
      </div>

      {/* Feed */}
      {entries.length === 0 ? (
        <p className="text-slate-500 text-sm text-center py-8">No mood check-ins yet. Share how you feel!</p>
      ) : (
        <div className="space-y-2">
          {entries.map((entry) => {
            const mood = MOODS.find((m) => m.key === entry.mood);
            return (
              <div key={entry.id} className="bg-slate-900 rounded-2xl border border-white/5 p-3 flex items-center gap-3">
                <div className="w-11 h-11 rounded-full flex items-center justify-center text-xl flex-shrink-0" style={{ backgroundColor: `${entry.color}30` }}>
                  {mood?.emoji || '😊'}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">{entry.author?.display_name || 'User'}</span>
                    <span className="text-xs text-slate-500">· {timeAgo(entry.created_at)}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs capitalize" style={{ color: entry.color }}>{entry.mood}</span>
                    <span className="text-xs text-slate-500 capitalize">· {entry.vibe} vibe</span>
                  </div>
                  {entry.note && <p className="text-sm text-slate-300 mt-1">{entry.note}</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
