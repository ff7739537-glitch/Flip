import { useEffect, useState } from 'react';
import { Megaphone, ShoppingBag, X, Send } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Ad } from '@/types';

export default function AdsScreen() {
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('ads').select('*').eq('is_active', true).order('created_at', { ascending: false });
      setAds((data as Ad[]) || []);
      setLoading(false);
    })();
  }, []);

  if (loading) return <div className="text-center py-12 text-slate-500 text-sm">Loading ads...</div>;

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Megaphone size={20} className="text-amber-400" />
        <h2 className="text-xl font-bold">Ads</h2>
      </div>

      {ads.length === 0 ? (
        <p className="text-slate-500 text-sm text-center py-8">No active ads.</p>
      ) : (
        <div className="space-y-3">
          {ads.map((ad) => (
            <div key={ad.id} className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-2xl border border-white/10 overflow-hidden">
              <div className="flex">
                {ad.image_url && (
                  <img src={ad.image_url} alt="" className="w-28 h-28 object-cover flex-shrink-0" />
                )}
                <div className="p-4 flex-1 flex flex-col justify-center">
                  <div className="flex items-center gap-1 mb-1">
                    <Megaphone size={12} className="text-amber-400" />
                    <span className="text-[10px] font-semibold text-amber-400 uppercase tracking-wider">Sponsored</span>
                  </div>
                  <p className="text-sm font-semibold">{ad.title}</p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                    <span>{ad.impressions.toLocaleString()} impressions</span>
                    <span>{ad.clicks} clicks</span>
                  </div>
                  {ad.target_url && (
                    <a href={ad.target_url} className="text-xs text-emerald-400 mt-1 hover:underline">Learn more</a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
