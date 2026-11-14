import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
const pendingKey = 'repair-ar-pending';
const short = (v: unknown): v is string => typeof v === 'string' && /^[A-Za-z0-9_-]{43}$/.test(v);
type Pending = { state: string; challenge: string; until: number };
// Only non-secret state/challenge survive OAuth. Codes/tokens never enter storage.
function load(): Pending | null {
 try {
  const url = new URL(window.location.href);
  const states = url.searchParams.getAll('ar_state'), challenges = url.searchParams.getAll('ar_challenge');
  if (states.length || challenges.length) {
   sessionStorage.removeItem(pendingKey);
   url.searchParams.delete('ar_state'); url.searchParams.delete('ar_challenge');
   window.history.replaceState(null, '', url.toString());
   if (states.length !== 1 || challenges.length !== 1 || !short(states[0]) || !short(challenges[0])) return null;
   const p = { state: states[0], challenge: challenges[0], until: Date.now()+180000 };
   sessionStorage.setItem(pendingKey, JSON.stringify(p)); return p;
  }
  const p = JSON.parse(sessionStorage.getItem(pendingKey) ?? 'null');
  if (!p || !short(p.state) || !short(p.challenge) || typeof p.until !== 'number' || p.until <= Date.now()) { sessionStorage.removeItem(pendingKey); return null; }
  return p;
 } catch { return null; }
}
const initial = load();
// Share the in-flight promise across StrictMode/remounts, not just individual component refs.
let inFlight: { state: string; promise: Promise<string> } | null = null;
let openedState: string | null = null;
function issue(pending: Pending): Promise<string> {
 if (inFlight?.state === pending.state) return inFlight.promise;
 const promise = (async () => {
  if (Date.now() >= pending.until) throw new Error('Expired');
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session) throw new Error('Sign-in required');
  const { data: identity, error: identityError } = await supabase.auth.getUser();
  if (identityError || !identity.user || identity.user.is_anonymous || identity.user.id !== data.session.user.id) throw new Error('Invalid session');
  const { data: result, error: issueError } = await supabase.functions.invoke('ar-session/issue', {
   body: { state: pending.state, challenge: pending.challenge }, headers: { Authorization: `Bearer ${data.session.access_token}` }
  });
  if (issueError || typeof result?.return_url !== 'string' || Date.now() >= pending.until) throw new Error('Return unavailable');
  const url = new URL(result.return_url);
  if (url.protocol !== 'com.tayo.carrepairar:' || url.hostname !== 'auth' || url.pathname !== '/callback' || url.username || url.password || url.port || url.hash ||
      url.searchParams.getAll('state').length !== 1 || url.searchParams.get('state') !== pending.state || url.searchParams.getAll('code').length !== 1 || !short(url.searchParams.get('code')) ||
      [...url.searchParams.keys()].some(key => key !== 'code' && key !== 'state')) throw new Error('Invalid return');
  return url.toString();
 })();
 inFlight = { state: pending.state, promise };
 return promise;
}
export function ARReturn() {
 const [pending, setPending] = useState(initial);
 const [revision, setRevision] = useState(0);
 const [message, setMessage] = useState('Returning to AR…');
 const [returnURL, setReturnURL] = useState<string | null>(null);
 const [failed, setFailed] = useState(false);
 useEffect(() => {
  if (!pending || openedState === pending.state) return;
  let active = true;
  setFailed(false); setMessage('Returning to AR…');
  void issue(pending).then(url => {
   if (!active || sessionStorage.getItem(pendingKey) !== JSON.stringify(pending) || Date.now() >= pending.until) return;
   sessionStorage.removeItem(pendingKey);
   openedState = pending.state;
   setReturnURL(url);
   setMessage('Opening AR. If your browser blocked app opening, use Return to AR below.');
   window.location.assign(url);
  }).catch(() => {
   if (active) { setFailed(true); setMessage('Could not return to AR. Check the connection or retry from the AR app.'); }
  });
  return () => { active = false; };
 }, [pending, revision]);
 useEffect(() => {
  if (!pending) return;
  const timer = window.setTimeout(() => { setReturnURL(null); setFailed(false); setMessage('Return expired. Start sign-in again from the AR app.'); sessionStorage.removeItem(pendingKey); }, Math.max(0, pending.until-Date.now()));
  return () => window.clearTimeout(timer);
 }, [pending]);
 if (!pending) return null;
 return <section className="border-b border-carbon-700 bg-carbon-900 p-4 text-carbon-50" aria-label="Return to AR">
  <p role="status">{message}</p>
  {returnURL && <a className="inline-block rounded bg-scat-600 p-3 mt-2" href={returnURL}>Return to AR</a>}
  {failed && Date.now() < pending.until && <button className="rounded bg-scat-600 p-3 mt-2" onClick={() => { inFlight = null; setRevision(v => v+1); }}>Retry return</button>}
  <button className="ml-3 underline" onClick={() => { sessionStorage.removeItem(pendingKey); setReturnURL(null); setPending(null); }}>Cancel return</button>
 </section>;
}
