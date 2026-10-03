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
      // Read the file as a data URL for immediate preview
      const previewUrl = URL.createObjectURL(file);
      setAvatarUrl(previewUrl);

      // Upload to Supabase storage — we re-upload during handleComplete
      // if needed, but storing the public URL here is more reliable
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id || 'temp-' + Date.now();
      const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `${userId}/avatar-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { cacheControl: '3600', upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      // Replace preview URL with the real public URL
      URL.revokeObjectURL(previewUrl);
      setAvatarUrl(publicUrl);
    } catch (err) {
      setError('Failed to upload image. Please try again.');
      console.warn('[Flip] Avatar upload failed:', err);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleComplete = async () => {
    setError(null);
    setLoading(true);

    try {
      const deviceFp = getDeviceFingerprint();

      // Device check is non-fatal — if the table doesn't exist or the query
      // fails, we proceed with registration rather than blocking the user.
      try {
        const { count: deviceCount } = await supabase
          .from('device_registrations')
          .select('*', { count: 'exact', head: true })
          .eq('device_fingerprint', deviceFp);

        if (deviceCount !== null && deviceCount >= 2) {
          setError(t('onboarding.deviceMaxReached'));
          setLoading(false);
          return;
        }
      } catch {
        // Table may not exist — skip device check
      }

      const cleanUsername = sanitizeFreeText(username).slice(0, 50);
      const cleanPhone = phone.trim().slice(0, 30);
      const cleanBio = sanitizeFreeText(bio).slice(0, 500);

      // Sign up with Supabase Auth
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
        } else if (msg.toLowerCase().includes('fetch') || msg.toLowerCase().includes('network')) {
          setError(t('onboarding.connectionError'));
        } else {
          setError(msg);
        }
        setLoading(false);
        return;
      }

      if (!data.user) {
        setError(t('onboarding.connectionError'));
        setLoading(false);
        return;
      }

      // If signUp did not return a session (email confirmation on),
      // sign in immediately so we have an authenticated session for
      // the profile upsert RPC call.
      if (!data.session) {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password,
        });
        if (signInError) {
          console.warn('[Flip] Auto sign-in after signUp failed:', signInError.message);
        }
      }

      // Upsert profile via SECURITY DEFINER RPC (bypasses RLS)
      let usernameAttempt = cleanUsername.toLowerCase().replace(/[^a-z0-9_]+/g, '_');
      let profileError: { message: string; code?: string } | null = null;

      for (let attempt = 0; attempt < 3; attempt++) {
        const { error } = await supabase.rpc('upsert_profile', {
          p_user_id: data.user.id,
          p_display_name: cleanUsername,
          p_username: usernameAttempt,
          p_email: email.trim().toLowerCase(),
          p_phone: cleanPhone,
          p_bio: cleanBio,
          p_avatar_url: avatarUrl || null,
          p_language: lang,
        });

        if (!error) {
          profileError = null;
          break;
        }
        profileError = error;
        if (error.code === '23505' && error.message.includes('username')) {
          usernameAttempt = `${usernameAttempt}_${Math.floor(Math.random() * 10000)}`;
          continue;
        }
        break;
      }

      if (profileError) {
        console.warn('[Flip] Profile upsert warning:', profileError.message);
      }

      // Device registration is non-fatal
      try {
        await supabase.from('device_registrations').insert({
          device_fingerprint: deviceFp,
          user_id: data.user.id,
          phone: cleanPhone,
        });
      } catch {
        // Table may not exist — skip
      }

      // Refresh the profile so the app navigates past the auth gate
      await refreshProfile();
    } catch (err) {
      console.error('[Flip] Signup failed:', err);
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('fetch') || msg.includes('network') || msg.includes('Failed to fetch')) {
        setError(t('onboarding.connectionError'));
      } else if (msg) {
        setError(msg);
      } else {
        setError(t('onboarding.connectionError'));
      }
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
              <div className="w-16 h-16 mx-auto bg-emerald-500/20 rounded-full flex items-center justify-center mb-2">
                <MessageSquare size={28} className="text-emerald-400" />
              </div>
              <h2 className="text-lg font-bold text-white">{t('onboarding.verifyNumber')}</h2>
              <p className="text-xs text-slate-400">{t('onboarding.otpSent')} {phone}. {t('onboarding.otpEnter')}</p>
              {otpVerified ? (
                <div className="flex items-center justify-center gap-2 text-emerald-400 font-semibold text-sm py-4">
                  <Check size={18} /> {t('onboarding.otpVerified')}
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
                  <p className="text-[10px] text-slate-500">{t('onboarding.demoCode')} <span className="font-mono font-bold text-emerald-400">{generatedOtp}</span></p>
                  <button onClick={() => { const code = generateOtp(); setGeneratedOtp(code); setOtp(['','','','','','']); otpRefs.current[0]?.focus(); }}
                    className="text-xs text-emerald-400 hover:text-emerald-300 font-medium">{t('onboarding.resendCode')}</button>
                </>
              )}
            </div>
          )}

          {/* Step 4: Profile Setup */}
          {step === 4 && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-white mb-1">{t('onboarding.profileTitle')}</h2>
              <p className="text-xs text-slate-400 mb-3">{t('onboarding.profileDesc')}</p>
              <div className="flex flex-col items-center mb-3">
                <div className="w-24 h-24 rounded-full bg-slate-800 border-2 border-dashed border-slate-600 flex items-center justify-center overflow-hidden mb-2">
                  {uploadingAvatar ? (
                    <Loader2 size={24} className="text-emerald-400 animate-spin" />
                  ) : avatarUrl ? (
                    <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <Camera size={28} className="text-slate-500" />
                  )}
                </div>
                {/* Camera + Gallery buttons */}
                <div className="flex gap-2 mb-1">
                  <button
                    onClick={() => cameraInputRef.current?.click()}
                    disabled={uploadingAvatar}
                    className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 disabled:opacity-50 transition-colors px-3 py-2 rounded-lg"
                  >
                    <Camera size={14} /> {t('onboarding.takePhoto')}
                  </button>
                  <button
                    onClick={() => galleryInputRef.current?.click()}
                    disabled={uploadingAvatar}
                    className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 disabled:opacity-50 transition-colors px-3 py-2 rounded-lg"
                  >
                    <Upload size={14} /> {t('onboarding.uploadPhoto')}
                  </button>
                </div>
                {/* Camera input — capture="environment" opens the rear camera on mobile */}
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                {/* Gallery input — no capture attribute, opens file picker on desktop and gallery on mobile */}
                <input
                  ref={galleryInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">{t('onboarding.bio')}</label>
                <textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder={t('onboarding.bioPlaceholder')} rows={3}
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
                <h2 className="text-lg font-bold text-white">{t('onboarding.connectTitle')}</h2>
                <p className="text-xs text-slate-400">{t('onboarding.connectDesc')}</p>
              </div>
              {suggestedUsers.length === 0 ? (
                <p className="text-center text-sm text-slate-500 py-6">{t('onboarding.noSuggestions')}</p>
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
                        {following.has(user.id) ? t('onboarding.following') : t('onboarding.follow')}
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
                <ChevronLeft size={16} /> {t('onboarding.back')}
              </button>
            )}
            {step < 3 && (
              <button onClick={() => {
                if (step === 1) handleStep1Next();
                else if (step === 2) handleStep2Next();
              }} className="flex-1 flex items-center justify-center gap-1 bg-emerald-500 hover:bg-emerald-400 text-white font-semibold py-3 rounded-xl transition-all shadow-lg shadow-emerald-500/20">
                {t('onboarding.continue')} <ChevronRight size={16} />
              </button>
            )}
            {step === 4 && (
              <button onClick={() => setStep(5)}
                className="flex-1 flex items-center justify-center gap-1 bg-emerald-500 hover:bg-emerald-400 text-white font-semibold py-3 rounded-xl transition-all shadow-lg shadow-emerald-500/20">
                {t('onboarding.continue')} <ChevronRight size={16} />
              </button>
            )}
            {step === 5 && (
              <button onClick={handleComplete} disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-all shadow-lg shadow-emerald-500/20">
                {loading ? <><Loader2 size={18} className="animate-spin" /> {t('onboarding.finishing')}</> : <><Check size={18} /> {t('onboarding.enterFlip')}</>}
              </button>
            )}
            {step === 5 && (
              <button onClick={handleComplete} disabled={loading}
                className="bg-slate-800 text-slate-400 hover:text-white px-4 py-3 rounded-xl text-sm font-semibold transition-colors">
                {t('onboarding.skip')}
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
              {t('onboarding.agreeTermsBtn')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
