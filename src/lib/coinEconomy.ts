import { supabase } from '@/lib/supabase';
import { rateLimit } from '@/lib/security';
import type { Profile } from '@/types';

export async function spendCoins(userId: string, amount: number, description: string): Promise<{ success: boolean; newBalance: number | null; error?: string }> {
  if (!rateLimit('coin_spend', 10, 60000)) {
    return { success: false, newBalance: null, error: 'Rate limit exceeded. Please slow down.' };
  }

  try {
    const { data: wallet, error: wError } = await supabase.from('wallets').select('balance').eq('user_id', userId).maybeSingle();
    if (wError) throw wError;
    const balance = (wallet as { balance: number })?.balance ?? 0;
    if (balance < amount) {
      return { success: false, newBalance: balance, error: 'Insufficient coins' };
    }
    const newBalance = balance - amount;
    const { error: updateError } = await supabase.from('wallets').update({ balance: newBalance, total_spent: newBalance }).eq('user_id', userId);
    if (updateError) throw updateError;
    await supabase.from('transactions').insert({ user_id: userId, type: 'spend', amount, description });
    return { success: true, newBalance };
  } catch {
    return { success: false, newBalance: null, error: 'Transaction failed' };
  }
}

export async function earnCoins(userId: string, amount: number, description: string): Promise<{ success: boolean; newBalance: number | null }> {
  try {
    const { data: wallet } = await supabase.from('wallets').select('balance').eq('user_id', userId).maybeSingle();
    const balance = (wallet as { balance: number })?.balance ?? 0;
    const newBalance = balance + amount;
    await supabase.from('wallets').update({ balance: newBalance, total_earned: newBalance }).eq('user_id', userId);
    await supabase.from('transactions').insert({ user_id: userId, type: 'earn', amount, description });
    return { success: true, newBalance };
  } catch {
    return { success: false, newBalance: null };
  }
}

export async function watchToEarn(userId: string, adId: string | null): Promise<{ earned: number; error?: string }> {
  if (!rateLimit('watch_to_earn', 5, 300000)) {
    return { earned: 0, error: 'You have earned enough from ads for now. Come back later.' };
  }
  try {
    const earned = 1;
    await supabase.from('ad_watches').insert({ user_id: userId, ad_id: adId, coins_earned: earned });
    const result = await earnCoins(userId, earned, 'Watch-to-earn reward');
    return { earned: result.success ? earned : 0, error: result.success ? undefined : 'Failed to credit coins' };
  } catch {
    return { earned: 0, error: 'Failed to process reward' };
  }
}

export async function checkLikeMilestone(postId: string, authorId: string, currentLikes: number): Promise<{ awarded: boolean; coins: number }> {
  const milestones = [500, 1000, 5000, 10000];
  for (const milestone of milestones) {
    if (currentLikes >= milestone) {
      const { data: existing } = await supabase.from('like_milestones').select('*').eq('post_id', postId).eq('milestone', milestone).maybeSingle();
      if (!existing) {
        const coins = milestone >= 10000 ? 200 : milestone >= 5000 ? 100 : 50;
        await supabase.from('like_milestones').insert({ post_id: postId, user_id: authorId, milestone, coins_awarded: coins });
        await earnCoins(authorId, coins, `Like milestone: ${milestone} likes!`);
        return { awarded: true, coins };
      }
    }
  }
  return { awarded: false, coins: 0 };
}

export async function boostContent(userId: string, targetType: 'post' | 'listing' | 'ad' | 'reel', targetId: string, coinsSpent: number): Promise<{ success: boolean; error?: string }> {
  if (coinsSpent < 2 || coinsSpent > 5) {
    return { success: false, error: 'Boost cost must be between 2 and 5 coins' };
  }
  const result = await spendCoins(userId, coinsSpent, `Boosted ${targetType}`);
  if (!result.success) {
    return { success: false, error: result.error };
  }
  await supabase.from('coin_boosts').insert({
    user_id: userId,
    target_type: targetType,
    target_id: targetId,
    coins_spent: coinsSpent,
    boost_position: Date.now(),
  });
  return { success: true };
}

export async function createNotification(userId: string, type: string, title: string, body: string, targetType?: string, targetId?: string): Promise<void> {
  try {
    await supabase.from('notifications').insert({
      user_id: userId,
      type,
      title,
      body,
      target_type: targetType || null,
      target_id: targetId || null,
    });
  } catch {
    // non-blocking
  }
}

export function getProfileInitials(profile: Profile | null): string {
  if (!profile) return 'U';
  return profile.display_name.charAt(0).toUpperCase();
}
