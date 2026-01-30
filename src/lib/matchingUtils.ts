// src/lib/matchingUtils.ts
// Manual scoring utilities for founder matching
// AI embedding generation has been moved to edge functions for security

import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

type FounderProfile = Tables<'founder_profiles'>;

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
  // Additional fields from match_founders RPC
  weaknesses_blindspots?: string[];
  timeline_start?: string;
  urgency_level?: string;
  working_style?: string;
}

/**
 * Find AI-powered matches for a founder via edge function
 * This keeps API keys secure on the backend
 */
export async function findAIMatches(
  founderId: string,
  threshold: number = 0.70,
  limit: number = 20
): Promise<AIMatchResult[]> {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session?.access_token) {
    throw new Error('Authentication required');
  }

  const { data, error } = await supabase.functions.invoke('get-founder-matches', {
    headers: { Authorization: `Bearer ${session.access_token}` },
    body: { founderId, threshold, limit },
  });

  if (error) {
    throw new Error(error.message || 'Failed to fetch matches');
  }

  if (!data.success) {
    throw new Error(data.error || 'Unknown error');
  }

  return data.matches || [];
}

/**
 * HYBRID APPROACH: Combine AI embeddings with manual scoring
 * Fetches AI matches from edge function, then enhances with manual scoring for interpretability
 */
export async function findHybridMatches(
  founderId: string,
  founderProfile: FounderProfile,
  threshold: number = 0.70,
  limit: number = 20
): Promise<AIMatchResult[]> {
  // 1. Get AI matches from edge function (secure)
  const aiMatches = await findAIMatches(founderId, threshold, limit);

  // 2. Enhance with manual scoring for interpretability
  const enhancedMatches = aiMatches.map(match => {
    const manualScore = calculateManualMatchScore(founderProfile, match as Partial<FounderProfile>);
    return {
      ...match,
      manualScore,
    };
  });

  // 3. Re-rank using weighted combination (70% AI, 30% manual)
  const reranked = enhancedMatches
    .map(match => ({
      ...match,
      combinedScore: (match.similarity * 0.7) + ((match.manualScore?.total || 0) / 100 * 0.3),
    }))
    .sort((a, b) => b.combinedScore - a.combinedScore)
    .slice(0, 10);

  return reranked;
}

/**
 * Manual matching logic for interpretability
 * Explains WHY matches work with human-readable breakdown
 */
function calculateManualMatchScore(
  founderA: FounderProfile,
  founderB: Partial<FounderProfile>
): MatchScore {
  const breakdown = {
    skillsMatch: calculateSkillsScore(founderA, founderB),
    locationFit: calculateLocationScore(founderA, founderB),
    timelineFit: calculateTimelineScore(founderA, founderB),
    workStyleFit: calculateWorkStyleScore(founderA, founderB),
  };

  const total = Object.values(breakdown).reduce((sum, v) => sum + v, 0);
  const { highlights, concerns } = generateInsights(founderA, founderB, breakdown);

  return { total, breakdown, highlights, concerns };
}

function calculateSkillsScore(a: FounderProfile, b: Partial<FounderProfile>): number {
  let score = 0;
  const aSkillsForB = countSkillMatches(a.core_skills, b.seeking_skills);
  const bSkillsForA = countSkillMatches(b.core_skills, a.seeking_skills);
  score += Math.min(aSkillsForB * 10, 20);
  score += Math.min(bSkillsForA * 10, 20);
  return score;
}

function countSkillMatches(hasSkills: string[] | null | undefined, seekingSkills: string[] | null | undefined): number {
  if (!hasSkills || !seekingSkills) return 0;
  const normalizedHas = hasSkills.map(s => s.toLowerCase().trim());
  const normalizedSeek = seekingSkills.map(s => s.toLowerCase().trim());
  let matches = 0;
  for (const seek of normalizedSeek) {
    if (normalizedHas.some(has => skillsRelated(has, seek))) {
      matches++;
    }
  }
  return matches;
}

function skillsRelated(skillA: string, skillB: string): boolean {
  if (skillA === skillB) return true;
  if (skillA.includes(skillB) || skillB.includes(skillA)) return true;
  const synonymGroups = [
    ['tech', 'technical', 'engineering', 'developer', 'code', 'coding', 'software'],
    ['design', 'ux', 'ui', 'product design', 'visual'],
    ['sales', 'business development', 'bd', 'growth'],
    ['marketing', 'growth', 'acquisition'],
    ['ops', 'operations', 'strategy'],
  ];
  for (const group of synonymGroups) {
    const aInGroup = group.some(syn => skillA.includes(syn));
    const bInGroup = group.some(syn => skillB.includes(syn));
    if (aInGroup && bInGroup) return true;
  }
  return false;
}

function calculateLocationScore(a: FounderProfile, b: Partial<FounderProfile>): number {
  const locA = (a.location_preference || '').toLowerCase().trim();
  const locB = (b.location_preference || '').toLowerCase().trim();

  // No location specified
  if (!locA || !locB) return 10;

  // Both flexible/remote (perfect match)
  if (isFlexible(locA) && isFlexible(locB)) return 25;
  
  // One is flexible (good match)
  if (isFlexible(locA) || isFlexible(locB)) return 20;

  // Exact match (case-insensitive)
  if (locA === locB) return 25;

  // Check if they share significant words (city, country, region)
  return calculateLocationOverlap(locA, locB);
}

function calculateLocationOverlap(locA: string, locB: string): number {
  // Remove common words that don't indicate location
  const stopWords = ['area', 'region', 'open', 'to', 'in', 'the', 'or', 'and'];
  
  const wordsA = locA
    .split(/[\s,]+/)
    .filter(w => w.length > 2 && !stopWords.includes(w));
  
  const wordsB = locB
    .split(/[\s,]+/)
    .filter(w => w.length > 2 && !stopWords.includes(w));

  // Count matching words
  let matches = 0;
  for (const wordA of wordsA) {
    for (const wordB of wordsB) {
      // Exact match
      if (wordA === wordB) {
        matches += 2; // Full match = 2 points
      }
      // Partial match (one contains the other)
      else if (wordA.includes(wordB) || wordB.includes(wordA)) {
        matches += 1; // Partial match = 1 point
      }
    }
  }

  // Score based on overlap
  const totalWords = Math.max(wordsA.length, wordsB.length);
  const overlapRatio = matches / (totalWords * 2); // Normalize to 0-1

  if (overlapRatio >= 0.8) return 25; // Very strong match
  if (overlapRatio >= 0.5) return 20; // Good match
  if (overlapRatio >= 0.3) return 15; // Decent match
  if (overlapRatio >= 0.1) return 10; // Weak match
  return 5; // No match
}

function isFlexible(loc: string): boolean {
  const flexTerms = [
    'remote', 'flexible', 'anywhere', 'open', 'any location',
    'work from anywhere', 'location independent', 'global'
  ];
  return flexTerms.some(term => loc.includes(term));
}

function calculateTimelineScore(a: FounderProfile, b: Partial<FounderProfile>): number {
  const timeA = (a.timeline_start || '').toLowerCase();
  const timeB = (b.timeline_start || '').toLowerCase();
  if (!timeA || !timeB) return 10;
  const urgencyA = getUrgencyLevel(timeA);
  const urgencyB = getUrgencyLevel(timeB);
  const diff = Math.abs(urgencyA - urgencyB);
  if (diff === 0) return 20;
  if (diff === 1) return 15;
  if (diff === 2) return 8;
  return 4;
}

function getUrgencyLevel(timeline: string): number {
  if (timeline.includes('now') || timeline.includes('asap') || timeline.includes('immediately')) return 4;
  if (timeline.includes('month') || timeline.includes('soon')) return 3;
  if (timeline.includes('quarter') || timeline.includes('few months')) return 2;
  if (timeline.includes('year') || timeline.includes('exploring')) return 1;
  return 2;
}

function calculateWorkStyleScore(a: FounderProfile, b: Partial<FounderProfile>): number {
  let score = 7;
  const styleA = (a.working_style || '').toLowerCase();
  const styleB = (b.working_style || '').toLowerCase();
  const styleTerms = ['iterative', 'agile', 'structured', 'flexible', 'fast', 'methodical'];
  for (const term of styleTerms) {
    if (styleA.includes(term) && styleB.includes(term)) {
      score += 4;
      break;
    }
  }
  const commitA = (a.commitment_level || '').toLowerCase();
  const commitB = (b.commitment_level || '').toLowerCase();
  if (commitA && commitB) {
    if (commitA.includes('full') && commitB.includes('full')) score += 4;
    else if (commitA.includes('part') && commitB.includes('part')) score += 4;
    else if (commitA.includes('flexible') || commitB.includes('flexible')) score += 2;
  }
  return Math.min(score, 15);
}

function generateInsights(
  a: FounderProfile,
  b: Partial<FounderProfile>,
  breakdown: MatchScore['breakdown']
): { highlights: string[]; concerns: string[] } {
  const highlights: string[] = [];
  const concerns: string[] = [];

  if (breakdown.skillsMatch >= 30) {
    highlights.push('Strong skills complementarity');
  } else if (breakdown.skillsMatch >= 20) {
    highlights.push('Good skills overlap');
  } else if (breakdown.skillsMatch < 10) {
    concerns.push('Limited skills match');
  }

  if (breakdown.locationFit >= 20) {
    highlights.push('Location compatible');
  } else if (breakdown.locationFit <= 5) {
    concerns.push('Different locations');
  }

  if (breakdown.timelineFit >= 15) {
    highlights.push('Aligned timelines');
  } else if (breakdown.timelineFit < 10) {
    concerns.push('Different urgency levels');
  }

  return { highlights, concerns };
}

export function getScoreTier(score: number): 'excellent' | 'good' | 'fair' | 'low' {
  if (score >= 75) return 'excellent';
  if (score >= 55) return 'good';
  if (score >= 35) return 'fair';
  return 'low';
}

// Legacy function for backward compatibility
export function calculateMatchScore(
  founderA: FounderProfile,
  founderB: FounderProfile
): MatchScore {
  return calculateManualMatchScore(founderA, founderB);
}

export function getMatchScoresForFounder(
  founder: FounderProfile,
  candidates: FounderProfile[]
): Array<{ candidate: FounderProfile; score: MatchScore }> {
  return candidates
    .filter(c => c.id !== founder.id)
    .map(candidate => ({
      candidate,
      score: calculateMatchScore(founder, candidate),
    }))
    .sort((a, b) => b.score.total - a.score.total);
}
