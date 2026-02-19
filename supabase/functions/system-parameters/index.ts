// supabase/functions/system-parameters/index.ts
// ============================================================================
// CRUD edge function for system_parameters table
// GET: returns all parameters (or single key via ?key=...)
// PUT: updates a parameter (admin only)
// ============================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "GET, PUT, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  // --- Auth ---
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(
      JSON.stringify({ error: "Missing authorization header" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
    );
  }

  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser();

  if (userError || !user) {
    return new Response(
      JSON.stringify({ error: "Invalid or expired token" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
    );
  }

  const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

  const { data: hasAdminRole } = await serviceClient.rpc("has_role", {
    _user_id: user.id,
    _role: "admin",
  });

  if (!hasAdminRole) {
    return new Response(
      JSON.stringify({ error: "Admin role required" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 403 }
    );
  }

  try {
    // --- GET: fetch parameters ---
    if (req.method === "GET") {
      const url = new URL(req.url);
      const key = url.searchParams.get("key");

      if (key) {
        const { data, error } = await serviceClient
          .from("system_parameters")
          .select("*")
          .eq("system_key", key)
          .maybeSingle();

        if (error) throw error;
        if (!data) {
          return new Response(
            JSON.stringify({ error: "Parameter not found" }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
          );
        }

        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Return all parameters
      const { data, error } = await serviceClient
        .from("system_parameters")
        .select("*")
        .order("system_key");

      if (error) throw error;

      return new Response(JSON.stringify({ parameters: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- PUT: update parameter ---
    if (req.method === "PUT") {
      const { system_key, value } = await req.json();

      if (!system_key || value === undefined) {
        return new Response(
          JSON.stringify({ error: "system_key and value are required" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }

      const { data, error } = await serviceClient
        .from("system_parameters")
        .upsert(
          {
            system_key,
            value,
            updated_at: new Date().toISOString(),
            updated_by: user.id,
          },
          { onConflict: "system_key" }
        )
        .select()
        .single();

      if (error) throw error;

      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 405 }
    );
  } catch (error) {
    console.error("system-parameters error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
