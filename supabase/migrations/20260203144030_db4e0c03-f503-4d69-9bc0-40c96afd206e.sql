-- Migration: Create founder_locations table for geocoded location data
-- This keeps location data separate from the main founder_profiles table

-- Create the locations table
CREATE TABLE public.founder_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  founder_id UUID NOT NULL REFERENCES public.founder_profiles(id) ON DELETE CASCADE,
  
  -- Original input
  raw_input TEXT NOT NULL,
  
  -- Geocoded coordinates
  lat DECIMAL(10, 7),
  lng DECIMAL(10, 7),
  
  -- Parsed location details
  city TEXT,
  region TEXT,           -- State/province
  country TEXT,          -- ISO 3166-1 alpha-2 code
  country_name TEXT,     -- Full country name
  display_name TEXT,     -- Full formatted address from geocoder
  
  -- Timezone
  timezone_offset SMALLINT,  -- UTC offset in minutes (e.g., -480 for PST)
  
  -- Geocoding metadata
  confidence TEXT CHECK (confidence IN ('high', 'medium', 'low')),
  geocoded_at TIMESTAMP WITH TIME ZONE,
  geocode_source TEXT DEFAULT 'nominatim',  -- Track which geocoder was used
  
  -- Preferences parsed from raw_input
  is_remote_ok BOOLEAN DEFAULT false,
  is_remote_only BOOLEAN DEFAULT false,
  is_hybrid_ok BOOLEAN DEFAULT false,
  willing_to_relocate BOOLEAN DEFAULT false,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  
  -- One location per founder (for now - can remove this constraint later if needed)
  UNIQUE(founder_id)
);

-- Index for geographic queries
CREATE INDEX idx_founder_locations_coords 
ON public.founder_locations (lat, lng) 
WHERE lat IS NOT NULL AND lng IS NOT NULL;

-- Index for finding founders by country/city
CREATE INDEX idx_founder_locations_country ON public.founder_locations (country);
CREATE INDEX idx_founder_locations_city ON public.founder_locations (city);

-- Index for remote preference filtering
CREATE INDEX idx_founder_locations_remote ON public.founder_locations (is_remote_ok, is_remote_only);

-- Enable RLS
ALTER TABLE public.founder_locations ENABLE ROW LEVEL SECURITY;

-- RLS policies (mirror founder_profiles policies)
CREATE POLICY "Users can view own location"
ON public.founder_locations
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.founder_profiles fp 
    WHERE fp.id = founder_id AND fp.user_id = auth.uid()
  )
);

CREATE POLICY "Admins can view all locations"
ON public.founder_locations
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage all locations"
ON public.founder_locations
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Block anonymous access"
ON public.founder_locations
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_founder_location_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_founder_location_timestamp
BEFORE UPDATE ON public.founder_locations
FOR EACH ROW
EXECUTE FUNCTION update_founder_location_timestamp();

-- Comments
COMMENT ON TABLE public.founder_locations IS 'Geocoded location data for founders, separated from main profile for cleaner schema';
COMMENT ON COLUMN public.founder_locations.raw_input IS 'Original location_preference text from founder profile';
COMMENT ON COLUMN public.founder_locations.timezone_offset IS 'UTC offset in minutes (e.g., -480 for PST, 0 for UTC, 60 for CET)';
COMMENT ON COLUMN public.founder_locations.confidence IS 'Geocoding confidence: high (city-level match), medium (region), low (country only)';