import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Get the JWT from the Authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    // Verify the user's JWT and get their user ID
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });
    
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      console.error("Auth error:", userError);
      return new Response(
        JSON.stringify({ error: "Invalid or expired token" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    // Use service role to check if user has admin role
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);
    
    const { data: hasAdminRole, error: roleError } = await serviceClient
      .rpc('has_role', { _user_id: user.id, _role: 'admin' });

    if (roleError) {
      console.error("Role check error:", roleError);
      return new Response(
        JSON.stringify({ error: "Failed to verify permissions" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    if (!hasAdminRole) {
      return new Response(
        JSON.stringify({ error: "Insufficient permissions. Admin role required." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 403 }
      );
    }

    // User is authenticated and has admin role - proceed with import
    const { callId } = await req.json();

    if (!callId) {
      return new Response(
        JSON.stringify({ error: "callId is required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    const vapiApiKey = Deno.env.get("VAPI_API_KEY");
    if (!vapiApiKey) {
      return new Response(
        JSON.stringify({ error: "VAPI_API_KEY not configured" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    // Fetch call details from Vapi API
    console.log(`Fetching call details for callId: ${callId}`);
    const vapiResponse = await fetch(`https://api.vapi.ai/call/${callId}`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${vapiApiKey}`,
        "Content-Type": "application/json",
      },
    });

    if (!vapiResponse.ok) {
      const errorText = await vapiResponse.text();
      console.error("Vapi API error:", errorText);
      return new Response(
        JSON.stringify({ error: `Failed to fetch call from Vapi: ${vapiResponse.status}` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    const callData = await vapiResponse.json();
    console.log("Call data received:", JSON.stringify(callData, null, 2));

    // Extract structured data from the call
    const structuredData = callData.analysis?.structuredData || {};
    
    // Map Vapi call data to founder_profiles schema
    const profileData = {
      vapi_call_id: callId,
      phone_number: callData.customer?.number || null,
      name: structuredData.name || null,
      whatsapp: structuredData.whatsapp || null,
      idea_description: structuredData.idea_description || null,
      problem_solving: structuredData.problem_solving || null,
      target_customer: structuredData.target_customer || null,
      stage: structuredData.stage || null,
      excitement_reason: structuredData.excitement_reason || null,
      background: structuredData.background || null,
      core_skills: structuredData.core_skills || null,
      previous_founder: structuredData.previous_founder || null,
      superpower: structuredData.superpower || null,
      weaknesses_blindspots: structuredData.weaknesses_blindspots || null,
      timeline_start: structuredData.timeline_start || null,
      urgency_level: structuredData.urgency_level || null,
      seeking_skills: structuredData.seeking_skills || null,
      cofounder_type: structuredData.cofounder_type || null,
      location_preference: structuredData.location_preference || null,
      commitment_level: structuredData.commitment_level || null,
      working_style: structuredData.working_style || null,
      non_negotiables: structuredData.non_negotiables || null,
      deal_breakers: structuredData.deal_breakers || null,
      equity_thoughts: structuredData.equity_thoughts || null,
      seriousness_score: structuredData.seriousness_score || null,
      preferred_contact: structuredData.preferred_contact || null,
      match_frequency_preference: structuredData.match_frequency_preference || null,
      success_criteria: structuredData.success_criteria || null,
      willingness_to_pay: structuredData.willingness_to_pay || null,
      call_summary: callData.summary || callData.analysis?.summary || null,
    };

    // Upsert into founder_profiles
    const { data, error } = await serviceClient
      .from("founder_profiles")
      .upsert(profileData, { onConflict: "vapi_call_id" })
      .select()
      .single();

    if (error) {
      console.error("Database error:", error);
      throw error;
    }

    console.log("Profile upserted successfully:", data.id);

    return new Response(
      JSON.stringify({ success: true, profile: data }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    console.error("Error in import-vapi-calls:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
