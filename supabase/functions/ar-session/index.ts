import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const origin = 'https://automotive-diy-proje-8ay4.bolt.host';
const callback = 'com.tayo.carrepairar://auth/callback';

const corsHeaders = {
  'Access-Control-Allow-Origin': origin,
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
  'Referrer-Policy': 'no-referrer',
  'Vary': 'Origin',
};

const reply = (status: number, value: unknown) =>
  new Response(JSON.stringify(value), { status, headers: corsHeaders });

const random = () =>
  btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

async function digest(value: string): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)));
}

async function hash(value: string): Promise<string> {
  return [...await digest(value)].map(v => v.toString(16).padStart(2, '0')).join('');
}

async function challenge(value: string): Promise<string> {
  return btoa(String.fromCharCode(...await digest(value)))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

const short = (v: unknown): v is string =>
  typeof v === 'string' && /^[A-Za-z0-9_-]{43}$/.test(v);

Deno.serve(async (req: Request) => {
  if (req.headers.get('Origin') && req.headers.get('Origin') !== origin) {
    return reply(403, { error: 'Origin denied' });
  }

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) {
      return reply(503, { error: 'Service unavailable' });
    }

    const db = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const path = new URL(req.url).pathname.replace(/^.*\/ar-session/, '') || '/';
    const bearer = /^Bearer ([A-Za-z0-9._-]{1,8192})$/.exec(req.headers.get('Authorization') ?? '')?.[1];

    // --- Issue / Exchange (POST) ---
    if (req.method === 'POST' && (path === '/issue' || path === '/exchange')) {
      if (!req.headers.get('Content-Type')?.startsWith('application/json')) {
        return reply(415, { error: 'JSON required' });
      }
      const text = await req.text();
      if (text.length > 2048) return reply(413, { error: 'Request too large' });
      const body = JSON.parse(text);

      if (path === '/issue') {
        if (!bearer || !short(body.challenge) || !short(body.state)) {
          return reply(400, { error: 'Invalid request' });
        }
        const { data: auth, error } = await db.auth.getUser(bearer);
        if (error || !auth.user) return reply(401, { error: 'Sign in required' });

        const { data: member, error: me } = await db
          .from('repair_workspace_members')
          .select('approved')
          .eq('user_id', auth.user.id)
          .maybeSingle();
        if (me) return reply(503, { error: 'Approval service unavailable' });
        if (member?.approved !== true) return reply(403, { error: 'Workspace approval required' });

        const code = random();
        const { data: issued, error: ie } = await db.rpc('repair_ar_issue', {
          p_user: auth.user.id,
          p_code_hash: await hash(code),
          p_challenge: body.challenge,
        });
        if (ie) return reply(503, { error: 'Issue failed' });
        if (!issued) return reply(429, { error: 'Wait before trying again' });

        return reply(200, {
          return_url: `${callback}?code=${code}&state=${body.state}`,
          expires_in: 90,
        });
      }

      // Exchange
      if (!short(body.code) || typeof body.verifier !== 'string' || !/^[A-Za-z0-9._~-]{43,128}$/.test(body.verifier)) {
        return reply(400, { error: 'Invalid exchange' });
      }

      const token = 'ar_' + random();
      const { data, error } = await db.rpc('repair_ar_exchange', {
        p_code_hash: await hash(body.code),
        p_challenge: await challenge(body.verifier),
        p_token_hash: await hash(token),
      });
      if (error) return reply(503, { error: 'Exchange unavailable' });
      if (!data?.[0]) return reply(401, { error: 'Expired or consumed authorization' });

      return reply(200, {
        access_token: token,
        token_type: 'bearer',
        expires_at: Math.floor(new Date(data[0].expires_at).getTime() / 1000),
        expires_in: 3600,
        user: { id: data[0].user_id },
      });
    }

    // --- AR token-authenticated routes ---
    if (!bearer || !/^ar_[A-Za-z0-9_-]{43}$/.test(bearer)) {
      return reply(401, { error: 'AR authorization required' });
    }

    const tokenHash = await hash(bearer);
    const { data: session, error: se } = await db
      .from('repair_ar_sessions')
      .select('user_id,expires_at')
      .eq('token_hash', tokenHash)
      .maybeSingle();
    if (se) return reply(503, { error: 'Session service unavailable' });
    if (!session || new Date(session.expires_at).getTime() <= Date.now()) {
      return reply(401, { error: 'AR session expired' });
    }

    if (req.method === 'POST' && path === '/revoke') {
      const { error } = await db.from('repair_ar_sessions').delete().eq('token_hash', tokenHash);
      return reply(error ? 503 : 200, error ? { error: 'Revocation unavailable' } : { revoked: true });
    }

    const { data: member, error: me } = await db
      .from('repair_workspace_members')
      .select('approved')
      .eq('user_id', session.user_id)
      .maybeSingle();
    if (me) return reply(503, { error: 'Approval service unavailable' });
    if (member?.approved !== true) {
      await db.from('repair_ar_sessions').delete().eq('token_hash', tokenHash);
      return reply(403, { error: 'Workspace access revoked' });
    }

    // Explicit read-only allowlist. Opaque AR tokens never authorize database writes.
    if (req.method !== 'GET') return reply(405, { error: 'Read only' });

    if (path === '/api/projects') {
      const { data, error } = await db
        .from('projects')
        .select('id,title,category,difficulty,est_hours,status')
        .order('created_at', { ascending: false });
      return error
        ? reply(503, { error: 'Projects unavailable' })
        : reply(200, { projects: data, count: data?.length ?? 0 });
    }

    const match = /^\/api\/projects\/([0-9a-f-]{36}|header|ac-recharge|ac)\/steps$/i.exec(path);
    if (!match) return reply(404, { error: 'Route unavailable' });

    let query = db.from('projects').select('id,title,category,difficulty,est_hours,status');
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(match[1])) {
      query = query.eq('id', match[1]);
    } else if (match[1] === 'headers') {
      query = query.ilike('title', '%Long Tube Headers%');
    } else if (match[1] === 'ac' || match[1] === 'ac-recharge') {
      query = query.ilike('title', '%AC System Refrigerant Recharge%');
    } else {
      return reply(404, { error: 'Project unavailable' });
    }

    const { data: project, error: pe } = await query.maybeSingle();
    if (pe) return reply(503, { error: 'Project unavailable' });
    if (!project) return reply(404, { error: 'Project not found' });

    const { data: steps, error: ste } = await db
      .from('project_steps')
      .select('id,description,fastener_info,torque_spec,tools_required,completed,step_order')
      .eq('project_id', project.id)
      .order('step_order');
    if (ste) return reply(503, { error: 'Steps unavailable' });

    const all = steps ?? [];
    const completed = all.filter((s: { completed: boolean }) => s.completed).length;

    return reply(200, {
      project,
      steps: all.map((s: Record<string, unknown>, i: number) => ({ ...s, step_number: i + 1 })),
      summary: {
        total_steps: all.length,
        completed,
        remaining: all.length - completed,
        completion_percentage: all.length ? Math.round((completed / all.length) * 100) : 0,
      },
    });
  } catch {
    return reply(400, { error: 'Request could not be processed' });
  }
});
