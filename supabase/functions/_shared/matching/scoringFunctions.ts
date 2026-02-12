// _shared/matching/scoringFunctions.ts
// ============================================================================
// 7-Dimension Matching Scoring Functions
//
// All scoring functions now accept a config parameter from system_parameters
// so weights, matrices, and thresholds can be tuned without code changes.
// ============================================================================

import type {
  FounderProfileForMatching,
  SkillsConfig,
  StageConfig,
  CommunicationConfig,
  ValuesConfig,
  VisionConfig,
  GeoConfig,
  AdvantagesConfig,
} from "./types.ts";
import { calculateCoverage, calculateOverlap, semanticSkillBoost, calculateSuperpowerBoost } from "./skillsHelpers.ts";
import {
  DIRECTNESS_DIRECT,
  DIRECTNESS_GENTLE,
  STRUCTURE_STRUCTURED,
  STRUCTURE_FLEXIBLE,
  COLLAB_ASYNC,
  COLLAB_SYNC,
  placeOnSpectrum,
  type SpectrumPosition,
} from "./communicationHelpers.ts";
import {
  type FounderWithLocation,
  calculateDistanceKm,
  parseLocationPrefsFromText,
} from "./geoHelpers.ts";
import {
  extractIndustries,
  extractSegments,
  buildVisionText,
  extractWords,
  jaccard,
  cosineSimilarity,
  parseEmbedding,
} from "./visionHelpers.ts";
import { extractValueProfile, scoreEquityWithConfig, scoreDimensionWithConfig } from "./valuesHelpers.ts";

export type { FounderProfileForMatching };

type FounderProfile = FounderProfileForMatching;


// ============================================================================
// 1. SKILLS COMPLEMENTARITY
// ============================================================================

export function scoreSkills(a: FounderProfile, b: FounderProfile, config: SkillsConfig): number {
  const sw = config.sub_weights;

  const aCoversB = calculateCoverage(a.core_skills, b.seeking_skills);
  const bCoversA = calculateCoverage(b.core_skills, a.seeking_skills);
  const avgCoverage = (aCoversB + bCoversA) / 2;

  const superpowerBoost = calculateSuperpowerBoost(a, b);
  const semanticBoost = semanticSkillBoost(a, b);

  const overlap = calculateOverlap(a.core_skills, b.core_skills);
  const overlapPenalty = overlap * config.overlap_penalty_factor;

  const rawScore = (avgCoverage * sw.coverage + superpowerBoost * sw.superpower_boost + semanticBoost * sw.semantic_boost) * 100;
  const finalScore = rawScore * (1 - overlapPenalty);

  return Math.min(100, Math.max(0, Math.round(finalScore * 10) / 10));
}


// ============================================================================
// 2. STAGE & TIMELINE ALIGNMENT
// ============================================================================

export function scoreStage(a: FounderProfile, b: FounderProfile, config: StageConfig): number {
  // --- Stage normalization ---
  const normalizeStage = (stage: string): string => {
    const s = stage?.toLowerCase() || "idea";
    if (s.includes("idea") || s.includes("validation") || s.includes("exploring")) return "idea";
    if (s.includes("mvp") || s.includes("building") || s.includes("prototype")) return "mvp";
    if (s.includes("launch") || s.includes("live") || s.includes("revenue")) return "launched";
    if (s.includes("scal") || s.includes("growth") || s.includes("series")) return "scaling";
    return "idea";
  };

  const aStage = normalizeStage(a.stage || "");
  const bStage = normalizeStage(b.stage || "");
  const stageScore = config.stage_matrix[aStage]?.[bStage] ?? 50;

  // --- Urgency normalization ---
  const normalizeUrgency = (urgency: string): string => {
    const u = urgency?.toLowerCase() || "flexible";
    if (u.includes("asap") || u.includes("immediately") || u.includes("urgent") || u.includes("now")) return "asap";
    if (u.includes("soon") || u.includes("month") || u.includes("weeks")) return "soon";
    return "flexible";
  };

  const aUrgency = normalizeUrgency(a.urgency_level || "");
  const bUrgency = normalizeUrgency(b.urgency_level || "");
  const urgencyScore = config.urgency_matrix[aUrgency]?.[bUrgency] ?? 60;

  // --- Commitment alignment ---
  const aCommit = a.commitment_level?.toLowerCase() || "";
  const bCommit = b.commitment_level?.toLowerCase() || "";

  let commitmentScore = config.commitment_scores.unknown;
  if (aCommit && bCommit) {
    if (aCommit === bCommit) {
      commitmentScore = config.commitment_scores.same;
    } else if (
      (aCommit.includes("full") && !bCommit.includes("full")) ||
      (!aCommit.includes("full") && bCommit.includes("full"))
    ) {
      commitmentScore = config.commitment_scores.one_fulltime_one_not;
    } else {
      commitmentScore = config.commitment_scores.different_compatible;
    }
  }

  return Math.round(((stageScore + urgencyScore + commitmentScore) / 3) * 10) / 10;
}


// ============================================================================
// 3. COMMUNICATION & CONFLICT STYLE
// ============================================================================

export function scoreCommunication(a: FounderProfile, b: FounderProfile, config: CommunicationConfig): number {
  const sw = config.sub_weights;
  const scores = config.spectrum_scores;

  const aDirectness = placeOnSpectrum(a, DIRECTNESS_DIRECT, DIRECTNESS_GENTLE);
  const bDirectness = placeOnSpectrum(b, DIRECTNESS_DIRECT, DIRECTNESS_GENTLE);
  const directnessScore = scores[aDirectness]?.[bDirectness] ?? 65;

  const aStructure = placeOnSpectrum(a, STRUCTURE_STRUCTURED, STRUCTURE_FLEXIBLE);
  const bStructure = placeOnSpectrum(b, STRUCTURE_STRUCTURED, STRUCTURE_FLEXIBLE);
  const structureScore = scores[aStructure]?.[bStructure] ?? 65;

  const aCollab = placeOnSpectrum(a, COLLAB_ASYNC, COLLAB_SYNC);
  const bCollab = placeOnSpectrum(b, COLLAB_ASYNC, COLLAB_SYNC);
  const collabScore = scores[aCollab]?.[bCollab] ?? 65;

  const finalScore = directnessScore * sw.directness + structureScore * sw.structure + collabScore * sw.collaboration;

  return Math.round(finalScore * 10) / 10;
}


// ============================================================================
// 4. VISION & PROBLEM SPACE ALIGNMENT
// ============================================================================

export function scoreVision(a: FounderProfile, b: FounderProfile, config: VisionConfig): number {
  const sw = config.sub_weights;
  const indCfg = config.industry_scores;
  const segCfg = config.segment_scores;

  const aVisionText = buildVisionText(a);
  const bVisionText = buildVisionText(b);

  // --- Industry alignment ---
  const aIndustries = extractIndustries(aVisionText);
  const bIndustries = extractIndustries(bVisionText);

  let industryScore = 0;
  if (aIndustries.size > 0 && bIndustries.size > 0) {
    const overlap = new Set([...aIndustries].filter((x) => bIndustries.has(x)));
    if (overlap.size > 0) {
      const overlapRatio = overlap.size / Math.max(aIndustries.size, bIndustries.size);
      industryScore = indCfg.overlap_base + overlapRatio * indCfg.overlap_bonus;
    } else {
      industryScore = indCfg.no_overlap;
    }
  } else if (aIndustries.size > 0 || bIndustries.size > 0) {
    industryScore = indCfg.one_unknown;
  } else {
    industryScore = indCfg.both_unknown;
  }

  // --- Customer segment alignment ---
  const aSegments = extractSegments(aVisionText + " " + (a.target_customer || ""));
  const bSegments = extractSegments(bVisionText + " " + (b.target_customer || ""));

  let segmentScore = 0;
  if (aSegments.size > 0 && bSegments.size > 0) {
    const segmentOverlap = jaccard(aSegments, bSegments);
    if (segmentOverlap > 0) {
      segmentScore = segCfg.overlap_base + segmentOverlap * segCfg.overlap_bonus;
    } else {
      segmentScore = segCfg.no_overlap;
    }
  } else {
    segmentScore = segCfg.unknown;
  }

  // --- Semantic similarity ---
  let semanticScore = 0;
  const aEmbed = parseEmbedding(a.embedding);
  const bEmbed = parseEmbedding(b.embedding);

  if (aEmbed && bEmbed) {
    const cosine = cosineSimilarity(aEmbed, bEmbed);
    semanticScore = Math.max(0, cosine);
  } else {
    const aWords = extractWords(aVisionText);
    const bWords = extractWords(bVisionText);
    semanticScore = jaccard(aWords, bWords);
  }

  // --- Vocabulary boost ---
  const aWords = extractWords(aVisionText);
  const bWords = extractWords(bVisionText);
  const vocabScore = jaccard(aWords, bWords);

  // --- Combine with config weights ---
  const rawScore = industryScore * sw.industry + segmentScore * sw.segment + semanticScore * sw.semantic + vocabScore * sw.vocabulary;
  const finalScore = rawScore * 100;

  return Math.min(100, Math.max(0, Math.round(finalScore * 10) / 10));
}


// ============================================================================
// 5. VALUES & WORKING STYLE
// ============================================================================

export function scoreValues(a: FounderProfile, b: FounderProfile, config: ValuesConfig): number {
  const sw = config.sub_weights;
  const ds = config.dimension_scores;
  const ec = config.equity_compatibility;

  const aProfile = extractValueProfile(a);
  const bProfile = extractValueProfile(b);

  const paceScore = scoreDimensionWithConfig(aProfile.pace, bProfile.pace, ds);
  const riskScore = scoreDimensionWithConfig(aProfile.risk, bProfile.risk, ds);
  const decisionScore = scoreDimensionWithConfig(aProfile.decision, bProfile.decision, ds);
  const autonomyScore = scoreDimensionWithConfig(aProfile.autonomy, bProfile.autonomy, ds);
  const worklifeScore = scoreDimensionWithConfig(aProfile.worklife, bProfile.worklife, ds);
  const equityScoreVal = scoreEquityWithConfig(aProfile.equity, bProfile.equity, ec);

  const rawScore =
    paceScore * sw.pace +
    riskScore * sw.risk +
    equityScoreVal * sw.equity +
    decisionScore * sw.decision +
    autonomyScore * sw.autonomy +
    worklifeScore * sw.worklife;

  return Math.min(100, Math.max(0, Math.round(rawScore * 10) / 10));
}


// ============================================================================
// 6. GEOGRAPHIC & LOGISTICS
// ============================================================================

export function scoreGeo(a: FounderProfile, b: FounderProfile, config: GeoConfig): number {
  const aExt = a as FounderWithLocation;
  const bExt = b as FounderWithLocation;

  const aLoc = aExt.location;
  const bLoc = bExt.location;

  const aPrefs = aLoc
    ? { remoteOk: aLoc.is_remote_ok, remoteOnly: aLoc.is_remote_only, willingToRelocate: aLoc.willing_to_relocate }
    : parseLocationPrefsFromText(a.location_preference);

  const bPrefs = bLoc
    ? { remoteOk: bLoc.is_remote_ok, remoteOnly: bLoc.is_remote_only, willingToRelocate: bLoc.willing_to_relocate }
    : parseLocationPrefsFromText(b.location_preference);

  const bothRemoteOk = aPrefs.remoteOk && bPrefs.remoteOk;
  const oneRemoteOk = aPrefs.remoteOk || bPrefs.remoteOk;
  const oneWillingToRelocate = aPrefs.willingToRelocate || bPrefs.willingToRelocate;

  const aHasCoords = aLoc?.lat != null && aLoc?.lng != null;
  const bHasCoords = bLoc?.lat != null && bLoc?.lng != null;

  if (aHasCoords && bHasCoords) {
    const distance = calculateDistanceKm(aLoc!.lat!, aLoc!.lng!, bLoc!.lat!, bLoc!.lng!);

    // Use config distance_scores thresholds
    let score = scoreDistanceWithConfig(distance, config.distance_scores);

    if (bothRemoteOk) {
      score += getTimezoneModifierWithConfig(aLoc!.timezone_offset, bLoc!.timezone_offset, config.timezone_modifiers);
    }

    if (oneWillingToRelocate && distance > 500) {
      score += config.relocate_bonus;
    }

    return Math.min(100, Math.max(0, Math.round(score)));
  }

  // ========== FALLBACK SCORING ==========
  const fb = config.fallback_scores;

  if (aPrefs.remoteOnly && bPrefs.remoteOnly) return fb.both_remote_only;

  if (bothRemoteOk) {
    const tzMod = getTimezoneModifierWithConfig(aLoc?.timezone_offset, bLoc?.timezone_offset, config.timezone_modifiers);
    return fb.both_remote_ok + tzMod;
  }

  if (oneWillingToRelocate) return fb.one_relocate;
  if (oneRemoteOk) return fb.one_remote_ok;
  if (!a.location_preference && !b.location_preference) return fb.no_data;

  return fb.no_flexibility;
}

/** Score distance using config thresholds */
function scoreDistanceWithConfig(distanceKm: number, distanceScores: Record<string, number>): number {
  const thresholds = Object.keys(distanceScores)
    .filter(k => k !== 'beyond')
    .map(Number)
    .sort((a, b) => a - b);

  for (const threshold of thresholds) {
    if (distanceKm < threshold) {
      return distanceScores[String(threshold)];
    }
  }
  return distanceScores['beyond'] ?? 40;
}

/** Timezone modifier using config */
function getTimezoneModifierWithConfig(
  offsetA: number | null | undefined,
  offsetB: number | null | undefined,
  tz: GeoConfig['timezone_modifiers'],
): number {
  if (offsetA == null || offsetB == null) return 0;

  const gapHours = Math.abs(offsetA - offsetB) / 60;

  if (gapHours <= tz.good_hours) return tz.good_bonus;
  if (gapHours <= tz.moderate_hours) return tz.moderate_bonus;
  return tz.poor_penalty;
}


// ============================================================================
// 7. UNFAIR ADVANTAGE SYNERGY
// ============================================================================

export function scoreAdvantages(a: FounderProfile, b: FounderProfile, config: AdvantagesConfig): number {
  const extractAdvantages = (profile: FounderProfile): Set<string> => {
    const advantages = new Set<string>();
    const text = `${profile.background || ""} ${profile.superpower || ""}`.toLowerCase();

    if (text.includes("expert") || text.includes("years in") || text.includes("specialist")) advantages.add("domain_expertise");
    if (text.includes("network") || text.includes("connections") || text.includes("contacts") || text.includes("relationships")) advantages.add("network");
    if (text.includes("engineer") || text.includes("technical") || text.includes("developer") || text.includes("architect")) advantages.add("technical");
    if (text.includes("sales") || text.includes("business") || text.includes("revenue") || text.includes("deals")) advantages.add("business");
    if (profile.previous_founder) advantages.add("founder_experience");

    return advantages;
  };

  const aAdvantages = extractAdvantages(a);
  const bAdvantages = extractAdvantages(b);
  const syn = config.synergy_scores;

  if (aAdvantages.size > 0 && bAdvantages.size > 0) {
    const overlap = Array.from(aAdvantages).filter((adv) => bAdvantages.has(adv)).length;
    if (overlap === 0) return syn.zero_overlap;
    if (overlap === 1) return syn.one_overlap;
    return syn.high_overlap;
  }

  if (aAdvantages.size > 0 || bAdvantages.size > 0) return syn.one_has;
  return syn.neither_has;
}
