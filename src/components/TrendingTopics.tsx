import { useEffect, useState } from 'react';
import { TrendingUp, Hash } from 'lucide-react';
import { fetchTrendingTags, type TrendingTag } from '@/lib/hashtags';

interface Props {
  onSelectTag?: (tag: string) => void;
}

export default function TrendingTopics({ onSelectTag }: Props) {
  const [tags, setTags] = useState<TrendingTag[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTrendingTags(8).then((t) => {
      setTags(t);
      setLoading(false);
    });
  }, []);

  if (loading || tags.length === 0) return null;

  return (
    <div className="bg-slate-900 light:bg-white rounded-2xl border border-white/5 light:border-slate-200 p-4 mb-4">
      <div className="flex items-center gap-2 mb-3">
        <TrendingUp size={16} className="text-emerald-400" />
        <h3 className="text-sm font-bold">Trending Topics</h3>
      </div>
      <div className="flex flex-wrap gap-2">
        {tags.map((t, i) => (
          <button
            key={t.tag}
            onClick={() => onSelectTag?.(t.tag)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-slate-800 light:bg-slate-100 hover:bg-slate-700 light:hover:bg-slate-200 text-xs font-medium transition-colors"
          >
            <Hash size={10} className="text-slate-500" />
            {t.tag}
            {i < 3 && <span className="text-emerald-400 ml-1">{t.usage_count}</span>}
          </button>
        ))}
      </div>
    </div>
  );
}
