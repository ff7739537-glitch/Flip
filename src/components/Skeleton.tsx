import { useEffect, useState } from 'react';

export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`relative overflow-hidden bg-slate-800/60 rounded-xl ${className}`}>
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/5 to-transparent" />
    </div>
  );
}

export function FeedSkeleton() {
  return (
    <div className="space-y-4">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="bg-slate-900 rounded-2xl border border-white/5 p-4 space-y-3">
          <div className="flex items-center gap-3">
            <Skeleton className="w-10 h-10 rounded-full" />
            <div className="space-y-1.5 flex-1">
              <Skeleton className="w-32 h-3 rounded" />
              <Skeleton className="w-20 h-2 rounded" />
            </div>
          </div>
          <Skeleton className="w-full h-4 rounded" />
          <Skeleton className="w-full h-4 rounded" />
          <Skeleton className="w-2/3 h-4 rounded" />
          <div className="flex gap-4 pt-2">
            <Skeleton className="w-16 h-5 rounded-full" />
            <Skeleton className="w-16 h-5 rounded-full" />
            <Skeleton className="w-16 h-5 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function MessageSkeleton() {
  return (
    <div className="space-y-2">
      {[...Array(5)].map((_, i) => (
        <div key={i} className={`flex items-center gap-2 ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
          {i % 2 === 0 && <Skeleton className="w-9 h-9 rounded-full" />}
          <Skeleton className={`h-12 rounded-2xl ${i % 2 === 0 ? 'w-48' : 'w-40'}`} />
        </div>
      ))}
    </div>
  );
}

export function ConversationSkeleton() {
  return (
    <div className="space-y-1">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3">
          <Skeleton className="w-11 h-11 rounded-full" />
          <div className="space-y-1.5 flex-1">
            <Skeleton className="w-24 h-3 rounded" />
            <Skeleton className="w-40 h-2.5 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function EmptyState({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-20 h-20 rounded-full bg-slate-800/60 flex items-center justify-center mb-4 text-slate-500">
        {icon}
      </div>
      <p className="text-slate-300 text-sm font-semibold mb-1">{title}</p>
      {subtitle && <p className="text-slate-500 text-xs max-w-xs">{subtitle}</p>}
    </div>
  );
}

export function PullToRefresh({ onRefresh, children }: { onRefresh: () => void; children: React.ReactNode }) {
  const [pulling, setPulling] = useState(false);
  const [pullDist, setPullDist] = useState(0);

  useEffect(() => {
    let startY = 0;
    let active = false;

    const onTouchStart = (e: TouchEvent) => {
      if (window.scrollY === 0) {
        startY = e.touches[0].clientY;
        active = true;
      }
    };
    const onTouchMove = (e: TouchEvent) => {
      if (!active) return;
      const dist = e.touches[0].clientY - startY;
      if (dist > 0) {
        setPulling(true);
        setPullDist(Math.min(dist * 0.5, 60));
      }
    };
    const onTouchEnd = () => {
      if (pullDist >= 50) {
        onRefresh();
      }
      active = false;
      setPulling(false);
      setPullDist(0);
    };

    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [pullDist, onRefresh]);

  return (
    <div style={{ transform: pulling ? `translateY(${pullDist}px)` : 'none', transition: pulling ? 'none' : 'transform 0.3s ease' }}>
      {pulling && (
        <div className="flex justify-center py-2">
          <div className="w-6 h-6 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
        </div>
      )}
      {children}
    </div>
  );
}
