import { useState } from 'react';
import { Loader2, AlertCircle, Sparkles } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import OnboardingWizard from '@/screens/OnboardingWizard';

export default function AuthScreen() {
  const { signIn } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const getFriendlyError = (msg: string): string => {
    if (msg.includes('Failed to fetch') || msg.includes('fetch')) {
      return 'Connection error. Please check your internet and try again.';
    }
    if (msg.includes('Invalid login')) {
      return 'Wrong email or password. Please try again.';
    }
    if (msg.includes('already registered') || msg.includes('already been registered')) {
      return 'This email is already registered. Try signing in instead.';
    }
    if (msg.includes('Email not confirmed')) {
      return 'Account created! Please sign in with your credentials.';
    }
    if (msg.includes('Password should be') || msg.includes('password')) {
      return 'Password must be at least 6 characters long.';
    }
    if (msg.includes('Unable to validate email')) {
      return 'Please enter a valid email address.';
    }
    return msg;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (!email.trim() || !password.trim()) {
        setError('Please enter your email and password.');
        setLoading(false);
        return;
      }
      const { error } = await signIn(email.trim(), password);
      if (error) {
        setError(getFriendlyError(error));
      }
    } catch {
      setError('Something went wrong. Please try again.');
    }
    setLoading(false);
  };

  if (showOnboarding) return <OnboardingWizard />;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-black tracking-tighter text-white">FLIP</h1>
          <p className="text-slate-400 mt-2 text-sm">Social. Live. Play. Connect.</p>
        </div>

        <div className="bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 p-8 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full bg-slate-800/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                required
                minLength={6}
                className="w-full bg-slate-800/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all"
              />
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-400 flex items-start gap-2">
                <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-slate-900/50 px-3 text-slate-500">New to FLIP?</span>
            </div>
          </div>

          <button
            onClick={() => setShowOnboarding(true)}
            className="w-full bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 hover:from-emerald-500/30 hover:to-cyan-500/30 border border-emerald-500/30 text-white font-semibold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
          >
            <Sparkles size={18} className="text-emerald-400" />
            Create New Account
          </button>

          <p className="text-center text-xs text-slate-500 mt-6">
            By continuing, you agree to FLIP's Terms of Service and Privacy Policy.
          </p>
        </div>
      </div>
    </div>
  );
}
