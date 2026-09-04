import { useState } from 'react';
import { X, Copy, Link2, Share2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

interface Props {
  open: boolean;
  onClose: () => void;
  targetType: 'post' | 'reel';
  targetId: string;
  content: string;
}

export default function ShareModal({ open, onClose, targetType, targetId, content }: Props) {
  const { profile } = useAuth();
  const [copied, setCopied] = useState(false);

  if (!open) return null;

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://flip.app';
  const shareUrl = `${baseUrl}/share/${targetType}/${targetId}`;
  const shareText = `"${content.slice(0, 100)}${content.length > 100 ? '...' : ''}" - via FLIP`;

  const trackShare = async (platform: string) => {
    if (!profile) return;
    try {
      await supabase.from('post_shares').insert({
        sharer_id: profile.id,
        target_type: targetType,
        target_id: targetId,
        share_url: shareUrl,
        platform,
      });
    } catch {
      // non-blocking
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard?.writeText(shareUrl);
      setCopied(true);
      toast.success('Link copied to clipboard!');
      trackShare('copy');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy link');
    }
  };

  const handleNativeShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ text: shareText, title: 'Shared from FLIP', url: shareUrl });
        toast.success('Shared!');
        trackShare('internal');
      } else {
        await navigator.clipboard?.writeText(`${shareText}\n${shareUrl}`);
        toast.success('Copied to clipboard!');
        trackShare('copy');
      }
    } catch {
      // user cancelled
    }
  };

  const platforms = [
    { key: 'whatsapp', label: 'WhatsApp', color: 'bg-green-500/20 text-green-400', url: `https://wa.me/?text=${encodeURIComponent(`${shareText} ${shareUrl}`)}` },
    { key: 'telegram', label: 'Telegram', color: 'bg-sky-500/20 text-sky-400', url: `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}` },
    { key: 'twitter', label: 'Twitter', color: 'bg-slate-500/20 text-slate-300', url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}` },
    { key: 'facebook', label: 'Facebook', color: 'bg-blue-500/20 text-blue-400', url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}` },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-slate-900 dark:bg-slate-900 light:bg-white rounded-3xl border border-white/10 light:border-slate-200 w-full max-w-sm p-6 animate-fade-in-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Share2 size={18} className="text-emerald-400" /> Share
          </h3>
          <button onClick={onClose}><X size={20} /></button>
        </div>

        <div className="mb-4">
          <label className="text-xs text-slate-400 mb-1.5 block">Share Link</label>
          <div className="flex items-center gap-2 bg-slate-800 light:bg-slate-100 rounded-xl p-2.5">
            <Link2 size={16} className="text-slate-400 flex-shrink-0" />
            <input
              readOnly
              value={shareUrl}
              className="flex-1 bg-transparent text-xs text-slate-300 light:text-slate-700 focus:outline-none truncate"
              onClick={(e) => (e.target as HTMLInputElement).select()}
            />
            <button
              onClick={handleCopy}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 ${
                copied ? 'bg-emerald-500 text-white' : 'bg-slate-700 light:bg-slate-200 text-slate-300 light:text-slate-700 hover:bg-slate-600'
              }`}
            >
              <Copy size={12} /> {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-3 mb-4">
          {platforms.map((p) => (
            <a
              key={p.key}
              href={p.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackShare(p.key)}
              className="flex flex-col items-center gap-1.5 group"
            >
              <div className={`w-12 h-12 rounded-full ${p.color} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                <span className="text-xs font-bold">{p.label.slice(0, 2)}</span>
              </div>
              <span className="text-[10px] text-slate-400">{p.label}</span>
            </a>
          ))}
        </div>

        <button
          onClick={handleNativeShare}
          className="w-full bg-emerald-500 hover:bg-emerald-400 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
        >
          <Share2 size={16} /> Share via Device
        </button>
      </div>
    </div>
  );
}
