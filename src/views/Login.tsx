import { useState, type FormEvent } from 'react';
import { Car, Mail, Lock, Eye, EyeOff, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/lib/auth';

type Mode = 'signin' | 'signup';

export function Login() {
  const { signIn, signUp, signInWithGoogle } = useAuth();
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  function resetState() {
    setError(null);
    setSuccess(null);
  }

  function switchMode(next: Mode) {
    setMode(next);
    resetState();
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    resetState();

    if (!email.trim() || !password) {
      setError('Please enter your email and password.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setSubmitting(true);
    if (mode === 'signin') {
      const { error } = await signIn(email.trim(), password);
      setSubmitting(false);
      if (error) setError(error);
    } else {
      const { error } = await signUp(email.trim(), password);
      setSubmitting(false);
      if (error) {
        setError(error);
      } else {
        setSuccess('Account created! You can now sign in with your credentials.');
        setMode('signin');
        setPassword('');
      }
    }
  }

  async function handleGoogle() {
    resetState();
    setGoogleLoading(true);
    const { error } = await signInWithGoogle();
    if (error) {
      setGoogleLoading(false);
      setError(error);
    }
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-carbon-950">
      {/* Hero Panel */}
      <div className="relative hidden lg:flex lg:w-1/2 items-center justify-center overflow-hidden bg-carbon-900">
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              'radial-gradient(circle at 30% 20%, #d32d09 0%, transparent 50%), radial-gradient(circle at 70% 80%, #2f84f8 0%, transparent 45%)',
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-carbon-950/40 via-transparent to-carbon-950/60" />
        <div className="relative z-10 px-16 py-20 max-w-lg">
          <div className="flex items-center gap-4 mb-8">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-scat-600 shadow-xl shadow-scat-950/50">
              <Car size={28} className="text-white" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold uppercase tracking-tight text-carbon-50">
                Scat Pack DIY
              </h1>
              <p className="text-xs font-medium uppercase tracking-wider text-carbon-400">
                2020 Charger Widebody Tracker
              </p>
            </div>
          </div>
          <h2 className="font-display text-3xl font-bold uppercase leading-tight text-carbon-50 mb-4">
            Track every bolt,<br />torque spec, and build step.
          </h2>
          <p className="text-carbon-300 leading-relaxed mb-10">
            Your personal workspace for DIY projects on the 6.4L HEMI Scat Pack Widebody.
            Log maintenance, manage parts inventory, and follow step-by-step procedures
            with fastener sizes and torque specs.
          </p>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Projects', value: '2' },
              { label: 'Build Steps', value: '20' },
              { label: 'Parts Tracked', value: '7' },
              { label: 'Tools Listed', value: '11' },
            ].map((stat) => (
              <div key={stat.label} className="rounded-xl bg-carbon-800/60 border border-carbon-700/50 px-4 py-3">
                <div className="font-display text-2xl font-bold text-scat-400">{stat.value}</div>
                <div className="text-xs font-medium uppercase tracking-wider text-carbon-400">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Form Panel */}
      <div className="flex flex-1 items-center justify-center px-6 py-12 sm:px-12">
        <div className="w-full max-w-md animate-slide-up">
          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-scat-600 shadow-lg shadow-scat-950/40">
              <Car size={22} className="text-white" />
            </div>
            <div>
              <h1 className="font-display text-xl font-bold uppercase leading-none tracking-tight text-carbon-50">
                Scat Pack DIY
              </h1>
              <p className="text-[10px] font-medium uppercase tracking-wider text-carbon-500">
                2020 Charger Widebody Tracker
              </p>
            </div>
          </div>

          <h2 className="font-display text-2xl font-bold uppercase tracking-tight text-carbon-50 mb-1">
            {mode === 'signin' ? 'Welcome Back' : 'Create Account'}
          </h2>
          <p className="text-sm text-carbon-400 mb-8">
            {mode === 'signin'
              ? 'Sign in to access your build tracker.'
              : 'Sign up to start tracking your Charger projects.'}
          </p>

          {/* Error / Success */}
          {error && (
            <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300 animate-fade-in">
              <AlertCircle size={18} className="mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
          {success && (
            <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-300 animate-fade-in">
              <CheckCircle2 size={18} className="mt-0.5 flex-shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {/* Google */}
          <button
            onClick={handleGoogle}
            disabled={googleLoading || submitting}
            className="btn-secondary mb-5 w-full py-3 disabled:opacity-60"
          >
            {googleLoading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <GoogleIcon />
            )}
            Continue with Google
          </button>

          {/* Divider */}
          <div className="relative mb-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-carbon-700/60" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-carbon-950 px-3 text-xs font-medium uppercase tracking-wider text-carbon-500">
                or
              </span>
            </div>
          </div>

          {/* Email / Password Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label" htmlFor="email">Email</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-carbon-500" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); resetState(); }}
                  placeholder="you@example.com"
                  autoComplete="email"
                  className="input pl-10"
                  disabled={submitting}
                />
              </div>
            </div>

            <div>
              <label className="label" htmlFor="password">Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-carbon-500" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); resetState(); }}
                  placeholder={mode === 'signup' ? 'At least 6 characters' : 'Your password'}
                  autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                  className="input pl-10 pr-10"
                  disabled={submitting}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-carbon-500 hover:text-carbon-300 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {mode === 'signin' && (
              <div className="flex justify-end">
                <button
                  type="button"
                  className="text-xs font-medium text-steel-400 hover:text-steel-300 transition-colors"
                  onClick={() => alert('Password resets are managed through your Supabase project settings.')}
                >
                  Forgot password?
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="btn-primary w-full py-3 disabled:opacity-60"
            >
              {submitting ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                mode === 'signin' ? 'Sign In' : 'Create Account'
              )}
            </button>
          </form>

          {/* Mode Switch */}
          <p className="mt-6 text-center text-sm text-carbon-400">
            {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
            <button
              onClick={() => switchMode(mode === 'signin' ? 'signup' : 'signin')}
              className="font-semibold text-scat-400 hover:text-scat-300 transition-colors"
            >
              {mode === 'signin' ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}
