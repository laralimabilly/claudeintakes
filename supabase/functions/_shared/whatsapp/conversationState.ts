// supabase/functions/_shared/whatsapp/conversationState.ts
// ============================================================================
// WhatsApp Conversation State Machine
//
// Manages the flow states for match notifications and responses.
// Each founder has ONE active conversation state at a time.
//
// States:
//   IDLE                  → No active flow, messages go to AI chat
//   MATCH_NOTIFIED        → Sent initial match notification, waiting yes/no
//   MATCH_DETAILS_SENT    → Sent full breakdown, waiting yes/no to intro
//   INTRO_CONFIRMED       → Founder confirmed, reaching out to other party
//   WAITING_FOR_OTHER     → Other party has been notified, waiting for their response
//   DECLINE_FEEDBACK      → Founder declined, asking for reason
//   INTRO_SENT            → Both interested, intro email sent
//   FOLLOWUP_PENDING      → Post-intro follow-up sent, waiting for status
// ============================================================================

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ConversationState =
  | "IDLE"
  | "MATCH_NOTIFIED"
  | "MATCH_DETAILS_SENT"
  | "INTRO_CONFIRMED"
  | "WAITING_FOR_OTHER"
  | "DECLINE_FEEDBACK"
  | "INTRO_SENT"
  | "FOLLOWUP_PENDING";

export interface ConversationContext {
  match_id?: string;           // founder_matches.id
  other_founder_id?: string;   // The other founder in the current match
  other_founder_name?: string; // Cached for quick access
  score?: number;              // Match total_score
  compatibility_level?: string;
  side?: "a" | "b";           // Whether this founder is "a" or "b" in the match
  decline_reason?: string;     // If they declined, why
  [key: string]: unknown;      // Allow extra metadata
}

export interface ConversationRecord {
  id: string;
  founder_id: string;
  phone_number: string;
  current_state: ConversationState;
  context: ConversationContext;
  last_message_at: string;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Intent Detection
// ---------------------------------------------------------------------------

export type UserIntent =
  | "positive"     // yes, sure, interested, tell me more, curious
  | "negative"     // no, pass, not interested, skip
  | "question"     // anything else / clarification
  | "feedback";    // response to decline feedback prompt

const POSITIVE_PATTERNS = [
  /^y(es|eah|ep|up)?$/i,
  /^sure$/i,
  /^ok(ay)?$/i,
  /^interested$/i,
  /^tell me more$/i,
  /^curious$/i,
  /^let'?s? (go|do it|do this)$/i,
  /^sounds? good$/i,
  /^definitely$/i,
  /^absolutely$/i,
  /^down$/i,
  /^i'?m? (in|down|interested)$/i,
  /^go ahead$/i,
  /^please$/i,
  /^set it up$/i,
  /^intro (us|me)$/i,
  /^want to$/i,
];

const NEGATIVE_PATTERNS = [
  /^n(o|ah|ope)?$/i,
  /^pass$/i,
  /^skip$/i,
  /^not (interested|now|really|for me)$/i,
  /^i'?ll? pass$/i,
  /^no thanks$/i,
  /^not? right now$/i,
  /^maybe later$/i,
  /^i don'?t think so$/i,
  /^nah$/i,
];

const FEEDBACK_PATTERNS = [
  /^skill/i,
  /^different (problem|space)/i,
  /^timeline/i,
  /^(just )?didn'?t feel right/i,
  /^other/i,
  /^mismatch/i,
  /^location/i,
  /^commitment/i,
];

/**
 * Detect user intent from their message.
 * Used when the conversation is in a match flow state.
 */
export function detectIntent(message: string): UserIntent {
  const trimmed = message.trim();

  for (const pattern of POSITIVE_PATTERNS) {
    if (pattern.test(trimmed)) return "positive";
  }

  for (const pattern of NEGATIVE_PATTERNS) {
    if (pattern.test(trimmed)) return "negative";
  }

  for (const pattern of FEEDBACK_PATTERNS) {
    if (pattern.test(trimmed)) return "feedback";
  }

  return "question";
}

// ---------------------------------------------------------------------------
// State Transitions
// ---------------------------------------------------------------------------

/**
 * Defines valid transitions from each state based on intent.
 * Returns the new state, or null if the intent doesn't trigger a transition
 * (meaning the message should be handled by AI chat with match context).
 */
export function getNextState(
  currentState: ConversationState,
  intent: UserIntent
): ConversationState | null {
  switch (currentState) {
    case "MATCH_NOTIFIED":
      if (intent === "positive") return "MATCH_DETAILS_SENT";
      if (intent === "negative") return "DECLINE_FEEDBACK";
      return null; // question → AI responds with more info, stays in same state

    case "MATCH_DETAILS_SENT":
      if (intent === "positive") return "INTRO_CONFIRMED";
      if (intent === "negative") return "DECLINE_FEEDBACK";
      return null;

    case "INTRO_CONFIRMED":
      // No user action needed here — this is a system transition
      // After confirming, system notifies other party
      return null;

    case "WAITING_FOR_OTHER":
      // Founder might message while waiting. Let AI handle it.
      return null;

    case "DECLINE_FEEDBACK":
      // Any response is feedback, transition back to IDLE
      return "IDLE";

    case "INTRO_SENT":
      // They might ask questions, let AI handle
      return null;

    case "FOLLOWUP_PENDING":
      // Any response → back to IDLE (we got their update)
      return "IDLE";

    case "IDLE":
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Database Operations
// ---------------------------------------------------------------------------

/**
 * Get the current conversation state for a founder (by phone number).
 * Returns null if no conversation record exists.
 */
export async function getConversation(
  supabase: SupabaseClient,
  phoneNumber: string
): Promise<ConversationRecord | null> {
  const { data, error } = await supabase
    .from("whatsapp_conversations")
    .select("*")
    .eq("phone_number", phoneNumber)
    .order("last_message_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[conversationState] Error fetching conversation:", error);
    return null;
  }

  return data as ConversationRecord | null;
}

/**
 * Get the current conversation state for a founder (by founder_id).
 */
export async function getConversationByFounderId(
  supabase: SupabaseClient,
  founderId: string
): Promise<ConversationRecord | null> {
  const { data, error } = await supabase
    .from("whatsapp_conversations")
    .select("*")
    .eq("founder_id", founderId)
    .order("last_message_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[conversationState] Error fetching conversation:", error);
    return null;
  }

  return data as ConversationRecord | null;
}

/**
 * Create or update a conversation state.
 * Uses upsert keyed on founder_id (one active conversation per founder).
 */
export async function setConversationState(
  supabase: SupabaseClient,
  params: {
    founderId: string;
    phoneNumber: string;
    state: ConversationState;
    context?: ConversationContext;
  }
): Promise<ConversationRecord | null> {
  const { founderId, phoneNumber, state, context } = params;

  const { data, error } = await supabase
    .from("whatsapp_conversations")
    .upsert(
      {
        founder_id: founderId,
        phone_number: phoneNumber,
        current_state: state,
        context: context || {},
        last_message_at: new Date().toISOString(),
      },
      { onConflict: "founder_id" }
    )
    .select()
    .single();

  if (error) {
    console.error("[conversationState] Error setting state:", error);
    return null;
  }

  console.log(
    `[conversationState] ${founderId} → ${state}`,
    context?.match_id ? `(match: ${context.match_id})` : ""
  );

  return data as ConversationRecord;
}

/**
 * Transition to a new state, merging context.
 */
export async function transitionState(
  supabase: SupabaseClient,
  phoneNumber: string,
  newState: ConversationState,
  mergeContext?: Partial<ConversationContext>
): Promise<ConversationRecord | null> {
  // Get current conversation
  const current = await getConversation(supabase, phoneNumber);

  if (!current) {
    console.error("[conversationState] No conversation found for", phoneNumber);
    return null;
  }

  const mergedContext = {
    ...current.context,
    ...mergeContext,
  };

  return setConversationState(supabase, {
    founderId: current.founder_id,
    phoneNumber: current.phone_number,
    state: newState,
    context: mergedContext,
  });
}

/**
 * Reset a conversation to IDLE state, clearing match-specific context.
 */
export async function resetToIdle(
  supabase: SupabaseClient,
  phoneNumber: string
): Promise<ConversationRecord | null> {
  return transitionState(supabase, phoneNumber, "IDLE", {
    match_id: undefined,
    other_founder_id: undefined,
    other_founder_name: undefined,
    score: undefined,
    compatibility_level: undefined,
    side: undefined,
    decline_reason: undefined,
  });
}

/**
 * Check if a founder is currently in an active match flow
 * (anything other than IDLE).
 */
export function isInMatchFlow(state: ConversationState): boolean {
  return state !== "IDLE";
}
