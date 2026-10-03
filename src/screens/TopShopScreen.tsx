import { useEffect, useState, useRef } from 'react';
import {
  ShoppingBag, Coins, Check, X, Sparkles, TrendingUp, Plus, Search,
  Lock, Shield, Filter, Zap, AlertCircle, User,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { rateLimit } from '@/lib/security';
import toast from 'react-hot-toast';
import type { ShopItem, P2PListing, Profile } from '@/types';

const PROMO_BANNERS = [
  { title: 'P2P Marketplace Live!', desc: 'Buy and sell coins directly with other users', color: 'from-emerald-500 to-cyan-500' },
  { title: 'Mega Coin Sale!', desc: 'Get 20% bonus on all official coin packages', color: 'from-amber-500 to-orange-500' },
  { title: 'Boost Your Listing', desc: 'Spend 3-5 coins to feature your listing at the top', color: 'from-rose-500 to-pink-500' },
  { title: 'Weekend Promo', desc: 'Double coins on every purchase', color: 'from-violet-500 to-purple-500' },
];

const PAYMENT_METHODS = [
  { value: 'mobile_money', label: 'Mobile Money' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'crypto', label: 'Crypto' },
  { value: 'other', label: 'Other' },
];

type Tab = 'shop' | 'p2p' | 'sell';

export default function TopShopScreen() {
  const { profile } = useAuth();
  const [tab, setTab] = useState<Tab>('shop');
  const [items, setItems] = useState<ShopItem[]>([]);
  const [p2pListings, setP2pListings] = useState<P2PListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<ShopItem | null>(null);
  const [success, setSuccess] = useState(false);
  const [balance, setBalance] = useState(0);
  const [bannerIdx, setBannerIdx] = useState(0);

  // P2P filters
  const [p2pSearch, setP2pSearch] = useState('');
  const [p2pFilterMethod, setP2pFilterMethod] = useState<string>('all');
  const [p2pSortBy, setP2pSortBy] = useState<'price_asc' | 'price_desc' | 'amount_desc' | 'recent'>('recent');

  // Sell form
  const [sellAmount, setSellAmount] = useState('');
  const [sellPricePer1k, setSellPricePer1k] = useState('');
  const [sellPaymentMethod, setSellPaymentMethod] = useState<string>('mobile_money');

  // My listings
  const [myListings, setMyListings] = useState<P2PListing[]>([]);

  const fetchData = async () => {
    const { data: shopData } = await supabase.from('shop_items').select('*').eq('is_active', true).order('is_coin_package', { ascending: false }).order('sold_count', { ascending: false });
    setItems((shopData as ShopItem[]) || []);

    const { data: p2pData } = await supabase.from('p2p_listings').select('*, seller:profiles!p2p_listings_seller_id_fkey(*)').eq('status', 'active').order('is_boosted', { ascending: false }).order('created_at', { ascending: false });
    setP2pListings((p2pData as P2PListing[]) || []);

    if (profile) {
      const { data: w } = await supabase.from('wallets').select('balance').eq('user_id', profile.id).maybeSingle();
      setBalance((w as { balance: number })?.balance ?? profile.coins);

      const { data: mine } = await supabase.from('p2p_listings').select('*').eq('seller_id', profile.id).order('created_at', { ascending: false });
      setMyListings((mine as P2PListing[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [profile]);

  useEffect(() => {
    const timer = setInterval(() => {
      setBannerIdx((prev) => (prev + 1) % PROMO_BANNERS.length);
    }, 3500);
    return () => clearInterval(timer);
  }, []);

  const handlePurchase = async () => {
    if (!profile || !purchasing) return;
    if (balance < purchasing.price) {
      toast.error('Not enough coins for this purchase');
      return;
    }
    if (!rateLimit('shop_purchase', 5, 60000)) {
      toast.error('Too many purchases. Please slow down.');
      return;
    }
    try {
      const newBalance = balance - purchasing.price;
      await supabase.from('wallets').update({ balance: newBalance, total_spent: newBalance }).eq('user_id', profile.id);
      await supabase.from('transactions').insert({ user_id: profile.id, type: 'spend', amount: purchasing.price, description: `Purchased ${purchasing.name}` });
      await supabase.from('shop_purchases').insert({ user_id: profile.id, item_id: purchasing.id, price_paid: purchasing.price });
      await supabase.from('shop_items').update({ sold_count: purchasing.sold_count + 1, stock: purchasing.stock - 1 }).eq('id', purchasing.id);
      setBalance(newBalance);
      setSuccess(true);
      toast.success(`Purchased ${purchasing.name}!`);
      setTimeout(() => { setPurchasing(null); setSuccess(false); fetchData(); }, 1500);
    } catch {
      toast.error('Transaction failed. Please try again.');
    }
  };

  const handleCreateListing = async () => {
    if (!profile) return;
    const amount = parseInt(sellAmount);
    const pricePer1k = parseInt(sellPricePer1k);
    if (!amount || amount < 100) { toast.error('Minimum 100 coins per listing'); return; }
    if (!pricePer1k || pricePer1k < 1) { toast.error('Set a valid price per 1000 coins'); return; }
    if (amount > balance) { toast.error('You do not have enough coins to sell'); return; }
    if (!rateLimit('p2p_create', 3, 60000)) { toast.error('Too many listings. Please wait.'); return; }

    try {
      const totalPrice = Math.ceil((amount / 1000) * pricePer1k);

      // Lock coins in escrow
      const newBalance = balance - amount;
      await supabase.from('wallets').update({ balance: newBalance }).eq('user_id', profile.id);
      await supabase.from('transactions').insert({ user_id: profile.id, type: 'spend', amount, description: `Escrow lock for P2P listing` });

      const { data, error } = await supabase.from('p2p_listings').insert({
        seller_id: profile.id,
        coin_amount: amount,
        price_per_1k: pricePer1k,
        total_price: totalPrice,
        payment_method: sellPaymentMethod,
        status: 'active',
      }).select('*').single();

      if (data) {
        await supabase.from('escrow_holds').insert({
          listing_id: (data as P2PListing).id,
          seller_id: profile.id,
          coin_amount: amount,
          status: 'held',
        });
      }

      if (error) throw error;

      setBalance(newBalance);
      setSellAmount('');
      setSellPricePer1k('');
      toast.success(`${amount} coins locked in escrow. Listing is live!`);
      fetchData();
    } catch {
      toast.error('Failed to create listing. Please try again.');
    }
  };

  const handleCancelListing = async (listing: P2PListing) => {
    if (!profile) return;
    try {
      // Return coins minus 1% penalty
      const penalty = Math.ceil(listing.coin_amount * 0.01);
      const returned = listing.coin_amount - penalty;
      const newBalance = balance + returned;

      await supabase.from('wallets').update({ balance: newBalance }).eq('user_id', profile.id);
      await supabase.from('transactions').insert({ user_id: profile.id, type: 'earn', amount: returned, description: `Escrow return minus ${penalty} coin penalty` });
      await supabase.from('p2p_listings').update({ status: 'cancelled' }).eq('id', listing.id);
      await supabase.from('escrow_holds').update({ status: 'penalized', penalty_fee: penalty, released_at: new Date().toISOString() }).eq('listing_id', listing.id);

      setBalance(newBalance);
      toast.success(`Listing cancelled. ${returned} coins returned (${penalty} penalty).`);
      fetchData();
    } catch {
      toast.error('Failed to cancel listing.');
    }
  };

  const handleBoostListing = async (listing: P2PListing) => {
    if (!profile) return;
    if (balance < 3) { toast.error('Need at least 3 coins to boost'); return; }
    try {
      const newBalance = balance - 3;
      await supabase.from('wallets').update({ balance: newBalance }).eq('user_id', profile.id);
      await supabase.from('transactions').insert({ user_id: profile.id, type: 'spend', amount: 3, description: 'P2P listing boost' });
      await supabase.from('p2p_listings').update({ is_boosted: true, boost_expires_at: new Date(Date.now() + 86400000).toISOString() }).eq('id', listing.id);

      setBalance(newBalance);
      toast.success('Listing boosted to the top for 24 hours!');
      fetchData();
    } catch {
      toast.error('Boost failed.');
    }
  };

  const handleBuyP2P = async (listing: P2PListing) => {
    if (!profile) return;
    if (listing.seller_id === profile.id) { toast.error('You cannot buy your own listing'); return; }
    if (!confirm(`Buy ${listing.coin_amount} coins for ${listing.total_price} (via ${PAYMENT_METHODS.find(p => p.value === listing.payment_method)?.label})?`)) return;

    try {
      // Mark as sold
      await supabase.from('p2p_listings').update({ status: 'sold', buyer_id: profile.id }).eq('id', listing.id);
      await supabase.from('escrow_holds').update({ status: 'released', released_at: new Date().toISOString() }).eq('listing_id', listing.id);

      // Transfer coins to buyer
      const newBuyerBalance = balance + listing.coin_amount;
      await supabase.from('wallets').update({ balance: newBuyerBalance }).eq('user_id', profile.id);
      await supabase.from('transactions').insert({ user_id: profile.id, type: 'earn', amount: listing.coin_amount, description: `P2P purchase from seller` });

      // Add coins to seller's wallet (minus 10% platform commission)
      const commission = Math.ceil(listing.coin_amount * 0.10);
      const sellerEarnings = listing.coin_amount - commission;
      const { data: sellerWallet } = await supabase.from('wallets').select('balance').eq('user_id', listing.seller_id).maybeSingle();
      const sellerBalance = (sellerWallet as { balance: number })?.balance ?? 0;
      await supabase.from('wallets').update({ balance: sellerBalance + sellerEarnings, total_earned: sellerEarnings }).eq('user_id', listing.seller_id);
      await supabase.from('transactions').insert({ user_id: listing.seller_id, type: 'earn', amount: sellerEarnings, description: `P2P sale (minus ${commission} commission)` });

      setBalance(newBuyerBalance);
      toast.success(`Purchased ${listing.coin_amount} coins!`);
      fetchData();
    } catch {
      toast.error('Purchase failed. Please try again.');
    }
  };

  const filteredP2P = p2pListings
    .filter((l) => {
      if (p2pFilterMethod !== 'all' && l.payment_method !== p2pFilterMethod) return false;
      if (p2pSearch) {
        const sellerName = (l.seller as unknown as Profile)?.display_name?.toLowerCase() || '';
        return sellerName.includes(p2pSearch.toLowerCase()) || l.coin_amount.toString().includes(p2pSearch);
      }
      return true;
    })
    .sort((a, b) => {
      switch (p2pSortBy) {
        case 'price_asc': return a.total_price - b.total_price;
        case 'price_desc': return b.total_price - a.total_price;
        case 'amount_desc': return b.coin_amount - a.coin_amount;
        default: return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });

  if (loading) return <div className="text-center py-12 text-slate-500 text-sm">Loading shop...</div>;

  const coinPackages = items.filter((i) => i.is_coin_package);
  const otherItems = items.filter((i) => !i.is_coin_package);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <ShoppingBag size={20} className="text-cyan-400" />
          <h2 className="text-xl font-bold">Top Shop</h2>
        </div>
        <div className="flex items-center gap-1.5 bg-slate-800 px-3 py-1.5 rounded-full">
          <Coins size={14} className="text-amber-400" />
          <span className="text-sm font-semibold">{balance}</span>
        </div>
      </div>

      {/* Auto-scrolling promo banner */}
      <div className="relative overflow-hidden rounded-2xl mb-5 h-28">
        <div className="flex transition-transform duration-500 ease-out h-full" style={{ transform: `translateX(-${bannerIdx * 100}%)` }}>
          {PROMO_BANNERS.map((banner, idx) => (
            <div key={idx} className={`min-w-full h-full bg-gradient-to-r ${banner.color} p-4 flex flex-col justify-center`}>
              <h3 className="text-lg font-black text-white">{banner.title}</h3>
              <p className="text-sm text-white/80 mt-1">{banner.desc}</p>
            </div>
          ))}
        </div>
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
          {PROMO_BANNERS.map((_, idx) => (
            <div key={idx} className={`h-1.5 rounded-full transition-all ${idx === bannerIdx ? 'w-5 bg-white' : 'w-1.5 bg-white/40'}`} />
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        {([
          { key: 'shop' as Tab, label: 'Official Shop', icon: <ShoppingBag size={14} /> },
          { key: 'p2p' as Tab, label: 'P2P Market', icon: <TrendingUp size={14} /> },
          { key: 'sell' as Tab, label: 'Sell Coins', icon: <Plus size={14} /> },
        ]).map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold transition-all ${tab === t.key ? 'bg-cyan-500 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Shop Tab */}
      {tab === 'shop' && (
        <>
          {coinPackages.length > 0 && (
            <div className="mb-5">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles size={16} className="text-amber-400" />
                <h3 className="text-sm font-semibold text-slate-300">Official Coin Packages</h3>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {coinPackages.map((item) => (
                  <button key={item.id} onClick={() => setPurchasing(item)}
                    className="relative bg-gradient-to-br from-amber-500/20 to-orange-500/10 border border-amber-500/20 rounded-2xl p-4 text-left hover:scale-105 transition-transform">
                    {item.bonus_percent > 0 && (
                      <span className="absolute top-2 right-2 bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">+{item.bonus_percent}% BONUS</span>
                    )}
                    <div className="w-12 h-12 rounded-full bg-amber-500/30 flex items-center justify-center mb-2">
                      <Coins size={24} className="text-amber-400" />
                    </div>
                    <p className="text-lg font-black text-white">{item.name}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{item.description}</p>
                    <div className="flex items-center justify-between mt-3">
                      <span className="text-amber-400 font-bold text-sm">{item.price} coins</span>
                      <span className="text-xs text-slate-500">{item.sold_count} sold</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {otherItems.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp size={16} className="text-cyan-400" />
                <h3 className="text-sm font-semibold text-slate-300">Featured Items</h3>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {otherItems.map((item) => (
                  <div key={item.id} className="bg-slate-900 rounded-2xl border border-white/5 overflow-hidden">
                    <div className="aspect-square bg-gradient-to-br from-cyan-500/10 to-blue-500/10 flex items-center justify-center">
                      {item.image_url ? <img src={item.image_url} alt="" className="w-full h-full object-cover" /> : <ShoppingBag size={32} className="text-cyan-400/50" />}
                    </div>
                    <div className="p-3">
                      <p className="text-sm font-semibold truncate">{item.name}</p>
                      <p className="text-xs text-slate-500 truncate mb-2">{item.description}</p>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1 text-amber-400 font-bold text-sm"><Coins size={12} /> {item.price}</span>
                        <button onClick={() => setPurchasing(item)} disabled={item.stock <= 0}
                          className="bg-cyan-500 hover:bg-cyan-400 disabled:opacity-30 text-white text-xs font-semibold px-3 py-1.5 rounded-full transition-colors">
                          {item.stock > 0 ? 'Buy' : 'Sold Out'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {items.length === 0 && (
            <div className="text-center py-12">
              <ShoppingBag size={48} className="mx-auto text-slate-600 mb-3" />
              <p className="text-slate-500 text-sm">No items available yet. Check back soon!</p>
            </div>
          )}
        </>
      )}

      {/* P2P Tab */}
      {tab === 'p2p' && (
        <div>
          {/* Filters */}
          <div className="flex gap-2 mb-4 flex-wrap">
            <div className="relative flex-1 min-w-[140px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input value={p2pSearch} onChange={(e) => setP2pSearch(e.target.value)} placeholder="Search..."
                className="w-full bg-slate-800 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500/50" />
            </div>
            <select value={p2pFilterMethod} onChange={(e) => setP2pFilterMethod(e.target.value)}
              className="bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500/50">
              <option value="all">All Methods</option>
              {PAYMENT_METHODS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
            <select value={p2pSortBy} onChange={(e) => setP2pSortBy(e.target.value as typeof p2pSortBy)}
              className="bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500/50">
              <option value="recent">Most Recent</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="amount_desc">Most Coins</option>
            </select>
          </div>

          {filteredP2P.length === 0 ? (
            <div className="text-center py-12">
              <TrendingUp size={48} className="mx-auto text-slate-600 mb-3" />
              <p className="text-slate-500 text-sm">No P2P listings found.</p>
              <button onClick={() => setTab('sell')} className="mt-3 text-xs text-cyan-400 hover:text-cyan-300 font-medium">
                Be the first to list coins
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredP2P.map((listing) => {
                const seller = listing.seller as unknown as Profile;
                const isOwn = listing.seller_id === profile?.id;
                return (
                  <div key={listing.id} className={`bg-slate-900 rounded-xl border p-3 ${listing.is_boosted ? 'border-amber-500/40 shadow-lg shadow-amber-500/5' : 'border-white/5'}`}>
                    {listing.is_boosted && (
                      <div className="flex items-center gap-1 text-[10px] text-amber-400 font-bold mb-1">
                        <Zap size={10} /> BOOSTED
                      </div>
                    )}
                    <div className="flex items-center gap-3">
                      {seller?.avatar_url ? (
                        <img src={seller.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover" />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center text-xs font-semibold">
                          {seller?.display_name?.charAt(0) || 'U'}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{seller?.display_name || 'Unknown Seller'}</p>
                        <p className="text-xs text-slate-500">{PAYMENT_METHODS.find(p => p.value === listing.payment_method)?.label}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-black text-amber-400 flex items-center gap-1 justify-end"><Coins size={14} /> {listing.coin_amount}</p>
                        <p className="text-xs text-slate-500">{listing.total_price} per 1k</p>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-2">
                      {isOwn ? (
                        <>
                          <button onClick={() => handleCancelListing(listing)} className="flex-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-semibold py-2 rounded-lg transition-colors">
                            Cancel (1% penalty)
                          </button>
                          {!listing.is_boosted && (
                            <button onClick={() => handleBoostListing(listing)} className="flex-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 text-xs font-semibold py-2 rounded-lg transition-colors flex items-center justify-center gap-1">
                              <Zap size={12} /> Boost (3)
                            </button>
                          )}
                        </>
                      ) : (
                        <button onClick={() => handleBuyP2P(listing)} className="flex-1 bg-cyan-500 hover:bg-cyan-400 text-white text-xs font-semibold py-2 rounded-lg transition-colors">
                          Buy Now
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Sell Tab */}
      {tab === 'sell' && (
        <div>
          {/* Create listing */}
          <div className="bg-slate-900 rounded-2xl border border-white/5 p-4 mb-4">
            <div className="flex items-center gap-2 mb-3">
              <Plus size={16} className="text-cyan-400" />
              <h3 className="text-sm font-semibold">Create New Listing</h3>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Coin Amount (min 100)</label>
                <input type="number" value={sellAmount} onChange={(e) => setSellAmount(e.target.value)} placeholder="1000"
                  className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Price per 1000 coins</label>
                <input type="number" value={sellPricePer1k} onChange={(e) => setSellPricePer1k(e.target.value)} placeholder="5"
                  className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Payment Method</label>
                <select value={sellPaymentMethod} onChange={(e) => setSellPaymentMethod(e.target.value)}
                  className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50">
                  {PAYMENT_METHODS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </div>
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 flex items-start gap-2">
                <Lock size={14} className="text-amber-400 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-amber-300">Coins will be locked in escrow immediately. Cancelling returns coins minus a 1% penalty fee.</p>
              </div>
              <button onClick={handleCreateListing} className="w-full bg-cyan-500 hover:bg-cyan-400 text-white font-semibold py-3 rounded-xl text-sm transition-colors flex items-center justify-center gap-2">
                <Lock size={16} /> Lock in Escrow & List
              </button>
            </div>
          </div>

          {/* My listings */}
          <div>
            <h3 className="text-sm font-semibold text-slate-300 mb-2">Your Active Listings</h3>
            {myListings.length === 0 ? (
              <p className="text-center text-slate-500 text-sm py-6">No listings yet. Create one above!</p>
            ) : (
              <div className="space-y-2">
                {myListings.map((listing) => (
                  <div key={listing.id} className="bg-slate-900 rounded-xl border border-white/5 p-3 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-amber-500/20 flex items-center justify-center">
                      <Coins size={16} className="text-amber-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold">{listing.coin_amount} coins</p>
                      <p className="text-xs text-slate-500">{listing.total_price} per 1k · {PAYMENT_METHODS.find(p => p.value === listing.payment_method)?.label}</p>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                      listing.status === 'active' ? 'bg-emerald-500/20 text-emerald-400' :
                      listing.status === 'sold' ? 'bg-red-500/20 text-red-400' :
                      'bg-slate-700 text-slate-400'
                    }`}>{listing.status.toUpperCase()}</span>
                    {listing.status === 'active' && (
                      <button onClick={() => handleCancelListing(listing)} className="text-xs text-red-400 hover:text-red-300 font-medium">
                        Cancel
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Purchase Modal */}
      {purchasing && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setPurchasing(null)}>
          <div className="bg-slate-900 rounded-3xl border border-white/10 p-6 w-full max-w-sm text-center" onClick={(e) => e.stopPropagation()}>
            {success ? (
              <>
                <div className="w-16 h-16 mx-auto bg-emerald-500/20 rounded-full flex items-center justify-center mb-3">
                  <Check size={32} className="text-emerald-400" />
                </div>
                <h3 className="text-lg font-bold">Purchase Successful!</h3>
                <p className="text-sm text-slate-400 mt-1">You bought {purchasing.name}</p>
              </>
            ) : (
              <>
                <div className="w-16 h-16 mx-auto bg-amber-500/20 rounded-full flex items-center justify-center mb-3">
                  <Coins size={32} className="text-amber-400" />
                </div>
                <h3 className="text-lg font-bold">Buy {purchasing.name}?</h3>
                <p className="text-sm text-slate-400 mt-1 mb-4">This will cost {purchasing.price} coins</p>
                {balance < purchasing.price && (
                  <p className="text-xs text-red-400 mb-3">You don't have enough coins!</p>
                )}
                <div className="flex gap-2">
                  <button onClick={() => setPurchasing(null)} className="flex-1 bg-slate-800 text-slate-400 hover:text-white py-2.5 rounded-xl text-sm font-semibold transition-colors">Cancel</button>
                  <button onClick={handlePurchase} disabled={balance < purchasing.price} className="flex-1 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-30 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors">Confirm</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
