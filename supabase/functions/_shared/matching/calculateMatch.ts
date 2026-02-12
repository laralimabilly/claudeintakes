// _shared/matching/calculateMatch.ts
// Main matching calculator — reads weights from config parameter

import {
  scoreSkills,
  scoreStage,
  scoreCommunication,
  scoreVision,
  scoreValues,
  scoreGeo,
  scoreAdvantages,
} from "./scoringFunctions.ts";
import type {
  FounderProfileForMatching,
  MatchResult,
  MatchingConfig,
} from "./types.ts";

export type { MatchResult, MatchingConfig };

/**
 * Calculate match score between two founders.
 *
 * @param founderA - First founder profile
 * @param founderB - Second founder profile
 * @param config   - Matching config loaded from system_parameters (MATCHING_WEIGHTS)
 * @returns MatchResult or null if score below minimum threshold
 */
export function calculateMatchScore(
  founderA: FounderProfileForMatching,
  founderB: FounderProfileForMatching,
  config: MatchingConfig,
): MatchResult | null {
  const dims = config.dimensions;

  // Calculate individual dimension scores (0-100 each)
  const skills = scoreSkills(founderA, founderB, dims.skills);
  const stage = scoreStage(founderA, founderB, dims.stage);
  const communication = scoreCommunication(founderA, founderB, dims.communication);
  const vision = scoreVision(founderA, founderB, dims.vision);
  const values = scoreValues(founderA, founderB, dims.values);
  const geo = scoreGeo(founderA, founderB, dims.geo);
  const advantages = scoreAdvantages(founderA, founderB, dims.advantages);

  // Calculate weighted total using config weights
  const totalScore =
    skills * dims.skills.weight +
    stage * dims.stage.weight +
    communication * dims.communication.weight +
    vision * dims.vision.weight +
    values * dims.values.weight +
    geo * dims.geo.weight +
    advantages * dims.advantages.weight;

  // Don't return matches below minimum threshold
  if (totalScore < config.min_match_score) {
    return null;
  }

  const round = (n: number) => Math.round(n * 10) / 10;

  return {
    founder_a_id: founderA.id,
    founder_b_id: founderB.id,
    total_score: round(totalScore),
    compatibility_level:
      totalScore >= config.highly_compatible_threshold ? "highly_compatible" : "somewhat_compatible",
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
