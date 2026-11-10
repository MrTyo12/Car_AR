import { useEffect, useState, useCallback } from 'react';
import { Camera, Loader2, Play, Square, AlertCircle, CheckCircle2, Smartphone, Monitor, Clock } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';

interface ARSession {
  id: string;
  project_id: string | null;
  unity_build_version: string;
  device_info: string;
  status: string;
  started_at: string;
  ended_at: string | null;
}

type MembershipState = 'loading' | 'approved' | 'denied';

const FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ar-session`;

function authHeaders(): Record<string, string> {
  const token = (supabase.auth.getSession() as unknown as { data?: { session?: { access_token?: string } } });
  const accessToken = token.data?.session?.access_token ?? '';
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${accessToken}`,
    apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
  };
}

export function ARReturn() {
  const { user } = useAuth();
  const [membership, setMembership] = useState<MembershipState>('loading');
  const [activeSession, setActiveSession] = useState<ARSession | null>(null);
  const [recentSessions, setRecentSessions] = useState<ARSession[]>([]);
  const [starting, setStarting] = useState(false);
  const [ending, setEnding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const checkMembership = useCallback(async () => {
    const { data, error: queryError } = await supabase
      .from('workspace_members')
      .select('status')
      .maybeSingle();

    if (queryError) {
      setMembership('denied');
      return;
    }
    setMembership(data?.status === 'approved' ? 'approved' : 'denied');
  }, []);

  const loadSessions = useCallback(async () => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${FUNCTION_URL}/active`, { headers });
      if (!res.ok) {
        setError('Could not check for active AR sessions.');
        return;
      }
      const data = await res.json();
      setActiveSession(data.session ?? null);

      const listRes = await fetch(`${FUNCTION_URL}`, { headers });
      if (listRes.ok) {
        const listData = await listRes.json();
        setRecentSessions(listData.sessions ?? []);
      }
    } catch {
      setError('Network error while loading sessions.');
    }
  }, []);

  useEffect(() => {
    checkMembership();
  }, [checkMembership]);

  useEffect(() => {
    if (membership === 'approved') {
      loadSessions();
    }
  }, [membership, loadSessions]);

  async function handleStart() {
    setError(null);
    setSuccess(null);
    setStarting(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${FUNCTION_URL}/start`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          unity_build_version: '1.0.0',
          device_info: navigator.userAgent.slice(0, 200),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Could not start AR session.');
        return;
      }
      setActiveSession(data.session);
      setSuccess('AR session started. Launch your Unity app to begin.');
      loadSessions();
    } catch {
      setError('Network error while starting session.');
    } finally {
      setStarting(false);
    }
  }

  async function handleEnd(status: 'completed' | 'aborted') {
    if (!activeSession) return;
    setError(null);
    setSuccess(null);
    setEnding(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${FUNCTION_URL}/end`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          session_id: activeSession.id,
          status,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Could not end AR session.');
        return;
      }
      setActiveSession(null);
      setSuccess(status === 'completed' ? 'AR session completed.' : 'AR session aborted.');
      loadSessions();
    } catch {
      setError('Network error while ending session.');
    } finally {
      setEnding(false);
    }
  }

  if (membership === 'loading') {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-carbon-400" />
      </div>
    );
  }

  if (membership === 'denied') {
    return (
      <div className="mx-auto max-w-lg py-12 animate-fade-in">
        <div className="card p-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-carbon-800 border border-carbon-700">
            <AlertCircle size={28} className="text-scat-400" />
          </div>
          <h2 className="font-display text-xl font-bold uppercase tracking-tight text-carbon-50 mb-2">
            Access Pending
          </h2>
          <p className="text-sm text-carbon-400 leading-relaxed">
            Your workspace membership has not been approved yet. AR features require
            operator authorization before they can be used. Contact your project
            administrator to request access.
          </p>
          <p className="mt-4 text-xs font-medium text-carbon-500">
            Signed in as: {user?.email}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="section-title">AR Session Control</h2>
          <p className="text-sm text-carbon-400 mt-1">
            Start and manage Unity AR sessions for hands-free build guidance.
          </p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-scat-600/20 border border-scat-600/30">
          <Camera size={20} className="text-scat-400" />
        </div>
      </div>

      {/* Error / Success */}
      {error && (
        <div className="flex items-start gap-2.5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300 animate-fade-in">
          <AlertCircle size={18} className="mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="flex items-start gap-2.5 rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-300 animate-fade-in">
          <CheckCircle2 size={18} className="mt-0.5 flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Active Session Card */}
      <div className="card p-6">
        {activeSession ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="badge bg-green-500/15 text-green-400 border border-green-500/30">
                <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
                Active
              </span>
              <span className="text-xs font-medium text-carbon-500 font-mono">
                {activeSession.id.slice(0, 8)}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-carbon-500">Started</div>
                <div className="text-sm text-carbon-200 mt-0.5">
                  {new Date(activeSession.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-carbon-500">Build Version</div>
                <div className="text-sm text-carbon-200 mt-0.5">{activeSession.unity_build_version || '—'}</div>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-carbon-500">Device</div>
                <div className="text-sm text-carbon-200 mt-0.5 truncate">
                  {activeSession.device_info.includes('Mobile') ? (
                    <span className="flex items-center gap-1"><Smartphone size={14} /> Mobile</span>
                  ) : (
                    <span className="flex items-center gap-1"><Monitor size={14} /> Desktop</span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => handleEnd('completed')}
                disabled={ending}
                className="btn-primary flex-1 disabled:opacity-60"
              >
                {ending ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                Complete Session
              </button>
              <button
                onClick={() => handleEnd('aborted')}
                disabled={ending}
                className="btn-secondary flex-1 disabled:opacity-60"
              >
                {ending ? <Loader2 size={16} className="animate-spin" /> : <Square size={16} />}
                Abort
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center py-6">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-carbon-800 border border-carbon-700">
              <Play size={26} className="text-scat-400" />
            </div>
            <h3 className="font-display text-lg font-bold uppercase tracking-tight text-carbon-100 mb-1">
              No Active Session
            </h3>
            <p className="text-sm text-carbon-400 mb-5 max-w-sm mx-auto">
              Start a session to enable AR overlay guidance in the Unity app for
              your Charger build steps.
            </p>
            <button
              onClick={handleStart}
              disabled={starting}
              className="btn-primary px-6 disabled:opacity-60"
            >
              {starting ? <Loader2 size={18} className="animate-spin" /> : <Play size={18} />}
              Start AR Session
            </button>
          </div>
        )}
      </div>

      {/* Session History */}
      <div className="card p-6">
        <h3 className="section-title text-base mb-4">Session History</h3>
        {recentSessions.length === 0 ? (
          <p className="text-sm text-carbon-500 py-4 text-center">No sessions recorded yet.</p>
        ) : (
          <div className="space-y-2">
            {recentSessions.slice(0, 10).map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between rounded-xl bg-carbon-800/50 border border-carbon-700/40 px-4 py-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${
                    s.status === 'completed'
                      ? 'bg-green-500/15 text-green-400'
                      : s.status === 'aborted'
                      ? 'bg-red-500/15 text-red-400'
                      : 'bg-steel-500/15 text-steel-400'
                  }`}>
                    {s.status === 'completed' ? <CheckCircle2 size={16} /> : s.status === 'aborted' ? <Square size={16} /> : <Clock size={16} />}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-carbon-200">
                      {new Date(s.started_at).toLocaleDateString([], { month: 'short', day: 'numeric' })} at{' '}
                      {new Date(s.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <div className="text-xs text-carbon-500 font-mono truncate">{s.id.slice(0, 8)}</div>
                  </div>
                </div>
                <span className={`badge flex-shrink-0 ${
                  s.status === 'completed'
                    ? 'bg-green-500/15 text-green-400'
                    : s.status === 'aborted'
                    ? 'bg-red-500/15 text-red-400'
                    : 'bg-steel-500/15 text-steel-400'
                }`}>
                  {s.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/** Gets fresh auth headers from the current Supabase session. */
async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const accessToken = data.session?.access_token ?? '';
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${accessToken}`,
    apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
  };
}
