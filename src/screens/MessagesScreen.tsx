import { useEffect, useState, useRef, useCallback } from 'react';
import { Send, Search, MessageCircle, ArrowLeft, Check, CheckCheck, Trash2, Ban, X, MoreVertical, Copy, Forward, ArrowDown, Smile } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { sanitizeFreeText } from '@/lib/security';
import type { Conversation, Message, Profile } from '@/types';
import { MessageSkeleton, ConversationSkeleton, EmptyState } from '@/components/Skeleton';
import VerifiedBadge from '@/components/VerifiedBadge';

export default function MessagesScreen({ initialConversation }: { initialConversation?: Conversation | null }) {
  const { profile } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConv, setActiveConv] = useState<Conversation | null>(initialConversation || null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMsg, setNewMsg] = useState('');
  const [search, setSearch] = useState('');
  const [allUsers, setAllUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [msgLoading, setMsgLoading] = useState(false);
  const [typing, setTyping] = useState(false);
  const [otherTyping, setOtherTyping] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [selectedMsg, setSelectedMsg] = useState<Message | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const msgEndRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const fetchConversations = async () => {
    if (!profile) return;
    const { data } = await supabase
      .from('conversations')
      .select('*, user1:profiles!conversations_user1_id_fkey(*), user2:profiles!conversations_user2_id_fkey(*), last_message:messages!conversations_id_fkey(*)')
      .or(`user1_id.eq.${profile.id},user2_id.eq.${profile.id}`);
    const convs = (data || []).map((c: Record<string, unknown>) => {
      const u1 = c.user1 as Profile;
      const u2 = c.user2 as Profile;
      const other = u1?.id === profile.id ? u2 : u1;
      return { ...c, other_user: other } as Conversation;
    });
    setConversations(convs);

    let unread = 0;
    for (const conv of convs) {
      const { count } = await supabase.from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('conversation_id', conv.id)
        .neq('sender_id', profile.id)
        .is('read_at', null);
      unread += count || 0;
    }
    setUnreadCount(unread);
    setLoading(false);
  };

  const fetchMessages = useCallback(async (convId: string, silent = false) => {
    if (!silent) setMsgLoading(true);
    const { data } = await supabase.from('messages').select('*').eq('conversation_id', convId).order('created_at', { ascending: true });
    setMessages((data as Message[]) || []);
    if (!silent) {
      setTimeout(() => msgEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }
    setMsgLoading(false);
  }, []);

  const markAsRead = useCallback(async (convId: string) => {
    if (!profile) return;
    await supabase
      .from('messages')
      .update({ read_at: new Date().toISOString() })
      .eq('conversation_id', convId)
      .neq('sender_id', profile.id)
      .is('read_at', null);
  }, [profile]);

  const fetchUsers = async () => {
    if (!profile) return;
    const { data } = await supabase.from('profiles').select('*').neq('id', profile.id).limit(50);
    setAllUsers((data as Profile[]) || []);
  };

  useEffect(() => { fetchConversations(); }, [profile]);

  useEffect(() => {
    if (activeConv) {
      fetchMessages(activeConv.id);
      markAsRead(activeConv.id);
      pollRef.current = setInterval(() => fetchMessages(activeConv.id, true), 2000);
      const typingPoll = setInterval(async () => {
        if (!profile) return;
        const { data } = await supabase
          .from('typing_status')
          .select('*')
          .eq('conversation_id', activeConv.id)
          .neq('user_id', profile.id)
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        const ts = data as { is_typing: boolean; updated_at: string } | null;
        if (ts && ts.is_typing && Date.now() - new Date(ts.updated_at).getTime() < 3000) {
          setOtherTyping(true);
        } else {
          setOtherTyping(false);
        }
      }, 1000);
      return () => { if (pollRef.current) clearInterval(pollRef.current); clearInterval(typingPoll); };
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [activeConv, fetchMessages, markAsRead, profile]);

  const handleScroll = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setShowScrollBtn(distFromBottom > 150);
  };

  const scrollToBottom = () => {
    msgEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const startConversation = async (otherUser: Profile) => {
    if (!profile) return;
    const u1 = profile.id < otherUser.id ? profile.id : otherUser.id;
    const u2 = profile.id < otherUser.id ? otherUser.id : profile.id;
    const { data } = await supabase
      .from('conversations')
      .upsert({ user1_id: u1, user2_id: u2 }, { onConflict: 'user1_id,user2_id' })
      .select('*, user1:profiles!conversations_user1_id_fkey(*), user2:profiles!conversations_user2_id_fkey(*)')
      .single();
    if (data) {
      const c = data as Record<string, unknown>;
      const u1p = c.user1 as Profile;
      const u2p = c.user2 as Profile;
      const other = u1p?.id === profile.id ? u2p : u1p;
      const conv = { ...c, other_user: other } as Conversation;
      setActiveConv(conv);
      setSearch('');
      fetchConversations();
      toast.success(`Chat with ${otherUser.display_name} started!`);
    }
  };

  const handleSend = async () => {
    if (!activeConv || !profile) return;
    const content = sanitizeFreeText(newMsg.trim());
    if (!content) return;
    const { data } = await supabase
      .from('messages')
      .insert({ conversation_id: activeConv.id, sender_id: profile.id, content })
      .select('*')
      .single();
    if (data) {
      setMessages([...messages, data as Message]);
      setNewMsg('');
      setTyping(false);
      setTimeout(() => msgEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }
  };

  const handleTyping = () => {
    if (typingTimer.current) clearTimeout(typingTimer.current);
    setTyping(true);
    if (profile && activeConv) {
      supabase
        .from('typing_status')
        .upsert({ conversation_id: activeConv.id, user_id: profile.id, is_typing: true, updated_at: new Date().toISOString() }, { onConflict: 'conversation_id,user_id' })
        .then(() => {});
    }
    typingTimer.current = setTimeout(() => {
      setTyping(false);
      if (profile && activeConv) {
        supabase
          .from('typing_status')
          .upsert({ conversation_id: activeConv.id, user_id: profile.id, is_typing: false, updated_at: new Date().toISOString() }, { onConflict: 'conversation_id,user_id' })
          .then(() => {});
      }
    }, 2000);
  };

  const handleDeleteMessage = async (msgId: string) => {
    if (!profile) return;
    await supabase.from('messages').delete().eq('id', msgId).eq('sender_id', profile.id);
    setMessages((prev) => prev.filter((m) => m.id !== msgId));
    setSelectedMsg(null);
    toast.success('Message deleted');
  };

  const handleCopyMessage = (content: string) => {
    navigator.clipboard?.writeText(content);
    setSelectedMsg(null);
    toast.success('Copied to clipboard');
  };

  const handleClearChat = async () => {
    if (!activeConv) return;
    await supabase.from('messages').delete().eq('conversation_id', activeConv.id);
    setMessages([]);
    setConfirmClear(false);
    setMenuOpen(false);
    toast.success('Chat cleared');
  };

  if (loading) return <ConversationSkeleton />;

  if (activeConv) {
    return (
      <div className="flex flex-col h-[calc(100vh-200px)]">
        {/* Chat header */}
        <div className="flex items-center gap-3 p-3 border-b border-white/5">
          <button onClick={() => setActiveConv(null)}><ArrowLeft size={20} /></button>
          {activeConv.other_user?.avatar_url ? (
            <img src={activeConv.other_user.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover" />
          ) : (
            <div className="w-9 h-9 rounded-full bg-emerald-500/20 flex items-center justify-center text-sm font-semibold">
              {activeConv.other_user?.display_name?.charAt(0) || 'U'}
            </div>
          )}
          <div className="flex-1">
            <div className="flex items-center gap-1">
              <p className="font-semibold text-sm">{activeConv.other_user?.display_name || 'User'}</p>
              <VerifiedBadge profile={activeConv.other_user} size={13} />
            </div>
            <p className="text-xs text-emerald-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Online
            </p>
          </div>
          <div className="relative">
            <button onClick={() => setMenuOpen(!menuOpen)} className="p-1.5 rounded-full hover:bg-white/10 transition-colors">
              <MoreVertical size={18} />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-8 w-40 bg-slate-800 border border-white/10 rounded-2xl shadow-2xl p-1 z-20 animate-fade-in-up">
                <button onClick={() => { setConfirmClear(true); setMenuOpen(false); }} className="w-full text-left px-3 py-2 rounded-xl hover:bg-white/10 text-sm text-red-400 flex items-center gap-2 transition-colors">
                  <Trash2 size={14} /> Clear Chat
                </button>
                <button className="w-full text-left px-3 py-2 rounded-xl hover:bg-white/10 text-sm text-slate-300 flex items-center gap-2 transition-colors">
                  <Ban size={14} /> Block User
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Messages */}
        <div ref={scrollContainerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto space-y-2 p-4 relative">
          {msgLoading ? (
            <MessageSkeleton />
          ) : messages.length === 0 ? (
            <EmptyState
              icon={<MessageCircle size={32} />}
              title="No messages yet"
              subtitle="Say hello and start the conversation!"
            />
          ) : messages.map((msg) => {
            const isOwn = msg.sender_id === profile?.id;
            const isRead = msg.read_at !== null;
            const isLink = /^(https?:\/\/|www\.)/.test(msg.content);
            return (
              <div key={msg.id} className={`flex group ${isOwn ? 'justify-end' : 'justify-start'}`}>
                <div
                  onClick={() => setSelectedMsg(msg)}
                  className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${
                    isOwn ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-200'
                  } cursor-pointer transition-transform active:scale-95`}
                >
                  {isLink ? (
                    <a
                      href={msg.content.startsWith('http') ? msg.content : `https://${msg.content}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline break-all"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {msg.content}
                    </a>
                  ) : (
                    msg.content
                  )}
                  {isOwn && (
                    <div className="flex items-center justify-end gap-1 mt-1">
                      {isRead ? (
                        <CheckCheck size={12} className="text-sky-300" />
                      ) : (
                        <Check size={12} className="text-white/50" />
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          {otherTyping && (
            <div className="flex justify-start">
              <div className="bg-slate-800 rounded-2xl px-4 py-3 flex gap-1">
                <span className="w-2 h-2 rounded-full bg-slate-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 rounded-full bg-slate-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 rounded-full bg-slate-500 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}
          <div ref={msgEndRef} />
        </div>

        {/* Auto-scroll button */}
        {showScrollBtn && (
          <button
            onClick={scrollToBottom}
            className="absolute bottom-20 right-8 w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg hover:bg-emerald-400 transition-colors animate-fade-in-up"
          >
            <ArrowDown size={18} />
          </button>
        )}

        {/* Input */}
        <div className="flex gap-2 p-3 border-t border-white/5">
          <button className="text-slate-500 hover:text-emerald-400 transition-colors p-2">
            <Smile size={22} />
          </button>
          <input
            value={newMsg}
            onChange={(e) => { setNewMsg(e.target.value); handleTyping(); }}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Type a message..."
            className="flex-1 bg-slate-800 border border-white/10 rounded-full px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          />
          <button onClick={handleSend} disabled={!newMsg.trim()} className="bg-emerald-500 disabled:opacity-30 rounded-full p-2.5 hover:bg-emerald-400 transition-colors active:scale-90">
            <Send size={18} />
          </button>
        </div>

        {/* Clear chat confirmation */}
        {confirmClear && (
          <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setConfirmClear(false)}>
            <div className="bg-slate-900 rounded-3xl border border-white/10 p-6 w-full max-w-sm text-center animate-fade-in-up" onClick={(e) => e.stopPropagation()}>
              <Trash2 size={32} className="mx-auto text-red-400 mb-3" />
              <h3 className="text-lg font-bold mb-2">Clear All Messages?</h3>
              <p className="text-sm text-slate-400 mb-4">This will permanently delete all messages in this conversation.</p>
              <div className="flex gap-2">
                <button onClick={() => setConfirmClear(false)} className="flex-1 bg-slate-800 text-slate-300 py-2.5 rounded-xl text-sm font-semibold">Cancel</button>
                <button onClick={handleClearChat} className="flex-1 bg-red-500 hover:bg-red-400 text-white py-2.5 rounded-xl text-sm font-semibold">Clear</button>
              </div>
            </div>
          </div>
        )}

        {/* Message context menu */}
        {selectedMsg && (
          <div className="fixed inset-0 z-50" onClick={() => setSelectedMsg(null)}>
            <div className="absolute bottom-24 left-1/2 -translate-x-1/2 bg-slate-800 border border-white/10 rounded-2xl shadow-2xl p-1 flex gap-1 animate-fade-in-up" onClick={(e) => e.stopPropagation()}>
              <button onClick={() => handleCopyMessage(selectedMsg.content)} className="flex flex-col items-center gap-1 px-4 py-2 rounded-xl hover:bg-white/10 transition-colors">
                <Copy size={18} className="text-slate-300" />
                <span className="text-[10px] text-slate-400">Copy</span>
              </button>
              {selectedMsg.sender_id === profile?.id && (
                <button onClick={() => handleDeleteMessage(selectedMsg.id)} className="flex flex-col items-center gap-1 px-4 py-2 rounded-xl hover:bg-red-500/10 transition-colors">
                  <Trash2 size={18} className="text-red-400" />
                  <span className="text-[10px] text-red-400">Delete</span>
                </button>
              )}
              <button className="flex flex-col items-center gap-1 px-4 py-2 rounded-xl hover:bg-white/10 transition-colors">
                <Forward size={18} className="text-slate-300" />
                <span className="text-[10px] text-slate-400">Forward</span>
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Messages</h2>
      <div className="relative mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          value={search}
          onChange={(e) => { setSearch(e.target.value); if (e.target.value) fetchUsers(); }}
          placeholder="Search users to start chatting..."
          className="w-full bg-slate-800 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
        />
      </div>

      {search && allUsers.length > 0 && (
        <div className="mb-4 space-y-1">
          {allUsers.filter(u => u.display_name.toLowerCase().includes(search.toLowerCase())).slice(0, 5).map((u) => (
            <button
              key={u.id}
              onClick={() => startConversation(u)}
              className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 transition-colors"
            >
              {u.avatar_url ? (
                <img src={u.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover" />
              ) : (
                <div className="w-9 h-9 rounded-full bg-emerald-500/20 flex items-center justify-center text-sm font-semibold">{u.display_name.charAt(0)}</div>
              )}
              <span className="text-sm font-medium">{u.display_name}</span>
            </button>
          ))}
        </div>
      )}

      {conversations.length === 0 ? (
        <EmptyState
          icon={<MessageCircle size={36} />}
          title="No conversations yet"
          subtitle="Search for users above to start chatting."
        />
      ) : (
        <div className="space-y-1">
          {conversations.map((conv) => (
            <button
              key={conv.id}
              onClick={() => setActiveConv(conv)}
              className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors"
            >
              {conv.other_user?.avatar_url ? (
                <img src={conv.other_user.avatar_url} alt="" className="w-11 h-11 rounded-full object-cover" />
              ) : (
                <div className="w-11 h-11 rounded-full bg-emerald-500/20 flex items-center justify-center text-sm font-semibold">
                  {conv.other_user?.display_name?.charAt(0) || 'U'}
                </div>
              )}
              <div className="flex-1 text-left">
                <div className="flex items-center gap-1">
                  <p className="text-sm font-semibold">{conv.other_user?.display_name || 'User'}</p>
                  <VerifiedBadge profile={conv.other_user} size={13} />
                </div>
                <p className="text-xs text-slate-500 truncate">
                  {conv.last_message?.content?.substring(0, 40) || 'Tap to start chatting'}
                </p>
              </div>
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
