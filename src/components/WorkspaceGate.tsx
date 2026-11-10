import { useEffect, useState, type ReactNode } from 'react';
import { Loader2, AlertCircle, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { Login } from '@/views/Login';

type GateState = 'loading' | 'unauthenticated' | 'approved' | 'denied';

export function WorkspaceGate({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [gateState, setGateState] = useState<GateState>('loading');

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setGateState('unauthenticated');
      return;
    }

    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.rpc('is_repair_workspace_approved');
      if (cancelled) return;
      if (error) {
        setGateState('denied');
        return;
      }
      setGateState(data === true ? 'approved' : 'denied');
    })();

    return () => { cancelled = true; };
  }, [user, authLoading]);

  if (gateState === 'loading' || authLoading) {
    return (
      <div className="min-h-screen bg-carbon-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-scat-600 shadow-lg shadow-scat-950/40">
            <Loader2 size={20} className="text-white animate-spin" />
          </div>
          <p className="text-xs font-medium uppercase tracking-wider text-carbon-500">Verifying workspace access</p>
        </div>
      </div>
    );
  }

  if (gateState === 'unauthenticated') {
    return <Login />;
  }

  if (gateState === 'denied') {
    return (
      <div className="min-h-screen bg-carbon-950 flex items-center justify-center px-4">
        <div className="card max-w-md p-8 text-center animate-fade-in">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-carbon-800 border border-carbon-700">
            <AlertCircle size={28} className="text-scat-400" />
          </div>
          <h2 className="font-display text-xl font-bold uppercase tracking-tight text-carbon-50 mb-2">
            Access Pending
          </h2>
          <p className="text-sm text-carbon-400 leading-relaxed">
            Your account has not been approved for this workspace. Contact your
            project administrator to request access.
          </p>
          <p className="mt-4 text-xs font-medium text-carbon-500">
            Signed in as: {user?.email}
          </p>
          <button
            onClick={() => supabase.auth.signOut()}
            className="btn-secondary mt-6"
          >
            Sign out
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

export function WorkspaceBadge() {
  const { user } = useAuth();
  const [approved, setApproved] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase.rpc('is_repair_workspace_approved');
      if (!cancelled) setApproved(data === true);
    })();
    return () => { cancelled = true; };
  }, [user]);

  if (approved !== true) return null;

  return (
    <span className="badge bg-green-500/15 text-green-400 border border-green-500/30">
      <ShieldCheck size={12} />
      Approved
    </span>
  );
}
