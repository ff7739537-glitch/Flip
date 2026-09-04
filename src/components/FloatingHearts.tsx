import { useCallback, useEffect, useState } from 'react';
import { Heart } from 'lucide-react';

interface FloatingHeart {
  id: number;
  x: number;
  scale: number;
  delay: number;
}

let heartId = 0;

export function useDoubleTapLike(onLike: () => void) {
  const [hearts, setHearts] = useState<FloatingHeart[]>([]);
  const [lastTap, setLastTap] = useState(0);

  const handleTap = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const now = Date.now();
    const isDouble = now - lastTap < 350;
    setLastTap(now);

    if (isDouble) {
      let x = 50;
      if ('touches' in e && e.touches.length > 0) {
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        x = ((e.touches[0].clientX - rect.left) / rect.width) * 100;
      } else if ('clientX' in e) {
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        x = ((e.clientX - rect.left) / rect.width) * 100;
      }

      const newHearts: FloatingHeart[] = [];
      for (let i = 0; i < 6; i++) {
        newHearts.push({
          id: heartId++,
          x: x + (Math.random() * 30 - 15),
          scale: 0.6 + Math.random() * 0.8,
          delay: i * 80,
        });
      }
      setHearts((prev) => [...prev, ...newHearts]);
      onLike();
    }
  }, [lastTap, onLike]);

  useEffect(() => {
    if (hearts.length === 0) return;
    const timer = setTimeout(() => setHearts([]), 2000);
    return () => clearTimeout(timer);
  }, [hearts]);

  return { handleTap, hearts };
}

export function FloatingHeartsOverlay({ hearts }: { hearts: FloatingHeart[] }) {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {hearts.map((h) => (
        <div
          key={h.id}
          className="absolute bottom-0"
          style={{ left: `${h.x}%`, transform: `translateX(-50%) scale(${h.scale})` }}
        >
          <Heart
            size={28}
            className="text-red-500 fill-red-500 animate-[floatUp_1.8s_ease-out_forwards]"
            style={{ animationDelay: `${h.delay}ms` }}
          />
        </div>
      ))}
    </div>
  );
}
