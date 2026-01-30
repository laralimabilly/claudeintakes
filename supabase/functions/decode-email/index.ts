import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { emailContent, includeSass } = await req.json();
    
    if (!emailContent || emailContent.trim().length < 20) {
      return new Response(
        JSON.stringify({ error: "Please provide a longer email thread to analyze." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Prevent resource abuse with maximum length limit
    if (emailContent.length > 50000) {
      return new Response(
        JSON.stringify({ error: "Email content too long. Maximum 50,000 characters." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `You are Kitty Teal, an expert at analyzing investor communications. You're a cat from Universe-7 who graduated from Yarn Combinator and is now a GP at Nine Lives Capital.

Your task is to analyze investor email threads and provide insights in JSON format.

${includeSass ? `SASS MODE ENABLED: Include a "hotTake" field with your irreverent, funny translation using cat metaphors:
- Ghosting: "They're hiding under the bed"
- Soft pass: "Sitting by the door but not going outside"  
- Interested: "Tail up, ears forward"
- Very interested: "Bringing you dead mice"
- Lukewarm: "Sleeping on your laptop - present but not engaged"
- Avoiding commitment: "Knocking things off the table to see what happens"
Keep the hot take punchy - 3-4 sentences max with personality.` : 'SASS MODE DISABLED: Set "hotTake" to null.'}

Analyze for:
1. Commitment level and genuine interest vs politeness
2. Common VC soft-pass patterns (e.g., "keep us updated", "timing isn't right", "not our focus right now")
3. Red flags or positive signals
4. Whether follow-up is warranted

RESPOND WITH VALID JSON ONLY in this exact format:
{
  "hotTake": ${includeSass ? '"Your sassy cat-metaphor analysis here"' : 'null'},
  "realMeaning": "Plain English translation of what they actually mean - be direct and honest",
  "confidenceScore": 7,
  "confidenceLabel": "Mildly Interested",
  "nextMove": "Specific, actionable advice with timeline (e.g., 'Send a brief update in 2 weeks with traction metrics')",
  "shouldFollowUp": true,
  "followUpReasoning": "Clear reasoning for why or why not to follow up"
}

confidenceScore should be 1-10 where:
- 1-2: Clear pass/rejection
- 3-4: Soft pass, unlikely
- 5-6: Lukewarm, could go either way
- 7-8: Genuine interest, worth pursuing
- 9-10: Very interested, high priority

Be honest and direct. Founders need real advice, not sugarcoating.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Analyze this investor email thread:\n\n${emailContent}` }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Service temporarily unavailable. Please try again later." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("AI analysis failed");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No response from AI");
    }

    // Parse JSON from response (handle potential markdown wrapping)
    let analysis;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (parseError) {
      console.error("Failed to parse AI response:", content);
      throw new Error("Failed to parse analysis");
    }

    return new Response(
      JSON.stringify({ success: true, analysis }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("decode-email error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Analysis failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});