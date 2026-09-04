import { useEffect, useState } from 'react';
import { Heart, MessageCircle, Share2, Send, Image, X, Bookmark, Flag, Trash2, MoreVertical, Check, CheckCheck, BadgeCheck, Eye, Globe, Users as UsersIcon, Lock } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import type { Post, Profile, PostComment } from '@/types';
import AdBanner from '@/components/AdBanner';
import { FeedSkeleton, EmptyState, PullToRefresh } from '@/components/Skeleton';
import { useDoubleTapLike, FloatingHeartsOverlay } from '@/components/FloatingHearts';
import { sanitizeFreeText } from '@/lib/security';
import { saveHashtagsForPost, renderContentWithHashtags } from '@/lib/hashtags';
import { createNotification } from '@/lib/coinEconomy';
import VerifiedBadge from '@/components/VerifiedBadge';
import ShareModal from '@/components/ShareModal';
import TrendingTopics from '@/components/TrendingTopics';
import { loadCachedPosts, saveCachedPosts, shuffleFeed } from '@/lib/postCache';

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function FeedPage({ searchQuery }: { searchQuery: string }) {
  const { profile } = useAuth();
  const [posts, setPosts] = useState<Post[]>(() => (searchQuery ? [] : shuffleFeed(loadCachedPosts())));
  const [loading, setLoading] = useState(() => (searchQuery ? true : loadCachedPosts().length === 0));
  const [refreshing, setRefreshing] = useState(false);
  const [newPost, setNewPost] = useState('');
  const [commentingId, setCommentingId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState<Record<string, PostComment[]>>({});
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [bookmarkedPosts, setBookmarkedPosts] = useState<Set<string>>(new Set());
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [reporting, setReporting] = useState<Post | null>(null);
  const [reportReason, setReportReason] = useState('');
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [sharing, setSharing] = useState<Post | null>(null);
  const [hashtagFilter, setHashtagFilter] = useState<string | null>(null);
  const [postPrivacy, setPostPrivacy] = useState<'public' | 'friends'>('public');
  const [lastPostTime, setLastPostTime] = useState<number>(0);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);

  const fetchPosts = async (silent = false) => {
    if (!silent) setLoading(true);
    setRefreshing(true);
    let query = supabase
      .from('posts')
      .select('*, author:profiles!posts_user_id_fkey(*)')
      .order('created_at', { ascending: false })
      .limit(50);

    if (searchQuery) {
      query = query.ilike('content', `%${searchQuery}%`);
    }

    const { data } = await query;
    const fetched = (data as unknown as Post[]) || [];
    // Randomized shuffle so the feed feels fresh on every load.
    setPosts(searchQuery ? fetched : shuffleFeed(fetched));
    if (!searchQuery) saveCachedPosts(fetched);

    if (profile) {
      const { data: likes } = await supabase.from('post_likes').select('post_id').eq('user_id', profile.id);
      setLikedPosts(new Set((likes || []).map((l: { post_id: string }) => l.post_id)));
      const { data: bookmarks } = await supabase.from('post_bookmarks').select('post_id').eq('user_id', profile.id);
      setBookmarkedPosts(new Set((bookmarks || []).map((b: { post_id: string }) => b.post_id)));
    }
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    fetchPosts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  const handlePost = async () => {
    const content = sanitizeFreeText(newPost).slice(0, 2000);
    if (!content || !profile) return;
    const now = Date.now();
    const elapsed = now - lastPostTime;
    if (elapsed < 15000) {
      const wait = Math.ceil((15000 - elapsed) / 1000);
      toast.error(`Please wait ${wait}s before posting again.`);
      return;
    }
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) {
      toast.error('Your session expired. Please sign in again.');
      return;
    }
    const { data, error } = await supabase
      .from('posts')
      .insert({ content, user_id: authData.user.id, privacy: postPrivacy })
      .select('*, author:profiles!posts_user_id_fkey(*)')
      .single();
    if (error) {
      console.error('[Flip] Post creation failed:', error.code, error.message);
      toast.error(error.code === '42501' ? 'Posting permission denied. Please sign in again.' : `Failed to post: ${error.message}`);
      return;
    }
    if (data) {
      const newPostData = data as unknown as Post;
      setPosts((current) => {
        const deduped = current.filter((p) => p.id !== newPostData.id);
        return [newPostData, ...deduped];
      });
      setNewPost('');
      setLastPostTime(now);
      setCooldownRemaining(15);
      toast.success('Posted!');
      saveHashtagsForPost(newPostData.id, content);
    }
  };

  useEffect(() => {
    if (cooldownRemaining <= 0) return;
    const timer = setTimeout(() => setCooldownRemaining((c) => Math.max(0, c - 1)), 1000);
    return () => clearTimeout(timer);
  }, [cooldownRemaining]);

  const handleLike = async (postId: string, postAuthorId?: string) => {
    if (!profile) return;
    const isLiked = likedPosts.has(postId);
    if (isLiked) {
      await supabase.from('post_likes').delete().eq('post_id', postId).eq('user_id', profile.id);
      setLikedPosts((prev) => { const n = new Set(prev); n.delete(postId); return n; });
      setPosts((prev) => prev.map((p) => p.id === postId ? { ...p, likes_count: Math.max(0, p.likes_count - 1) } : p));
    } else {
      await supabase.from('post_likes').insert({ post_id: postId, user_id: profile.id });
      setLikedPosts((prev) => new Set(prev).add(postId));
      setPosts((prev) => prev.map((p) => p.id === postId ? { ...p, likes_count: p.likes_count + 1 } : p));
      if (postAuthorId && postAuthorId !== profile.id) {
        createNotification(postAuthorId, 'social_interaction', 'New Like', `${profile.display_name} liked your post`, 'post', postId);
      }
    }
  };

  const handleBookmark = async (postId: string) => {
    if (!profile) return;
    const isBookmarked = bookmarkedPosts.has(postId);
    if (isBookmarked) {
      await supabase.from('post_bookmarks').delete().eq('post_id', postId).eq('user_id', profile.id);
      setBookmarkedPosts((prev) => { const n = new Set(prev); n.delete(postId); return n; });
      toast('Removed from saved');
    } else {
      await supabase.from('post_bookmarks').insert({ post_id: postId, user_id: profile.id });
      setBookmarkedPosts((prev) => new Set(prev).add(postId));
      toast.success('Saved!');
    }
  };

  const handleShare = (post: Post) => {
    setSharing(post);
    setMenuOpenId(null);
  };

  const handleDelete = async (postId: string) => {
    if (!profile) return;
    await supabase.from('post_likes').delete().eq('post_id', postId);
    await supabase.from('post_comments').delete().eq('post_id', postId);
    await supabase.from('posts').delete().eq('id', postId).eq('user_id', profile.id);
    setPosts((prev) => prev.filter((p) => p.id !== postId));
    setMenuOpenId(null);
    toast.success('Post deleted');
  };

  const handleReport = async () => {
    if (!profile || !reporting || !reportReason.trim()) return;
    await supabase.from('reports').insert({
      reporter_id: profile.id,
      target_type: 'post',
      target_id: reporting.id,
      reason: reportReason.trim(),
      description: `Reported post by ${reporting.author?.display_name || 'unknown'}`,
    });
    setReporting(null);
    setReportReason('');
    setMenuOpenId(null);
    toast.success('Report submitted. Thank you!');
  };

  const loadComments = async (postId: string) => {
    const { data } = await supabase
      .from('post_comments')
      .select('*, author:profiles!post_comments_user_id_fkey(*)')
      .eq('post_id', postId)
      .order('created_at', { ascending: true });
    setComments((prev) => ({ ...prev, [postId]: (data as unknown as PostComment[]) || [] }));
  };

  const handleComment = async (postId: string, postAuthorId?: string) => {
    if (!commentText.trim() || !profile) return;
    const { data } = await supabase
      .from('post_comments')
      .insert({ post_id: postId, content: commentText.trim(), user_id: profile.id })
      .select('*, author:profiles!post_comments_user_id_fkey(*)')
      .single();
    if (data) {
      setComments((prev) => ({
        ...prev,
        [postId]: [...(prev[postId] || []), data as unknown as PostComment],
      }));
      setPosts((prev) => prev.map((p) => p.id === postId ? { ...p, comments_count: p.comments_count + 1 } : p));
      setCommentText('');
      if (postAuthorId && postAuthorId !== profile.id) {
        createNotification(postAuthorId, 'social_interaction', 'New Comment', `${profile.display_name} commented on your post`, 'post', postId);
      }
    }
  };

  const handleDeleteComment = async (commentId: string, postId: string) => {
    if (!profile) return;
    await supabase.from('post_comments').delete().eq('id', commentId).eq('user_id', profile.id);
    setComments((prev) => ({
      ...prev,
      [postId]: (prev[postId] || []).filter((c) => c.id !== commentId),
    }));
    setPosts((prev) => prev.map((p) => p.id === postId ? { ...p, comments_count: Math.max(0, p.comments_count - 1) } : p));
    toast.success('Comment deleted');
  };

  const filteredPosts = hashtagFilter
    ? posts.filter((p) => p.content.toLowerCase().includes(`#${hashtagFilter}`))
    : posts;

  return (
    <div className="space-y-4">
      {/* Trending Topics */}
      {!searchQuery && !hashtagFilter && <TrendingTopics onSelectTag={(tag) => setHashtagFilter(tag)} />}

      {/* Hashtag filter banner */}
      {hashtagFilter && (
        <div className="flex items-center gap-2 bg-emerald-500/10 rounded-xl px-4 py-2.5 border border-emerald-500/20">
          <span className="text-sm text-emerald-400 font-medium">#{hashtagFilter}</span>
          <button onClick={() => setHashtagFilter(null)} className="ml-auto text-xs text-slate-400 hover:text-white">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Create Post */}
      <div className="bg-slate-900 dark:bg-slate-900 light:bg-white rounded-2xl border border-white/5 dark:border-white/5 light:border-slate-200 p-4">
        <div className="flex gap-3">
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-semibold flex-shrink-0">
              {profile?.display_name?.charAt(0).toUpperCase() || 'U'}
            </div>
          )}
          <div className="flex-1">
            <textarea
              value={newPost}
              onChange={(e) => setNewPost(e.target.value)}
              placeholder="What's on your mind?"
              rows={2}
              className="w-full bg-transparent text-sm placeholder-slate-500 focus:outline-none resize-none"
            />
            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center gap-2">
                <button className="text-slate-500 hover:text-emerald-400 transition-colors" title="Add image">
                  <Image size={18} />
                </button>
                <div className="flex items-center gap-1 ml-1">
                  <button
                    onClick={() => setPostPrivacy('public')}
                    className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-full transition-all ${
                      postPrivacy === 'public'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'text-slate-500 hover:text-slate-300'
                    }`}
                    title="Public — visible to everyone"
                  >
                    <Globe size={12} /> Public
                  </button>
                  <button
                    onClick={() => setPostPrivacy('friends')}
                    className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-full transition-all ${
                      postPrivacy === 'friends'
                        ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                        : 'text-slate-500 hover:text-slate-300'
                    }`}
                    title="Friends only"
                  >
                    <UsersIcon size={12} /> Friends
                  </button>
                </div>
              </div>
              <button
                onClick={handlePost}
                disabled={!newPost.trim() || cooldownRemaining > 0}
                className="bg-emerald-500 hover:bg-emerald-400 disabled:opacity-30 text-white text-sm font-semibold px-5 py-1.5 rounded-full transition-all"
              >
                {cooldownRemaining > 0 ? `${cooldownRemaining}s` : 'Post'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Posts */}
      {loading ? (
        <FeedSkeleton />
      ) : filteredPosts.length === 0 ? (
        <EmptyState
          icon={<MessageCircle size={36} />}
          title={searchQuery || hashtagFilter ? 'No posts found' : 'No posts yet'}
          subtitle={searchQuery || hashtagFilter ? 'Try a different search term' : 'Be the first to share something amazing!'}
        />
      ) : (
        <PullToRefresh onRefresh={() => fetchPosts(true)}>
          {filteredPosts.map((post, idx) => (
            <div key={post.id}>
              <PostCard
                post={post}
                profile={profile}
                liked={likedPosts.has(post.id)}
                bookmarked={bookmarkedPosts.has(post.id)}
                isOwn={post.user_id === profile?.id}
                menuOpen={menuOpenId === post.id}
                onLike={() => handleLike(post.id, post.user_id)}
                onDoubleLike={() => {
                  if (!likedPosts.has(post.id)) handleLike(post.id, post.user_id);
                }}
                onBookmark={() => handleBookmark(post.id)}
                onShare={() => handleShare(post)}
                onComment={() => {
                  if (commentingId === post.id) {
                    setCommentingId(null);
                  } else {
                    setCommentingId(post.id);
                    loadComments(post.id);
                  }
                }}
                onMenuToggle={() => setMenuOpenId(menuOpenId === post.id ? null : post.id)}
                onDelete={() => handleDelete(post.id)}
                onReport={() => { setReporting(post); setMenuOpenId(null); }}
                onImageClick={(url) => setLightboxUrl(url)}
                onHashtagClick={(tag) => setHashtagFilter(tag)}
              />
              {commentingId === post.id && (
                <div className="bg-slate-900 dark:bg-slate-900 light:bg-white rounded-b-2xl border border-t-0 border-white/5 dark:border-white/5 light:border-slate-200 p-4 -mt-1">
                  <div className="space-y-2 mb-3">
                    {(comments[post.id] || []).length === 0 ? (
                      <p className="text-xs text-slate-500 text-center py-2">No comments yet. Start the conversation!</p>
                    ) : (comments[post.id] || []).map((c) => (
                      <div key={c.id} className="flex gap-2 group">
                        <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center text-xs font-semibold flex-shrink-0">
                          {c.author?.display_name?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <div className="flex-1 bg-slate-800 dark:bg-slate-800 light:bg-slate-100 rounded-xl px-3 py-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1">
                              <p className="text-xs font-semibold">{c.author?.display_name || 'User'}</p>
                              <VerifiedBadge profile={c.author} size={12} />
                            </div>
                            {c.user_id === profile?.id && (
                              <button
                                onClick={() => handleDeleteComment(c.id, post.id)}
                                className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 transition-all"
                              >
                                <Trash2 size={12} />
                              </button>
                            )}
                          </div>
                          <p className="text-sm text-slate-300 dark:text-slate-300 light:text-slate-700">{c.content}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleComment(post.id, post.user_id)}
                      placeholder="Write a comment..."
                      className="flex-1 bg-slate-800 dark:bg-slate-800 light:bg-slate-100 border border-white/5 dark:border-white/5 light:border-slate-200 rounded-full px-4 py-2 text-sm placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                    />
                    <button
                      onClick={() => handleComment(post.id, post.user_id)}
                      disabled={!commentText.trim()}
                      className="bg-emerald-500 disabled:opacity-30 rounded-full p-2.5 hover:bg-emerald-400 transition-colors"
                    >
                      <Send size={16} />
                    </button>
                  </div>
                </div>
              )}
              {(idx + 1) % 3 === 0 && <AdBanner placement="feed" />}
            </div>
          ))}
          {refreshing && (
            <div className="flex justify-center py-4">
              <div className="w-6 h-6 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
            </div>
          )}
        </PullToRefresh>
      )}

      {/* Report Modal */}
      {reporting && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setReporting(null)}>
          <div className="bg-slate-900 dark:bg-slate-900 light:bg-white rounded-3xl border border-white/10 dark:border-white/10 light:border-slate-200 p-6 w-full max-w-sm animate-fade-in-up" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Flag size={18} className="text-red-400" /> Report Post
              </h3>
              <button onClick={() => setReporting(null)}><X size={20} /></button>
            </div>
            <p className="text-xs text-slate-400 mb-3">Why are you reporting this post?</p>
            <div className="space-y-2 mb-4">
              {['Spam or scam', 'Hate speech', 'Harassment or bullying', 'Nudity or sexual content', 'Misinformation', 'Other'].map((reason) => (
                <button
                  key={reason}
                  onClick={() => setReportReason(reason)}
                  className={`w-full text-left px-4 py-2.5 rounded-xl text-sm transition-colors ${
                    reportReason === reason ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-slate-800 dark:bg-slate-800 light:bg-slate-100 text-slate-300 dark:text-slate-300 light:text-slate-700 hover:bg-slate-700'
                  }`}
                >
                  {reason}
                </button>
              ))}
            </div>
            <button
              onClick={handleReport}
              disabled={!reportReason.trim()}
              className="w-full bg-red-500 hover:bg-red-400 disabled:opacity-30 text-white font-semibold py-3 rounded-xl transition-colors"
            >
              Submit Report
            </button>
          </div>
        </div>
      )}

      {/* Share Modal */}
      {sharing && (
        <ShareModal
          open={!!sharing}
          onClose={() => setSharing(null)}
          targetType="post"
          targetId={sharing.id}
          content={sharing.content}
        />
      )}

      {/* Image Lightbox */}
      {lightboxUrl && (
        <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4" onClick={() => setLightboxUrl(null)}>
          <button className="absolute top-4 right-4 text-white p-2" onClick={() => setLightboxUrl(null)}>
            <X size={24} />
          </button>
          <img src={lightboxUrl} alt="" className="max-w-full max-h-full object-contain rounded-xl" />
        </div>
      )}
    </div>
  );
}

function PostCard({ post, profile, liked, bookmarked, isOwn, menuOpen, onLike, onDoubleLike, onBookmark, onShare, onComment, onMenuToggle, onDelete, onReport, onImageClick, onHashtagClick }: {
  post: Post;
  profile: Profile | null;
  liked: boolean;
  bookmarked: boolean;
  isOwn: boolean;
  menuOpen: boolean;
  onLike: () => void;
  onDoubleLike: () => void;
  onBookmark: () => void;
  onShare: () => void;
  onComment: () => void;
  onMenuToggle: () => void;
  onDelete: () => void;
  onReport: () => void;
  onImageClick: (url: string) => void;
  onHashtagClick: (tag: string) => void;
}) {
  const { handleTap, hearts } = useDoubleTapLike(onDoubleLike);

  return (
    <div className="bg-slate-900 dark:bg-slate-900 light:bg-white rounded-2xl border border-white/5 dark:border-white/5 light:border-slate-200 overflow-hidden">
      <div className="p-4">
        <div className="flex items-center gap-3 mb-3">
          {post.author?.avatar_url ? (
            <img src={post.author.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-semibold">
              {post.author?.display_name?.charAt(0).toUpperCase() || 'U'}
            </div>
          )}
          <div className="flex-1">
            <div className="flex items-center gap-1">
              <p className="text-sm font-semibold">{post.author?.display_name || 'User'}</p>
              <VerifiedBadge profile={post.author} size={14} />
            </div>
            <div className="flex items-center gap-1">
              <p className="text-xs text-slate-500">{timeAgo(post.created_at)}</p>
              {post.privacy === 'friends' && (
                <span className="flex items-center gap-0.5 text-[10px] text-cyan-400 ml-1" title="Friends only">
                  <UsersIcon size={10} /> Friends
                </span>
              )}
            </div>
          </div>
          <div className="relative">
            <button onClick={onMenuToggle} className="p-1.5 rounded-full hover:bg-white/10 transition-colors">
              <MoreVertical size={16} className="text-slate-400" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-8 w-44 bg-slate-800 dark:bg-slate-800 light:bg-white border border-white/10 dark:border-white/10 light:border-slate-200 rounded-2xl shadow-2xl p-1 z-20 animate-fade-in-up">
                <button onClick={onBookmark} className="w-full text-left px-3 py-2 rounded-xl hover:bg-white/10 text-sm flex items-center gap-2 transition-colors">
                  <Bookmark size={14} className={bookmarked ? 'text-emerald-400 fill-emerald-400' : 'text-slate-400'} />
                  {bookmarked ? 'Saved' : 'Save Post'}
                </button>
                <button onClick={onShare} className="w-full text-left px-3 py-2 rounded-xl hover:bg-white/10 text-sm flex items-center gap-2 transition-colors">
                  <Share2 size={14} className="text-slate-400" /> Share
                </button>
                {isOwn ? (
                  <button onClick={onDelete} className="w-full text-left px-3 py-2 rounded-xl hover:bg-red-500/10 text-sm text-red-400 flex items-center gap-2 transition-colors">
                    <Trash2 size={14} /> Delete
                  </button>
                ) : (
                  <button onClick={onReport} className="w-full text-left px-3 py-2 rounded-xl hover:bg-red-500/10 text-sm text-red-400 flex items-center gap-2 transition-colors">
                    <Flag size={14} /> Report
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
        <div
          className="relative"
          onClick={handleTap}
        >
          <p className="text-sm text-slate-200 dark:text-slate-200 light:text-slate-800 whitespace-pre-wrap select-none">
            {renderContentWithHashtags(post.content, onHashtagClick)}
          </p>
          {post.media_url && (
            <img
              src={post.media_url}
              alt=""
              onClick={(e) => { e.stopPropagation(); onImageClick(post.media_url!); }}
              className="mt-3 w-full rounded-xl object-cover max-h-96 cursor-zoom-in"
            />
          )}
          <FloatingHeartsOverlay hearts={hearts} />
        </div>
      </div>
      <div className="px-4 pb-3 flex items-center gap-4">
        <button
          onClick={onLike}
          className={`flex items-center gap-1.5 text-sm transition-all active:scale-125 ${
            liked ? 'text-red-400' : 'text-slate-400 hover:text-red-400'
          }`}
        >
          <Heart size={18} fill={liked ? 'currentColor' : 'none'} />
          {post.likes_count > 0 && post.likes_count}
        </button>
        <button
          onClick={onComment}
          className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-emerald-400 transition-colors"
        >
          <MessageCircle size={18} />
          {post.comments_count > 0 && post.comments_count}
        </button>
        <button onClick={onShare} className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-cyan-400 transition-colors">
          <Share2 size={18} />
        </button>
        <div className="flex items-center gap-1 text-xs text-slate-500 ml-auto">
          <Eye size={12} />
          {(post.likes_count * 3 + post.comments_count * 5 + 12).toLocaleString()}
        </div>
        <button
          onClick={onBookmark}
          className={`flex items-center gap-1.5 text-sm transition-all active:scale-125 ${
            bookmarked ? 'text-emerald-400' : 'text-slate-400 hover:text-emerald-400'
          }`}
        >
          <Bookmark size={18} fill={bookmarked ? 'currentColor' : 'none'} />
        </button>
      </div>
    </div>
  );
}
