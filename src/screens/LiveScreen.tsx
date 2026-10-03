import { useEffect, useState } from 'react';
import { Radio, Heart, Eye, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { LiveStream } from '@/types';

export default function LiveScreen() {
  const [streams, setStreams] = useState<LiveStream[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewing, setViewing] = useState<LiveStream | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('live_streams')
        .select('*, host:profiles!live_streams_user_id_fkey(*)')
        .eq('is_live', true)
        .order('viewers_count', { ascending: false });
      setStreams((data as unknown as LiveStream[]) || []);
      setLoading(false);
    })();
  }, []);

  if (loading) return <div className="text-center py-12 text-slate-500 text-sm">Loading live streams...</div>;

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Radio size={20} className="text-red-500" />
        <h2 className="text-xl font-bold">Live Now</h2>
        <span className="bg-red-500/20 text-red-400 text-xs font-semibold px-2 py-0.5 rounded-full">{streams.length}</span>
      </div>

      {streams.length === 0 ? (
        <div className="text-center py-16">
          <Radio size={48} className="mx-auto text-slate-600 mb-3" />
          <p className="text-slate-500 text-sm">No live streams right now.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {streams.map((stream) => (
            <button
              key={stream.id}
              onClick={() => setViewing(stream)}
              className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-slate-800 group"
            >
              {stream.thumbnail_url ? (
                <img src={stream.thumbnail_url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
              ) : (
                <div className="w-full h-full bg-gradient-to-b from-red-500/20 to-slate-900 flex items-center justify-center">
                  <Radio size={32} className="text-red-400/50" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
              <div className="absolute top-2 left-2 flex items-center gap-1 bg-red-500 px-2 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                <span className="text-[10px] font-bold text-white">LIVE</span>
              </div>
              <div className="absolute top-2 right-2 flex items-center gap-1 bg-black/50 px-2 py-0.5 rounded-full">
                <Eye size={10} className="text-white" />
                <span className="text-[10px] text-white font-medium">{stream.viewers_count}</span>
              </div>
              <div className="absolute bottom-0 left-0 right-0 p-3">
                <p className="text-sm font-semibold text-white truncate">{stream.title}</p>
                <p className="text-xs text-slate-300">{stream.host?.display_name || 'Host'}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {viewing && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col" onClick={() => setViewing(null)}>
          <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4 bg-gradient-to-b from-black/60 to-transparent">
            <div className="flex items-center gap-2">
              {viewing.host?.avatar_url ? (
                <img src={viewing.host.avatar_url} alt="" className="w-9 h-9 rounded-full" />
              ) : (
                <div className="w-9 h-9 rounded-full bg-emerald-500/30 flex items-center justify-center text-sm font-semibold">
                  {viewing.host?.display_name?.charAt(0) || 'H'}
                </div>
              )}
              <div>
                <p className="text-sm font-semibold text-white">{viewing.host?.display_name || 'Host'}</p>
                <p className="text-xs text-slate-300">{viewing.viewers_count} watching</p>
              </div>
            </div>
            <button onClick={() => setViewing(null)} className="p-2 rounded-full bg-white/10">
              <X size={20} className="text-white" />
            </button>
          </div>
          <div className="flex-1 flex items-center justify-center bg-gradient-to-b from-slate-800 to-black">
            <div className="text-center">
              <Radio size={64} className="mx-auto text-red-500/30 mb-3" />
              <p className="text-white font-semibold">{viewing.title}</p>
              <p className="text-slate-400 text-sm mt-1">{viewing.category}</p>
            </div>
          </div>
          <div className="p-4 flex items-center gap-3">
            <button className="flex items-center gap-1.5 bg-red-500/20 text-red-400 px-4 py-2 rounded-full text-sm font-semibold hover:bg-red-500/30 transition-colors">
              <Heart size={16} /> {viewing.likes_count}
            </button>
            <input
              placeholder="Send a message..."
              className="flex-1 bg-white/10 border border-white/10 rounded-full px-4 py-2 text-sm text-white placeholder-slate-400 focus:outline-none"
            />
          </div>
        </div>
      )}
    </div>
  );
}
