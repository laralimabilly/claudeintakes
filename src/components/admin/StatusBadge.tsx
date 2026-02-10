// src/components/admin/StatusBadge.tsx
// ============================================================================
// Reusable status badge for match lifecycle states
// ============================================================================

import { getStatusConfig } from "@/types/matchStatus";

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className = "" }: StatusBadgeProps) {
  const config = getStatusConfig(status);

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${config.color} ${config.textColor} ${className}`}
    >
      {config.label}
    </span>
  );
}
