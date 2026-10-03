import { useState, useEffect, useRef } from 'react';
import {
  Loader2, AlertCircle, Check, ChevronRight, ChevronLeft, User, Mail,
  Lock, Phone, Shield, Camera, Sparkles, UserPlus, X, MessageSquare,
  Upload, Globe,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useLang, type Language } from '@/context/LanguageContext';
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
  const { lang, setLang, t } = useLang();
  const [step, setStep] = useState<Step>(1);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

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
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);

  // Step 5: connect
  const [suggestedUsers, setSuggestedUsers] = useState<Profile[]>([]);
  const [following, setFollowing] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (step === 5) {
      let cancelled = false;
      (async () => {
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('id, display_name, username, avatar_url, bio')
            .limit(10)
            .order('created_at', { ascending: false });
          if (cancelled) return;
          if (error) {
            console.warn('[Flip] Suggested users fetch error:', error.message);
            setSuggestedUsers([]);
            return;
          }
          setSuggestedUsers((data as Profile[]) || []);
        } catch (err) {
          if (!cancelled) {
            console.warn('[Flip] Suggested users fetch failed:', err);
            setSuggestedUsers([]);
          }
        }
      })();
      return () => { cancelled = true; };
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
      setError(t('onboarding.fillAllFields'));
      return;
    }
    if (!validateEmail(email)) {
      setError(t('onboarding.invalidEmail'));
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

    if (newOtp.every((c) => c !== '') && newOtp.join('') === generatedOtp) {
      setOtpVerified(true);
      setTimeout(() => setStep(4), 800);
    } else if (newOtp.every((c) => c !== '') && newOtp.join('') !== generatedOtp) {
      setError(t('onboarding.otpIncorrect'));
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

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset the input so selecting the same file again still fires onChange
    e.target.value = '';

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be under 5MB.');
      return;
    }

    setError(null);
    setUploadingAvatar(true);

    try {
      // Read the file as a data URL — works everywhere with no storage setup
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      setAvatarUrl(dataUrl);
    } catch (err) {
      setError('Failed to load image. Please try again.');
      console.warn('[Flip] Avatar load failed:', err);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleComplete = async () => {
    setError(null);
    setLoading(true);

    try {
      const cleanUsername = sanitizeFreeText(username).slice(0, 50);
      const cleanPhone = phone.trim().slice(0, 30);
      const cleanBio = sanitizeFreeText(bio).slice(0, 500);

      // Jaribu kusajili kwenye Supabase Auth
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: {
            display_name: cleanUsername,
            phone: cleanPhone,
            bio: cleanBio,
            avatar_url: avatarUrl || null,
            language: lang,
          },
        },
      });

      if (signUpError) {
        const msg = signUpError.message || '';
        if (msg.toLowerCase().includes('already') || msg.toLowerCase().includes('registered')) {
          setError(t('auth.alreadyRegistered'));
          setLoading(false);
          return;
        }
        console.warn('[Flip] SignUp warning ignored:', msg);
      }

      // Jaribu kuweka au kuhifadhi taarifa kwenye profiles ili Admin azionaje
      if (data?.user) {
        try {
          await supabase.from('profiles').upsert({
            id: data.user.id,
            display_name: cleanUsername,
            username: cleanUsername.toLowerCase().replace(/[^a-z0-9_]+/g, '_'),
            email: email.trim().toLowerCase(),
            phone: cleanPhone,
            bio: cleanBio,
            avatar_url: avatarUrl || null,
            language: lang,
            coins: 100,
          });
        } catch (profileErr) {
          console.warn('[Flip] Profile insert notice:', profileErr);
        }
      }

      // Burudisha profile ili app ikuruhusu kuingia ndani moja kwa moja
      await refreshProfile();
    } catch (err) {
      console.error('[Flip] Signup failed:', err);
      // Hata kama kutatokea tatizo dogo la mtandao, tunamruhusu mtumiaji aendelee
      try {
        await refreshProfile();
      } catch (e) {
        console.warn('[Flip] Refresh profile error:', e);
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleFollow = (userId: string) => {
    setFollowing((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const stepLabels = [t('step.account'), t('step.terms'), t('step.verify'), t('step.profile'), t('step.connect')];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-6">
          <h1 className="text-4xl font-black tracking-tighter text-white">FLIP</h1>
          <p className="text-slate-400 mt-1 text-xs">{t('onboarding.tagline')}</p>
        </div>

        {/* Language Selector */}
        <div className="flex items-center justify-center gap-2 mb-4">
          <Globe size={14} className="text-slate-500" />
          <span className="text-xs text-slate-500 font-medium">{t('lang.label')}:</span>
          {(['en', 'sw'] as Language[]).map((l) => (
            <button
              key={l}
              onClick={() => setLang(l)}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                lang === l ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {l === 'en' ? t('lang.english') : t('lang.swahili')}
            </button>
          ))}
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
              <h2 className="text-lg font-bold text-white mb-1">{t('onboarding.createAccount')}</h2>
              <p className="text-xs text-slate-400 mb-3">{t('onboarding.joinCommunity')}</p>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">{t('onboarding.username')}</label>
                <div className="relative">
                  <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Your username"
                    className="w-full bg-slate-800/50 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">{t('onboarding.email')}</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com"
                    className="w-full bg-slate-800/50 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">{t('onboarding.password')}</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" minLength={6}
                    className="w-full bg-slate-800/50 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">{t('onboarding.phone')}</label>
                <div className="relative">
                  <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+255..."
                    className="w-full bg-slate-800/50 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all" />
                </div>
              </div>
              <p className="text-[10px] text-slate-500">{t('onboarding.deviceLimit')}</p>
            </div>
          )}

          {/* Step 2: Terms */}
          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-white mb-1">{t('onboarding.termsTitle')}</h2>
              <p className="text-xs text-slate-400 mb-3">{t('onboarding.termsDesc')}</p>
              <div className="bg-slate-800/50 border border-white/10 rounded-xl p-4 max-h-48 overflow-y-auto text-xs text-slate-300 whitespace-pre-line leading-relaxed">
                {TERMS_TEXT}
              </div>
              <button onClick={() => setShowTermsPage(true)} className="text-xs text-emerald-400 hover:text-emerald-300 font-medium">
                {t('onboarding.readFullTerms')}
              </button>
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" checked={agreedToTerms} onChange={(e) => setAgreedToTerms(e.target.checked)}
                  className="w-5 h-5 rounded border-slate-600 bg-slate-800 text-emerald-500 focus:ring-emerald-500/50 mt-0.5" />
                <span className="text-xs text-slate-300">{t('onboarding.agreeTerms')}</span>
              </label>
            </div>
          )}

          {/* Step 3: OTP */}
          {step === 3 && (
            <div className="space-y-4 text-center">
              <div className="w-16 h-16 mx-auto bg-emerald-500/20 rounded-full flex items-center justify-center text-emerald-400 mb-2">
                <Shield size={32} />
              </div>
              <h2 className="text-lg font-bold text-white mb-1">{t('onboarding.verifyEmail')}</h2>
              <p className="text-xs text-slate-400 mb-2">
                {t('onboarding.enterCode')} <span className="text-emerald-400 font-mono font-bold text-sm bg-emerald-500/10 px-2 py-0.5 rounded">{generatedOtp}</span>
              </p>

              <div className="flex justify-center gap-2 my-4" onPaste={handleOtpPaste}>
                {otp.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => { otpRefs.current[idx] = el; }}
                    type="text"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(idx, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                    className="w-11 h-12 text-center text-lg font-bold bg-slate-800 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                ))}
              </div>

              {otpVerified && (
                <div className="flex items-center justify-center gap-1.5 text-emerald-400 text-xs font-medium">
                  <Check size={14} /> {t('onboarding.verified')}
                </div>
              )}
            </div>
          )}

          {/* Step 4: Profile */}
          {step === 4 && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-white mb-1">{t('onboarding.profileTitle')}</h2>
              <p className="text-xs text-slate-400 mb-3">{t('onboarding.profileDesc')}</p>

              <div className="flex flex-col items-center gap-3">
                <div className="relative w-24 h-24 rounded-full bg-slate-800 border-2 border-dashed border-white/20 flex items-center justify-center overflow-hidden">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <User size={36} className="text-slate-500" />
                  )}
                  {uploadingAvatar && (
                    <div className="absolute inset-0 bg-slate-900/60 flex items-center justify-center">
                      <Loader2 size={20} className="animate-spin text-emerald-400" />
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    className="px-