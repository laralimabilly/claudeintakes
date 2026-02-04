// src/lib/matchingUtils.ts
// Matching utilities using the new 7-dimension scoring system

import { supabase } from '@/integrations/supabase/client';
import { calculateMatchScore } from './matching/calculateMatch';
import { checkDealbreakers } from './matching/dealbreakers';
import type { FounderProfile, FounderProfileForMatching, AIMatchResult, MatchResult } from '@/types/founder';

export type { FounderProfile, AIMatchResult, MatchResult };

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
 * HYBRID APPROACH: Combine AI embeddings with new 7-dimension scoring
 * Fetches AI matches from edge function, then applies dealbreakers and 7-dimension scoring
 */
export async function findHybridMatches(
  founderId: string,
  founderProfile: FounderProfile,
  threshold: number = 0.70,
  limit: number = 20
): Promise<AIMatchResult[]> {
  // 1. Get AI matches from edge function (secure)
  const aiMatches = await findAIMatches(founderId, threshold, limit);
  
  console.log('[findHybridMatches] AI matches from edge function:', aiMatches.length);

  // 2. Apply dealbreaker filtering and calculate new 7-dimension scores
  const enhancedMatches: AIMatchResult[] = [];

  for (const match of aiMatches) {
    // Convert match to FounderProfileForMatching format
    const matchProfile: FounderProfileForMatching & { id: string } = {
      id: match.id,
      core_skills: match.core_skills || null,
      seeking_skills: match.seeking_skills || null,
      superpower: match.superpower || null,
      weaknesses_blindspots: match.weaknesses_blindspots || null,
      stage: match.stage || null,
      timeline_start: match.timeline_start || null,
      urgency_level: match.urgency_level || null,
      commitment_level: match.commitment_level || null,
      working_style: match.working_style || null,
      idea_description: match.idea_description || null,
      problem_solving: match.problem_solving || null,
      target_customer: match.target_customer || null,
      embedding: match.embedding || null,
      equity_thoughts: match.equity_thoughts || null,
      location_preference: match.location_preference || null,
      background: match.background || null,
      previous_founder: match.previous_founder || null,
      deal_breakers: match.deal_breakers || null,
      non_negotiables: match.non_negotiables || null,
    };

    const founderForMatching: FounderProfileForMatching & { id: string } = {
      id: founderId,
      core_skills: founderProfile.core_skills,
      seeking_skills: founderProfile.seeking_skills,
      superpower: founderProfile.superpower,
      weaknesses_blindspots: founderProfile.weaknesses_blindspots,
      stage: founderProfile.stage,
      timeline_start: founderProfile.timeline_start,
      urgency_level: founderProfile.urgency_level,
      commitment_level: founderProfile.commitment_level,
      working_style: founderProfile.working_style,
      idea_description: founderProfile.idea_description,
      problem_solving: founderProfile.problem_solving,
      target_customer: founderProfile.target_customer,
      embedding: founderProfile.embedding,
      equity_thoughts: founderProfile.equity_thoughts,
      location_preference: founderProfile.location_preference,
      background: founderProfile.background,
      previous_founder: founderProfile.previous_founder,
      deal_breakers: founderProfile.deal_breakers,
      non_negotiables: founderProfile.non_negotiables,
    };

    // Check dealbreakers both directions
    const passesFounderDealbreakers = checkDealbreakers(founderForMatching, matchProfile);
    const passesMatchDealbreakers = checkDealbreakers(matchProfile, founderForMatching);

    if (!passesFounderDealbreakers || !passesMatchDealbreakers) {
      console.log('[findHybridMatches] Match filtered by dealbreaker:', match.name || match.id);
      continue; // Skip this match - dealbreaker failed
    }

    // Calculate new 7-dimension score (threshold 0 to see all matches)
    const matchResult = calculateMatchScore(founderForMatching, matchProfile, 0);
    console.log('[findHybridMatches] Calculated match score for:', match.name || match.id, matchResult?.total_score);

    if (matchResult) {
      enhancedMatches.push({
        ...match,
        matchResult,
      });
    } else {
      console.warn('[findHybridMatches] matchResult was null for:', match.name || match.id);
    }
  }

  console.log('[findHybridMatches] Enhanced matches after filtering:', enhancedMatches.length);

  // 3. Re-rank using weighted combination (60% AI similarity, 40% 7-dimension score)
  const reranked = enhancedMatches
    .map(match => ({
      ...match,
      combinedScore: (match.similarity * 0.6) + ((match.matchResult?.total_score || 0) / 100 * 0.4),
    }))
    .sort((a, b) => (b.combinedScore || 0) - (a.combinedScore || 0))
    .slice(0, 10);

  console.log('[findHybridMatches] Final reranked matches:', reranked.length);
  
  return reranked;
}

/**
 * Calculate matches for a founder against a list of candidates
 * Uses new 7-dimension scoring with dealbreaker filtering
 */
export function calculateAllMatchesForFounder(
  founder: FounderProfile,
  candidates: FounderProfile[]
): Array<{ candidate: FounderProfile; matchResult: MatchResult }> {
  const results: Array<{ candidate: FounderProfile; matchResult: MatchResult }> = [];

  const founderForMatching: FounderProfileForMatching & { id: string } = {
    id: founder.id,
    core_skills: founder.core_skills,
    seeking_skills: founder.seeking_skills,
    superpower: founder.superpower,
    weaknesses_blindspots: founder.weaknesses_blindspots,
    stage: founder.stage,
    timeline_start: founder.timeline_start,
    urgency_level: founder.urgency_level,
    commitment_level: founder.commitment_level,
    working_style: founder.working_style,
    idea_description: founder.idea_description,
    problem_solving: founder.problem_solving,
    target_customer: founder.target_customer,
    embedding: founder.embedding,
    equity_thoughts: founder.equity_thoughts,
    location_preference: founder.location_preference,
    background: founder.background,
    previous_founder: founder.previous_founder,
    deal_breakers: founder.deal_breakers,
    non_negotiables: founder.non_negotiables,
  };

  for (const candidate of candidates) {
    if (candidate.id === founder.id) continue;

    const candidateForMatching: FounderProfileForMatching & { id: string } = {
      id: candidate.id,
      core_skills: candidate.core_skills,
      seeking_skills: candidate.seeking_skills,
      superpower: candidate.superpower,
      weaknesses_blindspots: candidate.weaknesses_blindspots,
      stage: candidate.stage,
      timeline_start: candidate.timeline_start,
      urgency_level: candidate.urgency_level,
      commitment_level: candidate.commitment_level,
      working_style: candidate.working_style,
      idea_description: candidate.idea_description,
      problem_solving: candidate.problem_solving,
      target_customer: candidate.target_customer,
      embedding: candidate.embedding,
      equity_thoughts: candidate.equity_thoughts,
      location_preference: candidate.location_preference,
      background: candidate.background,
      previous_founder: candidate.previous_founder,
      deal_breakers: candidate.deal_breakers,
      non_negotiables: candidate.non_negotiables,
    };

    // Check dealbreakers both directions
    const passesFounderDealbreakers = checkDealbreakers(founderForMatching, candidateForMatching);
    const passesCandidateDealbreakers = checkDealbreakers(candidateForMatching, founderForMatching);

    if (!passesFounderDealbreakers || !passesCandidateDealbreakers) {
      continue;
    }

    const matchResult = calculateMatchScore(founderForMatching, candidateForMatching);
    if (matchResult) {
      results.push({ candidate, matchResult });
    }
  }

  return results.sort((a, b) => b.matchResult.total_score - a.matchResult.total_score);
}

export function getScoreTier(score: number): 'excellent' | 'good' | 'fair' | 'low' {
  if (score >= 75) return 'excellent';
  if (score >= 60) return 'good';
  if (score >= 45) return 'fair';
  return 'low';
}
