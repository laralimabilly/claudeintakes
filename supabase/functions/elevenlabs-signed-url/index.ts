import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const AGENT_ID = "agent_0901kbv8t8emeen9pj6nqxrdfcyb";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { deckAnalysis } = await req.json();
    
    const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");
    if (!ELEVENLABS_API_KEY) {
      throw new Error("ELEVENLABS_API_KEY is not configured");
    }

    console.log("Generating ElevenLabs signed URL for agent:", AGENT_ID);
    console.log("Deck context:", deckAnalysis?.companyName || "No deck provided");

    // Build dynamic prompt override based on deck analysis
    let promptOverride = null;
    let firstMessageOverride = null;

    if (deckAnalysis) {
      promptOverride = `You are Line, a thoughtful AI mentor who helps founders refine their pitch. You've been observing patterns across thousands of startups and investor interactions.

You just reviewed the pitch deck for "${deckAnalysis.companyName}". Here's what you found:

Company: ${deckAnalysis.companyName}
Summary: ${deckAnalysis.oneLineSummary}
Core Thesis: ${deckAnalysis.coreThesis}
Target Customer: ${deckAnalysis.targetCustomer}
Market Size: ${deckAnalysis.marketSize}
Why Now: ${deckAnalysis.whyNow}
Traction: ${deckAnalysis.traction}
Business Model: ${deckAnalysis.businessModel}
Competition: ${deckAnalysis.competition}
Team: ${deckAnalysis.team}
Ask: ${deckAnalysis.ask}
Red Flags: ${deckAnalysis.redFlags?.join(", ") || "None identified"}
Strong Points: ${deckAnalysis.strongPoints?.join(", ") || "None identified"}
Readiness Score: ${deckAnalysis.overallReadiness}/10

Your role:
1. You've reviewed their deck - reference specific things you noticed
2. Ask probing questions that challenge their assumptions
3. Push them to be clearer and more specific
4. Help them anticipate investor skepticism
5. Be direct but supportive - you want them to succeed
6. Focus on the gaps and red flags, but acknowledge the strong points too

Key questions to explore:
${deckAnalysis.topThreeQuestions?.map((q: string, i: number) => `${i + 1}. ${q}`).join("\n") || "Ask about customer validation, market size justification, and competitive moats."}

Keep responses conversational and concise. You're having a dialogue, not giving a lecture. Push back when things are vague.`;

      firstMessageOverride = `I've been looking at your deck for ${deckAnalysis.companyName}. ${deckAnalysis.oneLineSummary}. I see some strong points - ${deckAnalysis.strongPoints?.[0] || "interesting approach"} - but I also have questions. Let me start with this: ${deckAnalysis.topThreeQuestions?.[0] || "Tell me more about your target customer and how you know they actually want this."}`;
    }

    // Get signed URL from ElevenLabs for the agent
    const response = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/get_signed_url?agent_id=${AGENT_ID}`,
      {
        method: "GET",
        headers: {
          "xi-api-key": ELEVENLABS_API_KEY,
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("ElevenLabs API error:", response.status, errorText);
      throw new Error(`ElevenLabs API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log("Got signed URL from ElevenLabs");

    return new Response(
      JSON.stringify({ 
        success: true, 
        signedUrl: data.signed_url,
        promptOverride,
        firstMessageOverride,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("elevenlabs-signed-url error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Failed to get signed URL" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
