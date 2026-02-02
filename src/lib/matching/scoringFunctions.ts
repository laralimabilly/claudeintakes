// lib/matching/scoringFunctions.ts
// Complete implementation for 7-dimension matching using existing database fields

import type { FounderProfileForMatching } from '@/types/founder';

// Re-export for convenience
export type { FounderProfileForMatching };

// Use FounderProfileForMatching for scoring functions
type FounderProfile = FounderProfileForMatching;

// ============================================================================
// 1. Skills Complementarity (27%)
// ============================================================================
export function scoreSkills(a: FounderProfile, b: FounderProfile): number {
  const aSkills = new Set(a.core_skills || []);
  const bSkills = new Set(b.core_skills || []);
  const aSeeking = new Set(a.seeking_skills || []);
  const bSeeking = new Set(b.seeking_skills || []);

  // How well does A cover B's needs?
  const aCoversB = bSeeking.size > 0 
    ? Array.from(aSkills).filter(s => bSeeking.has(s)).length / bSeeking.size 
    : 0;

  // How well does B cover A's needs?
  const bCoversA = aSeeking.size > 0
    ? Array.from(bSkills).filter(s => aSeeking.has(s)).length / aSeeking.size
    : 0;

  // Average coverage
  const coverage = (aCoversB + bCoversA) / 2;

  // Penalty for too much skill overlap (we want complementarity)
  const allSkills = new Set([...aSkills, ...bSkills]);
  const overlap = allSkills.size > 0
    ? Array.from(aSkills).filter(s => bSkills.has(s)).length / allSkills.size
    : 0;
  
  const overlapPenalty = overlap * 0.4; // Reduce by up to 40%

  const score = (coverage * 100) * (1 - overlapPenalty);
  return Math.min(100, Math.max(0, score));
}

// ============================================================================
// 2. Stage & Timeline Alignment (23%)
// ============================================================================
export function scoreStage(a: FounderProfile, b: FounderProfile): number {
  // Stage alignment scoring
  const normalizeStage = (stage: string): string => {
    const s = stage?.toLowerCase() || 'idea';
    if (s.includes('idea') || s.includes('validation')) return 'idea';
    if (s.includes('mvp') || s.includes('building')) return 'mvp';
    if (s.includes('launch')) return 'launched';
    if (s.includes('scal')) return 'scaling';
    return 'idea';
  };

  const stageScores: Record<string, Record<string, number>> = {
    'idea': { 'idea': 100, 'mvp': 80, 'launched': 50, 'scaling': 30 },
    'mvp': { 'idea': 80, 'mvp': 100, 'launched': 80, 'scaling': 50 },
    'launched': { 'idea': 50, 'mvp': 80, 'launched': 100, 'scaling': 80 },
    'scaling': { 'idea': 30, 'mvp': 50, 'launched': 80, 'scaling': 100 }
  };

  const aStage = normalizeStage(a.stage);
  const bStage = normalizeStage(b.stage);
  const stageScore = stageScores[aStage]?.[bStage] || 50;

  // Timeline/urgency alignment
  const normalizeUrgency = (urgency: string): string => {
    const u = urgency?.toLowerCase() || 'flexible';
    if (u.includes('asap') || u.includes('immediately') || u.includes('urgent')) return 'asap';
    if (u.includes('soon') || u.includes('month')) return 'soon';
    return 'flexible';
  };

  const urgencyScores: Record<string, Record<string, number>> = {
    'asap': { 'asap': 100, 'soon': 80, 'flexible': 50 },
    'soon': { 'asap': 80, 'soon': 100, 'flexible': 80 },
    'flexible': { 'asap': 50, 'soon': 80, 'flexible': 100 }
  };

  const aUrgency = normalizeUrgency(a.urgency_level);
  const bUrgency = normalizeUrgency(b.urgency_level);
  const urgencyScore = urgencyScores[aUrgency]?.[bUrgency] || 60;

  // Commitment alignment
  let commitmentScore = 70;
  const aCommit = a.commitment_level?.toLowerCase() || '';
  const bCommit = b.commitment_level?.toLowerCase() || '';
  
  if (aCommit === bCommit) {
    commitmentScore = 100;
  } else if (aCommit.includes('full') || bCommit.includes('full')) {
    commitmentScore = 50; // One full-time, one not
  }

  return (stageScore + urgencyScore + commitmentScore) / 3;
}

// ============================================================================
// 3. Communication & Conflict Style (19%)
// ============================================================================
export function scoreCommunication(a: FounderProfile, b: FounderProfile): number {
  const extractCommStyle = (workingStyle: string): string => {
    const ws = workingStyle?.toLowerCase() || '';
    
    if (ws.includes('direct') || ws.includes('blunt') || ws.includes('straightforward')) {
      return 'direct';
    }
    if (ws.includes('gentle') || ws.includes('careful') || ws.includes('thoughtful')) {
      return 'gentle';
    }
    return 'diplomatic'; // default middle ground
  };

  const commScores: Record<string, Record<string, number>> = {
    'direct': { 'direct': 100, 'diplomatic': 70, 'gentle': 40 },
    'diplomatic': { 'direct': 70, 'diplomatic': 100, 'gentle': 80 },
    'gentle': { 'direct': 40, 'diplomatic': 80, 'gentle': 100 }
  };

  const aStyle = extractCommStyle(a.working_style);
  const bStyle = extractCommStyle(b.working_style);

  return commScores[aStyle]?.[bStyle] || 60;
}

// ============================================================================
// 4. Vision & Problem Space Alignment (15%)
// ============================================================================
export function scoreVision(a: FounderProfile, b: FounderProfile): number {
  // Try to use embeddings first (semantic similarity)
  // Embeddings can be number[] or string (JSON), parse if needed
  const parseEmbedding = (emb: number[] | string | null | undefined): number[] | null => {
    if (!emb) return null;
    if (Array.isArray(emb)) return emb;
    try {
      return JSON.parse(emb);
    } catch {
      return null;
    }
  };

  const aEmb = parseEmbedding(a.embedding);
  const bEmb = parseEmbedding(b.embedding);

  if (aEmb && bEmb && aEmb.length === bEmb.length) {
    const similarity = cosineSimilarity(aEmb, bEmb);
    return similarity * 100; // Convert 0-1 to 0-100
  }

  // Fallback: Text-based keyword overlap
  const aText = `${a.idea_description || ''} ${a.problem_solving || ''} ${a.target_customer || ''}`.toLowerCase();
  const bText = `${b.idea_description || ''} ${b.problem_solving || ''} ${b.target_customer || ''}`.toLowerCase();

  // Extract meaningful words (> 4 characters)
  const aWords = new Set(aText.split(/\s+/).filter(w => w.length > 4));
  const bWords = new Set(bText.split(/\s+/).filter(w => w.length > 4));

  if (aWords.size === 0 || bWords.size === 0) return 50;

  // Jaccard similarity
  const intersection = Array.from(aWords).filter(w => bWords.has(w)).length;
  const union = new Set([...aWords, ...bWords]).size;

  return (intersection / union) * 100;
}

// Helper: Cosine similarity for embeddings
function cosineSimilarity(a: number[], b: number[]): number {
  if (!a || !b || a.length !== b.length) return 0;
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// ============================================================================
// 5. Values & Working Style (11%)
// ============================================================================
export function scoreValues(a: FounderProfile, b: FounderProfile): number {
  // Extract speed preference
  const extractSpeed = (profile: FounderProfile): string => {
    const text = `${profile.urgency_level || ''} ${profile.working_style || ''}`.toLowerCase();
    
    if (text.includes('fast') || text.includes('quick') || text.includes('agile')) {
      return 'fast';
    }
    if (text.includes('slow') || text.includes('deliberate') || text.includes('thorough')) {
      return 'slow';
    }
    return 'medium';
  };

  // Extract risk tolerance
  const extractRiskTolerance = (profile: FounderProfile): string => {
    const text = `${profile.working_style || ''} ${profile.equity_thoughts || ''}`.toLowerCase();
    
    if (text.includes('aggressive') || text.includes('high risk') || text.includes('bold')) {
      return 'high';
    }
    if (text.includes('conservative') || text.includes('careful') || text.includes('low risk')) {
      return 'low';
    }
    return 'medium';
  };

  const speedScores: Record<string, Record<string, number>> = {
    'fast': { 'fast': 100, 'medium': 70, 'slow': 40 },
    'medium': { 'fast': 70, 'medium': 100, 'slow': 70 },
    'slow': { 'fast': 40, 'medium': 70, 'slow': 100 }
  };

  const riskScores: Record<string, Record<string, number>> = {
    'high': { 'high': 100, 'medium': 75, 'low': 40 },
    'medium': { 'high': 75, 'medium': 100, 'low': 75 },
    'low': { 'high': 40, 'medium': 75, 'low': 100 }
  };

  const aSpeed = extractSpeed(a);
  const bSpeed = extractSpeed(b);
  const speedScore = speedScores[aSpeed]?.[bSpeed] || 60;

  const aRisk = extractRiskTolerance(a);
  const bRisk = extractRiskTolerance(b);
  const riskScore = riskScores[aRisk]?.[bRisk] || 60;

  return (speedScore + riskScore) / 2;
}

// ============================================================================
// 6. Geographic & Logistics (3%)
// ============================================================================
export function scoreGeo(a: FounderProfile, b: FounderProfile): number {
  const parseLocation = (locationPref: string) => {
    const lp = locationPref?.toLowerCase() || '';
    
    return {
      city: extractCity(lp),
      remoteOk: lp.includes('remote') || lp.includes('anywhere'),
      willingToRelocate: lp.includes('relocate') || lp.includes('flexible')
    };
  };

  const extractCity = (text: string): string => {
    // Extract city names from common formats
    const cityMatch = text.match(/(?:in|from|based in)\s+([a-z\s]+?)(?:,|$|\s+or\s+)/i);
    return cityMatch?.[1]?.trim() || '';
  };

  const aLoc = parseLocation(a.location_preference);
  const bLoc = parseLocation(b.location_preference);

  // Same city = 100
  if (aLoc.city && bLoc.city && aLoc.city === bLoc.city) {
    return 100;
  }

  // Both remote-ok = 80
  if (aLoc.remoteOk && bLoc.remoteOk) {
    return 80;
  }

  // One willing to relocate = 60
  if (aLoc.willingToRelocate || bLoc.willingToRelocate) {
    return 60;
  }

  // Different cities, no flexibility = 30
  return 30;
}

// ============================================================================
// 7. Unfair Advantage Synergy (2%)
// ============================================================================
export function scoreAdvantages(a: FounderProfile, b: FounderProfile): number {
  const extractAdvantages = (profile: FounderProfile): Set<string> => {
    const advantages = new Set<string>();
    
    const text = `${profile.background || ''} ${profile.superpower || ''}`.toLowerCase();
    
    // Domain expertise
    if (text.includes('expert') || text.includes('years in')) {
      advantages.add('domain_expertise');
    }
    
    // Network
    if (text.includes('network') || text.includes('connections') || text.includes('contacts')) {
      advantages.add('network');
    }
    
    // Technical depth
    if (text.includes('engineer') || text.includes('technical') || text.includes('developer')) {
      advantages.add('technical');
    }
    
    // Business/sales
    if (text.includes('sales') || text.includes('business') || text.includes('revenue')) {
      advantages.add('business');
    }
    
    // Founder experience
    if (profile.previous_founder) {
      advantages.add('founder_experience');
    }
    
    return advantages;
  };

  const aAdvantages = extractAdvantages(a);
  const bAdvantages = extractAdvantages(b);

  // If both have advantages
  if (aAdvantages.size > 0 && bAdvantages.size > 0) {
    const overlap = Array.from(aAdvantages).filter(adv => bAdvantages.has(adv)).length;
    
    if (overlap === 0) {
      return 80; // Completely different = great synergy
    } else if (overlap === 1) {
      return 65; // Some overlap = okay
    } else {
      return 50; // Too much overlap = less synergy
    }
  }

  // If only one has advantages
  if (aAdvantages.size > 0 || bAdvantages.size > 0) {
    return 60;
  }

  return 50; // Neither has clear advantages
}
