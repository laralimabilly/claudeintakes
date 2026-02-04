// lib/matching/calculateMatch.ts
// Main matching calculator that applies weights and returns match results

import {
  scoreSkills,
  scoreStage,
  scoreCommunication,
  scoreVision,
  scoreValues,
  scoreGeo,
  scoreAdvantages,
} from "./scoringFunctions";
import type { FounderProfileForMatching } from "@/types/founder";

export interface MatchResult {
  founder_a_id: string;
  founder_b_id: string;
  total_score: number;
  compatibility_level: "highly_compatible" | "somewhat_compatible";
  dimension_scores: {
    skills: number;
    stage: number;
    communication: number;
    vision: number;
    values: number;
    geo: number;
    advantages: number;
  };
}

/**
 * Calculate match score between two founders
 *
 * @param founderA - First founder profile
 * @param founderB - Second founder profile
 * @param minScoreThreshold - Minimum score to return (default 0 - return all matches)
 * @returns MatchResult or null if score < minScoreThreshold
 */
export function calculateMatchScore(
  founderA: FounderProfileForMatching & { id: string },
  founderB: FounderProfileForMatching & { id: string },
  minScoreThreshold: number = 0,
): MatchResult | null {
  // Calculate individual dimension scores (0-100 each)
  const skills = scoreSkills(founderA, founderB);
  const stage = scoreStage(founderA, founderB);
  const communication = scoreCommunication(founderA, founderB);
  const vision = scoreVision(founderA, founderB);
  const values = scoreValues(founderA, founderB);
  const geo = scoreGeo(founderA, founderB);
  const advantages = scoreAdvantages(founderA, founderB);

  console.log("[calculateMatchScore] Dimension scores:", {
    founderB: founderB.id,
    skills,
    stage,
    communication,
    vision,
    values,
    geo,
    advantages,
  });

  // Apply weights (must sum to 100%)
  const weights = {
    skills: 0.3, // 30%
    stage: 0.2, // 20%
    communication: 0.18, // 18%
    values: 0.15, // 15%
    vision: 0.12, // 12%
    geo: 0.03, // 3%
    advantages: 0.02, // 2%
  };

  // Calculate weighted total
  const totalScore =
    skills * weights.skills +
    stage * weights.stage +
    communication * weights.communication +
    vision * weights.vision +
    values * weights.values +
    geo * weights.geo +
    advantages * weights.advantages;

  console.log("[calculateMatchScore] Total score:", totalScore, "threshold:", minScoreThreshold);

  // Filter by minimum threshold
  if (totalScore < minScoreThreshold) {
    return null;
  }

  // Round scores to 1 decimal place
  const round = (n: number) => Math.round(n * 10) / 10;

  return {
    founder_a_id: founderA.id,
    founder_b_id: founderB.id,
    total_score: round(totalScore),
    compatibility_level: totalScore >= 75 ? "highly_compatible" : "somewhat_compatible",
    dimension_scores: {
      skills: round(skills),
      stage: round(stage),
      communication: round(communication),
      vision: round(vision),
      values: round(values),
      geo: round(geo),
      advantages: round(advantages),
    },
  };
}

/**
 * Calculate all matches for a founder against a list of candidates
 *
 * @param founder - The founder to match
 * @param candidates - List of potential matches
 * @returns Array of match results, sorted by score descending
 */
export function calculateAllMatches(
  founder: FounderProfileForMatching & { id: string },
  candidates: (FounderProfileForMatching & { id: string })[],
): MatchResult[] {
  const matches: MatchResult[] = [];

  for (const candidate of candidates) {
    // Skip matching with self
    if (candidate.id === founder.id) continue;

    const match = calculateMatchScore(founder, candidate);
    if (match) {
      matches.push(match);
    }
  }

  // Sort by total score descending
  return matches.sort((a, b) => b.total_score - a.total_score);
}
