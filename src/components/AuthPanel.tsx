import { useState, type FormEvent } from 'react';
import { supabase } from '@/lib/supabase';

export function AuthPanel() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [signup, setSignup] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('Sign in to the shared repair workspace. AR opens automatically when sign-in started from the AR app.');

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    const secret = password;
    setPassword('');
    try {
      if (signup) {
        const { data, error } = await supabase.auth.signUp({ email: email.trim(), password: secret,
          options: { emailRedirectTo: window.location.origin } });
        if (error) setMessage('Registration could not be completed. Check the email/password policy and provider configuration.');
        else setMessage(data.session ? 'Account signed in. Returning to AR if requested.' : 'If registration is permitted, check your email to confirm the account, then sign in. No administrator approval is required.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: secret });
        if (error) setMessage('Sign-in was rejected. Check credentials and email confirmation.');
      }
    } catch { setMessage('Account service unavailable. Check the connection and public configuration.'); }
    finally { setBusy(false); }
  }

  async function google() {
    if (busy) return;
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } });
      if (error) { setMessage('Google sign-in is unavailable. Check Supabase provider and redirect settings.'); setBusy(false); }
    } catch { setMessage('Unable to open Google sign-in.'); setBusy(false); }
  }

  return <main className="min-h-screen bg-carbon-950 flex items-center justify-center p-6 text-carbon-50">
    <section className="w-full max-w-md rounded-xl border border-carbon-800 bg-carbon-900 p-6 space-y-4">
      <h1 className="text-2xl font-bold">Scat Pack DIY • Repair account</h1>
      <p role="status" className="text-sm text-carbon-300">{message}</p>
      <form onSubmit={submit} className="space-y-4">
        <label className="block">Email<input type="email" autoComplete="email" required value={email} disabled={busy}
          onChange={e => setEmail(e.target.value)} className="mt-1 w-full rounded bg-carbon-950 border border-carbon-700 p-3" /></label>
        <label className="block">Password<input type="password" autoComplete={signup ? 'new-password' : 'current-password'} required value={password} disabled={busy}
          onChange={e => setPassword(e.target.value)} className="mt-1 w-full rounded bg-carbon-950 border border-carbon-700 p-3" /></label>
        <button type="submit" disabled={busy} className="w-full rounded bg-scat-600 p-3 disabled:opacity-50">{busy ? 'Please wait…' : signup ? 'Create account' : 'Sign in'}</button>
      </form>
      <button onClick={google} disabled={busy} className="w-full rounded border border-carbon-600 p-3 disabled:opacity-50">Continue with Google</button>
      <button onClick={() => { setSignup(!signup); setPassword(''); }} disabled={busy} className="text-sm underline">{signup ? 'Use an existing account' : 'Create an email account'}</button>
      <p className="text-xs text-carbon-400">Sign-in grants workspace access without administrator approval. Email confirmation may still be required.</p>
    </section>
  </main>;
}
