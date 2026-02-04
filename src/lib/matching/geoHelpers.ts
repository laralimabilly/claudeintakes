// lib/matching/geoHelpers.ts
// ============================================================================
// Geographic scoring helper functions
// ============================================================================

import type { FounderProfileForMatching } from '@/types/founder';

// ---------------------------------------------------------------------------
// Extended type including location data from founder_locations join
// ---------------------------------------------------------------------------
export interface FounderWithLocation extends FounderProfileForMatching {
  location?: {
    lat: number | null;
    lng: number | null;
    city: string | null;
    country: string | null;
    timezone_offset: number | null;
    is_remote_ok: boolean;
    is_remote_only: boolean;
    is_hybrid_ok: boolean;
    willing_to_relocate: boolean;
  } | null;
}

export interface LocationPrefs {
  remoteOk: boolean;
  remoteOnly: boolean;
  willingToRelocate: boolean;
}

// ---------------------------------------------------------------------------
// Haversine distance calculation
// ---------------------------------------------------------------------------
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

export function calculateDistanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371;
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLng / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// ---------------------------------------------------------------------------
// Distance-based scoring
// ---------------------------------------------------------------------------
export function scoreDistance(distanceKm: number): number {
  if (distanceKm < 50) return 100;      // Same city
  if (distanceKm < 200) return 90;      // Short trip (1-2 hr drive)
  if (distanceKm < 500) return 80;      // Day trip / short flight
  if (distanceKm < 2000) return 70;     // Regional
  if (distanceKm < 5000) return 60;     // Continental
  if (distanceKm < 10000) return 50;    // Intercontinental
  return 40;                             // Global
}

// ---------------------------------------------------------------------------
// Timezone overlap scoring
// ---------------------------------------------------------------------------
export function getTimezoneModifier(
  offsetA: number | null | undefined,
  offsetB: number | null | undefined,
): number {
  if (offsetA == null || offsetB == null) return 0;

  const gapHours = Math.abs(offsetA - offsetB) / 60;

  if (gapHours <= 3) return 10;   // Great overlap: +10
  if (gapHours <= 6) return 0;    // Moderate: no change
  return -10;                      // Poor: -10
}

// ---------------------------------------------------------------------------
// Fallback: Parse preferences from location_preference text
// ---------------------------------------------------------------------------
export function parseLocationPrefsFromText(text: string | null): LocationPrefs {
  const t = (text || '').toLowerCase();

  return {
    remoteOk: /\bremote\b/.test(t) || t.includes('anywhere'),
    remoteOnly: t.includes('remote only') || t.includes('fully remote'),
    willingToRelocate: t.includes('relocate') || t.includes('willing to move'),
  };
}
