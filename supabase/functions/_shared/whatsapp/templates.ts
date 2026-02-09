// supabase/functions/_shared/whatsapp/templates.ts
// ============================================================================
// WhatsApp Message Template Engine
// Generates personalized messages from founder + match data
//
// Templates are based on:
//   - Line AI Product Flow (OPT) doc
//   - WhatsApp Flow Suggestion doc
// ============================================================================

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FounderData {
  name?: string | null;
  phone_number: string;
  idea_description?: string | null;
  core_skills?: string[] | null;
  seeking_skills?: string[] | null;
  stage?: string | null;
  cofounder_type?: string | null;
  location_preference?: string | null;
  commitment_level?: string | null;
  working_style?: string | null;
  timeline_start?: string | null;
  background?: string | null;
  superpower?: string | null;
  previous_founder?: boolean | null;
}

export interface MatchData {
  total_score: number;
  compatibility_level: string; // 'highly_compatible' | 'somewhat_compatible'
  score_skills: number;
  score_stage: number;
  score_communication: number;
  score_vision: number;
  score_values: number;
  score_geo: number;
  score_advantages: number;
}

export type TemplateName =
  | "onboarding_confirmation"
  | "highly_compatible_initial"
  | "somewhat_compatible_initial"
  | "highly_compatible_details"
  | "somewhat_compatible_details"
  | "intro_confirmation"
  | "both_interested"
  | "other_declined"
  | "decline_feedback"
  | "no_matches_yet"
  | "weekly_checkin"
  | "followup_post_intro"
  | "followup_ghost"
  | "monthly_profile_checkin"
  | "pattern_suggestion";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function firstName(name?: string | null): string {
  if (!name) return "there";
  return name.split(" ")[0];
}

function truncate(text: string | null | undefined, max = 80): string {
  if (!text) return "something interesting";
  return text.length > max ? text.slice(0, max).trim() + "..." : text;
}

function primarySkill(skills?: string[] | null): string {
  if (!skills || skills.length === 0) return "multi-disciplinary";
  return skills[0];
}

function skillsList(skills?: string[] | null, max = 3): string {
  if (!skills || skills.length === 0) return "various areas";
  return skills.slice(0, max).join(", ");
}

/** Pick the top N dimension alignments to highlight */
function topAlignments(
  match: MatchData,
  founder: FounderData,
  other: FounderData,
  count = 3
): string[] {
  const dims: { key: string; score: number; label: string }[] = [
    {
      key: "skills",
      score: match.score_skills,
      label: buildSkillsAlignment(founder, other),
    },
    {
      key: "stage",
      score: match.score_stage,
      label: buildStageAlignment(founder, other),
    },
    {
      key: "communication",
      score: match.score_communication,
      label: buildCommAlignment(founder, other),
    },
    {
      key: "vision",
      score: match.score_vision,
      label: buildVisionAlignment(founder, other),
    },
    {
      key: "values",
      score: match.score_values,
      label: buildValuesAlignment(founder, other),
    },
    {
      key: "geo",
      score: match.score_geo,
      label: buildGeoAlignment(founder, other),
    },
  ];

  return dims
    .sort((a, b) => b.score - a.score)
    .slice(0, count)
    .filter((d) => d.score >= 50)
    .map((d) => d.label);
}

/** Pick dimensions with lowest scores as gaps */
function topGaps(
  match: MatchData,
  founder: FounderData,
  other: FounderData,
  count = 2
): string[] {
  const dims: { key: string; score: number; label: string }[] = [
    {
      key: "skills",
      score: match.score_skills,
      label: `Skill overlap — you may want to discuss who owns what`,
    },
    {
      key: "stage",
      score: match.score_stage,
      label: `Timeline or stage difference — worth aligning on`,
    },
    {
      key: "communication",
      score: match.score_communication,
      label: `Working/communication style differences`,
    },
    {
      key: "vision",
      score: match.score_vision,
      label: `Vision or problem-space alignment could be stronger`,
    },
    {
      key: "geo",
      score: match.score_geo,
      label: buildGeoGap(founder, other),
    },
  ];

  return dims
    .sort((a, b) => a.score - b.score)
    .slice(0, count)
    .filter((d) => d.score < 75)
    .map((d) => `${d.label}`);
}

// Alignment description builders
function buildSkillsAlignment(a: FounderData, b: FounderData): string {
  const aHas = primarySkill(a.core_skills);
  const bHas = primarySkill(b.core_skills);
  if (aHas === bHas) return `You both bring ${aHas} expertise`;
  return `${firstName(b.name)} brings ${bHas}, complementing your ${aHas}`;
}

function buildStageAlignment(a: FounderData, b: FounderData): string {
  if (a.timeline_start && b.timeline_start) {
    return `Timeline alignment — both aiming to start ${a.timeline_start}`;
  }
  if (a.commitment_level && b.commitment_level) {
    return `Both ${a.commitment_level}`;
  }
  return `Similar stage and urgency`;
}

function buildCommAlignment(_a: FounderData, _b: FounderData): string {
  return `Compatible communication and working styles`;
}

function buildVisionAlignment(a: FounderData, b: FounderData): string {
  return `Aligned on vision and problem space`;
}

function buildValuesAlignment(_a: FounderData, _b: FounderData): string {
  return `Shared working values and expectations`;
}

function buildGeoAlignment(a: FounderData, b: FounderData): string {
  if (a.location_preference && b.location_preference) {
    if (
      a.location_preference.toLowerCase() === b.location_preference.toLowerCase()
    ) {
      return `Both based in ${a.location_preference}`;
    }
    return `Location works — ${a.location_preference} / ${b.location_preference}`;
  }
  return `Location compatible`;
}

function buildGeoGap(a: FounderData, b: FounderData): string {
  if (a.location_preference && b.location_preference) {
    return `Different locations (${a.location_preference} vs ${b.location_preference}) — discuss remote setup`;
  }
  return `Location preferences may need discussion`;
}

/** One-sentence summary of the match */
function matchSummary(
  match: MatchData,
  founder: FounderData,
  other: FounderData
): string {
  const score = Math.round(match.total_score);
  if (score >= 80) {
    return `Strong complement — your gaps fill each other well.`;
  }
  if (score >= 70) {
    return `Solid alignment on the things that matter most.`;
  }
  return `Not a slam dunk, but the core alignment is there if the details work out.`;
}

/** Key alignment for initial message (one-liner) */
function keyAlignment(
  match: MatchData,
  founder: FounderData,
  other: FounderData
): string {
  // Pick the highest scoring dimension and describe it simply
  const scores = [
    { score: match.score_stage, text: getStageKeyAlignment(founder, other) },
    { score: match.score_skills, text: getSkillsKeyAlignment(founder, other) },
    { score: match.score_communication, text: "aligned on work style" },
    { score: match.score_vision, text: "building in a similar space" },
  ];

  const best = scores.sort((a, b) => b.score - a.score)[0];
  return best.text;
}

function getStageKeyAlignment(a: FounderData, b: FounderData): string {
  if (a.commitment_level && b.commitment_level) {
    return `${a.commitment_level} and moving at a similar pace`;
  }
  return "at a similar stage";
}

function getSkillsKeyAlignment(a: FounderData, b: FounderData): string {
  const aType = primarySkill(a.core_skills);
  const bType = primarySkill(b.core_skills);
  if (aType !== bType) return `complementary skills (${aType} + ${bType})`;
  return `both strong in ${aType}`;
}

/** Biggest gap for "somewhat compatible" initial message */
function biggestGap(
  match: MatchData,
  founder: FounderData,
  other: FounderData
): string {
  const gaps = topGaps(match, founder, other, 1);
  return gaps[0] || "Some areas to discuss";
}

// ---------------------------------------------------------------------------
// Template Functions
// ---------------------------------------------------------------------------

/**
 * Phase 1: Post-intake onboarding confirmation
 */
export function onboardingConfirmation(founder: FounderData): string {
  const name = firstName(founder.name);
  const building = truncate(founder.idea_description, 100);
  const seeking = founder.cofounder_type || skillsList(founder.seeking_skills);
  const timeline = founder.timeline_start || "soon";
  const workStyle = founder.working_style || founder.commitment_level || "flexible";

  return [
    `Hey ${name}, this is Line.`,
    ``,
    `Just finished processing our call. Here's what I captured:`,
    ``,
    `• Building: ${building}`,
    `• Looking for: ${seeking}`,
    `• Timeline: ${timeline}`,
    `• Prefer: ${workStyle}`,
    ``,
    `Look good? If anything's off, just let me know.`,
    ``,
    `I'll start surfacing co-founder matches within the next week. In the meantime, feel free to ask me anything about the matching process.`,
  ].join("\n");
}

/**
 * Phase 3: Initial match notification — Highly Compatible (≥75%)
 */
export function highlyCompatibleInitial(
  founder: FounderData,
  other: FounderData,
  match: MatchData
): string {
  const name = firstName(founder.name);
  const otherName = firstName(other.name);
  const skill = primarySkill(other.core_skills);
  const building = truncate(other.idea_description, 60);
  const alignment = keyAlignment(match, founder, other);
  const score = Math.round(match.total_score);

  return [
    `Hey ${name}!`,
    ``,
    `Found someone for you.`,
    ``,
    `${otherName} — ${skill} building ${building}.`,
    ``,
    `You're both ${alignment}.`,
    ``,
    `Match score: ${score}%`,
    ``,
    `Want to hear more?`,
  ].join("\n");
}

/**
 * Phase 3: Initial match notification — Somewhat Compatible (60-74%)
 */
export function somewhatCompatibleInitial(
  founder: FounderData,
  other: FounderData,
  match: MatchData
): string {
  const name = firstName(founder.name);
  const otherName = firstName(other.name);
  const skill = primarySkill(other.core_skills);
  const building = truncate(other.idea_description, 60);
  const alignment = keyAlignment(match, founder, other);
  const gap = biggestGap(match, founder, other);
  const score = Math.round(match.total_score);

  return [
    `Hey ${name},`,
    ``,
    `Potential match — not perfect, but worth considering.`,
    ``,
    `${otherName} — ${skill} building ${building}.`,
    ``,
    `Main alignment: ${alignment}`,
    `Thing to discuss: ${gap}`,
    ``,
    `Match score: ${score}%`,
    ``,
    `Curious?`,
  ].join("\n");
}

/**
 * Full details — Highly Compatible
 */
export function highlyCompatibleDetails(
  founder: FounderData,
  other: FounderData,
  match: MatchData
): string {
  const alignments = topAlignments(match, founder, other, 3);
  const gaps = topGaps(match, founder, other, 1);
  const summary = matchSummary(match, founder, other);

  const alignmentLines = alignments.map((a) => `• ${a}`).join("\n");
  const gapLines =
    gaps.length > 0
      ? gaps.map((g) => `• ${g}`).join("\n")
      : "• Nothing major";

  return [
    `Cool. Here's the breakdown:`,
    ``,
    `What works:`,
    alignmentLines,
    ``,
    `Potential to discuss:`,
    gapLines,
    ``,
    `My read: ${summary}`,
    ``,
    `Want me to intro you?`,
  ].join("\n");
}

/**
 * Full details — Somewhat Compatible
 */
export function somewhatCompatibleDetails(
  founder: FounderData,
  other: FounderData,
  match: MatchData
): string {
  const alignments = topAlignments(match, founder, other, 2);
  const gaps = topGaps(match, founder, other, 2);
  const summary = matchSummary(match, founder, other);

  const alignmentLines = alignments.map((a) => `• ${a}`).join("\n");
  const gapLines = gaps.map((g) => `• ${g}`).join("\n");

  return [
    `Here's what I see:`,
    ``,
    `Alignments:`,
    alignmentLines,
    ``,
    `Gaps:`,
    gapLines,
    ``,
    `My take: ${summary}`,
    ``,
    `Want me to intro you?`,
  ].join("\n");
}

/**
 * Intro confirmation — after founder says yes to details
 */
export function introConfirmation(
  other: FounderData
): string {
  const otherName = firstName(other.name);

  return [
    `Done. I'll reach out to ${otherName}.`,
    ``,
    `If they're interested, I'll intro you both over email in the next 24 hours.`,
    ``,
    `I'll suggest you hop on a call this week.`,
    ``,
    `Sound good?`,
  ].join("\n");
}

/**
 * Both interested — intro email sent
 */
export function bothInterested(
  founder: FounderData,
  other: FounderData
): string {
  const otherName = firstName(other.name);
  const founderName = firstName(founder.name);

  return [
    `Update: ${otherName} is interested too.`,
    ``,
    `Just sent you both an email intro.`,
    ``,
    `Subject line: "Co-founder intro: ${founderName} + ${otherName}"`,
    ``,
    `Check your inbox.`,
  ].join("\n");
}

/**
 * Other founder declined
 */
export function otherDeclined(
  founder: FounderData,
  other: FounderData,
  pipelineCount = 0
): string {
  const otherName = firstName(other.name);
  const pipeline =
    pipelineCount > 0
      ? `I've got ${pipelineCount} other folks in the pipeline. Will ping you when I find another match.`
      : `I'll keep looking. New founders join weekly.`;

  return [
    `Heads up: ${otherName} isn't looking right now.`,
    ``,
    `Back to the drawing board — ${pipeline}`,
    ``,
    `Keep building.`,
  ].join("\n");
}

/**
 * Decline feedback — when founder says no to a match
 */
export function declineFeedback(): string {
  return [
    `No worries!`,
    ``,
    `Quick question: what made you pass? (Helps me find better matches)`,
    ``,
    `- Skill mismatch`,
    `- Different problem space`,
    `- Timeline doesn't work`,
    `- Just didn't feel right`,
    `- Other`,
    ``,
    `Or just tell me in your own words.`,
  ].join("\n");
}

/**
 * After they give decline feedback
 */
export function declineFeedbackAck(
  weeklyJoinCount = 0
): string {
  const joinInfo =
    weeklyJoinCount > 0
      ? `${weeklyJoinCount} more founders joining this week.`
      : `New founders joining regularly.`;

  return [
    `Got it, thanks for the feedback.`,
    ``,
    `I'll keep looking. ${joinInfo}`,
    ``,
    `Talk soon.`,
  ].join("\n");
}

/**
 * No matches yet — when founder asks
 */
export function noMatchesYet(
  founder: FounderData,
  comparedCount = 0,
  newJoiningCount = 0
): string {
  const name = firstName(founder.name);
  const compared =
    comparedCount > 0
      ? `I've compared you with ${comparedCount} founders so far — no strong matches yet.`
      : `Still working through the current pool.`;
  const joining =
    newJoiningCount > 0
      ? `${newJoiningCount} new founders joining this week.`
      : `New founders joining regularly.`;

  return [
    `Still looking.`,
    ``,
    compared,
    ``,
    `${joining} I'll ping you as soon as I find someone compatible.`,
  ].join("\n");
}

/**
 * Weekly check-in — no matches after 1 week
 */
export function weeklyCheckin(
  founder: FounderData,
  analyzedCount = 0
): string {
  const name = firstName(founder.name);

  return [
    `Hey ${name},`,
    ``,
    `Quick update: Still actively looking for your match.`,
    ``,
    `Analyzed ${analyzedCount} founders this week — nothing above the compatibility threshold yet.`,
    ``,
    `Are you still actively looking? And has anything changed on your end (timeline, what you need, etc.)?`,
    ``,
    `Just want to make sure I'm matching you based on current info.`,
  ].join("\n");
}

/**
 * Follow-up 3 days after intro
 */
export function followupPostIntro(
  founder: FounderData,
  other: FounderData
): string {
  const name = firstName(founder.name);
  const otherName = firstName(other.name);

  return [
    `Hey ${name}, checking in.`,
    ``,
    `Did you get a chance to connect with ${otherName}?`,
    ``,
    `If the intro didn't land or you decided not to pursue it, no worries — just let me know so I can keep looking for other matches.`,
    ``,
    `What's the status?`,
  ].join("\n");
}

/**
 * Ghost follow-up — 5 days after intro, no response
 */
export function followupGhost(founder: FounderData): string {
  return [
    `Going to assume you're busy or this isn't a priority right now.`,
    ``,
    `I'll pause active matching for you — feel free to ping me when you're ready to engage again.`,
    ``,
    `Good luck with the build.`,
  ].join("\n");
}

/**
 * Monthly profile check-in
 */
export function monthlyProfileCheckin(founder: FounderData): string {
  const name = firstName(founder.name);
  const cofounderType = founder.cofounder_type || "a co-founder";
  const timeline = founder.timeline_start || "your current timeline";

  return [
    `Hey ${name},`,
    ``,
    `It's been a month since you updated your profile. Quick check:`,
    ``,
    `• Still planning on ${timeline}?`,
    `• Still looking for ${cofounderType}?`,
    `• Anything else changed?`,
    ``,
    `Let me know if anything needs updating.`,
  ].join("\n");
}

/**
 * Pattern suggestion — after 3+ declines
 */
export function patternSuggestion(
  founder: FounderData,
  declineCount: number,
  patternDescription: string
): string {
  const name = firstName(founder.name);

  return [
    `${name}, you've passed on the last ${declineCount} matches.`,
    ``,
    `Noticing a pattern: ${patternDescription}`,
    ``,
    `Want to adjust what you're looking for?`,
  ].join("\n");
}

// ---------------------------------------------------------------------------
// Template Dispatcher
// ---------------------------------------------------------------------------

export interface TemplateContext {
  founder: FounderData;
  other?: FounderData;
  match?: MatchData;
  meta?: {
    pipelineCount?: number;
    comparedCount?: number;
    newJoiningCount?: number;
    analyzedCount?: number;
    declineCount?: number;
    patternDescription?: string;
  };
}

/**
 * Generate a message from a template name and context.
 * This is the main entry point for the template engine.
 */
export function generateMessage(
  template: TemplateName,
  ctx: TemplateContext
): string {
  const { founder, other, match, meta } = ctx;

  switch (template) {
    case "onboarding_confirmation":
      return onboardingConfirmation(founder);

    case "highly_compatible_initial":
      if (!other || !match) throw new Error("other and match required");
      return highlyCompatibleInitial(founder, other, match);

    case "somewhat_compatible_initial":
      if (!other || !match) throw new Error("other and match required");
      return somewhatCompatibleInitial(founder, other, match);

    case "highly_compatible_details":
      if (!other || !match) throw new Error("other and match required");
      return highlyCompatibleDetails(founder, other, match);

    case "somewhat_compatible_details":
      if (!other || !match) throw new Error("other and match required");
      return somewhatCompatibleDetails(founder, other, match);

    case "intro_confirmation":
      if (!other) throw new Error("other required");
      return introConfirmation(other);

    case "both_interested":
      if (!other) throw new Error("other required");
      return bothInterested(founder, other);

    case "other_declined":
      if (!other) throw new Error("other required");
      return otherDeclined(founder, other, meta?.pipelineCount);

    case "decline_feedback":
      return declineFeedback();

    case "no_matches_yet":
      return noMatchesYet(founder, meta?.comparedCount, meta?.newJoiningCount);

    case "weekly_checkin":
      return weeklyCheckin(founder, meta?.analyzedCount);

    case "followup_post_intro":
      if (!other) throw new Error("other required");
      return followupPostIntro(founder, other);

    case "followup_ghost":
      return followupGhost(founder);

    case "monthly_profile_checkin":
      return monthlyProfileCheckin(founder);

    case "pattern_suggestion":
      if (!meta?.declineCount || !meta?.patternDescription) {
        throw new Error("meta.declineCount and meta.patternDescription required");
      }
      return patternSuggestion(founder, meta.declineCount, meta.patternDescription);

    default:
      throw new Error(`Unknown template: ${template}`);
  }
}
