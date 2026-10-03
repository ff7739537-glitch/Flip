import { useEffect, useState } from 'react';
import { Headphones, Mic, MicOff, Plus, X, Users } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import type { AudioRoom, AudioRoomParticipant, Profile } from '@/types';

export default function AudioLoungeScreen() {
  const { profile } = useAuth();
  const [rooms, setRooms] = useState<AudioRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', topic: '' });
  const [activeRoom, setActiveRoom] = useState<AudioRoom | null>(null);
  const [participants, setParticipants] = useState<AudioRoomParticipant[]>([]);

  const fetchRooms = async () => {
    const { data } = await supabase
      .from('audio_rooms')
      .select('*, host:profiles!audio_rooms_host_id_fkey(*)')
      .eq('is_live', true)
      .order('created_at', { ascending: false });
    setRooms((data as unknown as AudioRoom[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchRooms(); }, []);

  const handleCreate = async () => {
    if (!profile || !form.title) return;
    const { data } = await supabase
      .from('audio_rooms')
      .insert({ host_id: profile.id, title: form.title, description: form.description, topic: form.topic })
      .select('*, host:profiles!audio_rooms_host_id_fkey(*)')
      .single();
    if (data) {
      await supabase.from('audio_room_participants').insert({ room_id: (data as AudioRoom).id, user_id: profile.id, role: 'host', is_muted: false });
      setCreating(false);
      setForm({ title: '', description: '', topic: '' });
      fetchRooms();
      joinRoom(data as AudioRoom);
    }
  };

  const joinRoom = async (room: AudioRoom) => {
    if (!profile) return;
    setActiveRoom(room);
    const { data } = await supabase
      .from('audio_room_participants')
      .select('*, profile:profiles!audio_room_participants_user_id_fkey(*)')
      .eq('room_id', room.id);
    setParticipants((data as unknown as AudioRoomParticipant[]) || []);
    const existing = (data as unknown as AudioRoomParticipant[])?.find((p) => p.user_id === profile.id);
    if (!existing) {
      await supabase.from('audio_room_participants').insert({ room_id: room.id, user_id: profile.id, role: 'listener', is_muted: true });
      const { data: updated } = await supabase
        .from('audio_room_participants')
        .select('*, profile:profiles!audio_room_participants_user_id_fkey(*)')
        .eq('room_id', room.id);
      setParticipants((updated as unknown as AudioRoomParticipant[]) || []);
    }
  };

  const toggleMute = async (participant: AudioRoomParticipant) => {
    if (!profile || participant.user_id !== profile.id) return;
    await supabase.from('audio_room_participants').update({ is_muted: !participant.is_muted }).eq('id', participant.id);
    setParticipants((prev) => prev.map((p) => p.id === participant.id ? { ...p, is_muted: !p.is_muted } : p));
  };

  const leaveRoom = async () => {
    if (!profile || !activeRoom) return;
    await supabase.from('audio_room_participants').delete().eq('room_id', activeRoom.id).eq('user_id', profile.id);
    setActiveRoom(null);
    setParticipants([]);
  };

  if (loading) return <div className="text-center py-12 text-slate-500 text-sm">Loading audio rooms...</div>;

  if (activeRoom) {
    const speakers = participants.filter((p) => p.role === 'host' || p.role === 'speaker');
    const listeners = participants.filter((p) => p.role === 'listener');
    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Headphones size={20} className="text-emerald-400" />
            <h2 className="text-lg font-bold">{activeRoom.title}</h2>
          </div>
          <button onClick={leaveRoom} className="bg-red-500/20 text-red-400 text-sm font-semibold px-4 py-2 rounded-full hover:bg-red-500/30 transition-colors">
            Leave
          </button>
        </div>
        {activeRoom.topic && <p className="text-sm text-slate-400 mb-4">Topic: {activeRoom.topic}</p>}
        <div className="mb-6">
          <p className="text-xs font-semibold text-slate-500 mb-2">SPEAKERS</p>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
            {speakers.map((p) => (
              <button key={p.id} onClick={() => toggleMute(p)} className="flex flex-col items-center gap-1">
                <div className="relative">
                  {p.profile?.avatar_url ? (
                    <img src={p.profile.avatar_url} alt="" className="w-14 h-14 rounded-full object-cover" />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-emerald-500/20 flex items-center justify-center text-lg font-semibold">
                      {p.profile?.display_name?.charAt(0) || 'U'}
                    </div>
                  )}
                  <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center ${p.is_muted ? 'bg-red-500' : 'bg-emerald-500'}`}>
                    {p.is_muted ? <MicOff size={10} className="text-white" /> : <Mic size={10} className="text-white" />}
                  </div>
                </div>
                <span className="text-xs truncate max-w-[60px]">{p.profile?.display_name || 'User'}</span>
                <span className="text-[10px] text-slate-500">{p.role}</span>
              </button>
            ))}
          </div>
        </div>
        {listeners.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-slate-500 mb-2">LISTENERS ({listeners.length})</p>
            <div className="flex flex-wrap gap-2">
              {listeners.map((p) => (
                <div key={p.id} className="flex items-center gap-1.5 bg-slate-800 rounded-full px-2 py-1">
                  {p.profile?.avatar_url ? (
                    <img src={p.profile.avatar_url} alt="" className="w-5 h-5 rounded-full" />
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-slate-700 flex items-center justify-center text-[10px]">{p.profile?.display_name?.charAt(0) || 'U'}</div>
                  )}
                  <span className="text-xs text-slate-400">{p.profile?.display_name || 'User'}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Headphones size={20} className="text-emerald-400" />
          <h2 className="text-xl font-bold">Audio Lounge</h2>
        </div>
        <button onClick={() => setCreating(true)} className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-semibold px-4 py-2 rounded-full transition-colors">
          <Plus size={16} /> New Room
        </button>
      </div>

      {rooms.length === 0 ? (
        <div className="text-center py-16">
          <Headphones size={48} className="mx-auto text-slate-600 mb-3" />
          <p className="text-slate-500 text-sm">No active rooms. Start one!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rooms.map((room) => (
            <button key={room.id} onClick={() => joinRoom(room)} className="w-full bg-slate-900 rounded-2xl border border-white/5 p-4 hover:border-emerald-500/30 transition-all text-left">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-bold">{room.title}</h3>
                <span className="flex items-center gap-1 text-xs text-slate-500"><Users size={12} /> {room.participants_count}</span>
              </div>
              {room.description && <p className="text-xs text-slate-400 mb-2">{room.description}</p>}
              <div className="flex items-center gap-2">
                <span className="text-xs text-emerald-400 flex items-center gap-1"><Mic size={10} /> Live</span>
                {room.topic && <span className="text-xs text-slate-500">· {room.topic}</span>}
              </div>
            </button>
          ))}
        </div>
      )}

      {creating && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setCreating(false)}>
          <div className="bg-slate-900 rounded-3xl border border-white/10 p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">Start Audio Room</h3>
              <button onClick={() => setCreating(false)}><X size={20} /></button>
            </div>
            <div className="space-y-3">
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Room title" className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50" />
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Description" rows={2} className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 resize-none" />
              <input value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} placeholder="Topic (optional)" className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50" />
              <button onClick={handleCreate} disabled={!form.title} className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-30 text-white font-semibold py-3 rounded-xl transition-colors">
                Start Room
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
