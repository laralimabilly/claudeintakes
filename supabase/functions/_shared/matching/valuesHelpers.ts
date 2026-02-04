// _shared/matching/valuesHelpers.ts
// Values & Working Style helpers for edge functions

import type { FounderProfileForMatching } from './types.ts';

// ---------------------------------------------------------------------------
// Value dimension keyword groups
// ---------------------------------------------------------------------------

export const PACE_KEYWORDS = {
  fast: [
    'move fast', 'rapid', 'quick', 'agile', 'sprint-based', 'hustle',
    'bias for action', 'ship fast', 'iterate quickly', 'velocity',
    'aggressive timeline', 'move quickly', 'fast-paced', 'high tempo',
    'ship it', 'get it out',
  ],
  deliberate: [
    'deliberate', 'careful', 'thoughtful', 'methodical', 'thorough',
    'measured', 'strategic', 'planned', 'systematic', 'quality over speed',
    'take time', 'do it right', 'no rush', 'marathon not sprint',
    'sustainable pace', 'long-term', 'patient',
  ],
};

export const RISK_KEYWORDS = {
  high: [
    'high risk', 'bold', 'ambitious', 'moonshot', 'swing big', 'all in',
    'big bet', 'aggressive growth', 'take chances', 'disruptive', '10x',
    'go big or go home', 'risk taker', 'venture scale', 'big swings',
  ],
  low: [
    'conservative', 'cautious', 'safe', 'stable', 'steady', 'sustainable growth',
    'bootstrap', 'profitable', 'low burn', 'capital efficient', 'risk averse',
    'measured risk', 'calculated', 'pragmatic', 'sensible',
  ],
};

export const DECISION_KEYWORDS = {
  data: [
    'data-driven', 'data driven', 'metrics', 'analytics', 'evidence',
    'numbers', 'quantitative', 'measure', 'ab test', 'a/b test',
    'experiment', 'hypothesis', 'validate', 'research', 'kpis',
  ],
  intuition: [
    'intuition', 'gut', 'instinct', 'vision-driven', 'feel', 'creative',
    'artistic', 'taste', 'conviction', 'belief', 'qualitative', 'my gut',
  ],
};

export const AUTONOMY_KEYWORDS = {
  autonomous: [
    'autonomous', 'independent', 'self-directed', 'ownership',
    'trust each other', 'async', 'asynchronous', 'remote-first', 'flexible hours',
    'work alone', 'solo', 'hands-off', 'freedom', 'self-starter',
  ],
  collaborative: [
    'collaborative', 'team-first', 'together', 'pair programming', 'sync',
    'synchronous', 'standup', 'alignment', 'consensus', 'collective', 'co-create',
    'in-person', 'office', 'face to face', 'hands-on', 'close collaboration',
  ],
};

export const WORKLIFE_KEYWORDS = {
  intense: [
    'intense', '24/7', 'all-in', 'whatever it takes', 'grind',
    'no work-life balance', 'startup life', 'sacrifice',
    'nights and weekends', 'obsessed', 'hustle culture', 'always on',
  ],
  balanced: [
    'work-life balance', 'sustainable', 'healthy pace', 'boundaries', 'family time',
    'marathon not sprint', 'long term thinking', 'avoid burnout', 'wellness',
    'mental health', 'reasonable hours', 'sustainable pace',
  ],
};

// ---------------------------------------------------------------------------
// Equity philosophy patterns
// ---------------------------------------------------------------------------

export const EQUITY_PATTERNS = {
  equal: [
    'equal', '50/50', 'fifty fifty', 'split evenly', 'same equity',
    'fair split', 'even split',
  ],
  contribution_based: [
    'contribution', 'merit', 'based on work', 'earn', 'vest',
    'performance', 'value added', 'proportional',
  ],
  flexible: [
    'flexible', 'open', 'negotiate', 'discuss', 'depends', 'case by case',
    'figure it out', 'talk about it',
  ],
  clear_majority: [
    'majority', 'control', 'ceo gets more', 'founder gets more',
    'idea person', 'my idea',
  ],
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ValueScore = 'high' | 'medium' | 'low' | 'unknown';
export type EquityPhilosophy = 'equal' | 'contribution_based' | 'flexible' | 'clear_majority' | 'unknown';

export interface ValueProfile {
  pace: ValueScore;          // fast vs deliberate
  risk: ValueScore;          // high vs low
  decision: ValueScore;      // data vs intuition (high = data-driven)
  autonomy: ValueScore;      // high = autonomous, low = collaborative
  worklife: ValueScore;      // high = intense, low = balanced
  equity: EquityPhilosophy;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Count keyword matches in text.
 */
export function countMatches(text: string, keywords: string[]): number {
  return keywords.filter(kw => text.includes(kw)).length;
}

/**
 * Detect where text falls on a dimension.
 * Returns 'high' if more high keywords, 'low' if more low keywords,
 * 'medium' if mixed, 'unknown' if no signal.
 */
export function detectDimension(
  text: string,
  highKeywords: string[],
  lowKeywords: string[],
): ValueScore {
  const highCount = countMatches(text, highKeywords);
  const lowCount = countMatches(text, lowKeywords);

  if (highCount === 0 && lowCount === 0) return 'unknown';
  if (highCount > lowCount * 1.5) return 'high';
  if (lowCount > highCount * 1.5) return 'low';
  return 'medium';
}

/**
 * Detect equity philosophy from equity_thoughts.
 */
export function detectEquityPhilosophy(text: string): EquityPhilosophy {
  const scores: Record<EquityPhilosophy, number> = {
    equal: countMatches(text, EQUITY_PATTERNS.equal),
    contribution_based: countMatches(text, EQUITY_PATTERNS.contribution_based),
    flexible: countMatches(text, EQUITY_PATTERNS.flexible),
    clear_majority: countMatches(text, EQUITY_PATTERNS.clear_majority),
    unknown: 0,
  };

  const max = Math.max(...Object.values(scores));
  if (max === 0) return 'unknown';

  for (const [key, value] of Object.entries(scores)) {
    if (value === max) return key as EquityPhilosophy;
  }
  return 'unknown';
}

/**
 * Extract value dimensions from working_style and equity_thoughts.
 */
export function extractValueProfile(p: FounderProfileForMatching): ValueProfile {
  const workStyle = (p.working_style || '').toLowerCase();
  const equityText = (p.equity_thoughts || '').toLowerCase();
  const combined = `${workStyle} ${equityText}`;

  return {
    pace: detectDimension(combined, PACE_KEYWORDS.fast, PACE_KEYWORDS.deliberate),
    risk: detectDimension(combined, RISK_KEYWORDS.high, RISK_KEYWORDS.low),
    decision: detectDimension(combined, DECISION_KEYWORDS.data, DECISION_KEYWORDS.intuition),
    autonomy: detectDimension(combined, AUTONOMY_KEYWORDS.autonomous, AUTONOMY_KEYWORDS.collaborative),
    worklife: detectDimension(combined, WORKLIFE_KEYWORDS.intense, WORKLIFE_KEYWORDS.balanced),
    equity: detectEquityPhilosophy(equityText),
  };
}

/**
 * Score compatibility on a single dimension.
 * Same = 100, adjacent = 70, opposite = 40, one unknown = 60.
 */
export function scoreDimension(a: ValueScore, b: ValueScore): number {
  if (a === 'unknown' || b === 'unknown') return 60;
  if (a === b) return 100;
  if (a === 'medium' || b === 'medium') return 75; // Medium is compatible with either
  // Opposite (high vs low)
  return 40;
}

/**
 * Score equity philosophy compatibility.
 */
export function scoreEquity(a: EquityPhilosophy, b: EquityPhilosophy): number {
  if (a === 'unknown' || b === 'unknown') return 60;
  if (a === b) return 100;

  // Flexible is compatible with everything
  if (a === 'flexible' || b === 'flexible') return 85;

  // Equal and contribution_based can work together
  if (
    (a === 'equal' && b === 'contribution_based') ||
    (a === 'contribution_based' && b === 'equal')
  ) {
    return 65;
  }

  // Clear_majority conflicts with equal
  if (
    (a === 'clear_majority' && b === 'equal') ||
    (a === 'equal' && b === 'clear_majority')
  ) {
    return 30;
  }

  // Default moderate compatibility
  return 50;
}
