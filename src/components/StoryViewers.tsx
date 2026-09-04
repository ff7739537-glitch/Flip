import { useEffect, useState } from 'react';
import { X, Eye, User } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Profile } from '@/types';

interface Props {
  storyId: string | null;
  onClose: () => void;
}

export default function StoryViewers({ storyId, onClose }: Props) {
  const [viewers, setViewers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!storyId) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from('story_views')
        .select('viewer:profiles!story_views_viewer_id_fkey(*)')
        .eq('story_id', storyId)
        .order('created_at', { ascending: false });
      setViewers(((data || []) as unknown as { viewer: Profile }[]).map((r) => r.viewer));
      setLoading(false);
    })();
  }, [storyId]);

  if (!storyId) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-slate-900 light:bg-white rounded-3xl border border-white/10 light:border-slate-200 w-full max-w-sm max-h-[70vh] flex flex-col animate-fade-in-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-white/5 light:border-slate-200">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Eye size={18} className="text-emerald-400" /> Viewers
          </h3>
          <button onClick={onClose}><X size={20} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {loading ? (
            <p className="text-center py-8 text-slate-500 text-sm">Loading viewers...</p>
          ) : viewers.length === 0 ? (
            <p className="text-center py-8 text-slate-500 text-sm">No views yet.</p>
          ) : (
            viewers.map((v) => (
              <div key={v.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 light:hover:bg-slate-100 transition-colors">
                {v.avatar_url ? (
                  <img src={v.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover" />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-emerald-500/20 flex items-center justify-center">
                    <User size={16} className="text-emerald-400" />
                  </div>
                )}
                <span className="text-sm font-medium">{v.display_name}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
