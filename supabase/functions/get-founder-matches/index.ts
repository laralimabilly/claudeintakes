// supabase/functions/get-founder-matches/index.ts
// Returns AI-powered matches for a given founder
// Uses existing embeddings or generates them on-the-fly

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import OpenAI from "https://esm.sh/openai@4.73.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface FounderProfile {
  id: string;
  name?: string;
  embedding?: string;
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
    ${profile.name ? `Founder: ${profile.name}` : ''}
    
    IDEA & VISION:
    ${profile.idea_description || ''}
    ${profile.problem_solving || ''}
    ${profile.target_customer || ''}
    Stage: ${profile.stage || 'Not specified'}
    ${profile.excitement_reason || ''}
    
    FOUNDER BACKGROUND:
    ${profile.background || ''}
    ${profile.previous_founder ? 'Previous founder experience: Yes' : 'First-time founder'}
    ${profile.superpower ? `Superpower: ${profile.superpower}` : ''}
    
    SKILLS & EXPERTISE:
    Has: ${profile.core_skills?.join(', ') || 'Not specified'}
    Seeking: ${profile.seeking_skills?.join(', ') || 'Not specified'}
    ${profile.weaknesses_blindspots?.length ? `Aware of gaps in: ${profile.weaknesses_blindspots.join(', ')}` : ''}
    
    COFOUNDER PREFERENCES:
    Looking for: ${profile.cofounder_type || 'Not specified'}
    Working style: ${profile.working_style || 'Not specified'}
    Commitment: ${profile.commitment_level || 'Not specified'}
    ${profile.location_preference ? `Location: ${profile.location_preference}` : ''}
    
    TIMELINE & COMMITMENT:
    Timeline to start: ${profile.timeline_start || 'Not specified'}
    Urgency: ${profile.urgency_level || 'Not specified'}
    Seriousness score: ${profile.seriousness_score || 'Not rated'}
    
    DEAL PARAMETERS:
    ${profile.non_negotiables?.length ? `Non-negotiables: ${profile.non_negotiables.join(', ')}` : ''}
    ${profile.deal_breakers?.length ? `Deal breakers: ${profile.deal_breakers.join(', ')}` : ''}
    ${profile.equity_thoughts || ''}
    ${profile.willingness_to_pay || ''}
  `.trim();
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { founderId, threshold = 0.70, limit = 20 } = await req.json();

    if (!founderId) {
      return new Response(
        JSON.stringify({ error: "founderId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
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
    console.log(`Fetching matches for founder: ${founderId}`);
    const { data: profile, error: fetchError } = await supabase
      .from("founder_profiles")
      .select("*")
      .eq("id", founderId)
      .single();

    if (fetchError || !profile) {
      throw new Error(`Failed to fetch profile: ${fetchError?.message}`);
    }

    let embedding: number[];

    // 2. Check if embedding exists, generate if not
    if (profile.embedding) {
      console.log("Using existing embedding");
      // Parse the stored embedding (stored as vector type, returned as string)
      if (typeof profile.embedding === 'string') {
        // If it's a string like "[0.1, 0.2, ...]", parse it
        embedding = JSON.parse(profile.embedding);
      } else {
        embedding = profile.embedding;
      }
    } else {
      console.log("Generating new embedding...");
      const profileText = generateProfileText(profile);
      
      const embeddingResponse = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: profileText,
      });

      embedding = embeddingResponse.data[0].embedding;

      // Store for future use
      const { error: updateError } = await supabase
        .from("founder_profiles")
        .update({ embedding })
        .eq("id", founderId);

      if (updateError) {
        console.error("Failed to store embedding:", updateError);
        // Don't fail the request, we can still find matches
      }
    }

    // 3. Find matches using vector similarity
    console.log("Finding matches...");
    const { data: matches, error: matchError } = await supabase.rpc("match_founders", {
      query_embedding: embedding,
      match_threshold: threshold,
      match_count: limit,
      exclude_profile_id: founderId,
    });

    if (matchError) {
      throw new Error(`Failed to find matches: ${matchError.message}`);
    }

    console.log(`Found ${matches?.length || 0} matches`);

    return new Response(
      JSON.stringify({
        success: true,
        founderId,
        matches: matches || [],
        matchCount: matches?.length || 0,
        embeddingGenerated: !profile.embedding,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in get-founder-matches:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
