// lib/matching/communicationHelpers.ts
// Helper functions and constants for scoreCommunication

import type { FounderProfileForMatching } from '@/types/founder';

// ---------------------------------------------------------------------------
// Keyword lists for each sub-dimension
// ---------------------------------------------------------------------------

/** Direct ↔ Gentle spectrum */
export const DIRECTNESS_DIRECT = [
  'direct', 'blunt', 'straightforward', 'no-nonsense', 'no nonsense',
  'candid', 'frank', 'tell it like it is', 'honest feedback',
  'radical candor', 'transparent', 'upfront', 'cut to the chase',
  'no sugarcoating', 'tough love',
];

export const DIRECTNESS_GENTLE = [
  'gentle', 'careful', 'thoughtful', 'diplomatic', 'empathetic',
  'considerate', 'supportive', 'encouraging', 'patient',
  'non-confrontational', 'avoid conflict', 'harmony', 'consensus',
  'sensitive', 'tactful',
];

/** Structured ↔ Flexible spectrum */
export const STRUCTURE_STRUCTURED = [
  'structured', 'organized', 'process', 'systematic', 'methodical',
  'documented', 'planning', 'roadmap', 'sprint', 'standup', 'stand-up',
  'meetings', 'agenda', 'clear roles', 'defined', 'rigorous',
  'disciplined', 'framework',
];

export const STRUCTURE_FLEXIBLE = [
  'flexible', 'scrappy', 'ad hoc', 'ad-hoc', 'informal', 'loose',
  'unstructured', 'go with the flow', 'figure it out', 'startup mode',
  'move fast', 'break things', 'iterate', 'pivot', 'experiment',
  'chaos', 'adaptive',
];

/** Async/Independent ↔ Sync/Collaborative spectrum */
export const COLLAB_ASYNC = [
  'async', 'asynchronous', 'independent', 'autonomous', 'solo',
  'self-directed', 'heads down', 'deep work', 'remote', 'written',
  'documentation', 'slack', 'email', 'own pace', 'minimal meetings',
  'fewer meetings',
];

export const COLLAB_SYNC = [
  'sync', 'synchronous', 'collaborative', 'pair', 'pairing',
  'co-working', 'in-person', 'face to face', 'face-to-face',
  'real-time', 'real time', 'whiteboard', 'brainstorm', 'together',
  'team', 'daily standup', 'huddle', 'call', 'video',
];

// ---------------------------------------------------------------------------
// Spectrum placement
// ---------------------------------------------------------------------------

export type SpectrumPosition = 'high' | 'mid-high' | 'neutral' | 'mid-low' | 'low';

/**
 * Check if a keyword appears in text as a whole phrase (not as a substring
 * of another word). For multi-word keywords, uses simple includes().
 * For single short words (≤6 chars), uses word boundary matching to avoid
 * false positives like "frank" matching inside "frankenstein".
 */
export function keywordMatch(text: string, keyword: string): boolean {
  // Multi-word phrases: substring match is safe enough
  if (keyword.includes(' ') || keyword.includes('-')) {
    return text.includes(keyword);
  }

  // Short single words: require word boundary
  if (keyword.length <= 6) {
    const regex = new RegExp(`\\b${keyword}\\b`);
    return regex.test(text);
  }

  // Longer single words: substring match is fine
  return text.includes(keyword);
}

/**
 * Place a founder on a spectrum based on keyword hits.
 *
 * "high" = strong match to positive pole keywords
 * "low"  = strong match to negative pole keywords
 * "neutral" = no clear signal either way
 *
 * Scans multiple text fields for better signal extraction.
 */
export function placeOnSpectrum(
  profile: FounderProfileForMatching,
  highKeywords: string[],
  lowKeywords: string[],
): SpectrumPosition {
  // Build a combined text from all fields that might contain communication clues
  const text = [
    profile.working_style || '',
    profile.commitment_level || '',
    profile.equity_thoughts || '',
    // non_negotiables and deal_breakers often reveal communication preferences
    ...(profile.non_negotiables || []),
    ...(profile.deal_breakers || []),
  ].join(' ').toLowerCase();

  if (!text.trim()) return 'neutral';

  let highHits = 0;
  let lowHits = 0;

  for (const kw of highKeywords) {
    if (keywordMatch(text, kw)) highHits++;
  }
  for (const kw of lowKeywords) {
    if (keywordMatch(text, kw)) lowHits++;
  }

  const total = highHits + lowHits;

  if (total === 0) return 'neutral';

  const ratio = highHits / total;

  if (ratio >= 0.8) return 'high';
  if (ratio >= 0.6) return 'mid-high';
  if (ratio <= 0.2) return 'low';
  if (ratio <= 0.4) return 'mid-low';
  return 'neutral';
}

// ---------------------------------------------------------------------------
// Compatibility matrix
// ---------------------------------------------------------------------------

/**
 * Score how compatible two spectrum positions are.
 * Same position = best match. Opposite poles = worst.
 * Middle positions have graduated scores.
 *
 * Note on the "neutral" scores:
 * When one or both founders land on "neutral" (no clear signal), we score
 * 65–80 rather than 100. This is intentional:
 *   - 100 would mean "perfect match" which we can't claim with no data
 *   - 50 would be too punitive for missing data
 *   - 65-80 is a reasonable "probably fine, but we don't know for sure"
 */
export const SPECTRUM_SCORES: Record<SpectrumPosition, Record<SpectrumPosition, number>> = {
  'high':     { 'high': 100, 'mid-high': 85, 'neutral': 65, 'mid-low': 45, 'low': 30 },
  'mid-high': { 'high': 85,  'mid-high': 100, 'neutral': 80, 'mid-low': 60, 'low': 40 },
  'neutral':  { 'high': 65,  'mid-high': 80, 'neutral': 75, 'mid-low': 80, 'low': 65 },
  'mid-low':  { 'high': 45,  'mid-high': 60, 'neutral': 80, 'mid-low': 100, 'low': 85 },
  'low':      { 'high': 30,  'mid-high': 40, 'neutral': 65, 'mid-low': 85, 'low': 100 },
};
