import { useEffect, useState } from 'react';
import { Plus, X, Eye, BookOpen, FileText, Save, Send, Trash2, Edit3, ChevronRight, Bookmark, Clock, Users } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import type { Story, StoryChapter, Profile } from '@/types';
import StoryViewers from '@/components/StoryViewers';

type Tab = 'browse' | 'my-stories' | 'write';

export default function StoriesScreen() {
  const { profile } = useAuth();
  const [tab, setTab] = useState<Tab>('browse');
  const [stories, setStories] = useState<Story[]>([]);
  const [myStories, setMyStories] = useState<Story[]>([]);
  const [viewing, setViewing] = useState<Story | null>(null);
  const [chapters, setChapters] = useState<StoryChapter[]>([]);
  const [currentChapter, setCurrentChapter] = useState(0);
  const [loading, setLoading] = useState(true);
  const [viewersStoryId, setViewersStoryId] = useState<string | null>(null);

  // Write state
  const [storyTitle, setStoryTitle] = useState('');
  const [storyCategory, setStoryCategory] = useState('general');
  const [chapterTitle, setChapterTitle] = useState('');
  const [chapterContent, setChapterContent] = useState('');
  const [draftChapters, setDraftChapters] = useState<{ title: string; content: string }[]>([]);
  const [editingStoryId, setEditingStoryId] = useState<string | null>(null);
  const [saveMsg, setSaveMsg] = useState('');

  const fetchStories = async () => {
    const { data } = await supabase
      .from('stories')
      .select('*, author:profiles!stories_user_id_fkey(*)')
      .eq('is_draft', false)
      .order('created_at', { ascending: false });
    setStories((data as unknown as Story[]) || []);
    setLoading(false);
  };

  const fetchMyStories = async () => {
    if (!profile) return;
    const { data } = await supabase
      .from('stories')
      .select('*')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false });
    setMyStories((data as unknown as Story[]) || []);
  };

  useEffect(() => { fetchStories(); }, []);
  useEffect(() => { if (profile) fetchMyStories(); }, [profile]);

  const fetchChapters = async (storyId: string) => {
    const { data } = await supabase
      .from('story_chapters')
      .select('*')
      .eq('story_id', storyId)
      .eq('is_published', true)
      .order('chapter_number', { ascending: true });
    setChapters((data as StoryChapter[]) || []);
    setCurrentChapter(0);
  };

  const handleView = async (story: Story) => {
    setViewing(story);
    await fetchChapters(story.id);
    await supabase.from('stories').update({ views_count: story.views_count + 1 }).eq('id', story.id);
    if (profile && story.user_id !== profile.id) {
      await supabase.from('story_views').upsert({ story_id: story.id, viewer_id: profile.id }, { onConflict: 'story_id,viewer_id' });
    }
  };

  const addChapter = () => {
    if (!chapterTitle.trim() || !chapterContent.trim()) return;
    setDraftChapters([...draftChapters, { title: chapterTitle.trim(), content: chapterContent.trim() }]);
    setChapterTitle('');
    setChapterContent('');
  };

  const removeDraftChapter = (idx: number) => {
    setDraftChapters(draftChapters.filter((_, i) => i !== idx));
  };

  const saveDraft = async () => {
    if (!profile || !storyTitle.trim()) return;
    const { data } = await supabase
      .from('stories')
      .insert({
        user_id: profile.id,
        caption: storyTitle.trim(),
        media_type: 'text',
        is_draft: true,
        category: storyCategory,
      })
      .select('*')
      .single();
    if (data) {
      for (let i = 0; i < draftChapters.length; i++) {
        await supabase.from('story_chapters').insert({
          story_id: (data as unknown as Story).id,
          chapter_number: i + 1,
          title: draftChapters[i].title,
          content: draftChapters[i].content,
          is_published: false,
        });
      }
      setSaveMsg('Draft saved!');
      setTimeout(() => setSaveMsg(''), 2000);
      fetchMyStories();
      setEditingStoryId((data as unknown as Story).id);
    }
  };

  const publishStory = async () => {
    if (!profile || !storyTitle.trim() || draftChapters.length === 0) return;
    const storyId = editingStoryId;
    if (storyId) {
      // Update existing
      await supabase.from('stories').update({ caption: storyTitle.trim(), is_draft: false, category: storyCategory }).eq('id', storyId);
      for (let i = 0; i < draftChapters.length; i++) {
        await supabase.from('story_chapters').insert({
          story_id: storyId,
          chapter_number: i + 1,
          title: draftChapters[i].title,
          content: draftChapters[i].content,
          is_published: true,
        });
      }
    } else {
      const { data } = await supabase
        .from('stories')
        .insert({
          user_id: profile.id,
          caption: storyTitle.trim(),
          media_type: 'text',
          is_draft: false,
          category: storyCategory,
        })
        .select('*')
        .single();
      if (data) {
        for (let i = 0; i < draftChapters.length; i++) {
          await supabase.from('story_chapters').insert({
            story_id: (data as unknown as Story).id,
            chapter_number: i + 1,
            title: draftChapters[i].title,
            content: draftChapters[i].content,
            is_published: true,
          });
        }
      }
    }
    setSaveMsg('Story published!');
    setTimeout(() => setSaveMsg(''), 2000);
    setStoryTitle('');
    setStoryCategory('general');
    setDraftChapters([]);
    setEditingStoryId(null);
    fetchStories();
    fetchMyStories();
    setTab('my-stories');
  };

  const editStory = async (story: Story) => {
    setEditingStoryId(story.id);
    setStoryTitle(story.caption);
    setStoryCategory(story.category);
    const { data } = await supabase.from('story_chapters').select('*').eq('story_id', story.id).order('chapter_number', { ascending: true });
    const chs = (data as StoryChapter[]) || [];
    setDraftChapters(chs.map((c) => ({ title: c.title, content: c.content })));
    setTab('write');
  };

  const deleteStory = async (storyId: string) => {
    await supabase.from('story_chapters').delete().eq('story_id', storyId);
    await supabase.from('stories').delete().eq('id', storyId);
    fetchMyStories();
    fetchStories();
  };

  return (
    <div>
      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        {([
          { key: 'browse', label: 'Browse', icon: <BookOpen size={14} /> },
          { key: 'my-stories', label: 'My Stories', icon: <Bookmark size={14} /> },
          { key: 'write', label: 'Write', icon: <Edit3 size={14} /> },
        ] as { key: Tab; label: string; icon: React.ReactNode }[]).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition-all ${
              tab === t.key ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* Browse Tab */}
      {tab === 'browse' && (
        <>
          {loading ? (
            <div className="text-center py-12 text-slate-500 text-sm">Loading stories...</div>
          ) : stories.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen size={48} className="mx-auto text-slate-600 mb-3" />
              <p className="text-slate-500 text-sm">No published stories yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {stories.map((story) => (
                <button
                  key={story.id}
                  onClick={() => handleView(story)}
                  className="w-full bg-slate-900 rounded-2xl border border-white/5 p-4 text-left hover:border-emerald-500/20 transition-colors flex items-start gap-3"
                >
                  <div className="w-12 h-16 rounded-lg bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 flex items-center justify-center flex-shrink-0">
                    <BookOpen size={20} className="text-emerald-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold truncate">{story.caption}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">by {story.author?.display_name || 'User'}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="flex items-center gap-1 text-xs text-slate-500">
                        <Eye size={10} /> {story.views_count}
                      </span>
                      <span className="text-xs text-slate-600">{story.category}</span>
                      {story.user_id === profile?.id && (
                        <button
                          onClick={(e) => { e.stopPropagation(); setViewersStoryId(story.id); }}
                          className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 ml-auto"
                        >
                          <Users size={10} /> Viewers
                        </button>
                      )}
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-slate-600 flex-shrink-0 mt-1" />
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {/* My Stories Tab */}
      {tab === 'my-stories' && (
        <>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-300">Your Story Folder</h3>
            <button
              onClick={() => { setStoryTitle(''); setDraftChapters([]); setEditingStoryId(null); setTab('write'); }}
              className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-semibold px-4 py-2 rounded-full transition-colors"
            >
              <Plus size={16} /> New Story
            </button>
          </div>
          {myStories.length === 0 ? (
            <div className="text-center py-12">
              <FileText size={48} className="mx-auto text-slate-600 mb-3" />
              <p className="text-slate-500 text-sm">You haven't written any stories yet.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {myStories.map((story) => (
                <div key={story.id} className="bg-slate-900 rounded-2xl border border-white/5 p-3 flex items-center gap-3">
                  <div className="w-10 h-14 rounded-lg bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 flex items-center justify-center flex-shrink-0">
                    <BookOpen size={16} className="text-emerald-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{story.caption}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {story.is_draft ? (
                        <span className="text-[10px] bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Clock size={8} /> Draft
                        </span>
                      ) : (
                        <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full">Published</span>
                      )}
                      <span className="text-xs text-slate-500">{story.views_count} views</span>
                    </div>
                  </div>
                  <button onClick={() => editStory(story)} className="p-2 rounded-lg hover:bg-white/10 transition-colors">
                    <Edit3 size={14} className="text-slate-400" />
                  </button>
                  <button onClick={() => deleteStory(story.id)} className="p-2 rounded-lg hover:bg-red-500/10 transition-colors">
                    <Trash2 size={14} className="text-red-400" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Write Tab */}
      {tab === 'write' && (
        <div className="space-y-4">
          {/* Story info */}
          <div className="bg-slate-900 rounded-2xl border border-white/5 p-4 space-y-3">
            <div>
              <label className="text-xs text-slate-400">Story Title</label>
              <input
                value={storyTitle}
                onChange={(e) => setStoryTitle(e.target.value)}
                placeholder="Enter your story title..."
                className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-2.5 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400">Category</label>
              <select
                value={storyCategory}
                onChange={(e) => setStoryCategory(e.target.value)}
                className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-2.5 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              >
                <option value="general">General</option>
                <option value="romance">Romance</option>
                <option value="drama">Drama</option>
                <option value="comedy">Comedy</option>
                <option value="horror">Horror</option>
                <option value="adventure">Adventure</option>
                <option value="mystery">Mystery</option>
                <option value="fantasy">Fantasy</option>
              </select>
            </div>
          </div>

          {/* Chapters */}
          {draftChapters.length > 0 && (
            <div className="bg-slate-900 rounded-2xl border border-white/5 p-4">
              <h4 className="text-sm font-semibold text-slate-300 mb-3">Chapters ({draftChapters.length})</h4>
              <div className="space-y-2">
                {draftChapters.map((ch, idx) => (
                  <div key={idx} className="flex items-center gap-3 bg-slate-800/50 rounded-xl p-3">
                    <span className="w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-bold flex-shrink-0">
                      {idx + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">Part {idx + 1}: {ch.title}</p>
                      <p className="text-xs text-slate-500 truncate">{ch.content.slice(0, 60)}...</p>
                    </div>
                    <button onClick={() => removeDraftChapter(idx)} className="p-1.5 rounded-lg hover:bg-red-500/10 transition-colors">
                      <X size={14} className="text-red-400" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add chapter */}
          <div className="bg-slate-900 rounded-2xl border border-white/5 p-4 space-y-3">
            <h4 className="text-sm font-semibold text-slate-300">
              {draftChapters.length > 0 ? `Part ${draftChapters.length + 1}` : 'Part 1'}
            </h4>
            <input
              value={chapterTitle}
              onChange={(e) => setChapterTitle(e.target.value)}
              placeholder="Chapter title..."
              className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
            <textarea
              value={chapterContent}
              onChange={(e) => setChapterContent(e.target.value)}
              placeholder="Write your chapter content here..."
              rows={6}
              className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-3 text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 resize-none"
            />
            <button
              onClick={addChapter}
              disabled={!chapterTitle.trim() || !chapterContent.trim()}
              className="w-full bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              <Plus size={16} /> Add Chapter
            </button>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={saveDraft}
              disabled={!storyTitle.trim()}
              className="flex-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-white text-sm font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              <Save size={16} /> Save Draft
            </button>
            <button
              onClick={publishStory}
              disabled={!storyTitle.trim() || draftChapters.length === 0}
              className="flex-1 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-30 text-white text-sm font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              <Send size={16} /> Publish
            </button>
          </div>

          {saveMsg && (
            <p className="text-center text-sm text-emerald-400 font-medium">{saveMsg}</p>
          )}
        </div>
      )}

      {/* Story Reader Modal */}
      {viewing && chapters.length > 0 && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center" onClick={() => setViewing(null)}>
          <button className="absolute top-4 right-4 p-2 rounded-full bg-white/10 z-10" onClick={() => setViewing(null)}>
            <X size={20} />
          </button>
          <div className="max-w-md w-full mx-4 bg-slate-900 rounded-3xl overflow-hidden max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="p-4 border-b border-white/5">
              <h3 className="text-lg font-bold">{viewing.caption}</h3>
              <p className="text-xs text-slate-500 mt-0.5">by {viewing.author?.display_name || 'User'}</p>
              <div className="flex items-center gap-1 mt-2">
                {chapters.map((_, idx) => (
                  <div
                    key={idx}
                    className={`h-1 flex-1 rounded-full transition-all ${idx <= currentChapter ? 'bg-emerald-400' : 'bg-slate-700'}`}
                  />
                ))}
              </div>
            </div>
            {/* Content */}
            <div className="flex-1 overflow-y-auto p-5">
              <h4 className="text-sm font-bold text-emerald-400 mb-3">
                Part {chapters[currentChapter].chapter_number}: {chapters[currentChapter].title}
              </h4>
              <p className="text-sm text-slate-200 whitespace-pre-wrap leading-relaxed">
                {chapters[currentChapter].content}
              </p>
            </div>
            {/* Navigation */}
            <div className="p-4 border-t border-white/5 flex items-center justify-between">
              <button
                onClick={() => setCurrentChapter(Math.max(0, currentChapter - 1))}
                disabled={currentChapter === 0}
                className="text-sm text-slate-400 disabled:opacity-30 hover:text-white transition-colors"
              >
                Previous
              </button>
              <span className="text-xs text-slate-500">{currentChapter + 1} / {chapters.length}</span>
              <button
                onClick={() => {
                  if (currentChapter < chapters.length - 1) {
                    setCurrentChapter(currentChapter + 1);
                  } else {
                    setViewing(null);
                  }
                }}
                className="text-sm text-emerald-400 hover:text-emerald-300 transition-colors"
              >
                {currentChapter < chapters.length - 1 ? 'Next' : 'Finish'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fallback for stories without chapters */}
      {viewing && chapters.length === 0 && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center" onClick={() => setViewing(null)}>
          <div className="max-w-sm w-full mx-4 bg-slate-900 rounded-3xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 flex items-center justify-between border-b border-white/5">
              <h3 className="text-sm font-bold">{viewing.caption}</h3>
              <button onClick={() => setViewing(null)}><X size={18} /></button>
            </div>
            <div className="p-6">
              <p className="text-sm text-slate-300 whitespace-pre-wrap">{viewing.caption}</p>
            </div>
          </div>
        </div>
      )}

      {/* Story Viewers Modal */}
      <StoryViewers storyId={viewersStoryId} onClose={() => setViewersStoryId(null)} />
    </div>
  );
}
