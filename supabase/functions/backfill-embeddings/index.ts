// supabase/functions/backfill-embeddings/index.ts
// Run this once to generate embeddings for all existing profiles

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
  embedding?: number[];
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

// Delay helper for rate limiting
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse request body (optional parameters)
    const body = await req.json().catch(() => ({}));
    const { batchSize = 50, delayMs = 100 } = body;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");

    if (!openaiApiKey) {
      return new Response(
        JSON.stringify({ error: "OPENAI_API_KEY is not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify admin access
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });
    
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired token" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);
    
    const { data: hasAdminRole, error: roleError } = await serviceClient
      .rpc('has_role', { _user_id: user.id, _role: 'admin' });

    if (roleError || !hasAdminRole) {
      return new Response(
        JSON.stringify({ error: "Admin role required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 403 }
      );
    }

    // Fetch profiles without embeddings
    console.log("Fetching profiles without embeddings...");
    const { data: profiles, error: fetchError } = await serviceClient
      .from("founder_profiles")
      .select("*")
      .is("embedding", null)
      .limit(batchSize);

    if (fetchError) {
      throw new Error(`Failed to fetch profiles: ${fetchError.message}`);
    }

    if (!profiles || profiles.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "No profiles need embeddings",
          processed: 0,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Processing ${profiles.length} profiles...`);

    const openai = new OpenAI({ apiKey: openaiApiKey });
    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (const profile of profiles) {
      try {
        // Generate embedding
        const profileText = generateProfileText(profile);
        const embeddingResponse = await openai.embeddings.create({
          model: "text-embedding-3-small",
          input: profileText,
        });

        const embedding = embeddingResponse.data[0].embedding;

        // Store embedding
        const { error: updateError } = await serviceClient
          .from("founder_profiles")
          .update({ embedding })
          .eq("id", profile.id);

        if (updateError) {
          throw new Error(`Update failed: ${updateError.message}`);
        }

        results.success++;
        console.log(`✓ Processed ${profile.id} (${results.success}/${profiles.length})`);

        // Rate limiting delay
        if (delayMs > 0) {
          await delay(delayMs);
        }

      } catch (error) {
        results.failed++;
        const rawMsg = error instanceof Error ? error.message : 'Unknown error';
        // Sanitize error messages to prevent leaking secrets
        const safeMsg = rawMsg.replace(/sk-[a-zA-Z0-9_-]+/g, '[REDACTED]');
        const errorMsg = `Failed to process ${profile.id}: ${safeMsg}`;
        results.errors.push(errorMsg);
        console.error(errorMsg);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: results.success,
        failed: results.failed,
        total: profiles.length,
        errors: results.errors.length > 0 ? results.errors : undefined,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    const rawMsg = error instanceof Error ? error.message : "Unknown error";
    const safeMsg = rawMsg.replace(/sk-[a-zA-Z0-9_-]+/g, '[REDACTED]');
    console.error("Error in backfill-embeddings:", safeMsg);
    return new Response(
      JSON.stringify({ error: safeMsg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
