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
} from './scoringFunctions';
import type { FounderProfileForMatching } from '@/types/founder';

export interface MatchResult {
  founder_a_id: string;
  founder_b_id: string;
  total_score: number;
  compatibility_level: 'highly_compatible' | 'somewhat_compatible';
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
 * @returns MatchResult or null if score < 60
 */
export function calculateMatchScore(
  founderA: FounderProfileForMatching & { id: string },
  founderB: FounderProfileForMatching & { id: string }
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
    skills: 0.27,        // 27%
    stage: 0.23,         // 23%
    communication: 0.19, // 19%
    vision: 0.15,        // 15%
    values: 0.11,        // 11%
    geo: 0.03,           // 3%
    advantages: 0.02     // 2%
  };

  // Calculate weighted total
  const totalScore = (
    skills * weights.skills +
    stage * weights.stage +
    communication * weights.communication +
    vision * weights.vision +
    values * weights.values +
    geo * weights.geo +
    advantages * weights.advantages
  );

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
    compatibility_level: totalScore >= 75 ? 'highly_compatible' : 'somewhat_compatible',
    dimension_scores: {
      skills: round(skills),
      stage: round(stage),
      communication: round(communication),
      vision: round(vision),
      values: round(values),
      geo: round(geo),
      advantages: round(advantages)
    }
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
  candidates: (FounderProfileForMatching & { id: string })[]
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
