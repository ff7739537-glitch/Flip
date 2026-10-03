import { useEffect, useState } from 'react';
import { Wallet, Coins, Plus, ArrowUpRight, Shield, X, Check } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { validateAmount } from '@/lib/security';
import type { Wallet as WalletType } from '@/types';

export default function WalletScreen() {
  const { profile } = useAuth();
  const [wallet, setWallet] = useState<WalletType | null>(null);
  const [loading, setLoading] = useState(true);
  const [topupOpen, setTopupOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchWallet = async () => {
    if (!profile) return;
    const { data: w } = await supabase.from('wallets').select('*').eq('user_id', profile.id).maybeSingle();
    setWallet(w as WalletType | null);
    setLoading(false);
  };

  useEffect(() => { if (profile) fetchWallet(); }, [profile]);

  const handleTopup = async () => {
    if (!profile || !wallet) return;
    const check = validateAmount(amount);
    if (!check.valid) {
      setError(check.error || 'Invalid amount');
      return;
    }
    const amt = check.value!;
    setError(null);
    await supabase.from('wallets').update({ balance: wallet.balance + amt, total_earned: wallet.total_earned + amt }).eq('id', wallet.id);
    await supabase.from('transactions').insert({ user_id: profile.id, type: 'topup', amount: amt, description: 'Wallet top-up' });
    setSuccess(true);
    setTimeout(() => { setTopupOpen(false); setSuccess(false); setAmount(''); fetchWallet(); }, 1200);
  };

  const handleWithdraw = async () => {
    if (!profile || !wallet) return;
    const check = validateAmount(amount, wallet.balance);
    if (!check.valid) {
      setError(check.error || 'Invalid amount');
      return;
    }
    const amt = check.value!;
    setError(null);
    await supabase.from('wallets').update({ balance: wallet.balance - amt, total_spent: wallet.total_spent + amt }).eq('id', wallet.id);
    await supabase.from('transactions').insert({ user_id: profile.id, type: 'payout', amount: amt, description: 'Wallet withdrawal' });
    setSuccess(true);
    setTimeout(() => { setWithdrawOpen(false); setSuccess(false); setAmount(''); fetchWallet(); }, 1200);
  };

  if (loading) return <div className="text-center py-12 text-slate-500 text-sm">Loading wallet...</div>;

  return (
    <div className="space-y-4 max-w-md mx-auto">
      {/* Balance Card */}
      <div className="relative bg-gradient-to-br from-emerald-600 via-emerald-500 to-cyan-500 rounded-3xl p-6 overflow-hidden">
        <div className="absolute -top-8 -right-8 w-32 h-32 bg-white/10 rounded-full" />
        <div className="absolute -bottom-12 -left-4 w-24 h-24 bg-white/5 rounded-full" />
        <div className="relative">
          <div className="flex items-center gap-2 text-white/80 mb-2">
            <Wallet size={18} />
            <span className="text-sm font-medium">Your Balance</span>
          </div>
          <div className="flex items-baseline gap-2">
            <Coins size={36} className="text-amber-300" />
            <span className="text-5xl font-black text-white">{wallet?.balance ?? 0}</span>
            <span className="text-sm text-white/70 ml-1">coins</span>
          </div>
          <div className="flex items-center gap-1.5 mt-3 text-white/60 text-xs">
            <Shield size={12} />
            <span>Secured by FLIP Wallet</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => setTopupOpen(true)}
          className="bg-slate-900 hover:bg-slate-800 border border-white/5 rounded-2xl p-4 flex flex-col items-center gap-2 transition-colors"
        >
          <div className="w-11 h-11 rounded-full bg-emerald-500/20 flex items-center justify-center">
            <Plus size={22} className="text-emerald-400" />
          </div>
          <span className="text-sm font-semibold">Top Up</span>
        </button>
        <button
          onClick={() => setWithdrawOpen(true)}
          className="bg-slate-900 hover:bg-slate-800 border border-white/5 rounded-2xl p-4 flex flex-col items-center gap-2 transition-colors"
        >
          <div className="w-11 h-11 rounded-full bg-cyan-500/20 flex items-center justify-center">
            <ArrowUpRight size={22} className="text-cyan-400" />
          </div>
          <span className="text-sm font-semibold">Withdraw</span>
        </button>
      </div>

      {/* Info card */}
      <div className="bg-slate-900 rounded-2xl border border-white/5 p-4">
        <h3 className="text-sm font-semibold text-slate-300 mb-2">Wallet Summary</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-800/50 rounded-xl p-3">
            <p className="text-xs text-slate-500">Total Earned</p>
            <p className="text-lg font-bold text-emerald-400 mt-1">{wallet?.total_earned ?? 0}</p>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-3">
            <p className="text-xs text-slate-500">Total Spent</p>
            <p className="text-lg font-bold text-red-400 mt-1">{wallet?.total_spent ?? 0}</p>
          </div>
        </div>
      </div>

      {/* Top Up Modal */}
      {topupOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setTopupOpen(false)}>
          <div className="bg-slate-900 rounded-3xl border border-white/10 p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            {success ? (
              <div className="text-center py-6">
                <div className="w-16 h-16 mx-auto bg-emerald-500/20 rounded-full flex items-center justify-center mb-3">
                  <Check size={32} className="text-emerald-400" />
                </div>
                <h3 className="text-lg font-bold">Top Up Successful!</h3>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold">Top Up Coins</h3>
                  <button onClick={() => setTopupOpen(false)}><X size={20} /></button>
                </div>
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {[100, 500, 1000, 2000, 5000, 10000].map((amt) => (
                    <button
                      key={amt}
                      onClick={() => setAmount(String(amt))}
                      className={`bg-slate-800 hover:bg-emerald-500/20 border rounded-xl py-2.5 text-sm font-semibold transition-all ${
                        amount === String(amt) ? 'border-emerald-500/50 bg-emerald-500/20' : 'border-white/10'
                      }`}
                    >
                      {amt}
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Custom amount"
                  className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-3 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                />
                {error && <p className="text-xs text-red-400 mb-3">{error}</p>}
                <button
                  onClick={handleTopup}
                  disabled={!amount}
                  className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-30 text-white font-semibold py-3 rounded-xl transition-colors"
                >
                  Confirm Top Up
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Withdraw Modal */}
      {withdrawOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setWithdrawOpen(false)}>
          <div className="bg-slate-900 rounded-3xl border border-white/10 p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            {success ? (
              <div className="text-center py-6">
                <div className="w-16 h-16 mx-auto bg-cyan-500/20 rounded-full flex items-center justify-center mb-3">
                  <Check size={32} className="text-cyan-400" />
                </div>
                <h3 className="text-lg font-bold">Withdrawal Processed!</h3>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold">Withdraw Coins</h3>
                  <button onClick={() => setWithdrawOpen(false)}><X size={20} /></button>
                </div>
                <p className="text-xs text-slate-400 mb-3">Available: {wallet?.balance ?? 0} coins</p>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Amount to withdraw"
                  className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-3 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                />
                {amount && parseInt(amount) > (wallet?.balance ?? 0) && (
                  <p className="text-xs text-red-400 mb-3">Insufficient balance!</p>
                )}
                {error && <p className="text-xs text-red-400 mb-3">{error}</p>}
                <button
                  onClick={handleWithdraw}
                  disabled={!amount || parseInt(amount) > (wallet?.balance ?? 0)}
                  className="w-full bg-cyan-500 hover:bg-cyan-400 disabled:opacity-30 text-white font-semibold py-3 rounded-xl transition-colors"
                >
                  Confirm Withdrawal
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
