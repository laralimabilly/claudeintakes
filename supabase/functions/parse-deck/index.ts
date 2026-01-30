import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const systemPrompt = `You are an expert pitch deck analyst. Your job is to extract structured information from pitch decks to help a voice AI mentor give feedback.

Analyze the pitch deck content and extract:

1. **Core Thesis**: What is the startup claiming? What problem do they say they solve?
2. **Target Customer**: Who are they building for? Is it clear?
3. **Market Size**: How do they quantify the opportunity? (or note if missing)
4. **Why Now**: What timing/trend justifies this? (or note if missing)
5. **Traction**: What validation do they have? Customer-facing or just technical milestones?
6. **Business Model**: How do they make money? Is pricing validated?
7. **Competition**: How do they address competitors? Deep or superficial?
8. **Team**: Who are the founders? Relevant background?
9. **Ask**: What are they raising? What's the use of funds?
10. **Red Flags**: What concerns or gaps are immediately apparent?
11. **Strong Points**: What's genuinely compelling about this pitch?

Respond in JSON format:
{
  "companyName": "extracted name or 'Unknown'",
  "oneLineSummary": "One sentence description of what they do",
  "coreThesis": "Their main claim/value proposition",
  "targetCustomer": "Who they're building for (or 'Unclear')",
  "marketSize": "How they size the market (or 'Not addressed')",
  "whyNow": "Timing justification (or 'Not addressed')",
  "traction": "What validation they have",
  "businessModel": "How they make money",
  "competition": "How they address competitors",
  "team": "Founder backgrounds",
  "ask": "What they're raising and for what",
  "redFlags": ["list", "of", "concerns"],
  "strongPoints": ["list", "of", "positives"],
  "overallReadiness": "1-10 score for investor-readiness",
  "topThreeQuestions": ["Question 1 to challenge them on", "Question 2", "Question 3"]
}

Be direct and honest. This analysis will inform a mentor conversation.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { deckContent, deckName, pdfBase64 } = await req.json();
    
    // Prevent resource abuse with maximum length limits
    if (deckContent && deckContent.length > 100000) {
      return new Response(
        JSON.stringify({ error: "Deck content too long. Maximum 100,000 characters." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Limit PDF base64 size (roughly 10MB file limit)
    if (pdfBase64 && pdfBase64.length > 15000000) {
      return new Response(
        JSON.stringify({ error: "PDF file too large. Maximum 10MB." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    let messages: any[];
    
    // If PDF base64 is provided, send it directly to Gemini (it supports PDFs natively)
    if (pdfBase64) {
      console.log(`Sending PDF directly to Gemini: ${deckName}`);
      
      // Gemini supports PDFs via base64 in the content
      messages = [
        { role: "system", content: systemPrompt },
        { 
          role: "user", 
          content: [
            {
              type: "file",
              file: {
                filename: deckName || "pitch-deck.pdf",
                file_data: `data:application/pdf;base64,${pdfBase64}`
              }
            },
            {
              type: "text",
              text: `Analyze this pitch deck: ${deckName}`
            }
          ]
        }
      ];
    } else if (deckContent && deckContent.trim().length >= 50) {
      // Text content provided
      console.log(`Parsing text deck: ${deckName}, content length: ${deckContent.length}`);
      messages = [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Analyze this pitch deck:\n\nDeck Name: ${deckName}\n\nContent:\n${deckContent}` }
      ];
    } else {
      return new Response(
        JSON.stringify({ error: "Please provide deck content to analyze." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages,
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

    // Parse JSON from response
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

    console.log(`Successfully parsed deck: ${analysis.companyName}`);

    return new Response(
      JSON.stringify({ success: true, analysis }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("parse-deck error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Analysis failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
