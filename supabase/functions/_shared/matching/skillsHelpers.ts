// _shared/matching/skillsHelpers.ts
// Fuzzy skill matching helpers for the scoreSkills function (Deno edge functions)

import type { FounderProfileForMatching } from './types.ts';

// ---------------------------------------------------------------------------
// Synonym groups — skills that should be treated as equivalent.
// ---------------------------------------------------------------------------
export const SKILL_SYNONYM_GROUPS: string[][] = [
  // Engineering / Development (general)
  [
    'tech', 'technical', 'engineering', 'engineer', 'developer', 'development',
    'code', 'coding', 'software', 'programming', 'full-stack', 'fullstack',
    'full stack', 'backend', 'back-end', 'back end',
  ],
  // Frontend
  [
    'frontend', 'front-end', 'front end', 'react', 'react.js', 'reactjs',
    'vue', 'vue.js', 'vuejs', 'angular', 'svelte', 'next.js', 'nextjs',
    'html', 'css', 'javascript', 'typescript', 'ui development',
  ],
  // Mobile
  [
    'mobile', 'ios', 'android', 'react native', 'flutter', 'swift', 'kotlin',
    'mobile development', 'app development',
  ],
  // Design
  [
    'design', 'designer', 'ux', 'ui', 'ux/ui', 'ui/ux', 'user experience',
    'user interface', 'product design', 'visual design', 'graphic design',
    'web design',
  ],
  // Product
  [
    'product', 'product management', 'pm', 'product manager', 'product owner',
    'product strategy',
  ],
  // Data & AI/ML
  [
    'data', 'data science', 'data engineering', 'data analyst', 'analytics',
    'machine learning', 'ml', 'ai', 'artificial intelligence', 'deep learning',
    'nlp', 'computer vision', 'llm',
  ],
  // Sales & Business Development
  [
    'sales', 'business development', 'bd', 'account management',
    'enterprise sales', 'b2b sales', 'partnerships',
  ],
  // Marketing & Growth
  [
    'marketing', 'growth', 'growth hacking', 'digital marketing',
    'content marketing', 'seo', 'sem', 'acquisition', 'user acquisition',
    'brand', 'branding',
  ],
  // Operations & Strategy
  [
    'ops', 'operations', 'strategy', 'business strategy', 'coo',
    'supply chain', 'logistics',
  ],
  // Finance
  [
    'finance', 'financial', 'accounting', 'cfo', 'fundraising',
    'investor relations', 'financial modeling', 'bookkeeping',
  ],
  // DevOps & Infrastructure
  [
    'devops', 'infrastructure', 'cloud', 'aws', 'gcp', 'azure', 'sre',
    'site reliability', 'ci/cd', 'docker', 'kubernetes',
  ],
  // Blockchain / Web3
  [
    'blockchain', 'web3', 'crypto', 'smart contracts', 'solidity',
    'defi', 'nft',
  ],
  // Legal
  ['legal', 'lawyer', 'compliance', 'regulatory', 'ip', 'intellectual property'],
  // HR / People
  ['hr', 'human resources', 'people', 'recruiting', 'talent', 'people operations'],
];

// ---------------------------------------------------------------------------
// Skills Helpers
// ---------------------------------------------------------------------------

/** Normalize a skill string for comparison. */
export function normalizeSkill(skill: string): string {
  return skill
    .toLowerCase()
    .trim()
    .replace(/[()]/g, '')
    .replace(/\s+/g, ' ');
}

/**
 * Fuzzy similarity between two normalized skill strings.
 *   1.0  = exact match
 *   0.85 = same synonym group
 *   0.7  = one string contains the other
 *   0.0  = no match
 */
export function skillSimilarity(skillA: string, skillB: string): number {
  if (skillA === skillB) return 1.0;
  if (skillA.includes(skillB) || skillB.includes(skillA)) return 0.7;

  for (const group of SKILL_SYNONYM_GROUPS) {
    const aInGroup = group.some(syn => skillA.includes(syn) || syn.includes(skillA));
    const bInGroup = group.some(syn => skillB.includes(syn) || syn.includes(skillB));
    if (aInGroup && bInGroup) return 0.85;
  }
  return 0;
}

/** Best match score for a single "seeking" skill against a list of "has" skills. */
export function bestMatchForSkill(seekingSkill: string, hasSkills: string[]): number {
  let best = 0;
  for (const has of hasSkills) {
    const sim = skillSimilarity(seekingSkill, has);
    if (sim > best) best = sim;
    if (best === 1.0) break;
  }
  return best;
}

/**
 * How well does `hasSkills` cover what `seekingSkills` needs?
 * Returns 0–1 (partial matches via synonyms contribute proportionally).
 */
export function calculateCoverage(
  hasSkills: string[] | null,
  seekingSkills: string[] | null,
): number {
  if (!seekingSkills?.length || !hasSkills?.length) return 0;

  const normHas = hasSkills.map(normalizeSkill);
  const normSeeking = seekingSkills.map(normalizeSkill);

  let total = 0;
  for (const seeking of normSeeking) {
    total += bestMatchForSkill(seeking, normHas);
  }
  return total / normSeeking.length;
}

/**
 * Jaccard-style overlap ratio between two founders' core skills.
 * Two skills "overlap" when similarity ≥ 0.7.
 */
export function calculateOverlap(
  skillsA: string[] | null,
  skillsB: string[] | null,
): number {
  if (!skillsA?.length || !skillsB?.length) return 0;

  const normA = skillsA.map(normalizeSkill);
  const normB = skillsB.map(normalizeSkill);

  let overlapping = 0;
  for (const a of normA) {
    if (bestMatchForSkill(a, normB) >= 0.7) overlapping++;
  }

  const unionSize = normA.length + normB.length - overlapping;
  return unionSize > 0 ? overlapping / unionSize : 0;
}

/**
 * Semantic skill vocabulary overlap (Layer 3).
 * Builds a word bag from all skill-related fields and computes Jaccard similarity.
 */
export function semanticSkillBoost(
  a: FounderProfileForMatching,
  b: FounderProfileForMatching,
): number {
  const buildText = (p: FounderProfileForMatching): string =>
    [
      ...(p.core_skills || []),
      ...(p.seeking_skills || []),
      p.superpower || '',
      ...(p.weaknesses_blindspots || []),
    ].join(' ').toLowerCase();

  const aText = buildText(a);
  const bText = buildText(b);
  if (!aText || !bText) return 0;

  const extractWords = (text: string): Set<string> =>
    new Set(
      text
        .split(/[\s,;/]+/)
        .map(w => w.replace(/[^a-z0-9-]/g, ''))
        .filter(w => w.length >= 3),
    );

  const aWords = extractWords(aText);
  const bWords = extractWords(bText);
  if (aWords.size === 0 || bWords.size === 0) return 0;

  const intersection = Array.from(aWords).filter(w => bWords.has(w)).length;
  const union = new Set([...aWords, ...bWords]).size;
  return union > 0 ? intersection / union : 0;
}

/**
 * Superpower ↔ weakness complementarity.
 * If A's superpower addresses B's weakness (and vice versa), returns 0–1 boost.
 */
export function calculateSuperpowerBoost(
  a: FounderProfileForMatching,
  b: FounderProfileForMatching,
): number {
  let boost = 0;
  let checks = 0;

  // A's superpower vs B's weaknesses
  if (a.superpower && b.weaknesses_blindspots?.length) {
    checks++;
    const normSuperpower = normalizeSkill(a.superpower);
    if (b.weaknesses_blindspots.some(w => skillSimilarity(normSuperpower, normalizeSkill(w)) >= 0.7)) {
      boost += 1;
    }
  }

  // B's superpower vs A's weaknesses
  if (b.superpower && a.weaknesses_blindspots?.length) {
    checks++;
    const normSuperpower = normalizeSkill(b.superpower);
    if (a.weaknesses_blindspots.some(w => skillSimilarity(normSuperpower, normalizeSkill(w)) >= 0.7)) {
      boost += 1;
    }
  }

  return checks > 0 ? boost / checks : 0;
}
