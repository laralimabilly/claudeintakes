import type { Tables } from "@/integrations/supabase/types";

type FounderProfile = Tables<"founder_profiles">;

export interface MatchScore {
  total: number; // 0-100
  breakdown: {
    skillsMatch: number;    // 0-40 points
    locationFit: number;    // 0-25 points
    timelineFit: number;    // 0-20 points
    workStyleFit: number;   // 0-15 points
  };
  highlights: string[];
  concerns: string[];
}

/**
 * Calculates a compatibility score between two founder profiles.
 * Higher scores indicate better potential matches.
 */
export function calculateMatchScore(
  founderA: FounderProfile,
  founderB: FounderProfile
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

/**
 * Skills matching: Does A have what B seeks, and vice versa?
 * Max 40 points (20 per direction)
 */
function calculateSkillsScore(a: FounderProfile, b: FounderProfile): number {
  let score = 0;

  // A has skills B is seeking
  const aSkillsForB = countSkillMatches(a.core_skills, b.seeking_skills);
  // B has skills A is seeking
  const bSkillsForA = countSkillMatches(b.core_skills, a.seeking_skills);

  // Up to 20 points per direction
  score += Math.min(aSkillsForB * 10, 20);
  score += Math.min(bSkillsForA * 10, 20);

  return score;
}

function countSkillMatches(hasSkills: string[] | null, seekingSkills: string[] | null): number {
  if (!hasSkills || !seekingSkills) return 0;
  
  const normalizedHas = hasSkills.map(s => normalizeSkill(s));
  const normalizedSeek = seekingSkills.map(s => normalizeSkill(s));
  
  let matches = 0;
  for (const seek of normalizedSeek) {
    if (normalizedHas.some(has => skillsRelated(has, seek))) {
      matches++;
    }
  }
  return matches;
}

function normalizeSkill(skill: string): string {
  return skill.toLowerCase().trim();
}

function skillsRelated(skillA: string, skillB: string): boolean {
  // Exact match
  if (skillA === skillB) return true;
  
  // Partial match
  if (skillA.includes(skillB) || skillB.includes(skillA)) return true;
  
  // Common synonyms
  const synonymGroups = [
    ["tech", "technical", "engineering", "developer", "code", "coding", "software"],
    ["design", "ux", "ui", "product design", "visual"],
    ["sales", "business development", "bd", "growth"],
    ["marketing", "growth", "acquisition"],
    ["ops", "operations", "strategy"],
    ["finance", "financial", "accounting"],
    ["product", "pm", "product management"],
  ];
  
  for (const group of synonymGroups) {
    const aInGroup = group.some(syn => skillA.includes(syn));
    const bInGroup = group.some(syn => skillB.includes(syn));
    if (aInGroup && bInGroup) return true;
  }
  
  return false;
}

/**
 * Location compatibility
 * Max 25 points
 */
function calculateLocationScore(a: FounderProfile, b: FounderProfile): number {
  const locA = (a.location_preference || "").toLowerCase();
  const locB = (b.location_preference || "").toLowerCase();

  if (!locA || !locB) return 10; // Unknown = neutral

  // Both flexible/remote
  if (isFlexible(locA) && isFlexible(locB)) return 25;
  
  // One is flexible
  if (isFlexible(locA) || isFlexible(locB)) return 20;
  
  // Same city mentioned
  if (extractCity(locA) && extractCity(locA) === extractCity(locB)) return 25;
  
  // Same country/region
  if (sameRegion(locA, locB)) return 15;
  
  return 5;
}

function isFlexible(loc: string): boolean {
  return loc.includes("remote") || loc.includes("flexible") || loc.includes("anywhere") || loc.includes("open");
}

function extractCity(loc: string): string | null {
  const cities = ["boston", "new york", "nyc", "sf", "san francisco", "la", "los angeles", "austin", "seattle", "chicago", "miami", "london", "berlin"];
  for (const city of cities) {
    if (loc.includes(city)) return city;
  }
  return null;
}

function sameRegion(locA: string, locB: string): boolean {
  const usTerms = ["us", "usa", "united states", "america"];
  const aIsUS = usTerms.some(t => locA.includes(t)) || ["boston", "new york", "sf", "austin", "seattle", "chicago", "miami", "la"].some(c => locA.includes(c));
  const bIsUS = usTerms.some(t => locB.includes(t)) || ["boston", "new york", "sf", "austin", "seattle", "chicago", "miami", "la"].some(c => locB.includes(c));
  return aIsUS && bIsUS;
}

/**
 * Timeline & urgency alignment
 * Max 20 points
 */
function calculateTimelineScore(a: FounderProfile, b: FounderProfile): number {
  const timeA = (a.timeline_start || "").toLowerCase();
  const timeB = (b.timeline_start || "").toLowerCase();
  
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
  if (timeline.includes("now") || timeline.includes("asap") || timeline.includes("immediately")) return 4;
  if (timeline.includes("month") || timeline.includes("soon")) return 3;
  if (timeline.includes("quarter") || timeline.includes("few months")) return 2;
  if (timeline.includes("year") || timeline.includes("exploring")) return 1;
  return 2; // default middle
}

/**
 * Working style compatibility
 * Max 15 points
 */
function calculateWorkStyleScore(a: FounderProfile, b: FounderProfile): number {
  let score = 7; // baseline
  
  const styleA = (a.working_style || "").toLowerCase();
  const styleB = (b.working_style || "").toLowerCase();
  
  // Both mention similar styles
  const styleTerms = ["iterative", "agile", "structured", "flexible", "fast", "methodical"];
  for (const term of styleTerms) {
    if (styleA.includes(term) && styleB.includes(term)) {
      score += 4;
      break;
    }
  }
  
  // Commitment level match
  const commitA = (a.commitment_level || "").toLowerCase();
  const commitB = (b.commitment_level || "").toLowerCase();
  
  if (commitA && commitB) {
    if (commitA.includes("full") && commitB.includes("full")) score += 4;
    else if (commitA.includes("part") && commitB.includes("part")) score += 4;
    else if (commitA.includes("flexible") || commitB.includes("flexible")) score += 2;
  }
  
  return Math.min(score, 15);
}

/**
 * Generate human-readable insights
 */
function generateInsights(
  a: FounderProfile,
  b: FounderProfile,
  breakdown: MatchScore["breakdown"]
): { highlights: string[]; concerns: string[] } {
  const highlights: string[] = [];
  const concerns: string[] = [];

  // Skills highlights
  if (breakdown.skillsMatch >= 30) {
    highlights.push("Strong skills complementarity");
  } else if (breakdown.skillsMatch >= 20) {
    highlights.push("Good skills overlap");
  } else if (breakdown.skillsMatch < 10) {
    concerns.push("Limited skills match");
  }

  // Location
  if (breakdown.locationFit >= 20) {
    highlights.push("Location compatible");
  } else if (breakdown.locationFit <= 5) {
    concerns.push("Different locations");
  }

  // Timeline
  if (breakdown.timelineFit >= 15) {
    highlights.push("Aligned timelines");
  } else if (breakdown.timelineFit < 10) {
    concerns.push("Different urgency levels");
  }

  return { highlights, concerns };
}

/**
 * Get all match scores for a founder against a list of candidates
 */
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

/**
 * Get match score tier label
 */
export function getScoreTier(score: number): "excellent" | "good" | "fair" | "low" {
  if (score >= 75) return "excellent";
  if (score >= 55) return "good";
  if (score >= 35) return "fair";
  return "low";
}
