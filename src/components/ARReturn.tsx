import { useState } from 'react';
import { supabase } from '@/lib/supabase';

const pendingKey = 'repair-ar-pending';
const short = (v: unknown): v is string => typeof v === 'string' && /^[A-Za-z0-9_-]{43}$/.test(v);

type Pending = { state: string; challenge: string; until: number };

// Only non-secret state/challenge are kept across Google redirects. Never persist a token/code here.
function load(): Pending | null {
  try {
    const url = new URL(window.location.href);
    const states = url.searchParams.getAll('ar_state');
    const challenges = url.searchParams.getAll('ar_challenge');
    if (states.length || challenges.length) {
      sessionStorage.removeItem(pendingKey);
      url.searchParams.delete('ar_state');
      url.searchParams.delete('ar_challenge');
      window.history.replaceState(null, '', url.toString());
      if (states.length !== 1 || challenges.length !== 1 || !short(states[0]) || !short(challenges[0])) return null;
      const p = { state: states[0], challenge: challenges[0], until: Date.now() + 180000 };
      sessionStorage.setItem(pendingKey, JSON.stringify(p));
      return p;
    }
    const p = JSON.parse(sessionStorage.getItem(pendingKey) ?? 'null');
    if (!p || !short(p.state) || !short(p.challenge) || typeof p.until !== 'number' || p.until <= Date.now()) {
      sessionStorage.removeItem(pendingKey);
      return null;
    }
    return p;
  } catch {
    return null;
  }
}

// Capture before WorkspaceGate mounts: OAuth redirects must not lose the non-secret request.
const initial = load();

export function ARReturn() {
  const [pending, setPending] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('Return to your running AR app after approving this connection.');
  const [returnURL, setReturnURL] = useState<string | null>(null);

  if (!pending) return null;

  async function authorize() {
    if (busy || !pending) return;
    if (Date.now() >= pending.until) {
      sessionStorage.removeItem(pendingKey);
      setPending(null);
      return;
    }
    setBusy(true);
    setReturnURL(null);
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error || !data.session) {
        setMessage('Sign in on this dashboard first.');
        return;
      }
      const { data: result, error: issueError } = await supabase.functions.invoke('ar-session/issue', {
        body: { state: pending.state, challenge: pending.challenge },
        headers: { Authorization: `Bearer ${data.session.access_token}` },
      });
      if (issueError || typeof result?.return_url !== 'string') {
        setMessage('Cannot authorize AR. Workspace approval or backend deployment may be required.');
        return;
      }
      const url = new URL(result.return_url);
      if (
        url.protocol !== 'com.tayo.carrepairar:' ||
        url.hostname !== 'auth' ||
        url.pathname !== '/callback' ||
        url.username ||
        url.password ||
        url.port ||
        url.hash ||
        url.searchParams.getAll('state').length !== 1 ||
        url.searchParams.get('state') !== pending.state ||
        url.searchParams.getAll('code').length !== 1 ||
        !short(url.searchParams.get('code'))
      ) {
        throw new Error();
      }
      sessionStorage.removeItem(pendingKey);
      setReturnURL(url.toString());
      setMessage('Authorization is ready for 90 seconds. Tap Return to AR to open your running app.');
    } catch {
      setMessage('Authorization unavailable. Retry from the AR app.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      className="border-b border-carbon-700 bg-carbon-900 p-4 text-carbon-50 animate-fade-in"
      aria-label="AR authorization"
    >
      <p role="status" className="text-sm">{message}</p>
      {returnURL ? (
        <a
          className="btn-primary mt-2 inline-block"
          href={returnURL}
        >
          Return to AR
        </a>
      ) : (
        <button
          className="btn-primary mt-2 disabled:opacity-50"
          disabled={busy}
          onClick={authorize}
        >
          {busy ? 'Authorizing...' : 'Authorize AR connection'}
        </button>
      )}
      <button
        className="ml-3 underline text-sm text-carbon-400 hover:text-carbon-200 disabled:opacity-50"
        disabled={busy}
        onClick={() => {
          sessionStorage.removeItem(pendingKey);
          setReturnURL(null);
          setPending(null);
        }}
      >
        Cancel AR connection
      </button>
    </section>
  );
}
