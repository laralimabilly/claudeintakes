// supabase/functions/send-whatsapp-intro/index.ts
// ============================================================================
// Sends WhatsApp match notification to Founder A (the one who joined first).
// Accepts { matchId } or legacy { founderIds: [id1, id2] }.
// Now reads highly_compatible_threshold from system_parameters.
// ============================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendWhatsAppMessage } from "../_shared/whatsapp/sendMessage.ts";
import { generateMessage } from "../_shared/whatsapp/templates.ts";
import { setConversationState } from "../_shared/whatsapp/conversationState.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function getHighlyCompatibleThreshold(supabase: any): Promise<number> {
  const { data, error } = await supabase
    .from("system_parameters")
    .select("value")
    .eq("system_key", "MATCHING_WEIGHTS")
    .single();

  if (error || !data) {
    throw new Error(`Failed to load MATCHING_WEIGHTS: ${error?.message ?? "not found"}`);
  }

  return data.value.highly_compatible_threshold;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // --- Auth check ---
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

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired token" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    const { data: hasAdminRole, error: roleError } = await serviceClient.rpc("has_role", {
      _user_id: user.id,
      _role: "admin",
    });

    if (roleError || !hasAdminRole) {
      return new Response(
        JSON.stringify({ error: "Insufficient permissions. Admin role required." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 403 }
      );
    }

    // --- Load threshold from DB ---
    const highlyCompatibleThreshold = await getHighlyCompatibleThreshold(serviceClient);

    // --- Parse request ---
    const body = await req.json();
    let matchId: string | undefined = body.matchId;
    const founderIds: string[] | undefined = body.founderIds;

    if (!matchId && founderIds && Array.isArray(founderIds) && founderIds.length === 2) {
      const { data: existingMatch } = await serviceClient
        .from("founder_matches")
        .select("id")
        .or(
          `and(founder_id.eq.${founderIds[0]},matched_founder_id.eq.${founderIds[1]}),and(founder_id.eq.${founderIds[1]},matched_founder_id.eq.${founderIds[0]})`
        )
        .maybeSingle();

      if (existingMatch) {
        matchId = existingMatch.id;
      } else {
        return new Response(
          JSON.stringify({ error: "No match found between these two founders. Run compute-matches first." }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
        );
      }
    }

    if (!matchId) {
      return new Response(
        JSON.stringify({ error: "matchId is required (or founderIds with exactly 2 IDs)" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // --- Fetch match record ---
    const { data: match, error: matchError } = await serviceClient
      .from("founder_matches")
      .select(
        "id, founder_id, matched_founder_id, total_score, compatibility_level, status, score_skills, score_stage, score_communication, score_vision, score_values, score_geo, score_advantages"
      )
      .eq("id", matchId)
      .maybeSingle();

    if (matchError || !match) {
      return new Response(
        JSON.stringify({ error: "Match not found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
      );
    }

    // --- Fetch both founder profiles ---
    const { data: founders, error: foundersError } = await serviceClient
      .from("founder_profiles")
      .select(
        "id, name, phone_number, whatsapp, idea_description, core_skills, seeking_skills, stage, cofounder_type, location_preference, commitment_level, working_style, timeline_start, background, superpower, previous_founder, created_at"
      )
      .in("id", [match.founder_id, match.matched_founder_id]);

    if (foundersError || !founders || founders.length < 2) {
      return new Response(
        JSON.stringify({ error: "Could not fetch both founder profiles" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
      );
    }

    // --- Determine notification order: older created_at = Founder A ---
    const sorted = founders.sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    const founderA = sorted[0];
    const founderB = sorted[1];
    const sideA = founderA.id === match.founder_id ? "a" : "b";

    // --- Pick template based on configurable threshold ---
    const score = Math.round(match.total_score);
    const compatLevel =
      match.compatibility_level || (score >= highlyCompatibleThreshold ? "highly_compatible" : "somewhat_compatible");

    const templateName =
      score >= highlyCompatibleThreshold ? "highly_compatible_initial" : "somewhat_compatible_initial";

    const matchData = {
      total_score: match.total_score,
      compatibility_level: compatLevel,
      score_skills: Number(match.score_skills) || 0,
      score_stage: Number(match.score_stage) || 0,
      score_communication: Number(match.score_communication) || 0,
      score_vision: Number(match.score_vision) || 0,
      score_values: Number(match.score_values) || 0,
      score_geo: Number(match.score_geo) || 0,
      score_advantages: Number(match.score_advantages) || 0,
    };

    const messageBody = generateMessage(templateName, {
      founder: founderA,
      other: founderB,
      match: matchData,
    });

    // --- Send WhatsApp message to Founder A ---
    const phoneNumber = founderA.whatsapp || founderA.phone_number;

    const sendResult = await sendWhatsAppMessage({
      to: phoneNumber,
      body: messageBody,
      supabase: serviceClient,
    });

    if (!sendResult.success) {
      return new Response(
        JSON.stringify({ error: `Failed to send WhatsApp: ${sendResult.error}` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    // --- Set conversation state to MATCH_NOTIFIED ---
    await setConversationState(serviceClient, {
      founderId: founderA.id,
      phoneNumber,
      state: "MATCH_NOTIFIED",
      context: {
        match_id: match.id,
        other_founder_id: founderB.id,
        other_founder_name: founderB.name || "your match",
        score,
        compatibility_level: compatLevel,
        side: sideA,
      },
    });

    // --- Update match record ---
    await serviceClient
      .from("founder_matches")
      .update({ status: "notified_a", notified_at: new Date().toISOString() })
      .eq("id", match.id);

    return new Response(
      JSON.stringify({
        success: true,
        notifiedFounder: { id: founderA.id, name: founderA.name },
        matchId: match.id,
        score,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    console.error("Error in send-whatsapp-intro:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
