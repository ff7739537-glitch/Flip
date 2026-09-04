import { supabase } from '@/lib/supabase';

const HASHTAG_REGEX = /#[\w]+/g;

export function extractHashtags(content: string): string[] {
  const matches = content.match(HASHTAG_REGEX) || [];
  return [...new Set(matches.map((t) => t.slice(1).toLowerCase()))];
}

export async function saveHashtagsForPost(postId: string, content: string): Promise<void> {
  const tags = extractHashtags(content);
  if (tags.length === 0) return;

  for (const tag of tags) {
    try {
      const { data: existing } = await supabase
        .from('hashtags')
        .select('id, usage_count')
        .eq('tag', tag)
        .maybeSingle();

      if (existing) {
        await supabase
          .from('hashtags')
          .update({
            usage_count: (existing as { usage_count: number }).usage_count + 1,
            last_used_at: new Date().toISOString(),
          })
          .eq('id', (existing as { id: string }).id);

        await supabase.from('post_hashtags').insert({
          post_id: postId,
          hashtag_id: (existing as { id: string }).id,
        });
      } else {
        const { data: created } = await supabase
          .from('hashtags')
          .insert({ tag, usage_count: 1, last_used_at: new Date().toISOString() })
          .select('id')
          .single();

        if (created) {
          await supabase.from('post_hashtags').insert({
            post_id: postId,
            hashtag_id: (created as { id: string }).id,
          });
        }
      }
    } catch {
      // non-blocking
    }
  }
}

export interface TrendingTag {
  tag: string;
  usage_count: number;
}

export async function fetchTrendingTags(limit = 10): Promise<TrendingTag[]> {
  try {
    const { data } = await supabase
      .from('hashtags')
      .select('tag, usage_count')
      .order('usage_count', { ascending: false })
      .limit(limit);
    return (data as TrendingTag[]) || [];
  } catch {
    return [];
  }
}

export function renderContentWithHashtags(
  content: string,
  onHashtagClick?: (tag: string) => void
): React.ReactNode {
  if (!content) return content;
  const parts = content.split(/(#[\w]+)/g);
  return parts.map((part, i) => {
    if (/^#[\w]+$/.test(part)) {
      const tag = part.slice(1);
      return (
        <span
          key={i}
          onClick={(e) => {
            e.stopPropagation();
            onHashtagClick?.(tag);
          }}
          className="text-emerald-400 hover:text-emerald-300 cursor-pointer font-medium"
        >
          {part}
        </span>
      );
    }
    return <span key={i}>{part}</span>;
  });
}
