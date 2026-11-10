/*
# AR Session Tracking and Workspace Membership

1. New Tables
- `workspace_members` — controls which authenticated users are approved to use AR features.
  - `user_id` (uuid, primary key, references auth.users) — the approved user.
  - `email` (text) — cached email for admin visibility.
  - `status` (text) — 'approved' or 'pending'. Only 'approved' grants AR access.
  - `approved_at` (timestamptz) — when membership was granted.
  - `created_at` (timestamptz) — record creation time.
- `ar_sessions` — records each AR session started from the dashboard.
  - `id` (uuid, primary key).
  - `user_id` (uuid, not null, defaults to auth.uid()) — the user who started the session.
  - `project_id` (uuid, nullable, references projects) — optional linked project.
  - `unity_build_version` (text) — the Unity AR build version string.
  - `device_info` (text) — device identifier sent by the Unity client.
  - `status` (text) — 'active', 'completed', 'aborted'. Defaults to 'active'.
  - `started_at` (timestamptz, defaults to now()).
  - `ended_at` (timestamptz, nullable) — set when session is completed or aborted.

2. Security
- Both tables have RLS enabled.
- `workspace_members`: authenticated users can read their own membership row.
  No user can insert/update/delete their own membership — approval is done
  server-side by an admin (or directly in the database by the operator).
  service_role has full access for the edge function.
- `ar_sessions`: authenticated users can read and insert only their own sessions
  (user_id = auth.uid()). UPDATE is restricted to a SECURITY DEFINER function
  so users cannot forge status changes on arbitrary rows. DELETE is denied.
  service_role has full access for the edge function.
- A SECURITY DEFINER function `end_ar_session` lets a user end their own
  active session. It checks that the session belongs to the caller and is
  currently active before marking it completed/aborted.

3. Modified Tables
- None. Existing tables, data, and policies are preserved.

4. Important Notes
- The existing user btayo0612@gmail.com (auth.users id
  c47fa2c4-8da1-4b62-ba61-9a212e75981c) is inserted as an approved workspace
  member. No duplicate account is created.
- Existing single-tenant tables (projects, maintenance_logs, etc.) keep
  their current open policies — AR access control is layered on top, not
  replacing existing data access.
*/

-- workspace_members table
CREATE TABLE IF NOT EXISTS workspace_members (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending',
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON workspace_members TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON workspace_members TO service_role;

DROP POLICY IF EXISTS "select_own_membership" ON workspace_members;
CREATE POLICY "select_own_membership" ON workspace_members FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

-- Seed: approve existing user btayo0612@gmail.com
INSERT INTO workspace_members (user_id, email, status, approved_at)
VALUES ('c47fa2c4-8da1-4b62-ba61-9a212e75981c', 'btayo0612@gmail.com', 'approved', now())
ON CONFLICT (user_id) DO UPDATE
  SET status = 'approved',
      approved_at = now(),
      email = EXCLUDED.email;

-- ar_sessions table
CREATE TABLE IF NOT EXISTS ar_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id uuid REFERENCES projects(id) ON DELETE SET NULL,
  unity_build_version text NOT NULL DEFAULT '',
  device_info text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'active',
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz
);

ALTER TABLE ar_sessions ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT ON ar_sessions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ar_sessions TO service_role;

DROP POLICY IF EXISTS "select_own_ar_sessions" ON ar_sessions;
CREATE POLICY "select_own_ar_sessions" ON ar_sessions FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_ar_sessions" ON ar_sessions;
CREATE POLICY "insert_own_ar_sessions" ON ar_sessions FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

-- SECURITY DEFINER: lets a user end their own active AR session.
-- Checks ownership and active status inside the function body.
CREATE OR REPLACE FUNCTION end_ar_session(p_session_id uuid, p_status text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_owner uuid;
  v_current_status text;
BEGIN
  IF p_status NOT IN ('completed', 'aborted') THEN
    RAISE EXCEPTION 'Invalid status';
  END IF;

  SELECT user_id, status INTO v_owner, v_current_status
  FROM ar_sessions WHERE id = p_session_id;

  IF v_owner IS NULL THEN
    RAISE EXCEPTION 'Session not found';
  END IF;

  IF v_owner <> auth.uid() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF v_current_status <> 'active' THEN
    RAISE EXCEPTION 'Session is not active';
  END IF;

  UPDATE ar_sessions
  SET status = p_status, ended_at = now()
  WHERE id = p_session_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION end_ar_session(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION end_ar_session(uuid, text) TO authenticated;

-- Index for querying a user's active sessions
CREATE INDEX IF NOT EXISTS idx_ar_sessions_user_id ON ar_sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_ar_sessions_status ON ar_sessions (status);
