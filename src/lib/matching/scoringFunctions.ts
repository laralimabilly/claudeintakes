// lib/matching/scoringFunctions.ts
// ============================================================================
// 7-Dimension Matching Scoring Functions
//
// This file contains the core scoring logic for the MeetLine co-founder
// matching algorithm. Each dimension evaluates a different aspect of
// founder compatibility, returning a score from 0-100.
//
// DIMENSION WEIGHTS (defined in calculateMatch.ts):
//   1. Skills Complementarity    30%
//   2. Stage & Timeline          20%
//   3. Communication Style       18%
//   4. Values & Working Style    15%
//   5. Vision & Problem Space    12%
//   6. Geographic & Logistics     3%
//   7. Unfair Advantage Synergy   2%
//
// SCORING PHILOSOPHY:
//   - 100 = Perfect alignment / complementarity
//   - 60-80 = Good match, minor differences
//   - 40-60 = Neutral / unknown (insufficient data)
//   - 20-40 = Poor alignment, potential friction
//   - 0-20 = Significant mismatch / conflict
//
// ============================================================================

import type { FounderProfileForMatching } from "@/types/founder";
import { calculateCoverage, calculateOverlap, semanticSkillBoost, calculateSuperpowerBoost } from "./skillsHelpers";
import {
  DIRECTNESS_DIRECT,
  DIRECTNESS_GENTLE,
  STRUCTURE_STRUCTURED,
  STRUCTURE_FLEXIBLE,
  COLLAB_ASYNC,
  COLLAB_SYNC,
  SPECTRUM_SCORES,
  placeOnSpectrum,
} from "./communicationHelpers";
import {
  type FounderWithLocation,
  calculateDistanceKm,
  scoreDistance,
  getTimezoneModifier,
  parseLocationPrefsFromText,
} from "./geoHelpers";
import {
  extractIndustries,
  extractSegments,
  buildVisionText,
  extractWords,
  jaccard,
  cosineSimilarity,
  parseEmbedding,
} from "./visionHelpers";
import { extractValueProfile, scoreDimension, scoreEquity } from "./valuesHelpers";

// Re-export for convenience
export type { FounderProfileForMatching };

// Use FounderProfileForMatching for scoring functions
type FounderProfile = FounderProfileForMatching;


// ============================================================================
// 1. SKILLS COMPLEMENTARITY (30% of total score)
// ============================================================================
//
// PURPOSE:
//   Measures how well two founders' skills complement each other.
//   We want COMPLEMENTARITY, not similarity — ideal co-founders fill
//   each other's gaps rather than duplicating skills.
//
// DATABASE FIELDS USED:
//   - core_skills (ARRAY)           → What skills the founder HAS
//   - seeking_skills (ARRAY)        → What skills the founder NEEDS
//   - superpower (TEXT)             → Their unique strength
//   - weaknesses_blindspots (ARRAY) → Their known gaps
//
// SCORING APPROACH (Three-layer matching):
//
//   Layer 1: Normalized exact match
//     - Lowercase, trim, strip noise characters
//     - "React.js" matches "react"
//
//   Layer 2: Synonym group + partial string matching
//     - "Frontend" matches "React" (same group)
//     - "ML" matches "Machine Learning" (synonym)
//     - See SKILL_SYNONYM_GROUPS in skillsHelpers.ts
//
//   Layer 3: Semantic vocabulary overlap
//     - Jaccard similarity on all skill-related text
//     - Catches conceptual overlap when keywords fail
//
// SCORING BREAKDOWN:
//   70% — Bidirectional coverage (does A have what B seeks & vice versa)
//   20% — Superpower ↔ weakness complementarity boost
//   10% — Semantic skill vocabulary overlap
//   Penalty — Up to -30% for excessive core skill overlap (we want diversity)
//
// EXAMPLE SCORES:
//   - A has "React", B seeks "Frontend"           → High coverage
//   - A's superpower is "Sales", B's weakness is "Business" → Boost
//   - Both have identical core_skills            → Overlap penalty
//
// ============================================================================

export function scoreSkills(a: FounderProfile, b: FounderProfile): number {
  // --- Layer 1 + 2: Coverage with normalization + synonyms ---
  const aCoversB = calculateCoverage(a.core_skills, b.seeking_skills);
  const bCoversA = calculateCoverage(b.core_skills, a.seeking_skills);
  const avgCoverage = (aCoversB + bCoversA) / 2;

  // --- Superpower ↔ weakness complementarity boost ---
  // If A's superpower addresses B's weakness (or vice versa), boost score
  const superpowerBoost = calculateSuperpowerBoost(a, b);

  // --- Layer 3: Semantic skill vocabulary similarity ---
  const semanticBoost = semanticSkillBoost(a, b);

  // --- Overlap penalty (we want complementary, not duplicate skills) ---
  const overlap = calculateOverlap(a.core_skills, b.core_skills);
  const overlapPenalty = overlap * 0.3; // Max -30%

  // --- Combine ---
  const rawScore = (avgCoverage * 0.7 + superpowerBoost * 0.2 + semanticBoost * 0.1) * 100;

  const finalScore = rawScore * (1 - overlapPenalty);

  return Math.min(100, Math.max(0, Math.round(finalScore * 10) / 10));
}


// ============================================================================
// 2. STAGE & TIMELINE ALIGNMENT (20% of total score)
// ============================================================================
//
// PURPOSE:
//   Measures alignment on startup stage, urgency, and commitment level.
//   Co-founders should be at compatible stages and have similar timelines
//   to avoid friction (e.g., one ready to quit job vs one exploring).
//
// DATABASE FIELDS USED:
//   - stage (TEXT)            → Current startup stage (idea/mvp/launched/scaling)
//   - timeline_start (TEXT)   → When they want to start working
//   - urgency_level (TEXT)    → How urgent (ASAP/soon/flexible)
//   - commitment_level (TEXT) → Full-time/part-time/flexible
//
// SCORING APPROACH:
//   Three sub-scores averaged equally (33.3% each):
//
//   1. Stage alignment (compatibility matrix):
//      - Same stage = 100
//      - Adjacent stages = 80
//      - 2 stages apart = 50
//      - Opposite ends = 30
//
//   2. Urgency alignment:
//      - Same urgency = 100
//      - Adjacent = 80
//      - Opposite = 50
//
//   3. Commitment alignment:
//      - Same level = 100
//      - One full-time, one not = 50
//      - Unknown/flexible = 70
//
// NORMALIZATION:
//   Handles variations in how stages are described:
//   - "idea", "validation", "exploring" → 'idea'
//   - "mvp", "building", "prototype" → 'mvp'
//   - "launched", "live", "revenue" → 'launched'
//   - "scaling", "growth", "series" → 'scaling'
//
// EXAMPLE SCORES:
//   - Both at MVP stage, both ASAP, both full-time → 100
//   - Idea vs Scaling, ASAP vs Flexible, Full vs Part → ~43
//
// ============================================================================

export function scoreStage(a: FounderProfile, b: FounderProfile): number {
  // --- Stage normalization ---
  const normalizeStage = (stage: string): string => {
    const s = stage?.toLowerCase() || "idea";
    if (s.includes("idea") || s.includes("validation") || s.includes("exploring")) return "idea";
    if (s.includes("mvp") || s.includes("building") || s.includes("prototype")) return "mvp";
    if (s.includes("launch") || s.includes("live") || s.includes("revenue")) return "launched";
    if (s.includes("scal") || s.includes("growth") || s.includes("series")) return "scaling";
    return "idea"; // Default
  };

  // Stage compatibility matrix
  const stageScores: Record<string, Record<string, number>> = {
    idea:     { idea: 100, mvp: 80, launched: 50, scaling: 30 },
    mvp:      { idea: 80,  mvp: 100, launched: 80, scaling: 50 },
    launched: { idea: 50,  mvp: 80, launched: 100, scaling: 80 },
    scaling:  { idea: 30,  mvp: 50, launched: 80, scaling: 100 },
  };

  const aStage = normalizeStage(a.stage || "");
  const bStage = normalizeStage(b.stage || "");
  const stageScore = stageScores[aStage]?.[bStage] || 50;

  // --- Urgency normalization ---
  const normalizeUrgency = (urgency: string): string => {
    const u = urgency?.toLowerCase() || "flexible";
    if (u.includes("asap") || u.includes("immediately") || u.includes("urgent") || u.includes("now")) return "asap";
    if (u.includes("soon") || u.includes("month") || u.includes("weeks")) return "soon";
    return "flexible"; // Default
  };

  // Urgency compatibility matrix
  const urgencyScores: Record<string, Record<string, number>> = {
    asap:     { asap: 100, soon: 80, flexible: 50 },
    soon:     { asap: 80,  soon: 100, flexible: 80 },
    flexible: { asap: 50,  soon: 80, flexible: 100 },
  };

  const aUrgency = normalizeUrgency(a.urgency_level || "");
  const bUrgency = normalizeUrgency(b.urgency_level || "");
  const urgencyScore = urgencyScores[aUrgency]?.[bUrgency] || 60;

  // --- Commitment alignment ---
  let commitmentScore = 70; // Default for unknown
  const aCommit = a.commitment_level?.toLowerCase() || "";
  const bCommit = b.commitment_level?.toLowerCase() || "";

  if (aCommit && bCommit) {
    if (aCommit === bCommit) {
      commitmentScore = 100; // Exact match
    } else if (
      (aCommit.includes("full") && !bCommit.includes("full")) ||
      (!aCommit.includes("full") && bCommit.includes("full"))
    ) {
      commitmentScore = 50; // One full-time, one not — potential friction
    } else {
      commitmentScore = 75; // Different but compatible
    }
  }

  // --- Average the three sub-scores ---
  return Math.round(((stageScore + urgencyScore + commitmentScore) / 3) * 10) / 10;
}


// ============================================================================
// 3. COMMUNICATION & CONFLICT STYLE (18% of total score)
// ============================================================================
//
// PURPOSE:
//   Measures compatibility in how founders communicate and handle conflict.
//   Misaligned communication styles are a leading cause of co-founder breakups.
//
// DATABASE FIELDS USED:
//   - working_style (TEXT)      → Primary source for communication preferences
//   - commitment_level (TEXT)   → May contain hints about work preferences
//   - equity_thoughts (TEXT)    → May reveal conflict resolution approach
//   - non_negotiables (ARRAY)   → Often contains communication requirements
//   - deal_breakers (ARRAY)     → Often contains communication red flags
//
// SCORING APPROACH:
//   Three sub-dimensions on 5-point spectrums:
//
//   1. Directness (40% of communication score)
//      Spectrum: Direct ←→ Gentle
//      - Direct: "blunt", "candid", "radical candor", "no sugarcoating"
//      - Gentle: "diplomatic", "thoughtful", "non-confrontational"
//
//   2. Structure preference (35% of communication score)
//      Spectrum: Structured ←→ Flexible
//      - Structured: "organized", "systematic", "standup", "agenda"
//      - Flexible: "scrappy", "ad hoc", "go with the flow", "iterate"
//
//   3. Collaboration mode (25% of communication score)
//      Spectrum: Async ←→ Sync
//      - Async: "independent", "deep work", "written", "remote"
//      - Sync: "collaborative", "pairing", "real-time", "whiteboard"
//
// SPECTRUM SCORING:
//   Each founder is placed on a 5-point scale for each dimension:
//   - high, mid-high, neutral, mid-low, low
//
//   Compatibility matrix (see SPECTRUM_SCORES in communicationHelpers.ts):
//   - Same position = 100
//   - Adjacent = 85
//   - Neutral matches well with everything (65-80)
//   - Opposite poles = 30
//
// EXAMPLE SCORES:
//   - Both "direct" + "structured" + "sync" → 100
//   - "Direct" vs "gentle" (opposite) → 30 on directness sub-score
//
// ============================================================================

export function scoreCommunication(a: FounderProfile, b: FounderProfile): number {
  // --- Sub-dimension 1: Directness (40%) ---
  // How directly do they prefer to communicate feedback?
  const aDirectness = placeOnSpectrum(a, DIRECTNESS_DIRECT, DIRECTNESS_GENTLE);
  const bDirectness = placeOnSpectrum(b, DIRECTNESS_DIRECT, DIRECTNESS_GENTLE);
  const directnessScore = SPECTRUM_SCORES[aDirectness]?.[bDirectness] ?? 65;

  // --- Sub-dimension 2: Structure preference (35%) ---
  // Do they prefer organized processes or flexible/scrappy approaches?
  const aStructure = placeOnSpectrum(a, STRUCTURE_STRUCTURED, STRUCTURE_FLEXIBLE);
  const bStructure = placeOnSpectrum(b, STRUCTURE_STRUCTURED, STRUCTURE_FLEXIBLE);
  const structureScore = SPECTRUM_SCORES[aStructure]?.[bStructure] ?? 65;

  // --- Sub-dimension 3: Collaboration mode (25%) ---
  // Do they prefer async/independent work or sync/collaborative?
  const aCollab = placeOnSpectrum(a, COLLAB_ASYNC, COLLAB_SYNC);
  const bCollab = placeOnSpectrum(b, COLLAB_ASYNC, COLLAB_SYNC);
  const collabScore = SPECTRUM_SCORES[aCollab]?.[bCollab] ?? 65;

  // --- Weighted combination ---
  const finalScore = directnessScore * 0.4 + structureScore * 0.35 + collabScore * 0.25;

  return Math.round(finalScore * 10) / 10;
}


// ============================================================================
// 4. VISION & PROBLEM SPACE ALIGNMENT (12% of total score)
// ============================================================================
//
// PURPOSE:
//   Measures alignment on what problem they want to solve and who they
//   want to serve. Co-founders should be excited about the same space,
//   even if specific ideas differ.
//
// DATABASE FIELDS USED:
//   - idea_description (TEXT)  → Their startup idea
//   - problem_solving (TEXT)   → The problem they want to solve
//   - target_customer (TEXT)   → Who they want to serve
//   - embedding (ARRAY/TEXT)   → Pre-computed vector embedding of full profile
//
// SCORING APPROACH:
//   Four components:
//
//   1. Industry/Vertical alignment (45%)
//      Detects industry from idea text using 14 keyword groups:
//      Fintech, Healthcare, E-commerce, SaaS, Education, AI/ML,
//      Developer Tools, Media, Real Estate, Logistics, Climate,
//      Food/Ag, Legal, HR/Future of Work
//
//      Scoring:
//      - Same industry = 70-100% (based on overlap ratio)
//      - No industry overlap = 20%
//      - One/neither has detectable industry = 50%
//
//   2. Customer segment alignment (30%)
//      Detects target customer from 7 segments:
//      SMB, Enterprise, Consumer, Prosumer, Developer,
//      Healthcare Providers, Students
//
//      Scoring:
//      - Same segment = 75-100%
//      - Different segments = 30%
//      - Unknown = 50%
//
//   3. Semantic similarity (15%)
//      Uses embedding cosine similarity if available,
//      falls back to vocabulary Jaccard if not.
//
//   4. Vocabulary overlap boost (10%)
//      Jaccard similarity on vision-related words.
//      Catches specific shared terms.
//
// EXAMPLE SCORES:
//   - Both fintech + both SMB + high embedding similarity → 85+
//   - Healthcare vs Gaming + different customers → 25-35
//
// ============================================================================

export function scoreVision(a: FounderProfile, b: FounderProfile): number {
  // Build vision text from relevant fields
  const aVisionText = buildVisionText(a);
  const bVisionText = buildVisionText(b);

  // --- Industry alignment (45%) ---
  const aIndustries = extractIndustries(aVisionText);
  const bIndustries = extractIndustries(bVisionText);

  let industryScore = 0;
  if (aIndustries.size > 0 && bIndustries.size > 0) {
    const overlap = new Set([...aIndustries].filter((x) => bIndustries.has(x)));
    if (overlap.size > 0) {
      // Strong match: at least one industry in common
      const overlapRatio = overlap.size / Math.max(aIndustries.size, bIndustries.size);
      industryScore = 0.7 + overlapRatio * 0.3; // 70-100%
    } else {
      // No overlap = different industries, low score
      industryScore = 0.2;
    }
  } else if (aIndustries.size > 0 || bIndustries.size > 0) {
    // One has industry, one doesn't = neutral
    industryScore = 0.5;
  } else {
    // Neither has detectable industry = neutral (unknown)
    industryScore = 0.5;
  }

  // --- Customer segment alignment (30%) ---
  const aSegments = extractSegments(aVisionText + " " + (a.target_customer || ""));
  const bSegments = extractSegments(bVisionText + " " + (b.target_customer || ""));

  let segmentScore = 0;
  if (aSegments.size > 0 && bSegments.size > 0) {
    const segmentOverlap = jaccard(aSegments, bSegments);
    if (segmentOverlap > 0) {
      segmentScore = 0.75 + segmentOverlap * 0.25; // 75-100%
    } else {
      // Different segments = lower score
      segmentScore = 0.3;
    }
  } else {
    // Unknown segments = neutral
    segmentScore = 0.5;
  }

  // --- Semantic similarity (15%) ---
  let semanticScore = 0;
  const aEmbed = parseEmbedding(a.embedding);
  const bEmbed = parseEmbedding(b.embedding);

  if (aEmbed && bEmbed) {
    // Use embedding cosine similarity
    const cosine = cosineSimilarity(aEmbed, bEmbed);
    semanticScore = Math.max(0, cosine);
  } else {
    // Fallback: vocabulary Jaccard on vision fields
    const aWords = extractWords(aVisionText);
    const bWords = extractWords(bVisionText);
    semanticScore = jaccard(aWords, bWords);
  }

  // --- Vocabulary boost (10%) ---
  const aWords = extractWords(aVisionText);
  const bWords = extractWords(bVisionText);
  const vocabScore = jaccard(aWords, bWords);

  // --- Combine with weights ---
  const rawScore = industryScore * 0.45 + segmentScore * 0.3 + semanticScore * 0.15 + vocabScore * 0.1;

  const finalScore = rawScore * 100;

  return Math.min(100, Math.max(0, Math.round(finalScore * 10) / 10));
}


// ============================================================================
// 5. VALUES & WORKING STYLE (15% of total score)
// ============================================================================
//
// PURPOSE:
//   Measures alignment on core values and working preferences.
//   Values misalignment causes deep, long-term friction that's hard to resolve.
//
// DATABASE FIELDS USED:
//   - working_style (TEXT)   → Work preferences, pace, approach
//   - equity_thoughts (TEXT) → Equity philosophy and fairness views
//
// SCORING APPROACH:
//   Six value dimensions extracted via keyword detection:
//
//   1. Work pace (25%)
//      Fast ←→ Deliberate
//      - Fast: "move fast", "ship fast", "velocity", "hustle"
//      - Deliberate: "careful", "methodical", "quality over speed"
//
//   2. Risk tolerance (20%)
//      High ←→ Low
//      - High: "bold", "moonshot", "all in", "10x"
//      - Low: "conservative", "bootstrap", "capital efficient"
//
//   3. Equity philosophy (20%)
//      Four buckets:
//      - Equal: "50/50", "split evenly"
//      - Contribution-based: "merit", "earn", "vest"
//      - Flexible: "negotiate", "discuss", "depends"
//      - Clear majority: "control", "my idea"
//
//   4. Decision-making style (15%)
//      Data-driven ←→ Intuition
//      - Data: "metrics", "A/B test", "evidence", "KPIs"
//      - Intuition: "gut", "instinct", "creative", "conviction"
//
//   5. Autonomy preference (10%)
//      Autonomous ←→ Collaborative
//      - Autonomous: "independent", "async", "self-directed"
//      - Collaborative: "team-first", "consensus", "pair programming"
//
//   6. Work-life balance (10%)
//      Intense ←→ Balanced
//      - Intense: "24/7", "grind", "whatever it takes"
//      - Balanced: "boundaries", "sustainable", "avoid burnout"
//
// DIMENSION SCORING:
//   - Same position = 100
//   - Adjacent (medium) = 75
//   - Opposite = 40
//   - Unknown = 60
//
// EQUITY SPECIAL RULES:
//   - Equal + Contribution-based = 65 (can work)
//   - Equal + Clear majority = 30 (conflict!)
//   - Flexible + anything = 85 (compatible)
//
// EXAMPLE SCORES:
//   - Both fast-paced, data-driven, equal equity → 90+
//   - Fast vs deliberate, bold vs conservative → 40-50
//
// ============================================================================

export function scoreValues(a: FounderProfile, b: FounderProfile): number {
  // Extract value profiles from text fields
  const aProfile = extractValueProfile(a);
  const bProfile = extractValueProfile(b);

  // Score each dimension
  const paceScore = scoreDimension(aProfile.pace, bProfile.pace);
  const riskScore = scoreDimension(aProfile.risk, bProfile.risk);
  const decisionScore = scoreDimension(aProfile.decision, bProfile.decision);
  const autonomyScore = scoreDimension(aProfile.autonomy, bProfile.autonomy);
  const worklifeScore = scoreDimension(aProfile.worklife, bProfile.worklife);
  const equityScoreVal = scoreEquity(aProfile.equity, bProfile.equity);

  // Weighted combination
  const rawScore =
    paceScore * 0.25 +
    riskScore * 0.2 +
    equityScoreVal * 0.2 +
    decisionScore * 0.15 +
    autonomyScore * 0.1 +
    worklifeScore * 0.1;

  return Math.min(100, Math.max(0, Math.round(rawScore * 10) / 10));
}


// ============================================================================
// 6. GEOGRAPHIC & LOGISTICS (3% of total score)
// ============================================================================
//
// PURPOSE:
//   Measures geographic compatibility for co-working.
//   Lower weight because remote work is common, but still matters for
//   some founders who prefer in-person collaboration.
//
// DATABASE FIELDS USED:
//   - location_preference (TEXT) → Location requirements/preferences
//   - location (OBJECT, optional) → Structured location data from founder_locations:
//     - lat, lng (coordinates)
//     - city, country
//     - timezone_offset
//     - is_remote_ok, is_remote_only, is_hybrid_ok
//     - willing_to_relocate
//
// SCORING APPROACH:
//   Two modes:
//
//   A. COORDINATE-BASED (when both have lat/lng):
//      Uses Haversine distance:
//      - < 50km (same city) = 100
//      - < 200km (short trip) = 90
//      - < 500km (day trip) = 80
//      - < 2000km (regional) = 70
//      - < 5000km (continental) = 60
//      - < 10000km (intercontinental) = 50
//      - > 10000km (global) = 40
//
//      Modifiers:
//      - Both remote OK + good timezone overlap (+10)
//      - Both remote OK + poor timezone overlap (-10)
//      - One willing to relocate + distant (+5)
//
//   B. FALLBACK (no coordinates):
//      Based on text parsing of location_preference:
//      - Both remote-only = 75
//      - Both remote-ok = 70 (+/- timezone modifier)
//      - One willing to relocate = 65
//      - One remote-ok = 50
//      - No data = 50
//      - Different locations, no flexibility = 30
//
// TIMEZONE SCORING:
//   - ≤3 hour gap: +10 (great overlap)
//   - ≤6 hour gap: 0 (manageable)
//   - >6 hour gap: -10 (difficult)
//
// EXAMPLE SCORES:
//   - Same city (50km) = 100
//   - NYC ↔ SF (remote OK, 3hr timezone) = 80
//   - NYC ↔ London (remote OK, 5hr timezone) = 70
//   - NYC ↔ Singapore (remote OK, 12hr timezone) = 50
//
// ============================================================================

export function scoreGeo(a: FounderProfile, b: FounderProfile): number {
  // Cast to extended type that may include location data
  const aExt = a as FounderWithLocation;
  const bExt = b as FounderWithLocation;

  const aLoc = aExt.location;
  const bLoc = bExt.location;

  // Get preferences - from location table if available, otherwise parse from text
  const aPrefs = aLoc
    ? {
        remoteOk: aLoc.is_remote_ok,
        remoteOnly: aLoc.is_remote_only,
        willingToRelocate: aLoc.willing_to_relocate,
      }
    : parseLocationPrefsFromText(a.location_preference);

  const bPrefs = bLoc
    ? {
        remoteOk: bLoc.is_remote_ok,
        remoteOnly: bLoc.is_remote_only,
        willingToRelocate: bLoc.willing_to_relocate,
      }
    : parseLocationPrefsFromText(b.location_preference);

  const bothRemoteOk = aPrefs.remoteOk && bPrefs.remoteOk;
  const oneRemoteOk = aPrefs.remoteOk || bPrefs.remoteOk;
  const oneWillingToRelocate = aPrefs.willingToRelocate || bPrefs.willingToRelocate;

  // Check if we have coordinates for both
  const aHasCoords = aLoc?.lat != null && aLoc?.lng != null;
  const bHasCoords = bLoc?.lat != null && bLoc?.lng != null;

  if (aHasCoords && bHasCoords) {
    // ========== COORDINATE-BASED SCORING ==========
    const distance = calculateDistanceKm(aLoc!.lat!, aLoc!.lng!, bLoc!.lat!, bLoc!.lng!);

    let score = scoreDistance(distance);

    // Timezone modifier for remote pairs
    if (bothRemoteOk) {
      score += getTimezoneModifier(aLoc!.timezone_offset, bLoc!.timezone_offset);
    }

    // Relocation bonus for distant locations
    if (oneWillingToRelocate && distance > 500) {
      score += 5;
    }

    return Math.min(100, Math.max(0, Math.round(score)));
  }

  // ========== FALLBACK SCORING (no coordinates) ==========

  // Both remote-only is a solid match
  if (aPrefs.remoteOnly && bPrefs.remoteOnly) {
    return 75;
  }

  // Both open to remote
  if (bothRemoteOk) {
    // Try timezone scoring if available
    const tzModifier = getTimezoneModifier(aLoc?.timezone_offset, bLoc?.timezone_offset);
    return 70 + tzModifier;
  }

  // One willing to relocate
  if (oneWillingToRelocate) {
    return 65;
  }

  // One is open to remote
  if (oneRemoteOk) {
    return 50;
  }

  // No location data at all — neutral
  if (!a.location_preference && !b.location_preference) {
    return 50;
  }

  // Different locations with no flexibility — poor match
  return 30;
}


// ============================================================================
// 7. UNFAIR ADVANTAGE SYNERGY (2% of total score)
// ============================================================================
//
// PURPOSE:
//   Measures complementarity of "unfair advantages" — unique assets
//   each founder brings. We want DIFFERENT advantages for synergy,
//   not duplicate ones.
//
// DATABASE FIELDS USED:
//   - background (TEXT)        → Professional history, domain expertise
//   - superpower (TEXT)        → Unique strength
//   - previous_founder (BOOL)  → Has founded a company before
//
// SCORING APPROACH:
//   Extract advantage categories from text:
//
//   1. Domain expertise
//      Keywords: "expert", "years in", "specialist"
//
//   2. Network
//      Keywords: "network", "connections", "contacts", "relationships"
//
//   3. Technical depth
//      Keywords: "engineer", "technical", "developer", "architect"
//
//   4. Business/Sales
//      Keywords: "sales", "business", "revenue", "deals"
//
//   5. Founder experience
//      From previous_founder boolean field
//
// SYNERGY SCORING:
//   - Both have advantages, NO overlap = 80 (great synergy!)
//   - Both have advantages, 1 overlap = 65 (some synergy)
//   - Both have advantages, 2+ overlap = 50 (too similar)
//   - Only one has advantages = 60
//   - Neither has clear advantages = 50
//
// PHILOSOPHY:
//   Unlike other dimensions, we reward DIFFERENCE here.
//   A technical founder + a sales founder = better than two technical founders.
//
// EXAMPLE SCORES:
//   - A: technical + domain, B: network + sales → 80 (zero overlap)
//   - A: technical + sales, B: technical + founder exp → 65 (1 overlap)
//   - A: technical, B: technical → 50 (same advantage)
//
// ============================================================================

export function scoreAdvantages(a: FounderProfile, b: FounderProfile): number {
  // Extract advantage categories from profile text
  const extractAdvantages = (profile: FounderProfile): Set<string> => {
    const advantages = new Set<string>();

    const text = `${profile.background || ""} ${profile.superpower || ""}`.toLowerCase();

    // Domain expertise
    if (text.includes("expert") || text.includes("years in") || text.includes("specialist")) {
      advantages.add("domain_expertise");
    }

    // Network
    if (text.includes("network") || text.includes("connections") || text.includes("contacts") || text.includes("relationships")) {
      advantages.add("network");
    }

    // Technical depth
    if (text.includes("engineer") || text.includes("technical") || text.includes("developer") || text.includes("architect")) {
      advantages.add("technical");
    }

    // Business/sales
    if (text.includes("sales") || text.includes("business") || text.includes("revenue") || text.includes("deals")) {
      advantages.add("business");
    }

    // Founder experience (from boolean field)
    if (profile.previous_founder) {
      advantages.add("founder_experience");
    }

    return advantages;
  };

  const aAdvantages = extractAdvantages(a);
  const bAdvantages = extractAdvantages(b);

  // Calculate overlap
  if (aAdvantages.size > 0 && bAdvantages.size > 0) {
    const overlap = Array.from(aAdvantages).filter((adv) => bAdvantages.has(adv)).length;

    if (overlap === 0) {
      return 80; // Completely different advantages = great synergy!
    } else if (overlap === 1) {
      return 65; // Some overlap = moderate synergy
    } else {
      return 50; // Too much overlap = less complementary
    }
  }

  // Only one has clear advantages
  if (aAdvantages.size > 0 || bAdvantages.size > 0) {
    return 60;
  }

  // Neither has clear advantages — neutral
  return 50;
}
