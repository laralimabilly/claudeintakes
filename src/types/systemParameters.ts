// src/types/systemParameters.ts
// ============================================================================
// Types for the system_parameters table and matching configuration
// ============================================================================

export interface SystemParameter<T = unknown> {
  system_key: string;
  value: T;
  description: string | null;
  updated_at: string;
  updated_by: string | null;
}

// ---------------------------------------------------------------------------
// MATCHING_WEIGHTS value shape
// ---------------------------------------------------------------------------

export interface MatchingWeightsConfig {
  min_match_score: number;
  highly_compatible_threshold: number;
  hybrid_weights?: {
    ai_similarity: number;
    dimension_score: number;
  };
  dimensions: {
    skills: {
      weight: number;
      label: string;
      sub_weights: {
        coverage: number;
        superpower_boost: number;
        semantic_boost: number;
      };
      overlap_penalty_factor: number;
    };
    stage: {
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
    };
    communication: {
      weight: number;
      label: string;
      sub_weights: {
        directness: number;
        structure: number;
        collaboration: number;
      };
      spectrum_scores: Record<string, Record<string, number>>;
    };
    values: {
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
    };
    vision: {
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
    };
    geo: {
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
    };
    advantages: {
      weight: number;
      label: string;
      synergy_scores: {
        zero_overlap: number;
        one_overlap: number;
        high_overlap: number;
        one_has: number;
        neither_has: number;
      };
    };
  };
}
