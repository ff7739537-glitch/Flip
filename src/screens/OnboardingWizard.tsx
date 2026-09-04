import { useState, useEffect, useRef } from 'react';
import {
  Loader2, AlertCircle, Check, ChevronRight, ChevronLeft, User, Mail,
  Lock, Phone, Shield, Camera, Sparkles, UserPlus, X, MessageSquare,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { getDeviceFingerprint, validateEmail, validatePassword, rateLimit, sanitizeFreeText } from '@/lib/security';
import type { Profile } from '@/types';

type Step = 1 | 2 | 3 | 4 | 5;

const TERMS_TEXT = `FLIP Terms of Service & Liability Waiver

1. Acceptance of Terms
By creating an account on FLIP, you agree to be bound by these Terms of Service. If you do not agree, do not use the platform.

2. User Responsibilities
- You must be at least 13 years old to use FLIP.
- You are responsible for maintaining the confidentiality of your account credentials.
- You agree not to post harmful, illegal, or offensive content.
- You agree not to use FLIP for fraudulent activities, including coin exploitation or P2P marketplace fraud.

3. Coin Economy
- FLIP Coins are a virtual currency with no real-world monetary value unless exchanged through the P2P marketplace.
- The platform retains a 10-15% commission on all coin transactions including live streaming and gaming.
- Coin balances are non-transferable except through official platform mechanisms.

4. Content & Privacy
- You retain ownership of your content but grant FLIP a license to display it.
- Media content (images, videos, live streams) auto-delete after 48 hours.
- Text stories are retained for 21 days. Direct messages auto-delete after 4-5 days.

5. Prohibited Activities
- Creating more than 2 accounts per device is strictly prohibited.
- Screen recording or downloading live streams is forbidden (DRM protected).
- Spam, bot farming, and automated exploitation will result in permanent bans.

6. Liability Waiver
FLIP is provided "as is" without warranties of any kind. The platform is not liable for:
- Loss of virtual coins or data due to technical issues
- User-generated content or interactions between users
- Marketplace disputes between users (P2P transactions)

7. Account Dormancy
Inactive accounts (1+ month) may be compressed and eventually purged after 2 months of inactivity.

8. Termination
FLIP reserves the right to suspend or terminate accounts that violate these terms.

By checking the box, you acknowledge you have read and understood these terms.`;

export default function OnboardingWizard() {
  const { refreshProfile } = useAuth();
  const [step, setStep] = useState<Step>(1);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Step 1: credentials
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');

  // Step 2: terms
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [showTermsPage, setShowTermsPage] = useState(false);

  // Step 3: OTP
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [otpVerified, setOtpVerified] = useState(false);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Step 4: profile
  const [avatarUrl, setAvatarUrl] = useState('');
  const [bio, setBio] = useState('');

  // Step 5: connect
  const [suggestedUsers, setSuggestedUsers] = useState<Profile[]>([]);
  const [following, setFollowing] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (step === 5) {
      (async () => {
        const { data } = await supabase.from('profiles').select('*').limit(10).order('created_at', { ascending: false });
        setSuggestedUsers((data as Profile[]) || []);
      })();
    }
  }, [step]);

  const generateOtp = (): string => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
    return code;
  };

  const handleStep1Next = () => {
    setError(null);
    if (!username.trim() || !email.trim() || !password.trim() || !phone.trim()) {
      setError('Please fill in all fields.');
      return;
    }
    if (!validateEmail(email)) {
      setError('Please enter a valid email address.');
      return;
    }
    const pwCheck = validatePassword(password);
    if (!pwCheck.valid) {
      setError(pwCheck.message || 'Password is invalid.');
      return;
    }
    if (!rateLimit('signup_attempt', 3, 60000)) {
      setError('Too many attempts. Please wait a minute and try again.');
      return;
    }
    setStep(2);
  };

  const handleStep2Next = () => {
    setError(null);
    if (!agreedToTerms) {
      setError('You must agree to the Terms and Conditions to continue.');
      return;
    }
    const code = generateOtp();
    setGeneratedOtp(code);
    setStep(3);
  };

  const handleOtpChange = (idx: number, value: string) => {
    if (!/^[A-Za-z0-9]?$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[idx] = value.toUpperCase();
    setOtp(newOtp);

    if (value && idx < 5) {
      otpRefs.current[idx + 1]?.focus();
    }

    // Auto-advance when all 6 filled
    if (newOtp.every((c) => c !== '') && newOtp.join('') === generatedOtp) {
      setOtpVerified(true);
      setTimeout(() => setStep(4), 800);
    } else if (newOtp.every((c) => c !== '') && newOtp.join('') !== generatedOtp) {
      setError('Incorrect code. Please try again.');
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').trim().toUpperCase().slice(0, 6);
    if (pasted.length === 6 && /^[A-Za-z0-9]{6}$/.test(pasted)) {
      const newOtp = pasted.split('');
      setOtp(newOtp);
      if (newOtp.join('') === generatedOtp) {
        setOtpVerified(true);
        setTimeout(() => setStep(4), 800);
      }
    }
  };

  const handleOtpKeyDown = (idx: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[idx] && idx > 0) {
      otpRefs.current[idx - 1]?.focus();
    }
  };

  const handleComplete = async () => {
    setError(null);
    setLoading(true);

    try {
      const deviceFp = getDeviceFingerprint();

      // Check device limit (max 2 accounts per device)
      const { count: deviceCount } = await supabase
        .from('device_registrations')
        .select('*', { count: 'exact', head: true })
        .eq('device_fingerprint', deviceFp);

      if (deviceCount !== null && deviceCount >= 2) {
        setError('This device has reached the maximum of 2 accounts. This is an anti-spam measure.');
        setLoading(false);
        return;
      }

      const cleanUsername = sanitizeFreeText(username).slice(0, 50);
      const cleanPhone = phone.trim().slice(0, 30);
      const cleanBio = sanitizeFreeText(bio).slice(0, 500);
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: { data: { display_name: cleanUsername, phone: cleanPhone, bio: cleanBio, avatar_url: avatarUrl || null } },
      });

      if (signUpError) {
        setError(signUpError.message);
        setLoading(false);
        return;
      }

      if (data.session && data.user) {
        const { error: profileError } = await supabase.from('profiles').update({
          display_name: cleanUsername,
          username: cleanUsername.toLowerCase().replace(/[^a-z0-9_]+/g, '_'),
          phone: cleanPhone,
          bio: cleanBio,
          avatar_url: avatarUrl || null,
          onboarding_complete: true,
          updated_at: new Date().toISOString(),
        }).eq('id', data.user.id);
        if (profileError) throw profileError;

        const { error: deviceError } = await supabase.from('device_registrations').insert({
          device_fingerprint: deviceFp,
          user_id: data.user.id,
          phone: cleanPhone,
        });
        if (deviceError) throw deviceError;
      }

      await refreshProfile();
    } catch (err) {
      console.error('[Flip] Signup failed:', err);
      setError('Unable to reach the server. Please check your connection and try again.');
    }
    setLoading(false);
  };

  const toggleFollow = (userId: string) => {
    setFollowing((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const stepLabels = ['Account', 'Terms', 'Verify', 'Profile', 'Connect'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-6">
          <h1 className="text-4xl font-black tracking-tighter text-white">FLIP</h1>
          <p className="text-slate-400 mt-1 text-xs">Social. Live. Play. Connect.</p>
        </div>

        {/* Progress bar */}
        <div className="flex items-center justify-between mb-6 px-2">
          {stepLabels.map((label, idx) => (
            <div key={label} className="flex flex-col items-center flex-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                step > idx + 1 ? 'bg-emerald-500 text-white' :
                step === idx + 1 ? 'bg-emerald-500 text-white ring-4 ring-emerald-500/20' :
                'bg-slate-800 text-slate-500'
              }`}>
                {step > idx + 1 ? <Check size={14} /> : idx + 1}
              </div>
              <span className={`text-[10px] mt-1 ${step >= idx + 1 ? 'text-emerald-400' : 'text-slate-600'}`}>{label}</span>
              {idx < 4 && <div className={`h-0.5 flex-1 -mt-4 mx-1 ${step > idx + 1 ? 'bg-emerald-500' : 'bg-slate-800'}`} />}
            </div>
          ))}
        </div>

        <div className="bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 p-6 shadow-2xl">
          {/* Step 1: Credentials */}
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-white mb-1">Create your account</h2>
              <p className="text-xs text-slate-400 mb-3">Join the FLIP community in just a few steps.</p>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Username</label>
                <div className="relative">
                  <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Your username"
                    className="w-full bg-slate-800/50 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Email</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com"
                    className="w-full bg-slate-800/50 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Password</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" minLength={6}
                    className="w-full bg-slate-800/50 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Phone Number</label>
                <div className="relative">
                  <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+255..."
                    className="w-full bg-slate-800/50 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all" />
                </div>
              </div>
              <p className="text-[10px] text-slate-500">Max 2 accounts per device. This is enforced to prevent spam.</p>
            </div>
          )}

          {/* Step 2: Terms */}
          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-white mb-1">Terms & Conditions</h2>
              <p className="text-xs text-slate-400 mb-3">Please review and accept our terms to continue.</p>
              <div className="bg-slate-800/50 border border-white/10 rounded-xl p-4 max-h-48 overflow-y-auto text-xs text-slate-300 whitespace-pre-line leading-relaxed">
                {TERMS_TEXT}
              </div>
              <button onClick={() => setShowTermsPage(true)} className="text-xs text-emerald-400 hover:text-emerald-300 font-medium">
                Read full terms page
              </button>
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" checked={agreedToTerms} onChange={(e) => setAgreedToTerms(e.target.checked)}
                  className="w-5 h-5 rounded border-slate-600 bg-slate-800 text-emerald-500 focus:ring-emerald-500/50 mt-0.5" />
                <span className="text-xs text-slate-300">I have read and agree to the Terms of Service and Liability Waiver of FLIP.</span>
              </label>
            </div>
          )}

          {/* Step 3: OTP */}
          {step === 3 && (
            <div className="space-y-4 text-center">
              <div className="w-16 h-16 mx-auto bg-emerald-500/20 rounded-full flex items-center justify-center mb-2">
                <MessageSquare size={28} className="text-emerald-400" />
              </div>
              <h2 className="text-lg font-bold text-white">Verify your number</h2>
              <p className="text-xs text-slate-400">We sent a 6-character code to {phone}. Enter it below.</p>
              {otpVerified ? (
                <div className="flex items-center justify-center gap-2 text-emerald-400 font-semibold text-sm py-4">
                  <Check size={18} /> Verified! Taking you to the next step...
                </div>
              ) : (
                <>
                  <div className="flex justify-center gap-2 my-4" onPaste={handleOtpPaste}>
                    {otp.map((digit, idx) => (
                      <input key={idx} ref={(el) => { otpRefs.current[idx] = el; }}
                        type="text" value={digit} onChange={(e) => handleOtpChange(idx, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(idx, e)} maxLength={1}
                        className="w-11 h-14 bg-slate-800/50 border border-white/10 rounded-xl text-center text-xl font-bold text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all" />
                    ))}
                  </div>
                  <p className="text-[10px] text-slate-500">Demo code: <span className="font-mono font-bold text-emerald-400">{generatedOtp}</span></p>
                  <button onClick={() => { const code = generateOtp(); setGeneratedOtp(code); setOtp(['','','','','','']); otpRefs.current[0]?.focus(); }}
                    className="text-xs text-emerald-400 hover:text-emerald-300 font-medium">Resend code</button>
                </>
              )}
            </div>
          )}

          {/* Step 4: Profile Setup */}
          {step === 4 && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-white mb-1">Set up your profile</h2>
              <p className="text-xs text-slate-400 mb-3">Add a photo and bio so people can recognize you.</p>
              <div className="flex flex-col items-center mb-3">
                <div className="w-24 h-24 rounded-full bg-slate-800 border-2 border-dashed border-slate-600 flex items-center justify-center overflow-hidden mb-2">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <Camera size={28} className="text-slate-500" />
                  )}
                </div>
                <input type="text" value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} placeholder="Paste image URL..."
                  className="w-full bg-slate-800/50 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all text-center" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Bio</label>
                <textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Tell people about yourself..." rows={3}
                  className="w-full bg-slate-800/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all resize-none" />
              </div>
            </div>
          )}

          {/* Step 5: Connect */}
          {step === 5 && (
            <div className="space-y-4">
              <div className="text-center mb-3">
                <div className="w-16 h-16 mx-auto bg-emerald-500/20 rounded-full flex items-center justify-center mb-2">
                  <Sparkles size={28} className="text-emerald-400" />
                </div>
                <h2 className="text-lg font-bold text-white">Welcome to FLIP!</h2>
                <p className="text-xs text-slate-400">Connect with people to see their content in your feed.</p>
              </div>
              {suggestedUsers.length === 0 ? (
                <p className="text-center text-sm text-slate-500 py-6">No suggestions yet. You can skip and explore!</p>
              ) : (
                <div className="max-h-56 overflow-y-auto space-y-2">
                  {suggestedUsers.map((user) => (
                    <div key={user.id} className="flex items-center gap-3 bg-slate-800/50 rounded-xl p-2.5">
                      {user.avatar_url ? (
                        <img src={user.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover" />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-emerald-500/20 flex items-center justify-center text-sm font-bold text-emerald-400">
                          {user.display_name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{user.display_name}</p>
                        <p className="text-xs text-slate-500 truncate">{user.bio || 'No bio'}</p>
                      </div>
                      <button onClick={() => toggleFollow(user.id)}
                        className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-all ${
                          following.has(user.id) ? 'bg-emerald-500 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                        }`}>
                        {following.has(user.id) ? 'Following' : 'Follow'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-400 flex items-start gap-2 mt-4">
              <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Navigation */}
          <div className="flex gap-2 mt-5">
            {step > 1 && step < 5 && (
              <button onClick={() => { setStep((step - 1) as Step); setError(null); }}
                className="flex items-center gap-1 bg-slate-800 text-slate-300 hover:text-white px-4 py-3 rounded-xl text-sm font-semibold transition-colors">
                <ChevronLeft size={16} /> Back
              </button>
            )}
            {step < 3 && (
              <button onClick={() => {
                if (step === 1) handleStep1Next();
                else if (step === 2) handleStep2Next();
              }} className="flex-1 flex items-center justify-center gap-1 bg-emerald-500 hover:bg-emerald-400 text-white font-semibold py-3 rounded-xl transition-all shadow-lg shadow-emerald-500/20">
                Continue <ChevronRight size={16} />
              </button>
            )}
            {step === 4 && (
              <button onClick={() => setStep(5)}
                className="flex-1 flex items-center justify-center gap-1 bg-emerald-500 hover:bg-emerald-400 text-white font-semibold py-3 rounded-xl transition-all shadow-lg shadow-emerald-500/20">
                Continue <ChevronRight size={16} />
              </button>
            )}
            {step === 5 && (
              <button onClick={handleComplete} disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-all shadow-lg shadow-emerald-500/20">
                {loading ? <><Loader2 size={18} className="animate-spin" /> Finishing...</> : <><Check size={18} /> Enter FLIP</>}
              </button>
            )}
            {step === 5 && (
              <button onClick={handleComplete} disabled={loading}
                className="bg-slate-800 text-slate-400 hover:text-white px-4 py-3 rounded-xl text-sm font-semibold transition-colors">
                Skip
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Full terms page modal */}
      {showTermsPage && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={() => setShowTermsPage(false)}>
          <div className="bg-slate-900 rounded-3xl border border-white/10 p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold flex items-center gap-2"><Shield size={18} className="text-emerald-400" /> FLIP Terms of Service</h2>
              <button onClick={() => setShowTermsPage(false)}><X size={20} /></button>
            </div>
            <div className="text-xs text-slate-300 whitespace-pre-line leading-relaxed">{TERMS_TEXT}</div>
            <button onClick={() => { setAgreedToTerms(true); setShowTermsPage(false); }}
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-white font-semibold py-3 rounded-xl mt-4 transition-colors">
              I Agree to These Terms
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
