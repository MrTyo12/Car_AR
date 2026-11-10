/*
# Approved Repair Workspace — Membership and Restrictive Policies

1. New Tables
- `repair_workspace_members` — administrator-managed approval for the shared
  repair workspace. Clients can read only their own approval row; they cannot
  insert, update, or delete it.
  - `user_id` (uuid, primary key, references auth.users)
  - `approved` (boolean, default false)
  - `approved_at` (timestamptz, nullable)

2. New Functions
- `is_repair_workspace_approved()` — SECURITY DEFINER, STABLE. Returns true if
  the caller (auth.uid()) has an approved row in repair_workspace_members.
  Used by RLS policies on all data tables. EXECUTE granted to authenticated only.

3. Security Changes
- RLS enabled on repair_workspace_members. SELECT granted to authenticated;
  INSERT/UPDATE/DELETE revoked from all client roles. Only service_role can
  modify memberships (server-side/admin only).
- All 9 existing data tables (vehicle_profile, maintenance_logs, active_upgrades,
  upcoming_services, projects, project_steps, parts_inventory, tools_checklist,
  media_tutorials): RLS enabled, anon access revoked, authenticated gets CRUD,
  and all existing anon_* policies replaced with a single `approved_workspace_access`
  policy gated by is_repair_workspace_approved().

4. Modified Tables
- No tables are dropped, renamed, or have columns changed. Existing data and
  repair records are preserved. Only RLS policies and grants change.

5. Important Notes
- This migration is idempotent-safe: it checks for unexpected policies before
  applying and aborts if it finds any.
- The existing user btayo0612@gmail.com is approved after this migration runs.
- Previous workspace_members and ar_sessions tables from an earlier migration
  are NOT dropped here — they remain but are superseded by the new
  repair_workspace_members / repair_ar_grants / repair_ar_sessions tables.
*/

CREATE TABLE IF NOT EXISTS public.repair_workspace_members (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  approved boolean NOT NULL DEFAULT false,
  approved_at timestamptz
);

ALTER TABLE public.repair_workspace_members ENABLE ROW LEVEL SECURITY;

DO $membership_check$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'repair_workspace_members'
      AND policyname <> 'read_own_repair_membership'
  ) THEN
    RAISE EXCEPTION 'Unexpected workspace membership policy; review deployed state before applying changes';
  END IF;
END;
$membership_check$;

REVOKE ALL ON TABLE public.repair_workspace_members FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.repair_workspace_members TO authenticated;

DROP POLICY IF EXISTS "read_own_repair_membership" ON public.repair_workspace_members;
CREATE POLICY "read_own_repair_membership" ON public.repair_workspace_members
  FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));

CREATE OR REPLACE FUNCTION public.is_repair_workspace_approved()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.repair_workspace_members AS m
    WHERE m.user_id = (SELECT auth.uid()) AND m.approved = true
  );
$function$;

REVOKE ALL ON FUNCTION public.is_repair_workspace_approved() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_repair_workspace_approved() TO authenticated;

DO $migration$
DECLARE
  item record;
  verb text;
  recognized text[];
BEGIN
  FOR item IN SELECT * FROM (VALUES
    ('vehicle_profile', 'vehicle'),
    ('maintenance_logs', 'mlogs'),
    ('active_upgrades', 'upgrades'),
    ('upcoming_services', 'upcoming'),
    ('projects', 'projects'),
    ('project_steps', 'steps'),
    ('parts_inventory', 'parts'),
    ('tools_checklist', 'tools'),
    ('media_tutorials', 'media')
  ) AS targets(table_name, policy_suffix)
  LOOP
    IF to_regclass(format('public.%I', item.table_name)) IS NULL THEN
      RAISE EXCEPTION 'Expected repair table % is missing; no migration applied', item.table_name;
    END IF;
    recognized := ARRAY[
      'anon_select_' || item.policy_suffix,
      'anon_insert_' || item.policy_suffix,
      'anon_update_' || item.policy_suffix,
      'anon_delete_' || item.policy_suffix,
      'approved_workspace_access'
    ];
    IF EXISTS (
      SELECT 1 FROM pg_catalog.pg_policies
      WHERE schemaname = 'public' AND tablename = item.table_name
        AND NOT (policyname::text = ANY(recognized))
    ) THEN
      RAISE EXCEPTION 'Unexpected policy on %; review deployed state before applying security changes', item.table_name;
    END IF;
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', item.table_name);
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM PUBLIC, anon', item.table_name);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.%I TO authenticated', item.table_name);
    FOREACH verb IN ARRAY ARRAY['select', 'insert', 'update', 'delete']
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'anon_' || verb || '_' || item.policy_suffix, item.table_name);
    END LOOP;
    EXECUTE format('DROP POLICY IF EXISTS approved_workspace_access ON public.%I', item.table_name);
    EXECUTE format(
      'CREATE POLICY approved_workspace_access ON public.%I FOR ALL TO authenticated USING (public.is_repair_workspace_approved()) WITH CHECK (public.is_repair_workspace_approved())',
      item.table_name
    );
  END LOOP;
END;
$migration$;

COMMENT ON TABLE public.repair_workspace_members IS 'Administrator-managed approval for the shared repair workspace. Clients may read only their own approval, never insert/update/delete it.';

-- Approve the existing authenticated user btayo0612@gmail.com
-- (auth.users id c47fa2c4-8da1-4b62-ba61-9a212e75981c). No duplicate account.
INSERT INTO public.repair_workspace_members (user_id, approved, approved_at)
VALUES ('c47fa2c4-8da1-4b62-ba61-9a212e75981c', true, now())
ON CONFLICT (user_id) DO UPDATE
  SET approved = true, approved_at = now();
