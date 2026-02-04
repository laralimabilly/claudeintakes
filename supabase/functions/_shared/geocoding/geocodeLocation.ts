// _shared/geocoding/geocodeLocation.ts
// ============================================================================
// Geocoding utility for converting location text to coordinates
//
// Uses OpenStreetMap Nominatim API (free, no API key required)
// Rate limit: 1 request/second — we only call this once per profile creation
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
}

// ---------------------------------------------------------------------------
// Timezone estimation based on longitude
// ---------------------------------------------------------------------------
function estimateTimezoneOffset(lng: number): number {
  // Each 15 degrees of longitude ≈ 1 hour offset
  // Rough approximation — doesn't account for DST or political boundaries
  const hours = Math.round(lng / 15);
  return hours * 60; // Return in minutes
}

// ---------------------------------------------------------------------------
// Parse location preferences from text
// ---------------------------------------------------------------------------
export function parseLocationPreferences(text: string): LocationPreferences {
  const t = text.toLowerCase();

  const isRemoteOk =
    /\bremote\b/.test(t) ||
    t.includes('anywhere') ||
    t.includes('location independent') ||
    t.includes('work from anywhere') ||
    t.includes('distributed');

  const isRemoteOnly =
    t.includes('remote only') ||
    t.includes('fully remote') ||
    t.includes('100% remote');

  const isHybridOk =
    t.includes('hybrid');

  const willingToRelocate =
    t.includes('relocate') ||
    t.includes('willing to move') ||
    t.includes('open to moving') ||
    t.includes('flexible on location');

  return { isRemoteOk, isRemoteOnly, isHybridOk, willingToRelocate };
}

// ---------------------------------------------------------------------------
// Pre-processing for better geocoding results
// ---------------------------------------------------------------------------
function preprocessLocationText(text: string): string {
  let processed = text.toLowerCase().trim();

  // Remove noise phrases that confuse geocoders
  const noisePatterns = [
    /\b(remote|hybrid|flexible|anywhere|willing to relocate|open to)\b/gi,
    /\b(based in|located in|living in|from|currently in)\b/gi,
    /\b(or remote|remote ok|remote friendly)\b/gi,
    /[()]/g,
  ];

  for (const pattern of noisePatterns) {
    processed = processed.replace(pattern, ' ');
  }

  // Expand common abbreviations
  const abbreviations: Record<string, string> = {
    'sf': 'San Francisco',
    'nyc': 'New York City',
    'la': 'Los Angeles',
    'dc': 'Washington DC',
    'philly': 'Philadelphia',
    'uk': 'United Kingdom',
    'uae': 'United Arab Emirates',
  };

  const cleanedTrimmed = processed.replace(/[,.\s]+/g, ' ').trim();
  for (const [abbr, full] of Object.entries(abbreviations)) {
    if (cleanedTrimmed === abbr || cleanedTrimmed.startsWith(abbr + ' ')) {
      processed = processed.replace(new RegExp(`\\b${abbr}\\b`, 'i'), full);
    }
  }

  return processed.replace(/\s+/g, ' ').trim();
}

// ---------------------------------------------------------------------------
// Main geocoding function
// ---------------------------------------------------------------------------

/**
 * Geocode a location string using OpenStreetMap Nominatim.
 *
 * @param locationText - Free-form location text
 * @returns GeocodeResult with coordinates, parsed location, and preferences
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
    };
  }

  // Check if purely remote with no location
  const lowerText = locationText.toLowerCase();
  const purelyRemote = [
    'remote', 'fully remote', 'remote only', 'anywhere', 'location independent'
  ].includes(lowerText.trim());

  if (purelyRemote) {
    return {
      success: false,
      location: null,
      preferences: { ...preferences, isRemoteOk: true, isRemoteOnly: true },
      error: 'No geographic location specified (remote-only)',
      rawInput,
    };
  }

  const processed = preprocessLocationText(locationText);

  if (processed.length < 2) {
    return {
      success: false,
      location: null,
      preferences,
      error: 'No valid location text after preprocessing',
      rawInput,
    };
  }

  try {
    const encodedQuery = encodeURIComponent(processed);
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
      return {
        success: false,
        location: null,
        preferences,
        error: `No results found for: "${processed}"`,
        rawInput,
      };
    }

    const result = results[0];
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);

    // Extract location details from address
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

    // Determine confidence
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
      success: true,
      location: {
        lat,
        lng,
        city,
        region,
        country,
        countryName,
        timezoneOffset,
        displayName: result.display_name || processed,
        confidence,
      },
      preferences,
      rawInput,
    };
  } catch (error) {
    return {
      success: false,
      location: null,
      preferences,
      error: error instanceof Error ? error.message : 'Unknown geocoding error',
      rawInput,
    };
  }
}

// ---------------------------------------------------------------------------
// Distance calculations
// ---------------------------------------------------------------------------

/**
 * Calculate distance between two points using Haversine formula.
 * @returns Distance in kilometers
 */
export function calculateDistanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLng / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Calculate timezone difference in hours.
 */
export function calculateTimezoneGapHours(
  offsetA: number | null,
  offsetB: number | null,
): number | null {
  if (offsetA === null || offsetB === null) return null;
  return Math.abs(offsetA - offsetB) / 60;
}
