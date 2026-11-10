import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Service-role client — bypasses RLS, used only server-side for privileged lookups.
const adminClient = createClient(supabaseUrl, serviceRoleKey);

interface SessionRow {
  id: string;
  user_id: string;
  project_id: string | null;
  unity_build_version: string;
  device_info: string;
  status: string;
  started_at: string;
  ended_at: string | null;
}

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/**
 * Extracts the bearer token from the Authorization header and resolves it
 * to a Supabase user. Returns null if the token is missing or invalid.
 * Service-role credentials are never exposed — only the caller's own JWT
 * is used to identify them.
 */
async function resolveUser(req: Request): Promise<string | null> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  const token = authHeader.replace("Bearer ", "").trim();
  if (!token) return null;

  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data, error } = await userClient.auth.getUser();
  if (error || !data.user) return null;
  return data.user.id;
}

/** Checks workspace_members for an approved membership row. */
async function isApprovedMember(userId: string): Promise<boolean> {
  const { data, error } = await adminClient
    .from("workspace_members")
    .select("status")
    .eq("user_id", userId)
    .maybeSingle();
  if (error || !data) return false;
  return data.status === "approved";
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "GET" && req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed. Use GET or POST." }, 405);
  }

  try {
    const userId = await resolveUser(req);
    if (!userId) {
      return jsonResponse({ error: "Authentication required." }, 401);
    }

    const approved = await isApprovedMember(userId);
    if (!approved) {
      return jsonResponse({ error: "Workspace membership not approved." }, 403);
    }

    const url = new URL(req.url);
    const path = url.pathname.replace(/^.*\/ar-session/, "") || "/";

    // GET / — list the caller's AR sessions
    if (req.method === "GET" && (path === "/" || path === "")) {
      const { data, error } = await adminClient
        .from("ar_sessions")
        .select("*")
        .eq("user_id", userId)
        .order("started_at", { ascending: false })
        .limit(50);

      if (error) return jsonResponse({ error: "Could not retrieve sessions." }, 500);

      return jsonResponse({
        sessions: (data as SessionRow[]).map((s) => ({
          id: s.id,
          project_id: s.project_id,
          unity_build_version: s.unity_build_version,
          device_info: s.device_info,
          status: s.status,
          started_at: s.started_at,
          ended_at: s.ended_at,
        })),
        count: data?.length ?? 0,
      });
    }

    // GET /active — get the caller's current active session (if any)
    if (req.method === "GET" && path === "/active") {
      const { data, error } = await adminClient
        .from("ar_sessions")
        .select("*")
        .eq("user_id", userId)
        .eq("status", "active")
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) return jsonResponse({ error: "Could not retrieve active session." }, 500);

      if (!data) {
        return jsonResponse({ active: false, session: null });
      }

      const s = data as SessionRow;
      return jsonResponse({
        active: true,
        session: {
          id: s.id,
          project_id: s.project_id,
          unity_build_version: s.unity_build_version,
          device_info: s.device_info,
          status: s.status,
          started_at: s.started_at,
        },
      });
    }

    // POST /start — create a new AR session
    if (req.method === "POST" && path === "/start") {
      let body: { unity_build_version?: string; device_info?: string; project_id?: string } = {};
      try {
        body = await req.json();
      } catch {
        return jsonResponse({ error: "Invalid JSON body." }, 400);
      }

      const version = (body.unity_build_version ?? "").slice(0, 100);
      const device = (body.device_info ?? "").slice(0, 200);
      const projectId = body.project_id ?? null;

      // If project_id is supplied, validate it exists.
      if (projectId) {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(projectId)) {
          return jsonResponse({ error: "Invalid project_id." }, 400);
        }
        const { data: proj } = await adminClient
          .from("projects")
          .select("id")
          .eq("id", projectId)
          .maybeSingle();
        if (!proj) {
          return jsonResponse({ error: "Project not found." }, 404);
        }
      }

      const { data, error } = await adminClient
        .from("ar_sessions")
        .insert({
          user_id: userId,
          project_id: projectId,
          unity_build_version: version,
          device_info: device,
          status: "active",
        })
        .select("*")
        .single();

      if (error) return jsonResponse({ error: "Could not start AR session." }, 500);

      const s = data as SessionRow;
      return jsonResponse({
        session: {
          id: s.id,
          project_id: s.project_id,
          unity_build_version: s.unity_build_version,
          device_info: s.device_info,
          status: s.status,
          started_at: s.started_at,
        },
      });
    }

    // POST /end — end the caller's active session via SECURITY DEFINER function
    if (req.method === "POST" && path === "/end") {
      let body: { session_id?: string; status?: string } = {};
      try {
        body = await req.json();
      } catch {
        return jsonResponse({ error: "Invalid JSON body." }, 400);
      }

      const sessionId = body.session_id;
      const endStatus = body.status ?? "completed";

      if (!sessionId) {
        return jsonResponse({ error: "session_id is required." }, 400);
      }

      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(sessionId)) {
        return jsonResponse({ error: "Invalid session_id." }, 400);
      }

      if (endStatus !== "completed" && endStatus !== "aborted") {
        return jsonResponse({ error: "status must be 'completed' or 'aborted'." }, 400);
      }

      // Call the SECURITY DEFINER function with the caller's token so
      // auth.uid() inside the function resolves to the caller.
      const authHeader = req.headers.get("Authorization");
      const token = authHeader?.replace("Bearer ", "").trim();
      const userClient = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: `Bearer ${token}` } },
      });

      const { error } = await userClient.rpc("end_ar_session", {
        p_session_id: sessionId,
        p_status: endStatus,
      });

      if (error) {
        const msg = error.message.toLowerCase();
        if (msg.includes("not authorized")) {
          return jsonResponse({ error: "Not authorized to end this session." }, 403);
        }
        if (msg.includes("not found")) {
          return jsonResponse({ error: "Session not found." }, 404);
        }
        if (msg.includes("not active")) {
          return jsonResponse({ error: "Session is already ended." }, 409);
        }
        return jsonResponse({ error: "Could not end AR session." }, 500);
      }

      return jsonResponse({ success: true, session_id: sessionId, status: endStatus });
    }

    return jsonResponse({ error: "Endpoint not found", path }, 404);
  } catch (err) {
    return jsonResponse(
      { error: err instanceof Error ? err.message : "Internal server error" },
      500
    );
  }
});
