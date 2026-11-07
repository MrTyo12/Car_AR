import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseKey);

interface ProjectStep {
  id: string;
  project_id: string;
  description: string;
  fastener_info: string;
  torque_spec: string;
  tools_required: string;
  completed: boolean;
  step_order: number;
}

interface Project {
  id: string;
  title: string;
  category: string;
  difficulty: number;
  est_hours: number;
  parts_cost: number;
  shop_labor_cost: number;
  status: string;
  description: string;
}

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "GET") {
    return jsonResponse({ error: "Method not allowed. Use GET." }, 405);
  }

  try {
    const url = new URL(req.url);
    const path = url.pathname.replace(/^.*\/charger-api/, "") || "/";

    // Helper to load a project by slug keyword
    async function findProject(slug: string): Promise<Project | null> {
      const keywordMap: Record<string, string> = {
        headers: "Long Tube Headers",
        "ac-recharge": "AC System Refrigerant Recharge",
        ac: "AC System Refrigerant Recharge",
      };
      const keyword = keywordMap[slug];
      if (!keyword) return null;

      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .ilike("title", `%${keyword}%`)
        .maybeSingle();

      if (error || !data) return null;
      return data as Project;
    }

    // GET / — API root: list available endpoints
    if (path === "/" || path === "") {
      return jsonResponse({
        name: "Scat Pack DIY API",
        description: "Dodge Charger Scat Pack Widebody DIY project tracker API",
        endpoints: {
          "GET /api/projects": "List all projects with step summaries",
          "GET /api/projects/{slug}": "Get a single project by slug (headers, ac-recharge, or project UUID)",
          "GET /api/projects/{slug}/steps": "Get step-by-step procedure for a project (includes fastener sizes, torque specs, completion status)",
          "GET /api/projects/{slug}/status": "Get completion status summary for a project",
          "GET /api/parts": "List all parts in inventory with delivery status",
          "GET /api/tools": "List all tools in the checklist with ownership status",
          "GET /api/maintenance": "List recent maintenance logs",
          "GET /api/upcoming": "List upcoming service items",
        },
        slugs: {
          headers: "Installing Long Tube Headers",
          "ac-recharge": "AC System Refrigerant Recharge",
        },
      });
    }

    const segments = path.split("/").filter(Boolean);

    // /api/projects
    if (segments.length >= 2 && segments[0] === "api" && segments[1] === "projects") {
      // List all projects
      if (segments.length === 2) {
        const { data: projects, error } = await supabase
          .from("projects")
          .select("*")
          .order("created_at", { ascending: false });

        if (error) return jsonResponse({ error: error.message }, 500);

        // Fetch step counts for each project
        const enriched = await Promise.all(
          (projects as Project[]).map(async (p) => {
            const { data: steps } = await supabase
              .from("project_steps")
              .select("id, completed")
              .eq("project_id", p.id);

            const all = steps ?? [];
            const completed = all.filter((s) => s.completed).length;
            const totalSavings = p.shop_labor_cost;
            const totalAtShop = p.parts_cost + p.shop_labor_cost;
            const savingsPct = totalAtShop > 0 ? Math.round((totalSavings / totalAtShop) * 100) : 0;

            return {
              id: p.id,
              title: p.title,
              category: p.category,
              difficulty: p.difficulty,
              est_hours: p.est_hours,
              status: p.status,
              cost_breakdown: {
                parts_cost: p.parts_cost,
                shop_labor_cost: p.shop_labor_cost,
                total_at_shop: totalAtShop,
                diy_savings: totalSavings,
                savings_percent: savingsPct,
              },
              steps: {
                total: all.length,
                completed,
                remaining: all.length - completed,
              },
            };
          })
        );

        return jsonResponse({ projects: enriched, count: enriched.length });
      }

      // /api/projects/{slug}
      const slug = segments[2];
      let project: Project | null = null;

      // Try UUID first
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(slug)) {
        const { data, error } = await supabase
          .from("projects")
          .select("*")
          .eq("id", slug)
          .maybeSingle();
        if (!error && data) project = data as Project;
      } else {
        project = await findProject(slug);
      }

      if (!project) {
        return jsonResponse({
          error: "Project not found",
          slug,
          hint: "Use a slug like 'headers' or 'ac-recharge', or a valid project UUID.",
        }, 404);
      }

      // /api/projects/{slug}/steps
      if (segments.length === 4 && segments[3] === "steps") {
        const { data: steps, error } = await supabase
          .from("project_steps")
          .select("*")
          .eq("project_id", project.id)
          .order("step_order", { ascending: true });

        if (error) return jsonResponse({ error: error.message }, 500);

        const allSteps = (steps ?? []) as ProjectStep[];
        const completed = allSteps.filter((s) => s.completed).length;

        return jsonResponse({
          project: {
            id: project.id,
            title: project.title,
            category: project.category,
            difficulty: project.difficulty,
            est_hours: project.est_hours,
            status: project.status,
          },
          steps: allSteps.map((s, idx) => ({
            step_number: idx + 1,
            id: s.id,
            description: s.description,
            fastener_info: s.fastener_info,
            torque_spec: s.torque_spec,
            tools_required: s.tools_required,
            completed: s.completed,
            step_order: s.step_order,
          })),
          summary: {
            total_steps: allSteps.length,
            completed,
            remaining: allSteps.length - completed,
            completion_percentage: allSteps.length > 0 ? Math.round((completed / allSteps.length) * 100) : 0,
          },
        });
      }

      // /api/projects/{slug}/status
      if (segments.length === 4 && segments[3] === "status") {
        const { data: steps } = await supabase
          .from("project_steps")
          .select("completed")
          .eq("project_id", project.id);

        const all = steps ?? [];
        const completed = all.filter((s) => s.completed).length;

        return jsonResponse({
          project: {
            id: project.id,
            title: project.title,
            status: project.status,
          },
          steps: {
            total: all.length,
            completed,
            remaining: all.length - completed,
            completion_percentage: all.length > 0 ? Math.round((completed / all.length) * 100) : 0,
          },
        });
      }

      // /api/projects/{slug} — full project detail
      const { data: steps } = await supabase
        .from("project_steps")
        .select("*")
        .eq("project_id", project.id)
        .order("step_order", { ascending: true });

      const allSteps = (steps ?? []) as ProjectStep[];
      const completed = allSteps.filter((s) => s.completed).length;
      const totalAtShop = project.parts_cost + project.shop_labor_cost;

      return jsonResponse({
        id: project.id,
        title: project.title,
        category: project.category,
        difficulty: project.difficulty,
        est_hours: project.est_hours,
        status: project.status,
        description: project.description,
        cost_breakdown: {
          parts_cost: project.parts_cost,
          shop_labor_cost: project.shop_labor_cost,
          total_at_shop: totalAtShop,
          diy_savings: project.shop_labor_cost,
          savings_percent: totalAtShop > 0 ? Math.round((project.shop_labor_cost / totalAtShop) * 100) : 0,
        },
        steps: allSteps.map((s, idx) => ({
          step_number: idx + 1,
          id: s.id,
          description: s.description,
          fastener_info: s.fastener_info,
          torque_spec: s.torque_spec,
          tools_required: s.tools_required,
          completed: s.completed,
        })),
        progress: {
          total_steps: allSteps.length,
          completed,
          remaining: allSteps.length - completed,
          completion_percentage: allSteps.length > 0 ? Math.round((completed / allSteps.length) * 100) : 0,
        },
      });
    }

    // /api/parts
    if (segments.length === 2 && segments[0] === "api" && segments[1] === "parts") {
      const { data, error } = await supabase
        .from("parts_inventory")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) return jsonResponse({ error: error.message }, 500);

      const parts = data ?? [];
      const totalValue = parts.reduce((sum: number, p: any) => sum + Number(p.price) * p.quantity, 0);

      return jsonResponse({
        parts: parts.map((p: any) => ({
          id: p.id,
          name: p.name,
          part_number: p.part_number,
          vendor: p.vendor,
          price: Number(p.price),
          quantity: p.quantity,
          delivery_status: p.delivery_status,
          notes: p.notes,
        })),
        count: parts.length,
        total_value: totalValue,
      });
    }

    // /api/tools
    if (segments.length === 2 && segments[0] === "api" && segments[1] === "tools") {
      const { data, error } = await supabase
        .from("tools_checklist")
        .select("*")
        .order("category", { ascending: true });

      if (error) return jsonResponse({ error: error.message }, 500);

      const tools = data ?? [];
      const owned = tools.filter((t: any) => t.owned).length;

      return jsonResponse({
        tools: tools.map((t: any) => ({
          id: t.id,
          name: t.name,
          category: t.category,
          owned: t.owned,
          notes: t.notes,
        })),
        count: tools.length,
        owned_count: owned,
        needed_count: tools.length - owned,
      });
    }

    // /api/maintenance
    if (segments.length === 2 && segments[0] === "api" && segments[1] === "maintenance") {
      const { data, error } = await supabase
        .from("maintenance_logs")
        .select("*")
        .order("log_date", { ascending: false })
        .limit(20);

      if (error) return jsonResponse({ error: error.message }, 500);

      return jsonResponse({
        logs: (data ?? []).map((l: any) => ({
          id: l.id,
          date: l.log_date,
          mileage: l.mileage,
          service_type: l.service_type,
          description: l.description,
          cost: Number(l.cost),
        })),
        count: data?.length ?? 0,
      });
    }

    // /api/upcoming
    if (segments.length === 2 && segments[0] === "api" && segments[1] === "upcoming") {
      const { data, error } = await supabase
        .from("upcoming_services")
        .select("*")
        .order("due_mileage", { ascending: true });

      if (error) return jsonResponse({ error: error.message }, 500);

      return jsonResponse({
        services: (data ?? []).map((s: any) => ({
          id: s.id,
          item: s.item,
          due_mileage: s.due_mileage,
          priority: s.priority,
          notes: s.notes,
          completed: s.completed,
        })),
        count: data?.length ?? 0,
        pending: (data ?? []).filter((s: any) => !s.completed).length,
      });
    }

    return jsonResponse({ error: "Endpoint not found", path }, 404);
  } catch (err) {
    return jsonResponse(
      { error: err instanceof Error ? err.message : "Internal server error" },
      500
    );
  }
});
