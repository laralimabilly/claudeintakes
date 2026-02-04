// _shared/matching/calculateMatch.ts
// Main matching calculator that applies weights and returns match results

import {
  scoreSkills,
  scoreStage,
  scoreCommunication,
  scoreVision,
  scoreValues,
  scoreGeo,
  scoreAdvantages,
} from "./scoringFunctions.ts";
import type { FounderProfileForMatching, MatchResult } from "./types.ts";

export type { MatchResult };

/**
 * Calculate match score between two founders
 *
 * @param founderA - First founder profile
 * @param founderB - Second founder profile
 * @returns MatchResult or null if score < 60
 */
export function calculateMatchScore(
  founderA: FounderProfileForMatching,
  founderB: FounderProfileForMatching,
): MatchResult | null {
  // Calculate individual dimension scores (0-100 each)
  const skills = scoreSkills(founderA, founderB);
  const stage = scoreStage(founderA, founderB);
  const communication = scoreCommunication(founderA, founderB);
  const vision = scoreVision(founderA, founderB);
  const values = scoreValues(founderA, founderB);
  const geo = scoreGeo(founderA, founderB);
  const advantages = scoreAdvantages(founderA, founderB);

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

  // Don't return matches below 60% compatibility
  if (totalScore < 60) {
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
