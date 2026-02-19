import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    if (!lovableApiKey) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch profiles without taglines
    const { data: profiles, error: fetchError } = await supabase
      .from("founder_profiles")
      .select("id, name, call_summary, idea_description, core_skills, stage, cofounder_type")
      .is("tagline", null)
      .order("created_at", { ascending: false });

    if (fetchError) throw new Error(`Failed to fetch profiles: ${fetchError.message}`);
    if (!profiles || profiles.length === 0) {
      return new Response(
        JSON.stringify({ success: true, processed: 0, message: "All profiles already have taglines" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Generating taglines for ${profiles.length} profiles`);

    let processed = 0;
    let errors = 0;

    // Process in batches of 5
    for (let i = 0; i < profiles.length; i += 5) {
      const batch = profiles.slice(i, i + 5);

      const batchPrompt = batch.map((p, idx) => {
        const source = p.call_summary || p.idea_description || "";
        return `PROFILE ${idx + 1} (id: ${p.id}):
Name: ${p.name || "Unknown"}
Summary: ${source.slice(0, 500)}
Skills: ${p.core_skills?.join(", ") || "N/A"}
Stage: ${p.stage || "N/A"}
Seeking: ${p.cofounder_type || "N/A"}`;
      }).join("\n\n---\n\n");

      try {
        const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${lovableApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash-lite",
            messages: [
              {
                role: "system",
                content: `You generate ultra-short taglines for founder profiles. Each tagline must be 6-10 words max that capture WHAT they're building and WHO they are. Focus on the product/idea, not generic descriptions. Use active, specific language.

Examples of GOOD taglines:
- "AI writing tool for enterprise sales teams"
- "Solar-powered skincare marketplace, ex-Google PM"  
- "Career coaching platform, serial founder"
- "Fintech for gig worker savings accounts"

Examples of BAD taglines (too generic):
- "Seeking a technical co-founder for startup"
- "Experienced founder looking for partners"
- "Building something in the AI space"

Return ONLY a JSON array with objects: [{"id": "...", "tagline": "..."}]
No markdown, no explanation.`,
              },
              {
                role: "user",
                content: batchPrompt,
              },
            ],
          }),
        });

        if (!response.ok) {
          console.error(`AI gateway error: ${response.status}`);
          errors += batch.length;
          continue;
        }

        const result = await response.json();
        const content = result.choices?.[0]?.message?.content || "";
        
        // Parse JSON from response (strip markdown fences if present)
        const jsonStr = content.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
        const taglines = JSON.parse(jsonStr);

        for (const item of taglines) {
          const { error: updateError } = await supabase
            .from("founder_profiles")
            .update({ tagline: item.tagline })
            .eq("id", item.id);

          if (updateError) {
            console.error(`Failed to update ${item.id}:`, updateError);
            errors++;
          } else {
            processed++;
          }
        }
      } catch (batchError) {
        console.error("Batch error:", batchError);
        errors += batch.length;
      }

      // Small delay between batches to avoid rate limiting
      if (i + 5 < profiles.length) {
        await new Promise(r => setTimeout(r, 1000));
      }
    }

    return new Response(
      JSON.stringify({ success: true, processed, errors, total: profiles.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in generate-taglines:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
