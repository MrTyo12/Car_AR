import { useEffect, useState, type ReactNode } from 'react';
import { ShieldCheck } from 'lucide-react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { AuthPanel } from './AuthPanel';

export function WorkspaceGate({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    let receivedEvent = false;
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      receivedEvent = true;
      if (active) { setSession(next); setLoaded(true); }
    });
    supabase.auth.getSession().then(({ data, error }) => {
      if (active && !receivedEvent) { setSession(error ? null : data.session); setLoaded(true); }
    }).catch(() => { if (active && !receivedEvent) setLoaded(true); });
    return () => { active = false; data.subscription.unsubscribe(); };
  }, []);

  if (!loaded) return <main className="min-h-screen bg-carbon-950 text-carbon-50 p-8">Loading account…</main>;
  if (!session || session.user.is_anonymous) return <AuthPanel />;
  return <>
    <div className="bg-carbon-900 text-carbon-50 border-b border-carbon-800 px-4 py-2 flex justify-between">
      <span>Shared repair workspace</span>
      <button onClick={() => { void supabase.auth.signOut(); }} className="underline">Sign out</button>
    </div>
    {children}
  </>;
}

export function WorkspaceBadge() {
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    let active = true;
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      if (active) setSession(next);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (active) setSession(data.session);
    });
    return () => { active = false; data.subscription.unsubscribe(); };
  }, []);

  if (!session || session.user.is_anonymous) return null;

  return (
    <span className="badge bg-green-500/15 text-green-400 border border-green-500/30">
      <ShieldCheck size={12} />
      Approved
    </span>
  );
}
