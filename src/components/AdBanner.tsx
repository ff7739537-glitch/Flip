import { useEffect, useState } from 'react';
import { Megaphone, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Ad } from '@/types';

export default function AdBanner({ placement = 'feed' }: { placement?: string }) {
  const [ad, setAd] = useState<Ad | null>(null);
  const [closed, setClosed] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('ads')
        .select('*')
        .eq('is_active', true)
        .eq('placement', placement)
        .limit(1)
        .maybeSingle();
      if (data) {
        setAd(data as Ad);
        await supabase.from('ads').update({ impressions: (data as Ad).impressions + 1 }).eq('id', (data as Ad).id);
      }
    })();
  }, [placement]);

  if (!ad || closed) return null;

  return (
    <div className="relative bg-gradient-to-r from-slate-800 to-slate-900 rounded-2xl border border-white/10 overflow-hidden">
      <button
        onClick={() => setClosed(true)}
        className="absolute top-2 right-2 p-1 rounded-full bg-black/30 hover:bg-black/50 transition-colors z-10"
      >
        <X size={14} />
      </button>
      <div className="flex">
        {ad.image_url && (
          <img src={ad.image_url} alt="" className="w-24 h-24 object-cover flex-shrink-0" />
        )}
        <div className="p-3 flex-1 flex flex-col justify-center">
          <div className="flex items-center gap-1 mb-1">
            <Megaphone size={12} className="text-amber-400" />
            <span className="text-[10px] font-semibold text-amber-400 uppercase tracking-wider">Sponsored</span>
          </div>
          <p className="text-sm font-semibold text-white">{ad.title}</p>
          {ad.target_url && (
            <a href={ad.target_url} className="text-xs text-emerald-400 mt-1 hover:underline">Learn more</a>
          )}
        </div>
      </div>
    </div>
  );
}
