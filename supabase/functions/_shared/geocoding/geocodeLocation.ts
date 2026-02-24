// _shared/geocoding/geocodeLocation.ts
// ============================================================================
// Geocoding utility for converting location text to coordinates
//
// Uses OpenStreetMap Nominatim API (free, no API key required)
// Rate limit: 1 request/second — we only call this once per profile creation
//
// ARCHITECTURE (v2):
//   Location extraction is now handled by extractLocationWithAI.ts which uses
//   an LLM to parse free-form text into clean, geocodable strings. This file
//   is now responsible for:
//     1. Calling Nominatim with a clean location string
//     2. Returning structured coordinates + metadata
//
//   The old regex/keyword/abbreviation approach has been removed.
//   parseLocationPreferences() is kept as a lightweight fallback for boolean
//   flags when AI extraction isn't available (e.g., client-side code).
// ============================================================================

export interface GeocodedLocation {
  lat: number;
  lng: number;
  city: string | null;
  region: string | null;        // State/province
  country: string | null;       // ISO 3166-1 alpha-2 code
  countryName: string | null;   // Full country name
  displayName: string;
  timezoneOffset: number | null; // UTC offset in minutes
  confidence: 'high' | 'medium' | 'low';
}

export interface LocationPreferences {
  isRemoteOk: boolean;
  isRemoteOnly: boolean;
  isHybridOk: boolean;
  willingToRelocate: boolean;
}

export interface GeocodeResult {
  success: boolean;
  location: GeocodedLocation | null;
  preferences: LocationPreferences;
  error?: string;
  rawInput: string;
  extractedLocation: string | null;
}

// ---------------------------------------------------------------------------
// Timezone estimation based on longitude
// ---------------------------------------------------------------------------
function estimateTimezoneOffset(lng: number): number {
  const hours = Math.round(lng / 15);
  return hours * 60;
}

// ---------------------------------------------------------------------------
// Parse location preferences from text (lightweight keyword fallback)
//
// This is used when AI extraction isn't available (client-side, fallback).
// When AI extraction IS available, use the preferences from AILocationResult
// instead — they're more accurate.
// ---------------------------------------------------------------------------
export function parseLocationPreferences(text: string): LocationPreferences {
  const t = text.toLowerCase();

  return {
    isRemoteOk:
      /\bremote\b/.test(t) ||
      t.includes('anywhere') ||
      t.includes('location independent') ||
      t.includes('work from anywhere') ||
      t.includes('distributed') ||
      t.includes('digital nomad'),
    isRemoteOnly:
      t.includes('remote only') ||
      t.includes('fully remote') ||
      t.includes('100% remote') ||
      t.includes('remote-only'),
    isHybridOk:
      t.includes('hybrid'),
    willingToRelocate:
      t.includes('relocate') ||
      t.includes('willing to move') ||
      t.includes('open to moving') ||
      t.includes('flexible on location') ||
      t.includes('can move') ||
      t.includes('will move'),
  };
}

// ---------------------------------------------------------------------------
// Geocode a single clean location string via Nominatim
// ---------------------------------------------------------------------------

/**
 * Geocode a clean, pre-extracted location string using Nominatim.
 *
 * Unlike the old version, this expects a CLEAN location string
 * (e.g., "San Francisco, California, US") not raw user input.
 * Use extractLocationWithAI() first to get clean strings.
 *
 * @param locationString - Clean location string to geocode
 * @returns GeocodedLocation or null if not found
 */
export async function geocodeCleanLocation(
  locationString: string,
): Promise<GeocodedLocation | null> {
  if (!locationString || locationString.trim().length < 2) {
    return null;
  }

  try {
    const encodedQuery = encodeURIComponent(locationString.trim());
    const url = `https://nominatim.openstreetmap.org/search?q=${encodedQuery}&format=json&limit=1&addressdetails=1`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'MeetlineAI-CofounderMatching/1.0',
      },
    });

    if (!response.ok) {
      throw new Error(`Nominatim API error: ${response.status}`);
    }

    const results = await response.json();

    if (!results || results.length === 0) {
      return null;
    }

    const result = results[0];
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);

    const address = result.address || {};
    const city =
      address.city ||
      address.town ||
      address.village ||
      address.municipality ||
      address.county ||
      null;
    const region = address.state || address.province || null;
    const country = address.country_code?.toUpperCase() || null;
    const countryName = address.country || null;
    const timezoneOffset = estimateTimezoneOffset(lng);

    let confidence: 'high' | 'medium' | 'low' = 'medium';
    const resultType = result.type || '';
    const resultClass = result.class || '';

    if (
      resultClass === 'place' &&
      ['city', 'town', 'village', 'municipality'].includes(resultType)
    ) {
      confidence = 'high';
    } else if (resultClass === 'boundary' && resultType === 'administrative') {
      confidence = 'high';
    } else if (resultClass === 'place' && resultType === 'country') {
      confidence = 'low';
    }

    return {
      lat,
      lng,
      city,
      region,
      country,
      countryName,
      timezoneOffset,
      displayName: result.display_name || locationString,
      confidence,
    };
  } catch (error) {
    console.error('[geocodeCleanLocation] Error:', error instanceof Error ? error.message : error);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Full pipeline: AI extraction + Nominatim geocoding
//
// This is the main entry point for edge functions that have OpenAI access.
// For each location returned by the AI, it tries Nominatim until one succeeds.
// ---------------------------------------------------------------------------

/**
 * Full geocoding pipeline: extract locations with AI, then geocode the best one.
 *
 * @param locationText - Raw location preference text from user
 * @param aiLocations - Pre-extracted locations from extractLocationWithAI()
 * @param aiPreferences - Pre-extracted preferences from extractLocationWithAI()
 * @returns GeocodeResult with coordinates and preferences
 */
export async function geocodeWithAIResults(
  locationText: string,
  aiLocations: string[],
  aiPreferences: LocationPreferences,
): Promise<GeocodeResult> {
  const rawInput = locationText;

  // No locations extracted — remote-only or vague preference
  if (aiLocations.length === 0) {
    return {
      success: false,
      location: null,
      preferences: aiPreferences,
      error: 'No geographic location extracted from text',
      rawInput,
      extractedLocation: null,
    };
  }

  // Try each extracted location until one geocodes successfully
  for (const locationString of aiLocations) {
    const geocoded = await geocodeCleanLocation(locationString);

    if (geocoded) {
      return {
        success: true,
        location: geocoded,
        preferences: aiPreferences,
        rawInput,
        extractedLocation: locationString,
      };
    }

    console.log(`[geocodeWithAIResults] No Nominatim result for: "${locationString}", trying next...`);

    // Nominatim rate limit: 1 req/sec
    await new Promise(resolve => setTimeout(resolve, 1100));
  }

  // None of the extracted locations geocoded
  return {
    success: false,
    location: null,
    preferences: aiPreferences,
    error: `No geocoding results for any extracted location: ${aiLocations.join(', ')}`,
    rawInput,
    extractedLocation: aiLocations[0],
  };
}

// ---------------------------------------------------------------------------
// Legacy entry point (backward compatibility)
//
// Uses keyword-based preference parsing + sends raw text to Nominatim.
// Kept for client-side code or cases where OpenAI isn't available.
// Prefer geocodeWithAIResults() in edge functions.
// ---------------------------------------------------------------------------

/**
 * @deprecated Use extractLocationWithAI() + geocodeWithAIResults() instead.
 * Kept for backward compatibility with client-side code.
 */
export async function geocodeLocation(locationText: string): Promise<GeocodeResult> {
  const rawInput = locationText;
  const preferences = parseLocationPreferences(locationText);

  if (!locationText || locationText.trim().length < 2) {
    return {
      success: false,
      location: null,
      preferences,
      error: 'Location text too short',
      rawInput,
      extractedLocation: null,
    };
  }

  // Try geocoding the raw text directly (Nominatim handles some aliases)
  const geocoded = await geocodeCleanLocation(locationText.trim());

  if (geocoded) {
    return {
      success: true,
      location: geocoded,
      preferences,
      rawInput,
      extractedLocation: locationText.trim(),
    };
  }

  return {
    success: false,
    location: null,
    preferences,
    error: `No geocoding results for: "${locationText}"`,
    rawInput,
    extractedLocation: null,
  };
}

// ---------------------------------------------------------------------------
// Batch helper
// ---------------------------------------------------------------------------

/**
 * Quick check if a location_preference is worth geocoding.
 * Returns false for obviously non-geocodable text.
 */
export function isWorthGeocoding(locationText: string | null | undefined): boolean {
  if (!locationText || locationText.trim().length < 2) return false;

  const t = locationText.toLowerCase().trim();
  const pureRemotePhrases = [
    'remote', 'fully remote', 'remote only', 'anywhere',
    'flexible', 'wherever', 'tbd', 'undecided', 'no preference',
    'location independent', 'work from anywhere', 'digital nomad',
  ];

  return !pureRemotePhrases.includes(t);
}
