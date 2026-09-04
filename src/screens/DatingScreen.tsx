import { useEffect, useState } from 'react';
import { Heart, Users, Radio, Plus, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import type { DatingRoom } from '@/types';

export default function DatingScreen() {
  const { profile } = useAuth();
  const [rooms, setRooms] = useState<DatingRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', age_range: '18-35' });

  const fetchRooms = async () => {
    const { data } = await supabase
      .from('dating_rooms')
      .select('*, host:profiles!dating_rooms_host_id_fkey(*)')
      .eq('is_active', true)
      .order('created_at', { ascending: false });
    setRooms((data as unknown as DatingRoom[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchRooms(); }, []);

  const handleCreate = async () => {
    if (!profile || !form.title) return;
    await supabase.from('dating_rooms').insert({ host_id: profile.id, title: form.title, description: form.description, age_range: form.age_range });
    setCreating(false);
    setForm({ title: '', description: '', age_range: '18-35' });
    fetchRooms();
  };

  if (loading) return <div className="text-center py-12 text-slate-500 text-sm">Loading dating rooms...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Heart size={20} className="text-rose-400" />
          <h2 className="text-xl font-bold">Dating Rooms</h2>
        </div>
        <button onClick={() => setCreating(true)} className="flex items-center gap-1.5 bg-rose-500 hover:bg-rose-400 text-white text-sm font-semibold px-4 py-2 rounded-full transition-colors">
          <Plus size={16} /> Create Room
        </button>
      </div>

      {rooms.length === 0 ? (
        <div className="text-center py-16">
          <Heart size={48} className="mx-auto text-slate-600 mb-3" />
          <p className="text-slate-500 text-sm">No dating rooms active. Create one!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {rooms.map((room) => (
            <div key={room.id} className="bg-gradient-to-br from-rose-500/10 to-pink-500/5 rounded-2xl border border-rose-500/20 p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-10 h-10 rounded-full bg-rose-500/20 flex items-center justify-center">
                  <Radio size={18} className="text-rose-400" />
                </div>
                <div>
                  <p className="text-sm font-bold">{room.title}</p>
                  <p className="text-xs text-slate-500">by {room.host?.display_name || 'Host'}</p>
                </div>
              </div>
              {room.description && <p className="text-sm text-slate-400 mb-3">{room.description}</p>}
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1 text-slate-500"><Users size={12} /> {room.participants_count} in room</span>
                <span className="bg-rose-500/10 text-rose-400 px-2 py-0.5 rounded-full">Ages {room.age_range}</span>
              </div>
              <button className="w-full mt-3 bg-rose-500 hover:bg-rose-400 text-white text-sm font-semibold py-2 rounded-xl transition-colors">
                Join Room
              </button>
            </div>
          ))}
        </div>
      )}

      {creating && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setCreating(false)}>
          <div className="bg-slate-900 rounded-3xl border border-white/10 p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">Create Dating Room</h3>
              <button onClick={() => setCreating(false)}><X size={20} /></button>
            </div>
            <div className="space-y-3">
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Room title" className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/50" />
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Description" rows={2} className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/50 resize-none" />
              <input value={form.age_range} onChange={(e) => setForm({ ...form, age_range: e.target.value })} placeholder="Age range (e.g. 18-35)" className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/50" />
              <button onClick={handleCreate} disabled={!form.title} className="w-full bg-rose-500 hover:bg-rose-400 disabled:opacity-30 text-white font-semibold py-3 rounded-xl transition-colors">
                Create Room
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
