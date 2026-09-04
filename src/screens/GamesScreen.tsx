import { useEffect, useState } from 'react';
import { Gamepad2, Play, Star, Coins, TrendingUp, Trophy, Zap, ArrowLeft, Dice5, Target, Crown, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { rateLimit } from '@/lib/security';
import toast from 'react-hot-toast';
import type { Game } from '@/types';

type BetType = 'over_under' | 'correct_score' | 'jackpot';
type GameMode = 'list' | 'betting' | 'playing';

interface BetOption {
  label: string;
  multiplier: number;
  winChance: number;
}

const BET_GAMES: { type: BetType; label: string; icon: typeof Dice5; options: BetOption[] }[] = [
  {
    type: 'over_under',
    label: 'Over/Under',
    icon: Target,
    options: [
      { label: 'Over 50', multiplier: 1.9, winChance: 0.5 },
      { label: 'Under 50', multiplier: 1.9, winChance: 0.5 },
    ],
  },
  {
    type: 'correct_score',
    label: 'Correct Score',
    icon: Trophy,
    options: [
      { label: 'Exact 7', multiplier: 5, winChance: 0.2 },
      { label: 'Exact 3', multiplier: 3.5, winChance: 0.28 },
      { label: 'Exact 0', multiplier: 10, winChance: 0.1 },
    ],
  },
  {
    type: 'jackpot',
    label: 'Jackpot',
    icon: Crown,
    options: [
      { label: 'Mega Jackpot', multiplier: 50, winChance: 0.02 },
      { label: 'Mini Jackpot', multiplier: 10, winChance: 0.1 },
    ],
  },
];

export default function GamesScreen() {
  const { profile } = useAuth();
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<GameMode>('list');
  const [playing, setPlaying] = useState<Game | null>(null);
  const [balance, setBalance] = useState(0);
  const [activeBetType, setActiveBetType] = useState<BetType | null>(null);
  const [stake, setStake] = useState('5');
  const [selectedOption, setSelectedOption] = useState<number>(-1);
  const [betResult, setBetResult] = useState<{ won: boolean; amount: number; roll: number } | null>(null);
  const [betting, setBetting] = useState(false);

  const fetchGames = async () => {
    const { data } = await supabase.from('games').select('*').order('play_count', { ascending: false });
    setGames((data as Game[]) || []);
    setLoading(false);
  };

  const fetchBalance = async () => {
    if (!profile) return;
    const { data: w } = await supabase.from('wallets').select('balance').eq('user_id', profile.id).maybeSingle();
    setBalance((w as { balance: number })?.balance ?? profile.coins);
  };

  useEffect(() => {
    fetchGames();
    fetchBalance();
  }, [profile]);

  const handlePlay = async (game: Game) => {
    setPlaying(game);
    setMode('playing');
    await supabase.from('games').update({ play_count: game.play_count + 1 }).eq('id', game.id);
  };

  const handleStartBetting = (type: BetType) => {
    setActiveBetType(type);
    setSelectedOption(-1);
    setBetResult(null);
    setStake('5');
    setMode('betting');
  };

  const handlePlaceBet = async () => {
    if (!profile || !activeBetType || selectedOption < 0) return;
    const stakeNum = parseInt(stake);
    if (!stakeNum || stakeNum < 2) { toast.error('Minimum stake is 2 coins'); return; }
    if (stakeNum > 50) { toast.error('Maximum stake is 50 coins'); return; }
    if (stakeNum > balance) { toast.error('Not enough coins'); return; }
    if (!rateLimit('game_bet', 10, 60000)) { toast.error('Too many bets. Slow down.'); return; }

    setBetting(true);
    setBetResult(null);

    try {
      const betGame = BET_GAMES.find((g) => g.type === activeBetType)!;
      const option = betGame.options[selectedOption];
      const roll = Math.random();
      const won = roll < option.winChance;
      const payout = won ? Math.ceil(stakeNum * option.multiplier) : 0;
      const netChange = won ? payout - stakeNum : -stakeNum;

      const newBalance = balance + netChange;
      await supabase.from('wallets').update({
        balance: newBalance,
        total_spent: won ? balance : newBalance,
        total_earned: won ? (balance + payout) : balance,
      }).eq('user_id', profile.id);

      await supabase.from('transactions').insert({
        user_id: profile.id,
        type: won ? 'earn' : 'spend',
        amount: won ? payout : stakeNum,
        description: won
          ? `Won ${betGame.label} bet (${option.label}) - ${payout} coins!`
          : `Lost ${betGame.label} bet (${option.label}) - ${stakeNum} coins`,
      });

      setBalance(newBalance);
      setBetResult({ won, amount: won ? payout : stakeNum, roll: Math.floor(roll * 100) });

      if (won) {
        toast.success(`You won ${payout} coins!`);
      } else {
        toast.error(`You lost ${stakeNum} coins. Try again!`);
      }
    } catch {
      toast.error('Bet failed. Please try again.');
    } finally {
      setBetting(false);
    }
  };

  if (loading) return <div className="text-center py-12 text-slate-500 text-sm">Loading games...</div>;

  if (mode === 'betting' && activeBetType) {
    const betGame = BET_GAMES.find((g) => g.type === activeBetType)!;
    const BetIcon = betGame.icon;
    return (
      <div>
        <div className="flex items-center gap-3 mb-5">
          <button onClick={() => setMode('list')} className="p-2 rounded-full bg-slate-800 hover:bg-slate-700 transition-colors">
            <ArrowLeft size={18} />
          </button>
          <div className="flex items-center gap-2">
            <BetIcon size={20} className="text-amber-400" />
            <h2 className="text-xl font-bold">{betGame.label}</h2>
          </div>
          <div className="ml-auto flex items-center gap-1.5 bg-slate-800 px-3 py-1.5 rounded-full">
            <Coins size={14} className="text-amber-400" />
            <span className="text-sm font-semibold">{balance}</span>
          </div>
        </div>

        {betResult && (
          <div className={`rounded-2xl p-5 mb-4 text-center ${betResult.won ? 'bg-emerald-500/15 border border-emerald-500/30' : 'bg-red-500/10 border border-red-500/20'}`}>
            <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-3 ${betResult.won ? 'bg-emerald-500/20' : 'bg-red-500/20'}`}>
              {betResult.won ? <Trophy size={32} className="text-emerald-400" /> : <X size={32} className="text-red-400" />}
            </div>
            <p className="text-lg font-black">{betResult.won ? `You won ${betResult.amount} coins!` : `You lost ${betResult.amount} coins`}</p>
            <p className="text-xs text-slate-400 mt-1">Roll: {betResult.roll}</p>
            <button onClick={() => { setBetResult(null); setSelectedOption(-1); }}
              className="mt-3 bg-slate-800 hover:bg-slate-700 text-white text-sm font-semibold px-5 py-2 rounded-full transition-colors">
              Bet Again
            </button>
          </div>
        )}

        {!betResult && (
          <>
            <div className="space-y-2 mb-4">
              <p className="text-xs text-slate-400 mb-2">Choose your bet:</p>
              {betGame.options.map((opt, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedOption(idx)}
                  className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all ${
                    selectedOption === idx
                      ? 'bg-amber-500/15 border-amber-500/40'
                      : 'bg-slate-900 border-white/5 hover:border-white/10'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <BetIcon size={20} className={selectedOption === idx ? 'text-amber-400' : 'text-slate-500'} />
                    <div className="text-left">
                      <p className="text-sm font-semibold">{opt.label}</p>
                      <p className="text-xs text-slate-500">{Math.round(opt.winChance * 100)}% win chance</p>
                    </div>
                  </div>
                  <span className="text-lg font-black text-amber-400">{opt.multiplier}x</span>
                </button>
              ))}
            </div>

            <div className="bg-slate-900 rounded-2xl border border-white/5 p-4 space-y-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Stake (2-50 coins)</label>
                <div className="flex gap-2">
                  {[5, 10, 25, 50].map((amt) => (
                    <button
                      key={amt}
                      onClick={() => setStake(String(amt))}
                      className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${
                        stake === String(amt) ? 'bg-amber-500/20 border border-amber-500/40 text-amber-400' : 'bg-slate-800 border border-white/10 text-slate-400'
                      }`}
                    >
                      {amt}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Or enter custom amount</label>
                <input
                  type="number"
                  value={stake}
                  onChange={(e) => setStake(e.target.value)}
                  min={2}
                  max={50}
                  className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                />
              </div>
              {selectedOption >= 0 && parseInt(stake) > 0 && (
                <div className="bg-slate-800/50 rounded-xl p-3 flex items-center justify-between">
                  <span className="text-xs text-slate-400">Potential payout</span>
                  <span className="text-lg font-bold text-emerald-400">
                    {Math.ceil(parseInt(stake) * betGame.options[selectedOption].multiplier)} coins
                  </span>
                </div>
              )}
              <button
                onClick={handlePlaceBet}
                disabled={selectedOption < 0 || betting || !stake}
                className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-30 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {betting ? <><Zap size={18} className="animate-pulse" /> Rolling...</> : <><Zap size={18} /> Place Bet</>}
              </button>
            </div>
          </>
        )}
      </div>
    );
  }

  if (mode === 'playing' && playing) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col" onClick={() => { setPlaying(null); setMode('list'); }}>
        <div className="flex items-center justify-between p-4 border-b border-white/5">
          <h3 className="text-lg font-bold text-white">{playing.name}</h3>
          <button onClick={() => { setPlaying(null); setMode('list'); }} className="text-slate-400 hover:text-white text-sm">Close</button>
        </div>
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center">
            <Gamepad2 size={64} className="mx-auto text-emerald-400/30 mb-4" />
            <p className="text-white font-semibold text-lg">{playing.name}</p>
            <p className="text-slate-400 text-sm mt-2 max-w-xs">{playing.description}</p>
            <p className="text-slate-500 text-xs mt-4">Game starting...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Gamepad2 size={20} className="text-emerald-400" />
          <h2 className="text-xl font-bold">Games</h2>
        </div>
        <div className="flex items-center gap-1.5 bg-slate-800 px-3 py-1.5 rounded-full">
          <Coins size={14} className="text-amber-400" />
          <span className="text-sm font-semibold">{balance}</span>
        </div>
      </div>

      {/* Betting section */}
      <div className="mb-5">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp size={16} className="text-amber-400" />
          <h3 className="text-sm font-semibold text-slate-300">Coin Staking & Betting</h3>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {BET_GAMES.map((bg) => {
            const Icon = bg.icon;
            return (
              <button
                key={bg.type}
                onClick={() => handleStartBetting(bg.type)}
                className="bg-gradient-to-br from-amber-500/15 to-orange-500/5 border border-amber-500/20 rounded-2xl p-3 text-center hover:scale-105 transition-transform"
              >
                <div className="w-10 h-10 mx-auto rounded-full bg-amber-500/20 flex items-center justify-center mb-2">
                  <Icon size={20} className="text-amber-400" />
                </div>
                <p className="text-xs font-bold">{bg.label}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">{bg.options[0].multiplier}x-{bg.options[bg.options.length - 1].multiplier}x</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Available games */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Gamepad2 size={16} className="text-emerald-400" />
          <h3 className="text-sm font-semibold text-slate-300">Mini-Games</h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {games.map((game) => (
            <button
              key={game.id}
              onClick={() => handlePlay(game)}
              className="bg-slate-900 rounded-2xl border border-white/5 overflow-hidden hover:border-emerald-500/30 transition-all group"
            >
              <div className="aspect-square bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 flex items-center justify-center relative">
                {game.image_url ? (
                  <img src={game.image_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <Gamepad2 size={32} className="text-emerald-400/50" />
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <div className="w-12 h-12 rounded-full bg-emerald-500 flex items-center justify-center">
                    <Play size={20} className="text-white ml-1" fill="white" />
                  </div>
                </div>
              </div>
              <div className="p-3">
                <p className="text-sm font-semibold truncate">{game.name}</p>
                <p className="text-xs text-slate-500 truncate">{game.description}</p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full">{game.category}</span>
                  <span className="text-[10px] text-slate-500 flex items-center gap-0.5">
                    <Star size={10} className="text-amber-400" />
                    {(game.play_count / 1000).toFixed(1)}k
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
        {games.length === 0 && (
          <div className="text-center py-12">
            <Gamepad2 size={48} className="mx-auto text-slate-600 mb-3" />
            <p className="text-slate-500 text-sm">No games available yet. Check back soon!</p>
          </div>
        )}
      </div>
    </div>
  );
}
