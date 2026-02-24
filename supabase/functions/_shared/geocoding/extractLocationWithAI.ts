// _shared/geocoding/extractLocationWithAI.ts
// ============================================================================
// AI-powered location extraction using OpenAI
//
// Replaces the brittle regex/keyword approach with a single LLM call that
// handles abbreviations, comma-separated lists, parenthetical locations,
// regional aliases, and every other edge case naturally.
//
// Cost: ~0.001 cent per call with gpt-4o-mini (negligible)
// Latency: ~200-400ms (runs in parallel with other processing)
//
// EXAMPLES OF INPUTS IT HANDLES:
//   "Bay Area"                        → ["San Francisco Bay Area, California, US"]
//   "LA, New York, San Francisco"     → ["Los Angeles, California, US", "New York City, US", "San Francisco, California, US"]
//   "same city (Boston)"              → ["Boston, Massachusetts, US"]
//   "Remote, but based in Austin"     → ["Austin, Texas, US"]
//   "SF or NYC"                       → ["San Francisco, California, US", "New York City, US"]
//   "Fully remote, anywhere"          → []
//   "Silicon Valley"                  → ["San Jose, California, US"]
//   "LATAM, preferably São Paulo"     → ["São Paulo, Brazil"]
//   "DMV area"                        → ["Washington DC, US"]
// ============================================================================

import OpenAI from "https://esm.sh/openai@4.73.0";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AILocationResult {
  /** Cleaned, geocodable location strings (most preferred first) */
  locations: string[];
  /** Whether the person is open to remote work */
  isRemoteOk: boolean;
  /** Whether they ONLY want remote (no in-person) */
  isRemoteOnly: boolean;
  /** Whether they mentioned hybrid preferences */
  isHybridOk: boolean;
  /** Whether they're willing to relocate */
  willingToRelocate: boolean;
}

// ---------------------------------------------------------------------------
// Prompt
// ---------------------------------------------------------------------------

const EXTRACTION_PROMPT = `You are a location extraction assistant. Given a person's free-form location preference text, extract:

1. **locations**: An array of clean, geocodable location strings. Expand all abbreviations and aliases to their full, standard names that a geocoding API would recognize. Examples:
   - "LA" → "Los Angeles, California, US"
   - "Bay Area" → "San Francisco Bay Area, California, US"  
   - "NYC" → "New York City, New York, US"
   - "SF" → "San Francisco, California, US"
   - "Silicon Valley" → "San Jose, California, US"
   - "DMV" → "Washington DC, US"
   - "LATAM" → "Latin America"
   
   If the text contains multiple locations (comma-separated, "or"-separated, etc.), include ALL of them in order of preference (first mentioned = most preferred).
   
   If no specific geographic location is mentioned (e.g., "remote", "anywhere", "flexible", "same city" without specifying which city), return an EMPTY array.
   
   Do NOT include vague terms like "remote", "anywhere", "flexible" as locations.

2. **isRemoteOk**: true if the person mentions being open to remote work, working from anywhere, distributed teams, etc.

3. **isRemoteOnly**: true if the person ONLY wants remote work (e.g., "fully remote", "remote only", "100% remote").

4. **isHybridOk**: true if hybrid work is mentioned.

5. **willingToRelocate**: true if they mention willingness to move or relocate.

Respond with ONLY a JSON object, no markdown, no backticks, no explanation.`;

// ---------------------------------------------------------------------------
// Main extraction function
// ---------------------------------------------------------------------------

/**
 * Extract location data from free-form text using OpenAI.
 *
 * @param locationText - Raw location preference text from founder profile
 * @param openaiApiKey - OpenAI API key (or pass an existing OpenAI client)
 * @returns Structured location data with clean, geocodable strings
 */
export async function extractLocationWithAI(
  locationText: string,
  openaiApiKey: string,
): Promise<AILocationResult> {
  // Default fallback for empty/missing input
  const defaultResult: AILocationResult = {
    locations: [],
    isRemoteOk: false,
    isRemoteOnly: false,
    isHybridOk: false,
    willingToRelocate: false,
  };

  if (!locationText || locationText.trim().length < 2) {
    return defaultResult;
  }

  try {
    const openai = new OpenAI({ apiKey: openaiApiKey });

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: EXTRACTION_PROMPT },
        { role: "user", content: locationText },
      ],
      temperature: 0,
      max_tokens: 300,
    });

    const rawContent = completion.choices[0]?.message?.content || "";

    // Strip markdown fences if present
    const cleaned = rawContent
      .replace(/```json\s*/g, "")
      .replace(/```\s*/g, "")
      .trim();

    const parsed = JSON.parse(cleaned);

    return {
      locations: Array.isArray(parsed.locations)
        ? parsed.locations.filter((l: unknown) => typeof l === "string" && l.trim().length > 0)
        : [],
      isRemoteOk: Boolean(parsed.isRemoteOk),
      isRemoteOnly: Boolean(parsed.isRemoteOnly),
      isHybridOk: Boolean(parsed.isHybridOk),
      willingToRelocate: Boolean(parsed.willingToRelocate),
    };
  } catch (error) {
    console.error("[extractLocationWithAI] Error:", error instanceof Error ? error.message : error);
    // On failure, fall back to simple keyword detection so geocoding isn't blocked
    return fallbackExtraction(locationText);
  }
}

// ---------------------------------------------------------------------------
// Fallback: simple keyword-based extraction (used if OpenAI call fails)
// ---------------------------------------------------------------------------

function fallbackExtraction(text: string): AILocationResult {
  const t = text.toLowerCase();

  return {
    locations: [], // Can't reliably extract locations without AI — let caller handle
    isRemoteOk:
      /\bremote\b/.test(t) ||
      t.includes("anywhere") ||
      t.includes("location independent") ||
      t.includes("distributed"),
    isRemoteOnly:
      t.includes("remote only") ||
      t.includes("fully remote") ||
      t.includes("100% remote") ||
      t.includes("remote-only"),
    isHybridOk: t.includes("hybrid"),
    willingToRelocate:
      t.includes("relocate") ||
      t.includes("willing to move") ||
      t.includes("open to moving") ||
      t.includes("can move"),
  };
}
