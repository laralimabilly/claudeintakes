// lib/matching/scoringFunctions.ts
// 7-dimension matching scoring functions

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
// 1. Skills Complementarity (30%)
//
// Three-layer matching approach:
//   Layer 1: Normalized exact match (lowercase + trimmed)
//   Layer 2: Synonym group + partial string matching
//   Layer 3: Semantic skill vocabulary overlap (Jaccard on skill-related text)
//
// Also includes superpower ↔ weakness complementarity analysis.
// ============================================================================

/**
 * Score skills complementarity between two founders (0–100).
 *
 * Weighted breakdown:
 *   70% — Bidirectional coverage (does A have what B seeks & vice versa)
 *   20% — Superpower / weakness complementarity
 *   10% — Semantic skill vocabulary overlap
 *   Penalty — Up to -30% for excessive core skill overlap
 */
export function scoreSkills(a: FounderProfile, b: FounderProfile): number {
  // --- Coverage (Layers 1 + 2) ---
  const aCoversB = calculateCoverage(a.core_skills, b.seeking_skills);
  const bCoversA = calculateCoverage(b.core_skills, a.seeking_skills);
  const avgCoverage = (aCoversB + bCoversA) / 2;

  // --- Superpower ↔ weakness boost ---
  const superpowerBoost = calculateSuperpowerBoost(a, b);

  // --- Semantic vocabulary boost (Layer 3) ---
  const semanticBoost = semanticSkillBoost(a, b);

  // --- Overlap penalty ---
  const overlap = calculateOverlap(a.core_skills, b.core_skills);
  const overlapPenalty = overlap * 0.3;

  // --- Combine ---
  const rawScore = (avgCoverage * 0.7 + superpowerBoost * 0.2 + semanticBoost * 0.1) * 100;

  const finalScore = rawScore * (1 - overlapPenalty);

  return Math.min(100, Math.max(0, Math.round(finalScore * 10) / 10));
}

// ============================================================================
// 2. Stage & Timeline Alignment (20%)
// ============================================================================
export function scoreStage(a: FounderProfile, b: FounderProfile): number {
  // Stage alignment scoring
  const normalizeStage = (stage: string): string => {
    const s = stage?.toLowerCase() || "idea";
    if (s.includes("idea") || s.includes("validation")) return "idea";
    if (s.includes("mvp") || s.includes("building")) return "mvp";
    if (s.includes("launch")) return "launched";
    if (s.includes("scal")) return "scaling";
    return "idea";
  };

  const stageScores: Record<string, Record<string, number>> = {
    idea: { idea: 100, mvp: 80, launched: 50, scaling: 30 },
    mvp: { idea: 80, mvp: 100, launched: 80, scaling: 50 },
    launched: { idea: 50, mvp: 80, launched: 100, scaling: 80 },
    scaling: { idea: 30, mvp: 50, launched: 80, scaling: 100 },
  };

  const aStage = normalizeStage(a.stage);
  const bStage = normalizeStage(b.stage);
  const stageScore = stageScores[aStage]?.[bStage] || 50;

  // Timeline/urgency alignment
  const normalizeUrgency = (urgency: string): string => {
    const u = urgency?.toLowerCase() || "flexible";
    if (u.includes("asap") || u.includes("immediately") || u.includes("urgent")) return "asap";
    if (u.includes("soon") || u.includes("month")) return "soon";
    return "flexible";
  };

  const urgencyScores: Record<string, Record<string, number>> = {
    asap: { asap: 100, soon: 80, flexible: 50 },
    soon: { asap: 80, soon: 100, flexible: 80 },
    flexible: { asap: 50, soon: 80, flexible: 100 },
  };

  const aUrgency = normalizeUrgency(a.urgency_level);
  const bUrgency = normalizeUrgency(b.urgency_level);
  const urgencyScore = urgencyScores[aUrgency]?.[bUrgency] || 60;

  // Commitment alignment
  let commitmentScore = 70;
  const aCommit = a.commitment_level?.toLowerCase() || "";
  const bCommit = b.commitment_level?.toLowerCase() || "";

  if (aCommit === bCommit) {
    commitmentScore = 100;
  } else if (aCommit.includes("full") || bCommit.includes("full")) {
    commitmentScore = 50; // One full-time, one not
  }

  return (stageScore + urgencyScore + commitmentScore) / 3;
}

// ============================================================================
// 3. Communication & Conflict Style (18%)
//
// Evaluates 3 sub-dimensions from multiple profile fields:
//   1. Communication directness (40% of this score)
//   2. Structure preference (35% of this score)
//   3. Collaboration mode (25% of this score)
// ============================================================================
export function scoreCommunication(a: FounderProfile, b: FounderProfile): number {
  // --- Sub-dimension 1: Directness ---
  const aDirectness = placeOnSpectrum(a, DIRECTNESS_DIRECT, DIRECTNESS_GENTLE);
  const bDirectness = placeOnSpectrum(b, DIRECTNESS_DIRECT, DIRECTNESS_GENTLE);
  const directnessScore = SPECTRUM_SCORES[aDirectness]?.[bDirectness] ?? 65;

  // --- Sub-dimension 2: Structure preference ---
  const aStructure = placeOnSpectrum(a, STRUCTURE_STRUCTURED, STRUCTURE_FLEXIBLE);
  const bStructure = placeOnSpectrum(b, STRUCTURE_STRUCTURED, STRUCTURE_FLEXIBLE);
  const structureScore = SPECTRUM_SCORES[aStructure]?.[bStructure] ?? 65;

  // --- Sub-dimension 3: Collaboration mode ---
  const aCollab = placeOnSpectrum(a, COLLAB_ASYNC, COLLAB_SYNC);
  const bCollab = placeOnSpectrum(b, COLLAB_ASYNC, COLLAB_SYNC);
  const collabScore = SPECTRUM_SCORES[aCollab]?.[bCollab] ?? 65;

  // --- Weighted combination ---
  const finalScore = directnessScore * 0.4 + structureScore * 0.35 + collabScore * 0.25;

  return Math.round(finalScore * 10) / 10;
}

// ============================================================================
// 4. Vision & Problem Space Alignment (12%)
//
// Measures how aligned two founders are on:
//   1. Problem space / industry vertical (45%)
//   2. Target customer segment (30%)
//   3. Semantic similarity via embeddings or vocab fallback (15%)
//   4. Vocabulary overlap boost (10%)
// ============================================================================
export function scoreVision(a: FounderProfile, b: FounderProfile): number {
  const aVisionText = buildVisionText(a);
  const bVisionText = buildVisionText(b);

  // --- Industry alignment (40%) ---
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
      // No overlap = low score (different industries)
      industryScore = 0.2;
    }
  } else if (aIndustries.size > 0 || bIndustries.size > 0) {
    // One has industry, one doesn't = neutral
    industryScore = 0.5;
  } else {
    // Neither has detectable industry = neutral-low (unknown)
    industryScore = 0.5;
  }

  // --- Customer segment alignment (25%) ---
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

  // --- Semantic similarity (25%) ---
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

  // --- Combine ---
  const rawScore = industryScore * 0.45 + segmentScore * 0.3 + semanticScore * 0.15 + vocabScore * 0.1;

  const finalScore = rawScore * 100;

  return Math.min(100, Math.max(0, Math.round(finalScore * 10) / 10));
}

// ============================================================================
// 5. Values & Working Style (15%)
//
// Measures alignment on 6 dimensions:
//   1. Work pace preference (25%)
//   2. Risk tolerance (20%)
//   3. Equity philosophy (20%)
//   4. Decision-making style (15%)
//   5. Autonomy vs collaboration (10%)
//   6. Work-life balance (10%)
// ============================================================================
export function scoreValues(a: FounderProfile, b: FounderProfile): number {
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
// 6. Geographic & Logistics (3%)
// ============================================================================
export function scoreGeo(a: FounderProfile, b: FounderProfile): number {
  // Cast to extended type
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

  // ========== FALLBACK SCORING ==========

  if (aPrefs.remoteOnly && bPrefs.remoteOnly) {
    return 75;
  }

  if (bothRemoteOk) {
    // Try timezone scoring if available
    const tzModifier = getTimezoneModifier(aLoc?.timezone_offset, bLoc?.timezone_offset);
    return 70 + tzModifier;
  }

  if (oneWillingToRelocate) {
    return 65;
  }

  if (oneRemoteOk) {
    return 50;
  }

  // No location data at all
  if (!a.location_preference && !b.location_preference) {
    return 50;
  }

  // Different locations, no flexibility
  return 30;
}

// ============================================================================
// 7. Unfair Advantage Synergy (2%)
// ============================================================================
export function scoreAdvantages(a: FounderProfile, b: FounderProfile): number {
  const extractAdvantages = (profile: FounderProfile): Set<string> => {
    const advantages = new Set<string>();

    const text = `${profile.background || ""} ${profile.superpower || ""}`.toLowerCase();

    // Domain expertise
    if (text.includes("expert") || text.includes("years in")) {
      advantages.add("domain_expertise");
    }

    // Network
    if (text.includes("network") || text.includes("connections") || text.includes("contacts")) {
      advantages.add("network");
    }

    // Technical depth
    if (text.includes("engineer") || text.includes("technical") || text.includes("developer")) {
      advantages.add("technical");
    }

    // Business/sales
    if (text.includes("sales") || text.includes("business") || text.includes("revenue")) {
      advantages.add("business");
    }

    // Founder experience
    if (profile.previous_founder) {
      advantages.add("founder_experience");
    }

    return advantages;
  };

  const aAdvantages = extractAdvantages(a);
  const bAdvantages = extractAdvantages(b);

  // If both have advantages
  if (aAdvantages.size > 0 && bAdvantages.size > 0) {
    const overlap = Array.from(aAdvantages).filter((adv) => bAdvantages.has(adv)).length;

    if (overlap === 0) {
      return 80; // Completely different = great synergy
    } else if (overlap === 1) {
      return 65; // Some overlap = okay
    } else {
      return 50; // Too much overlap = less synergy
    }
  }

  // If only one has advantages
  if (aAdvantages.size > 0 || bAdvantages.size > 0) {
    return 60;
  }

  return 50; // Neither has clear advantages
}
