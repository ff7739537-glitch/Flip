import { useEffect, useState } from 'react';
import { Calendar, MapPin, Users, Plus, X, Check } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import type { EventItem } from '@/types';

export default function EventsScreen() {
  const { profile } = useAuth();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', event_date: '', location: '' });
  const [rsvps, setRsvps] = useState<Record<string, string>>({});

  const fetchEvents = async () => {
    const { data } = await supabase
      .from('events')
      .select('*, author:profiles!events_user_id_fkey(*)')
      .order('event_date', { ascending: true });
    setEvents((data as unknown as EventItem[]) || []);
    if (profile) {
      const { data: myRsvps } = await supabase.from('event_rsvps').select('*').eq('user_id', profile.id);
      const rsvpMap: Record<string, string> = {};
      (myRsvps || []).forEach((r: { event_id: string; status: string }) => { rsvpMap[r.event_id] = r.status; });
      setRsvps(rsvpMap);
    }
    setLoading(false);
  };

  useEffect(() => { fetchEvents(); }, [profile]);

  const handleCreate = async () => {
    if (!profile || !form.title || !form.event_date) return;
    await supabase.from('events').insert({
      user_id: profile.id,
      title: form.title,
      description: form.description,
      event_date: new Date(form.event_date).toISOString(),
      location: form.location,
    });
    setCreating(false);
    setForm({ title: '', description: '', event_date: '', location: '' });
    fetchEvents();
  };

  const handleRsvp = async (eventId: string, status: string) => {
    if (!profile) return;
    const existing = rsvps[eventId];
    if (existing) {
      await supabase.from('event_rsvps').update({ status }).eq('event_id', eventId).eq('user_id', profile.id);
    } else {
      await supabase.from('event_rsvps').insert({ event_id: eventId, user_id: profile.id, status });
    }
    setRsvps({ ...rsvps, [eventId]: status });
  };

  if (loading) return <div className="text-center py-12 text-slate-500 text-sm">Loading events...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Calendar size={20} className="text-emerald-400" />
          <h2 className="text-xl font-bold">Events</h2>
        </div>
        <button onClick={() => setCreating(true)} className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-semibold px-4 py-2 rounded-full transition-colors">
          <Plus size={16} /> Create
        </button>
      </div>

      {events.length === 0 ? (
        <p className="text-slate-500 text-sm text-center py-8">No events yet. Create one!</p>
      ) : (
        <div className="space-y-3">
          {events.map((event) => (
            <div key={event.id} className="bg-slate-900 rounded-2xl border border-white/5 overflow-hidden">
              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-base font-bold">{event.title}</h3>
                  <span className="text-xs text-slate-500 bg-slate-800 px-2 py-1 rounded-full">
                    {new Date(event.event_date).toLocaleDateString()}
                  </span>
                </div>
                {event.description && <p className="text-sm text-slate-400 mb-3">{event.description}</p>}
                <div className="flex items-center gap-3 text-xs text-slate-500 mb-3">
                  <span className="flex items-center gap-1"><MapPin size={12} /> {event.location || 'TBD'}</span>
                  <span className="flex items-center gap-1"><Users size={12} /> {event.max_attendees} max</span>
                  <span className="flex items-center gap-1">by {event.author?.display_name || 'User'}</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleRsvp(event.id, 'going')}
                    className={`flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-full transition-colors ${
                      rsvps[event.id] === 'going' ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <Check size={12} /> Going
                  </button>
                  <button
                    onClick={() => handleRsvp(event.id, 'maybe')}
                    className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-colors ${
                      rsvps[event.id] === 'maybe' ? 'bg-amber-500 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    Maybe
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {creating && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setCreating(false)}>
          <div className="bg-slate-900 rounded-3xl border border-white/10 p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">Create Event</h3>
              <button onClick={() => setCreating(false)}><X size={20} /></button>
            </div>
            <div className="space-y-3">
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Event title" className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50" />
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Description" rows={2} className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 resize-none" />
              <input type="datetime-local" value={form.event_date} onChange={(e) => setForm({ ...form, event_date: e.target.value })} className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50" />
              <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Location" className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50" />
              <button onClick={handleCreate} disabled={!form.title || !form.event_date} className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-30 text-white font-semibold py-3 rounded-xl transition-colors">
                Create Event
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
