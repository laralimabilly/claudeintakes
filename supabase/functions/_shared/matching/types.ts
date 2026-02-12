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

// ---------------------------------------------------------------------------
// Matching configuration — mirrors the MATCHING_WEIGHTS system parameter
// ---------------------------------------------------------------------------

export interface MatchingConfig {
  min_match_score: number;
  highly_compatible_threshold: number;
  dimensions: {
    skills: SkillsConfig;
    stage: StageConfig;
    communication: CommunicationConfig;
    values: ValuesConfig;
    vision: VisionConfig;
    geo: GeoConfig;
    advantages: AdvantagesConfig;
  };
}

export interface SkillsConfig {
  weight: number;
  label: string;
  sub_weights: {
    coverage: number;
    superpower_boost: number;
    semantic_boost: number;
  };
  overlap_penalty_factor: number;
}

export interface StageConfig {
  weight: number;
  label: string;
  stage_matrix: Record<string, Record<string, number>>;
  urgency_matrix: Record<string, Record<string, number>>;
  commitment_scores: {
    same: number;
    one_fulltime_one_not: number;
    different_compatible: number;
    unknown: number;
  };
}

export interface CommunicationConfig {
  weight: number;
  label: string;
  sub_weights: {
    directness: number;
    structure: number;
    collaboration: number;
  };
  spectrum_scores: Record<string, Record<string, number>>;
}

export interface ValuesConfig {
  weight: number;
  label: string;
  sub_weights: {
    pace: number;
    risk: number;
    equity: number;
    decision: number;
    autonomy: number;
    worklife: number;
  };
  dimension_scores: {
    same: number;
    adjacent: number;
    opposite: number;
    unknown: number;
  };
  equity_compatibility: {
    same: number;
    flexible_any: number;
    equal_contribution: number;
    equal_majority: number;
    default: number;
  };
}

export interface VisionConfig {
  weight: number;
  label: string;
  sub_weights: {
    industry: number;
    segment: number;
    semantic: number;
    vocabulary: number;
  };
  industry_scores: {
    overlap_base: number;
    overlap_bonus: number;
    no_overlap: number;
    one_unknown: number;
    both_unknown: number;
  };
  segment_scores: {
    overlap_base: number;
    overlap_bonus: number;
    no_overlap: number;
    unknown: number;
  };
}

export interface GeoConfig {
  weight: number;
  label: string;
  distance_scores: Record<string, number>;
  timezone_modifiers: {
    good_hours: number;
    good_bonus: number;
    moderate_hours: number;
    moderate_bonus: number;
    poor_penalty: number;
  };
  fallback_scores: {
    both_remote_only: number;
    both_remote_ok: number;
    one_relocate: number;
    one_remote_ok: number;
    no_data: number;
    no_flexibility: number;
  };
  relocate_bonus: number;
}

export interface AdvantagesConfig {
  weight: number;
  label: string;
  synergy_scores: {
    zero_overlap: number;
    one_overlap: number;
    high_overlap: number;
    one_has: number;
    neither_has: number;
  };
}
