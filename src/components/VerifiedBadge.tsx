import { BadgeCheck } from 'lucide-react';
import type { Profile } from '@/types';

interface Props {
  profile?: Pick<Profile, 'is_verified' | 'role'> | null;
  size?: number;
  className?: string;
}

export default function VerifiedBadge({ profile, size = 14, className = '' }: Props) {
  if (!profile) return null;
  const isVerified = profile.is_verified || profile.role === 'admin' || profile.role === 'moderator';
  if (!isVerified) return null;
  return <BadgeCheck size={size} className={`text-sky-400 flex-shrink-0 ${className}`} />;
}
