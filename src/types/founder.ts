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

// Match score breakdown for UI display
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

// AI match result from edge function
export interface AIMatchResult {
  id: string;
  name?: string;
  phone_number: string;
  email?: string;
  idea_description?: string;
  stage?: string;
  background?: string;
  core_skills?: string[];
  previous_founder?: boolean;
  superpower?: string;
  seeking_skills?: string[];
  cofounder_type?: string;
  location_preference?: string;
  commitment_level?: string;
  seriousness_score?: number;
  similarity: number;
  manualScore?: MatchScore;
  created_at: string;
  weaknesses_blindspots?: string[];
  timeline_start?: string;
  urgency_level?: string;
  working_style?: string;
}

// Founder match record from database
export type FounderMatch = Tables<'founder_matches'>;
