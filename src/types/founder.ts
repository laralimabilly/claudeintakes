// Centralized founder types
// Single source of truth for FounderProfile and related types

import type { Tables } from '@/integrations/supabase/types';

// Database-backed founder profile type
export type FounderProfile = Tables<'founder_profiles'>;

// Founder profile for matching algorithms (subset with required fields for scoring)
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

// New 7-dimension match result (used by compute-matches and MatchingView)
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

// Legacy match score breakdown (deprecated, kept for backward compatibility)
export interface MatchScore {
  total: number;
  breakdown: {
    skillsMatch: number;
    locationFit: number;
    timelineFit: number;
    workStyleFit: number;
  };
  highlights: string[];
  concerns: string[];
}

// AI match result from edge function (enhanced with new scoring)
export interface AIMatchResult extends FounderProfileForMatching {
  name?: string;
  phone_number: string;
  email?: string;
  cofounder_type?: string;
  seriousness_score?: number;
  similarity: number;
  created_at: string;
  // New 7-dimension scores
  matchResult?: MatchResult;
  // Legacy score (deprecated)
  manualScore?: MatchScore;
}

// Match lifecycle status values
export type MatchStatus =
  | 'pending'
  | 'notified_a'
  | 'a_interested'
  | 'notified_b'
  | 'b_interested'
  | 'both_interested'
  | 'intro_sent'
  | 'a_declined'
  | 'b_declined'
  | 'completed'
  | 'expired';

// Founder match record from database
export type FounderMatch = Tables<'founder_matches'>;
