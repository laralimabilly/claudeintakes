// _shared/geocoding/geocodeLocation.ts
// ============================================================================
// Geocoding utility for converting location text to coordinates
//
// Uses OpenStreetMap Nominatim API (free, no API key required)
// Rate limit: 1 request/second — we only call this once per profile creation
//
// IMPROVEMENTS in this version:
//   - Extracts city names from parentheses: "same city (Boston)" → "Boston"
//   - Filters out non-geocodable phrases before calling Nominatim
//   - Handles relative location preferences: "same city", "wherever", etc.
//   - Better abbreviation expansion
//   - Validates extracted location before API call
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
  extractedLocation: string | null; // The cleaned location we actually geocoded
}

// ---------------------------------------------------------------------------
// Non-geocodable phrases (these should NOT be sent to Nominatim)
// ---------------------------------------------------------------------------
const NON_GEOCODABLE_PHRASES = [
  // Relative/vague preferences
  'same city',
  'same location',
  'same area',
  'same region',
  'same country',
  'same timezone',
  'same time zone',
  'wherever',
  'anywhere',
  'flexible',
  'open to anything',
  'no preference',
  'doesn\'t matter',
  'tbd',
  'to be determined',
  'undecided',
  'not sure',
  'wherever my cofounder is',
  'wherever they are',
  'will relocate',
  'can relocate',
  'open to relocate',
  // Pure remote
  'remote',
  'fully remote',
  'remote only',
  'location independent',
  'work from anywhere',
  'digital nomad',
  // Meta descriptions
  'in person',
  'on-site',
  'office',
  'hybrid',
];

// ---------------------------------------------------------------------------
// Common city abbreviations
// ---------------------------------------------------------------------------
const CITY_ABBREVIATIONS: Record<string, string> = {
  'sf': 'San Francisco, California',
  'nyc': 'New York City',
  'ny': 'New York City',
  'la': 'Los Angeles, California',
  'dc': 'Washington DC',
  'philly': 'Philadelphia',
  'chi': 'Chicago',
  'atl': 'Atlanta',
  'bos': 'Boston',
  'sea': 'Seattle',
  'pdx': 'Portland, Oregon',
  'den': 'Denver',
  'aus': 'Austin, Texas',
  'dal': 'Dallas',
  'hou': 'Houston',
  'mia': 'Miami',
  'uk': 'United Kingdom',
  'uae': 'United Arab Emirates',
  'hk': 'Hong Kong',
  'sg': 'Singapore',
};

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
    t.includes('distributed') ||
    t.includes('digital nomad');

  const isRemoteOnly =
    t.includes('remote only') ||
    t.includes('fully remote') ||
    t.includes('100% remote') ||
    t.includes('remote-only');

  const isHybridOk =
    t.includes('hybrid');

  const willingToRelocate =
    t.includes('relocate') ||
    t.includes('willing to move') ||
    t.includes('open to moving') ||
    t.includes('flexible on location') ||
    t.includes('can move') ||
    t.includes('will move');

  return { isRemoteOk, isRemoteOnly, isHybridOk, willingToRelocate };
}

// ---------------------------------------------------------------------------
// Extract actual location from text
// ---------------------------------------------------------------------------

/**
 * Extract the first valid city/location from a comma/or-separated list.
 * 
 * Handles patterns like:
 *   - "Los Angeles, San Francisco, or somewhere in California" → "Los Angeles"
 *   - "NYC or SF" → "New York City"
 *   - "somewhere in California" → "California"
 * 
 * Returns null if no valid location found.
 */
function extractFirstCityFromList(text: string): string | null {
  // Split by comma, "or", semicolon, slash
  const parts = text.split(/\s*(?:,|;|\/|\bor\b)\s*/i);
  
  for (const part of parts) {
    // Clean up vague qualifiers like "somewhere in", "anywhere in", "around"
    let cleaned = part
      .replace(/\b(somewhere|anywhere|someplace|around|near|maybe)\s*(in|the|around)?\s*/gi, '')
      .replace(/^(in|the|a)\s+/i, '')
      .trim();
    
    // Skip empty or too short
    if (cleaned.length < 2) {
      continue;
    }
    
    // Skip if it's a non-geocodable phrase
    const cleanedLower = cleaned.toLowerCase();
    if (NON_GEOCODABLE_PHRASES.some(p => cleanedLower === p || cleanedLower.includes(p))) {
      continue;
    }
    
    // Skip pure qualifiers
    if (/^(but|if|when|prefer|ideally|flexible|open)$/i.test(cleaned)) {
      continue;
    }
    
    // Found a valid location candidate
    return expandAbbreviations(cleaned);
  }
  
  return null;
}

/**
 * Extract a valid location from text inside parentheses.
 * Handles both single locations and comma/or-separated lists.
 * 
 * Returns null if no valid location found.
 */
function extractFromParentheses(insideParens: string): string | null {
  const trimmed = insideParens.trim();
  
  // Clean up "but based in" prefix if present
  const cleanedParens = trimmed
    .replace(/^(but\s+)?(based|located|living)\s+(in|at)\s+/i, '')
    .trim();
  
  // Skip if it looks like a clarification, not a location
  // e.g., "(e.g., a couple weeks or a month)"
  if (/^(e\.?g\.?|i\.?e\.?|for example|such as|like)/i.test(cleanedParens)) {
    return null;
  }
  
  // Skip time-related parenthetical content
  // e.g., "(a couple weeks or a month)"
  if (/\b(week|month|day|hour|year|time)\b/i.test(cleanedParens) && 
      !/\b(new york|salt lake|mexico|kansas|oklahoma|iowa|jersey)\b/i.test(cleanedParens)) {
    return null;
  }
  
  // Check if it contains multiple locations (comma or "or")
  if (/,|\bor\b/i.test(cleanedParens)) {
    // Extract first valid city from list
    return extractFirstCityFromList(cleanedParens);
  } else {
    // Single location - check if it's valid
    const cleanedLower = cleanedParens.toLowerCase();
    const cleanedIsNonGeocodable = NON_GEOCODABLE_PHRASES.some(p => cleanedLower === p);
    
    if (!cleanedIsNonGeocodable && cleanedParens.length >= 2 && /[a-z]/i.test(cleanedParens)) {
      return expandAbbreviations(cleanedParens);
    }
  }
  
  return null;
}

/**
 * Extract a geocodable location string from free-form text.
 * 
 * Handles patterns like:
 *   - "same city (Boston)" → "Boston"
 *   - "same city (Los Angeles, San Francisco, or somewhere in California)" → "Los Angeles"
 *   - "Boston or remote" → "Boston"
 *   - "Based in San Francisco" → "San Francisco"
 *   - "SF Bay Area" → "San Francisco Bay Area"
 *   - "NYC, willing to relocate" → "New York City"
 * 
 * Returns null if no geocodable location can be extracted.
 */
export function extractGeocodableLocation(text: string): string | null {
  if (!text || text.trim().length < 2) {
    return null;
  }

  const original = text.trim();
  const lowerText = original.toLowerCase();

  // 1. Check if the entire input is a non-geocodable phrase
  for (const phrase of NON_GEOCODABLE_PHRASES) {
    if (lowerText === phrase || lowerText === phrase.replace(/'/g, '')) {
      return null;
    }
  }

  // 2. Check if input STARTS with a non-geocodable phrase (indicates primary intent)
  //    e.g., "Fully remote is fine, with timezone overlap..." → null
  //    e.g., "Remote work preferred, but based in NYC" → check for parentheses first
  const primaryIntentPhrases = [
    'fully remote',
    'remote only',
    'remote is fine',
    'remote is ok',
    'remote is okay',
    'remote works',
    'remote preferred',
    'anywhere',
    'location independent',
    'work from anywhere',
    'digital nomad',
    'no preference',
    'flexible',
    'wherever',
    'tbd',
    'undecided',
  ];
  
  for (const phrase of primaryIntentPhrases) {
    if (lowerText.startsWith(phrase)) {
      // But first check if there's a specific location in parentheses
      const parenMatch = original.match(/\(([^)]+)\)/);
      if (parenMatch) {
        const extracted = extractFromParentheses(parenMatch[1]);
        if (extracted) {
          return extracted;
        }
      }
      // No valid location in parentheses, and primary intent is remote/flexible
      return null;
    }
  }

  // 3. Extract location from parentheses (highest priority)
  //    e.g., "same city (Boston)" → "Boston"
  //    e.g., "Remote (but based in Austin)" → "Austin"
  //    e.g., "Same city (Los Angeles, San Francisco, or California)" → "Los Angeles"
  const parenMatch = original.match(/\(([^)]+)\)/);
  if (parenMatch) {
    const extracted = extractFromParentheses(parenMatch[1]);
    if (extracted) {
      return extracted;
    }
  }
  
  // 4. Check if remaining text (outside parens) indicates no specific location
  //    e.g., "same city", "same location" without parentheses
  const textWithoutParens = original.replace(/\([^)]*\)/g, '').trim().toLowerCase();
  for (const phrase of NON_GEOCODABLE_PHRASES) {
    if (textWithoutParens === phrase || textWithoutParens.startsWith(phrase + ' ') || 
        textWithoutParens.startsWith(phrase + ',') || textWithoutParens.startsWith(phrase + '.')) {
      return null;
    }
  }

  let processed = lowerText;

  // 3. Remove parenthetical content for further processing
  processed = processed.replace(/\([^)]*\)/g, ' ');

  // 4. Remove non-geocodable phrases
  for (const phrase of NON_GEOCODABLE_PHRASES) {
    // Use word boundary to avoid partial matches
    const regex = new RegExp(`\\b${escapeRegex(phrase)}\\b`, 'gi');
    processed = processed.replace(regex, ' ');
  }

  // 5. Remove common noise words and connectors
  const noisePatterns = [
    /\b(based|located|living|from|currently|in|at|near|around)\s+(in|at)?\s*/gi,
    /\b(or|and|but|if|when|,|;|\/)\s*/gi,
    /\b(prefer|ideally|preferably|would like|looking for)\b/gi,
    /\b(area|region|metro|metropolitan|greater)\b/gi,
    /\b(willing to|open to|can|could)\b/gi,
  ];

  for (const pattern of noisePatterns) {
    processed = processed.replace(pattern, ' ');
  }

  // 6. Clean up whitespace
  processed = processed.replace(/\s+/g, ' ').trim();

  // 7. Check if anything meaningful remains
  if (processed.length < 2) {
    return null;
  }

  // 8. Check if the remaining text is still a non-geocodable phrase
  for (const phrase of NON_GEOCODABLE_PHRASES) {
    if (processed === phrase || processed === phrase.replace(/'/g, '')) {
      return null;
    }
  }

  // 9. Expand abbreviations
  processed = expandAbbreviations(processed);

  // 10. Final validation: must contain at least one letter
  if (!/[a-z]/i.test(processed)) {
    return null;
  }

  // 11. Restore original casing where possible
  //     Find the processed location in the original text
  const finalLocation = restoreOriginalCasing(original, processed);

  return finalLocation;
}

/**
 * Expand common city/country abbreviations.
 */
function expandAbbreviations(text: string): string {
  let result = text;
  
  // Check for exact abbreviation match (case-insensitive)
  const lowerText = text.toLowerCase().trim();
  if (CITY_ABBREVIATIONS[lowerText]) {
    return CITY_ABBREVIATIONS[lowerText];
  }

  // Check for abbreviation at start of string
  // e.g., "SF Bay Area" → "San Francisco Bay Area"
  for (const [abbr, full] of Object.entries(CITY_ABBREVIATIONS)) {
    const pattern = new RegExp(`^${abbr}\\b`, 'i');
    if (pattern.test(result)) {
      // Extract just the city name (first part before comma)
      const cityName = full.split(',')[0];
      result = result.replace(pattern, cityName);
      break;
    }
  }

  return result;
}

/**
 * Try to restore original casing from the input text.
 */
function restoreOriginalCasing(original: string, processed: string): string {
  // Try to find the processed text in the original (case-insensitive)
  const lowerOriginal = original.toLowerCase();
  const index = lowerOriginal.indexOf(processed.toLowerCase());
  
  if (index !== -1) {
    return original.substring(index, index + processed.length);
  }
  
  // If not found directly, try to find the first word
  const firstWord = processed.split(' ')[0];
  const firstWordIndex = lowerOriginal.indexOf(firstWord.toLowerCase());
  
  if (firstWordIndex !== -1) {
    // Extract from original starting at this position
    const remaining = original.substring(firstWordIndex);
    // Take approximately the same length
    return remaining.substring(0, Math.min(remaining.length, processed.length + 10)).trim();
  }

  // Fall back to processed text with title case
  return toTitleCase(processed);
}

/**
 * Convert string to title case.
 */
function toTitleCase(str: string): string {
  return str.replace(/\b\w/g, char => char.toUpperCase());
}

/**
 * Escape special regex characters.
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ---------------------------------------------------------------------------
// Main geocoding function
// ---------------------------------------------------------------------------

/**
 * Geocode a location string using OpenStreetMap Nominatim.
 *
 * This function:
 * 1. Parses location preferences (remote, hybrid, relocate)
 * 2. Extracts a geocodable location from the text
 * 3. Calls Nominatim API only if a valid location is found
 * 4. Returns structured result with coordinates and metadata
 *
 * @param locationText - Free-form location text from user input
 * @returns GeocodeResult with coordinates, parsed location, and preferences
 */
export async function geocodeLocation(locationText: string): Promise<GeocodeResult> {
  const rawInput = locationText;
  const preferences = parseLocationPreferences(locationText);

  // Step 1: Validate input
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

  // Step 2: Extract geocodable location
  const extractedLocation = extractGeocodableLocation(locationText);

  if (!extractedLocation) {
    // Determine appropriate error message
    const lowerText = locationText.toLowerCase();
    let error = 'No geocodable location found in text';
    
    if (lowerText.includes('remote') || lowerText.includes('anywhere')) {
      error = 'No geographic location specified (remote preference only)';
    } else if (lowerText.includes('same city') || lowerText.includes('same location')) {
      error = 'Relative location preference (no specific city mentioned)';
    } else if (lowerText.includes('flexible') || lowerText.includes('open')) {
      error = 'Flexible/open location preference (no specific city mentioned)';
    }

    return {
      success: false,
      location: null,
      preferences,
      error,
      rawInput,
      extractedLocation: null,
    };
  }

  // Step 3: Call Nominatim API
  try {
    const encodedQuery = encodeURIComponent(extractedLocation);
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
        error: `No geocoding results for: "${extractedLocation}"`,
        rawInput,
        extractedLocation,
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
        displayName: result.display_name || extractedLocation,
        confidence,
      },
      preferences,
      rawInput,
      extractedLocation,
    };
  } catch (error) {
    return {
      success: false,
      location: null,
      preferences,
      error: error instanceof Error ? error.message : 'Unknown geocoding error',
      rawInput,
      extractedLocation,
    };
  }
}

// ---------------------------------------------------------------------------
// Batch geocoding helper
// ---------------------------------------------------------------------------

/**
 * Check if a location_preference text is worth geocoding.
 * Use this to filter before calling geocodeLocation() in batch operations.
 */
export function isWorthGeocoding(locationText: string | null | undefined): boolean {
  if (!locationText || locationText.trim().length < 2) {
    return false;
  }
  
  return extractGeocodableLocation(locationText) !== null;
}
