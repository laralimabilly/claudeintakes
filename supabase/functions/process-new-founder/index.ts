// supabase/functions/process-new-founder/index.ts
// Automatically generates embeddings and finds matches when a new founder completes their call

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import OpenAI from "https://esm.sh/openai@4.73.0";
import { geocodeLocation } from "../_shared/geocoding/geocodeLocation.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface FounderProfile {
  id: string;
  name?: string;
  idea_description?: string;
  problem_solving?: string;
  target_customer?: string;
  stage?: string;
  excitement_reason?: string;
  background?: string;
  core_skills?: string[];
  previous_founder?: boolean;
  superpower?: string;
  weaknesses_blindspots?: string[];
  timeline_start?: string;
  urgency_level?: string;
  seeking_skills?: string[];
  cofounder_type?: string;
  location_preference?: string;
  commitment_level?: string;
  working_style?: string;
  non_negotiables?: string[];
  deal_breakers?: string[];
  equity_thoughts?: string;
  seriousness_score?: number;
  willingness_to_pay?: string;
}

function generateProfileText(profile: FounderProfile): string {
  return `
    ${profile.name ? `Founder: ${profile.name}` : ""}
    
    IDEA & VISION:
    ${profile.idea_description || ""}
    ${profile.problem_solving || ""}
    ${profile.target_customer || ""}
    Stage: ${profile.stage || "Not specified"}
    ${profile.excitement_reason || ""}
    
    FOUNDER BACKGROUND:
    ${profile.background || ""}
    ${profile.previous_founder ? "Previous founder experience: Yes" : "First-time founder"}
    ${profile.superpower ? `Superpower: ${profile.superpower}` : ""}
    
    SKILLS & EXPERTISE:
    Has: ${profile.core_skills?.join(", ") || "Not specified"}
    Seeking: ${profile.seeking_skills?.join(", ") || "Not specified"}
    ${profile.weaknesses_blindspots?.length ? `Aware of gaps in: ${profile.weaknesses_blindspots.join(", ")}` : ""}
    
    COFOUNDER PREFERENCES:
    Looking for: ${profile.cofounder_type || "Not specified"}
    Working style: ${profile.working_style || "Not specified"}
    Commitment: ${profile.commitment_level || "Not specified"}
    ${profile.location_preference ? `Location: ${profile.location_preference}` : ""}
    
    TIMELINE & COMMITMENT:
    Timeline to start: ${profile.timeline_start || "Not specified"}
    Urgency: ${profile.urgency_level || "Not specified"}
    Seriousness score: ${profile.seriousness_score || "Not rated"}
    
    DEAL PARAMETERS:
    ${profile.non_negotiables?.length ? `Non-negotiables: ${profile.non_negotiables.join(", ")}` : ""}
    ${profile.deal_breakers?.length ? `Deal breakers: ${profile.deal_breakers.join(", ")}` : ""}
    ${profile.equity_thoughts || ""}
    ${profile.willingness_to_pay || ""}
  `.trim();
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { founderId } = await req.json();

    if (!founderId) {
      return new Response(JSON.stringify({ error: "founderId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Initialize clients
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");

    if (!openaiApiKey) {
      throw new Error("OPENAI_API_KEY is not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const openai = new OpenAI({ apiKey: openaiApiKey });

    // 1. Fetch founder profile
    console.log(`Processing founder: ${founderId}`);
    const { data: profile, error: fetchError } = await supabase
      .from("founder_profiles")
      .select("*")
      .eq("id", founderId)
      .single();

    if (fetchError || !profile) {
      throw new Error(`Failed to fetch profile: ${fetchError?.message}`);
    }

    // 2. Generate and store embedding
    console.log("Generating embedding...");
    const profileText = generateProfileText(profile);

    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: profileText,
    });

    const embedding = embeddingResponse.data[0].embedding;

    console.log("Storing embedding...");
    const { error: updateError } = await supabase.from("founder_profiles").update({ embedding }).eq("id", founderId);

    if (updateError) {
      throw new Error(`Failed to store embedding: ${updateError.message}`);
    }

    // 3. Geocode location and store in founder_locations table
    let geocodeInfo = null;
    if (profile.location_preference) {
      console.log("Geocoding location...");

      try {
        const geoResult = await geocodeLocation(profile.location_preference);

        const locationData: Record<string, unknown> = {
          founder_id: founderId,
          raw_input: profile.location_preference,
          is_remote_ok: geoResult.preferences.isRemoteOk,
          is_remote_only: geoResult.preferences.isRemoteOnly,
          is_hybrid_ok: geoResult.preferences.isHybridOk,
          willing_to_relocate: geoResult.preferences.willingToRelocate,
        };

        if (geoResult.success && geoResult.location) {
          const loc = geoResult.location;
          locationData.lat = loc.lat;
          locationData.lng = loc.lng;
          locationData.city = loc.city;
          locationData.region = loc.region;
          locationData.country = loc.country;
          locationData.country_name = loc.countryName;
          locationData.display_name = loc.displayName;
          locationData.timezone_offset = loc.timezoneOffset;
          locationData.confidence = loc.confidence;
          locationData.geocoded_at = new Date().toISOString();

          geocodeInfo = { city: loc.city, country: loc.country };
          console.log(`Geocoded: "${profile.location_preference}" → ${loc.city}, ${loc.country}`);
        } else {
          console.log(`No geocode results: ${geoResult.error}`);
        }

        const { error: locationError } = await supabase
          .from("founder_locations")
          .upsert(locationData, { onConflict: "founder_id" });

        if (locationError) {
          console.error("Failed to store location:", locationError);
        }
      } catch (geoError) {
        console.error("Geocoding error:", geoError);
      }
    }

    // 4. Find matches
    console.log("Finding matches...");
    const { data: matches, error: matchError } = await supabase.rpc("match_founders", {
      query_embedding: embedding,
      match_threshold: 0.75,
      match_count: 10,
      exclude_profile_id: founderId,
    });

    if (matchError) {
      console.error("Error finding matches:", matchError);
    }

    // 5. Store matches
    if (matches && matches.length > 0) {
      console.log(`Found ${matches.length} matches`);

      for (const match of matches) {
        const { error: storeError } = await supabase.rpc("store_founder_match", {
          p_founder_id: founderId,
          p_matched_founder_id: match.id,
          p_similarity_score: match.similarity,
        });

        if (storeError) {
          console.error(`Failed to store match with ${match.id}:`, storeError);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        founderId,
        embeddingGenerated: true,
        location: geocodeInfo,
        matchesFound: matches?.length || 0,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Error in process-new-founder:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
