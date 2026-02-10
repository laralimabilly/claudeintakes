// src/types/matchStatus.ts
// ============================================================================
// Match lifecycle status types and UI helpers
// ============================================================================

export type MatchStatus =
  | "pending"
  | "notified_a"
  | "a_interested"
  | "notified_b"
  | "b_interested"
  | "both_interested"
  | "intro_sent"
  | "a_declined"
  | "b_declined"
  | "completed"
  | "expired";

export interface StatusBadgeConfig {
  label: string;
  color: string; // Tailwind bg class
  textColor: string; // Tailwind text class
}

export const MATCH_STATUS_CONFIG: Record<MatchStatus, StatusBadgeConfig> = {
  pending:          { label: "Pending",          color: "bg-gray-500/20",    textColor: "text-gray-400" },
  notified_a:       { label: "Notified A",       color: "bg-blue-500/20",    textColor: "text-blue-400" },
  a_interested:     { label: "A Interested",     color: "bg-blue-500/20",    textColor: "text-blue-400" },
  notified_b:       { label: "Notified B",       color: "bg-blue-500/20",    textColor: "text-blue-400" },
  b_interested:     { label: "B Interested",     color: "bg-blue-500/20",    textColor: "text-blue-400" },
  both_interested:  { label: "Both Interested",  color: "bg-emerald-500/20", textColor: "text-emerald-400" },
  intro_sent:       { label: "Intro Sent",       color: "bg-emerald-500/20", textColor: "text-emerald-400" },
  a_declined:       { label: "A Declined",       color: "bg-red-500/20",     textColor: "text-red-400" },
  b_declined:       { label: "B Declined",       color: "bg-red-500/20",     textColor: "text-red-400" },
  completed:        { label: "Completed",        color: "bg-emerald-500/20", textColor: "text-emerald-400" },
  expired:          { label: "Expired",          color: "bg-gray-500/20",    textColor: "text-gray-400" },
};

export function getStatusConfig(status: string): StatusBadgeConfig {
  return (
    MATCH_STATUS_CONFIG[status as MatchStatus] || {
      label: status || "Unknown",
      color: "bg-gray-500/20",
      textColor: "text-gray-400",
    }
  );
}

/** Returns true if the match can still be notified (admin "Notify" button) */
export function canNotify(status: string): boolean {
  return status === "pending";
}

/** Returns true if the match is in an active flow */
export function isActive(status: string): boolean {
  return ["notified_a", "a_interested", "notified_b", "b_interested", "both_interested"].includes(status);
}
