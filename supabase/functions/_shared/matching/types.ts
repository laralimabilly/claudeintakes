// _shared/matching/types.ts
// Shared types for matching functions in edge functions

export interface FounderProfileForMatching {
  id: string;
  core_skills: string[] | null;
  seeking_skills: string[] | null;
  superpower: string | null;
  weaknesses_blindspots: string[] | null;
  stage: string | null;
  timeline_start: string | null;
  urgency_level: string | null;
  commitment_level: string | null;
  working_style: string | null;
  idea_description: string | null;
  problem_solving: string | null;
  target_customer: string | null;
  embedding?: number[] | string | null;
  equity_thoughts: string | null;
  location_preference: string | null;
  background: string | null;
  previous_founder: boolean | null;
  deal_breakers: string[] | null;
  non_negotiables: string[] | null;
}

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
