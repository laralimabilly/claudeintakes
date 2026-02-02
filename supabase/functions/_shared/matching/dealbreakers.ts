// _shared/matching/dealbreakers.ts
// Dealbreaker filtering logic - hard requirements that must be met

import type { FounderProfileForMatching } from './types.ts';

/**
 * Check if a candidate passes all of a founder's dealbreakers
 * 
 * @param founder - Founder with dealbreakers
 * @param candidate - Candidate to check
 * @returns true if candidate passes all dealbreakers, false otherwise
 */
export function checkDealbreakers(
  founder: FounderProfileForMatching,
  candidate: FounderProfileForMatching
): boolean {
  // Combine deal_breakers and non_negotiables
  const dealbreakers = [
    ...(founder.deal_breakers || []),
    ...(founder.non_negotiables || [])
  ];

  if (dealbreakers.length === 0) {
    return true; // No dealbreakers = automatic pass
  }

  // Check each dealbreaker
  for (const dealbreaker of dealbreakers) {
    if (!checkSingleDealbreaker(dealbreaker, candidate)) {
      return false; // Failed a dealbreaker
    }
  }

  return true; // Passed all dealbreakers
}

/**
 * Check if candidate passes a single dealbreaker
 */
function checkSingleDealbreaker(
  dealbreaker: string,
  candidate: FounderProfileForMatching
): boolean {
  const db = dealbreaker.toLowerCase();

  // Skill requirements
  if (db.includes('must have') || db.includes('need') || db.includes('require')) {
    return checkSkillRequirement(db, candidate);
  }

  // Commitment requirements
  if (db.includes('full-time') || db.includes('full time')) {
    return checkCommitmentRequirement(candidate);
  }

  // Location requirements
  if (db.includes('local') || db.includes('in-person') || db.includes('same city')) {
    return checkLocationRequirement(db, candidate);
  }

  // Domain requirements
  if (db.includes('experience in') || db.includes('background in') || db.includes('domain')) {
    return checkDomainRequirement(db, candidate);
  }

  // If we can't classify the dealbreaker, be lenient and pass
  return true;
}

/**
 * Check skill requirements
 */
function checkSkillRequirement(dealbreaker: string, candidate: FounderProfileForMatching): boolean {
  const requiredSkills = extractSkills(dealbreaker);
  const candidateSkills = candidate.core_skills || [];
  
  // If no skills extracted, be lenient
  if (requiredSkills.length === 0) {
    return true;
  }
  
  // Candidate must have at least one of the required skills
  return requiredSkills.some(skill => 
    candidateSkills.some(cs => cs.toLowerCase().includes(skill))
  );
}

/**
 * Check commitment requirements
 */
function checkCommitmentRequirement(candidate: FounderProfileForMatching): boolean {
  const commitment = candidate.commitment_level?.toLowerCase() || '';
  return commitment.includes('full');
}

/**
 * Check location requirements
 */
function checkLocationRequirement(dealbreaker: string, candidate: FounderProfileForMatching): boolean {
  const candidateLoc = candidate.location_preference?.toLowerCase() || '';
  
  // If candidate is remote, they pass location requirements
  if (candidateLoc.includes('remote') && !candidateLoc.includes('no remote')) {
    return true;
  }

  // Extract required city from dealbreaker
  const requiredCity = extractCity(dealbreaker);
  if (requiredCity) {
    const candidateCity = extractCity(candidateLoc);
    return candidateCity === requiredCity;
  }

  // If we can't determine, be lenient
  return true;
}

/**
 * Check domain requirements
 */
function checkDomainRequirement(dealbreaker: string, candidate: FounderProfileForMatching): boolean {
  const requiredDomains = extractDomains(dealbreaker);
  
  // If no domains extracted, be lenient
  if (requiredDomains.length === 0) {
    return true;
  }
  
  const candidateText = `
    ${candidate.background || ''} 
    ${candidate.idea_description || ''} 
    ${candidate.superpower || ''}
  `.toLowerCase();
  
  // Candidate must have at least one domain keyword
  return requiredDomains.some(domain => candidateText.includes(domain));
}

/**
 * Extract skill keywords from text
 */
export function extractSkills(text: string): string[] {
  const commonSkills = [
    'engineer', 'engineering', 'developer', 'development',
    'design', 'designer', 'product',
    'marketing', 'growth', 'sales',
    'technical', 'business', 'finance',
    'operations', 'ops', 'data',
    'machine learning', 'ml', 'ai'
  ];

  return commonSkills.filter(skill => text.includes(skill));
}

/**
 * Extract domain keywords from text
 */
function extractDomains(text: string): string[] {
  const commonDomains = [
    'healthcare', 'health', 'medical',
    'fintech', 'finance', 'banking',
    'saas', 'b2b', 'enterprise',
    'consumer', 'marketplace', 'ecommerce',
    'crypto', 'blockchain', 'web3',
    'ai', 'machine learning', 'data',
    'education', 'edtech',
    'climate', 'sustainability'
  ];

  return commonDomains.filter(domain => text.includes(domain));
}

/**
 * Extract city name from text
 */
function extractCity(text: string): string {
  const patterns = [
    /(?:in|from|based in)\s+([a-z\s]+?)(?:,|$|\s+or\s+)/i,
    /([a-z\s]+?)\s+area/i,
    /(san francisco|sf|new york|nyc|london|berlin|austin|seattle|boston|la|los angeles)/i
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return match[1].trim().toLowerCase();
    }
  }

  return '';
}
