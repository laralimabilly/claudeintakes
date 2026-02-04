// lib/matching/visionHelpers.ts
// Vision & Problem Space Alignment helpers for client-side

import type { FounderProfileForMatching } from '@/types/founder';

// ---------------------------------------------------------------------------
// Industry/Vertical keyword groups
// Founders in the same or adjacent verticals score higher
// ---------------------------------------------------------------------------
export const INDUSTRY_GROUPS: string[][] = [
  // Fintech
  [
    'fintech', 'banking', 'payments', 'lending', 'credit',
    'insurance', 'insurtech', 'wealth management', 'investment', 'trading', 'crypto',
    'blockchain', 'defi', 'neobank', 'financial services',
  ],

  // Healthcare / Biotech
  [
    'healthcare', 'medical', 'biotech', 'pharma', 'clinical',
    'telemedicine', 'telehealth', 'mental health',
    'healthtech', 'medtech', 'diagnostics', 'therapeutics', 'patient care',
  ],

  // E-commerce / Retail
  [
    'ecommerce', 'e-commerce', 'retail', 'shopping', 'marketplace',
    'dtc', 'd2c', 'direct to consumer', 'cpg',
    'subscription box',
  ],

  // SaaS / Enterprise (more specific terms)
  [
    'saas', 'b2b saas', 'enterprise software',
    'workflow automation', 'crm', 'erp', 'hr tech', 'hrtech',
    'sales enablement', 'marketing automation',
  ],

  // Education
  [
    'edtech', 'e-learning', 'online learning', 'training platform',
    'tutoring', 'upskilling', 'bootcamp', 'lms', 'learning management',
  ],

  // AI / ML (specific terms)
  [
    'artificial intelligence', 'machine learning', 'ml platform',
    'llm', 'gpt', 'nlp', 'computer vision', 'deep learning', 'generative ai',
    'ai-powered', 'neural network',
  ],

  // Developer Tools
  [
    'devtools', 'developer tools', 'api platform', 'infrastructure',
    'devops', 'open source', 'sdk', 'developer experience',
    'no-code', 'low-code',
  ],

  // Media / Content
  [
    'media company', 'content platform', 'creator economy', 'video platform',
    'streaming', 'podcast', 'entertainment', 'gaming',
    'social media', 'influencer',
  ],

  // Real Estate / PropTech
  [
    'real estate', 'proptech', 'property management', 'housing',
    'mortgage', 'construction tech', 'commercial real estate',
  ],

  // Logistics / Supply Chain
  [
    'logistics', 'supply chain', 'shipping', 'freight',
    'warehouse', 'fulfillment', 'last mile', 'fleet management',
  ],

  // Climate / Sustainability
  [
    'climate tech', 'cleantech', 'sustainability', 'renewable energy',
    'carbon', 'solar', 'ev', 'electric vehicle', 'green tech',
  ],

  // Food / Agriculture
  [
    'foodtech', 'agtech', 'agriculture', 'farming tech',
    'food delivery', 'meal kit', 'grocery tech',
  ],

  // Legal / Compliance
  [
    'legaltech', 'legal tech', 'compliance', 'regulatory tech',
    'contract management',
  ],

  // HR / Future of Work
  [
    'hr tech', 'hrtech', 'recruiting platform', 'talent platform',
    'remote work', 'future of work', 'payroll',
  ],
];

// ---------------------------------------------------------------------------
// Customer segment keywords
// ---------------------------------------------------------------------------
export const CUSTOMER_SEGMENTS: Record<string, string[]> = {
  smb: ['smb', 'small business', 'small businesses', 'sme', 'local business', 'mom and pop', 'startups', 'early-stage'],
  enterprise: ['enterprise', 'large companies', 'fortune 500', 'corporations', 'large organizations'],
  consumer: ['consumer', 'b2c', 'individual', 'personal', 'everyday people', 'general public', 'users'],
  prosumer: ['prosumer', 'power user', 'professional', 'freelancer', 'creator', 'solopreneur'],
  developer: ['developer', 'engineer', 'technical', 'devs', 'programmers', 'builders'],
  healthcare_providers: ['doctor', 'physician', 'nurse', 'clinic', 'hospital', 'provider', 'practitioner'],
  students: ['student', 'learner', 'university', 'college', 'school'],
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Extract industry verticals from vision text.
 * Uses word boundary matching to avoid false positives.
 */
export function extractIndustries(text: string): Set<string> {
  const lower = text.toLowerCase();
  const found = new Set<string>();

  for (let i = 0; i < INDUSTRY_GROUPS.length; i++) {
    for (const keyword of INDUSTRY_GROUPS[i]) {
      // Use word boundary for short keywords to avoid false positives
      const pattern = keyword.length <= 4
        ? new RegExp(`\\b${escapeRegex(keyword)}\\b`, 'i')
        : new RegExp(escapeRegex(keyword), 'i');
      
      if (pattern.test(lower)) {
        found.add(`industry_${i}`);
        break; // One match per group is enough
      }
    }
  }

  return found;
}

/**
 * Extract customer segments from target_customer and idea text.
 */
export function extractSegments(text: string): Set<string> {
  const lower = text.toLowerCase();
  const found = new Set<string>();

  for (const [segment, keywords] of Object.entries(CUSTOMER_SEGMENTS)) {
    for (const keyword of keywords) {
      if (lower.includes(keyword)) {
        found.add(segment);
        break;
      }
    }
  }

  return found;
}

/**
 * Build vision-focused text from profile.
 */
export function buildVisionText(p: FounderProfileForMatching): string {
  return [
    p.idea_description || '',
    p.problem_solving || '',
    p.target_customer || '',
  ].join(' ').toLowerCase();
}

/**
 * Extract meaningful words from text.
 * Lowered threshold to 2 chars to catch "AI", "B2B", "SaaS", "HR", etc.
 */
export function extractWords(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .split(/[\s,;/()]+/)
      .map(w => w.replace(/[^a-z0-9-]/g, ''))
      .filter(w => w.length >= 2)
  );
}

/**
 * Jaccard similarity between two sets.
 */
export function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  const intersection = Array.from(a).filter(x => b.has(x)).length;
  const union = new Set([...a, ...b]).size;
  return union > 0 ? intersection / union : 0;
}

/**
 * Cosine similarity for embedding vectors.
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;

  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom > 0 ? dot / denom : 0;
}

/**
 * Parse embedding from various formats.
 */
export function parseEmbedding(embedding: number[] | string | null | undefined): number[] | null {
  if (!embedding) return null;

  if (Array.isArray(embedding)) {
    return embedding;
  }

  if (typeof embedding === 'string') {
    try {
      const parsed = JSON.parse(embedding);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      // Not valid JSON
    }
  }

  return null;
}
