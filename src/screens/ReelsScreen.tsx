import { useEffect, useState } from 'react';
import { Heart, MessageCircle, Share2, Music, Play } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import type { Reel } from '@/types';
import VerifiedBadge from '@/components/VerifiedBadge';
import ShareModal from '@/components/ShareModal';

export default function ReelsScreen() {
  const { profile } = useAuth();
  const [reels, setReels] = useState<Reel[]>([]);
  const [loading, setLoading] = useState(true);
  const [sharing, setSharing] = useState<Reel | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('reels')
        .select('*, author:profiles!reels_user_id_fkey(*)')
        .order('created_at', { ascending: false })
        .limit(20);
      setReels((data as unknown as Reel[]) || []);
      setLoading(false);
    })();
  }, []);

  const handleLike = async (reel: Reel) => {
    if (!profile) return;
    const { data } = await supabase
      .from('reels')
      .update({ likes_count: reel.likes_count + 1 })
      .eq('id', reel.id)
      .select()
      .single();
    if (data) {
      setReels((prev) => prev.map((r) => r.id === reel.id ? { ...r, likes_count: r.likes_count + 1 } : r));
    }
  };

  const handleShare = async (reel: Reel) => {
    setSharing(reel);
    await supabase.from('reels').update({ shares_count: reel.shares_count + 1 }).eq('id', reel.id);
    setReels((prev) => prev.map((r) => r.id === reel.id ? { ...r, shares_count: r.shares_count + 1 } : r));
  };

  if (loading) return <div className="text-center py-12 text-slate-500 text-sm">Loading reels...</div>;

  if (reels.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500 text-sm">
        No reels yet. Upload your first reel!
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {reels.map((reel) => (
        <div key={reel.id} className="relative aspect-[9:16] max-h-[70vh] mx-auto max-w-sm rounded-3xl overflow-hidden bg-slate-900">
          {/* Placeholder video area */}
          <div className="absolute inset-0 bg-gradient-to-b from-slate-800 via-slate-900 to-black flex items-center justify-center">
            <Play size={48} className="text-white/30" />
          </div>

          {/* Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" />

          {/* Right action bar */}
          <div className="absolute right-3 bottom-20 flex flex-col gap-4 items-center">
            <button onClick={() => handleLike(reel)} className="flex flex-col items-center gap-1">
              <div className="w-11 h-11 rounded-full bg-black/40 backdrop-blur flex items-center justify-center hover:bg-black/60 transition-colors">
                <Heart size={22} className="text-white" />
              </div>
              <span className="text-xs text-white font-medium">{reel.likes_count}</span>
            </button>
            <div className="flex flex-col items-center gap-1">
              <div className="w-11 h-11 rounded-full bg-black/40 backdrop-blur flex items-center justify-center">
                <MessageCircle size={22} className="text-white" />
              </div>
              <span className="text-xs text-white font-medium">{reel.comments_count}</span>
            </div>
            <button onClick={() => handleShare(reel)} className="flex flex-col items-center gap-1">
              <div className="w-11 h-11 rounded-full bg-black/40 backdrop-blur flex items-center justify-center hover:bg-black/60 transition-colors">
                <Share2 size={22} className="text-white" />
              </div>
              <span className="text-xs text-white font-medium">{reel.shares_count}</span>
            </button>
          </div>

          {/* Bottom info */}
          <div className="absolute bottom-0 left-0 right-16 p-4">
            <div className="flex items-center gap-2 mb-2">
              {reel.author?.avatar_url ? (
                <img src={reel.author.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover border-2 border-white/20" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-emerald-500/30 flex items-center justify-center text-xs font-semibold">
                  {reel.author?.display_name?.charAt(0).toUpperCase() || 'U'}
                </div>
              )}
              <span className="text-sm font-semibold text-white">{reel.author?.display_name || 'User'}</span>
              <VerifiedBadge profile={reel.author} size={14} />
            </div>
            <p className="text-sm text-white/90 mb-2">{reel.caption}</p>
            {reel.audio_track && (
              <div className="flex items-center gap-1.5 text-xs text-white/70">
                <Music size={12} />
                <span className="truncate">{reel.audio_track}</span>
              </div>
            )}
          </div>
        </div>
      ))}

      {sharing && (
        <ShareModal
          open={!!sharing}
          onClose={() => setSharing(null)}
          targetType="reel"
          targetId={sharing.id}
          content={sharing.caption}
        />
      )}
    </div>
  );
}
