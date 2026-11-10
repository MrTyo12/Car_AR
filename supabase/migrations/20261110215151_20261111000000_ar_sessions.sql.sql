/*
# AR Sessions Broker — Private Grant/Session Tables and Atomic Exchange

1. New Tables
- `repair_ar_grants` — single-use PKCE-bound authorization codes.
  - `code_hash` (text, primary key, 64-char SHA-256 hex)
  - `user_id` (uuid, references auth.users, cascade delete)
  - `challenge` (text, 43-char S256 challenge)
  - `expires_at` (timestamptz, defaults to now() + 90 seconds)
  - `created_at` (timestamptz, defaults to now())
- `repair_ar_sessions` — opaque hashed AR session tokens.
  - `token_hash` (text, primary key, 64-char SHA-256 hex)
  - `user_id` (uuid, references auth.users, cascade delete)
  - `expires_at` (timestamptz, not null, set to now() + 1 hour at creation)
  - `created_at` (timestamptz, defaults to now())

2. New Functions
- `repair_ar_issue(p_user, p_code_hash, p_challenge)` — SECURITY DEFINER.
  Atomically checks workspace approval, enforces a per-user rate limit (max 5
  grants/minute), purges expired grants/sessions, and inserts a new grant.
  Returns boolean (true on success). EXECUTE granted to service_role only.
- `repair_ar_exchange(p_code_hash, p_challenge, p_token_hash)` — SECURITY DEFINER.
  Atomically deletes a matching, unexpired grant (single-use), re-checks workspace
  approval, and inserts a new AR session with 1-hour expiry. Returns the user_id
  and expires_at. EXECUTE granted to service_role only.

3. Security
- Both tables have RLS enabled. ALL privileges revoked from PUBLIC, anon, and
  authenticated. Only service_role has SELECT, INSERT, DELETE (used by the
  ar-session edge function with the service role key).
- No access/refresh tokens are stored. Only hashed codes and hashed session
  tokens are persisted.

4. Important Notes
- No Supabase access/refresh tokens are copied or stored by the broker.
- Grants expire after 90 seconds; sessions after 1 hour with no auto-extension.
- The exchange function is atomic: concurrent calls for the same code result in
  at most one success (the DELETE ... RETURNING consumes the row).
- No historical schema or repair data is included or modified.
*/

CREATE TABLE IF NOT EXISTS public.repair_ar_grants (
  code_hash text PRIMARY KEY CHECK (length(code_hash) = 64),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  challenge text NOT NULL CHECK (length(challenge) = 43),
  expires_at timestamptz NOT NULL DEFAULT now() + interval '90 seconds',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.repair_ar_sessions (
  token_hash text PRIMARY KEY CHECK (length(token_hash) = 64),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.repair_ar_grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repair_ar_sessions ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.repair_ar_grants, public.repair_ar_sessions FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, DELETE ON public.repair_ar_grants, public.repair_ar_sessions TO service_role;

CREATE OR REPLACE FUNCTION public.repair_ar_exchange(p_code_hash text, p_challenge text, p_token_hash text)
RETURNS TABLE(user_id uuid, expires_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public
AS $$
DECLARE
  g public.repair_ar_grants%rowtype;
BEGIN
  DELETE FROM public.repair_ar_grants r
  WHERE r.code_hash = p_code_hash
    AND r.challenge = p_challenge
    AND r.expires_at > now()
  RETURNING r.* INTO g;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.repair_workspace_members m
    WHERE m.user_id = g.user_id AND m.approved = true
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
  INSERT INTO public.repair_ar_sessions (token_hash, user_id, expires_at)
  VALUES (p_token_hash, g.user_id, now() + interval '1 hour')
  RETURNING repair_ar_sessions.user_id, repair_ar_sessions.expires_at;
END;
$$;

REVOKE ALL ON FUNCTION public.repair_ar_exchange(text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.repair_ar_exchange(text, text, text) TO service_role;

CREATE OR REPLACE FUNCTION public.repair_ar_issue(p_user uuid, p_code_hash text, p_challenge text)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public
AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(p_user::text, 0));

  IF NOT EXISTS (
    SELECT 1 FROM public.repair_workspace_members m
    WHERE m.user_id = p_user AND m.approved = true
  ) THEN
    RETURN false;
  END IF;

  IF (
    SELECT count(*) FROM public.repair_ar_grants g
    WHERE g.user_id = p_user AND g.created_at > now() - interval '1 minute'
  ) >= 5 THEN
    RETURN false;
  END IF;

  DELETE FROM public.repair_ar_grants WHERE expires_at <= now();
  DELETE FROM public.repair_ar_sessions WHERE expires_at <= now();

  INSERT INTO public.repair_ar_grants (code_hash, user_id, challenge)
  VALUES (p_code_hash, p_user, p_challenge);

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.repair_ar_issue(uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.repair_ar_issue(uuid, text, text) TO service_role;
