-- Migration: Add AI-powered embedding matching to founder_profiles

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Add embedding column to existing founder_profiles table
ALTER TABLE public.founder_profiles 
ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- Add email column if it doesn't exist (for match notifications)
ALTER TABLE public.founder_profiles 
ADD COLUMN IF NOT EXISTS email text;

-- Create HNSW index for fast similarity search
-- This enables sub-second queries even with 100k+ profiles
CREATE INDEX IF NOT EXISTS founder_profiles_embedding_idx 
ON public.founder_profiles 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Add comment explaining the embedding
COMMENT ON COLUMN public.founder_profiles.embedding IS 
'Vector embedding (1536 dimensions) generated from founder profile for AI-powered similarity matching using OpenAI text-embedding-3-small';

-- Create function to find similar founders using cosine similarity
CREATE OR REPLACE FUNCTION match_founders(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.75,
  match_count int DEFAULT 10,
  exclude_profile_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  name text,
  phone_number text,
  email text,
  idea_description text,
  stage text,
  background text,
  core_skills text[],
  previous_founder boolean,
  superpower text,
  weaknesses_blindspots text[],
  timeline_start text,
  urgency_level text,
  seeking_skills text[],
  cofounder_type text,
  location_preference text,
  commitment_level text,
  working_style text,
  seriousness_score integer,
  similarity float,
  created_at timestamp with time zone
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    fp.id,
    fp.name,
    fp.phone_number,
    fp.email,
    fp.idea_description,
    fp.stage,
    fp.background,
    fp.core_skills,
    fp.previous_founder,
    fp.superpower,
    fp.weaknesses_blindspots,
    fp.timeline_start,
    fp.urgency_level,
    fp.seeking_skills,
    fp.cofounder_type,
    fp.location_preference,
    fp.commitment_level,
    fp.working_style,
    fp.seriousness_score,
    1 - (fp.embedding <=> query_embedding) as similarity,
    fp.created_at
  FROM public.founder_profiles fp
  WHERE 
    fp.id != COALESCE(exclude_profile_id, '00000000-0000-0000-0000-000000000000'::uuid)
    AND fp.embedding IS NOT NULL
    AND 1 - (fp.embedding <=> query_embedding) > match_threshold
  ORDER BY fp.embedding <=> query_embedding
  LIMIT match_count;
$$;

-- Create table to store founder matches
CREATE TABLE IF NOT EXISTS public.founder_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  founder_id uuid REFERENCES public.founder_profiles(id) ON DELETE CASCADE NOT NULL,
  matched_founder_id uuid REFERENCES public.founder_profiles(id) ON DELETE CASCADE NOT NULL,
  similarity_score float NOT NULL CHECK (similarity_score >= 0 AND similarity_score <= 1),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'expired')),
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  
  -- Prevent duplicate matches
  UNIQUE(founder_id, matched_founder_id)
);

-- Create indexes for faster queries on founder_matches
CREATE INDEX IF NOT EXISTS founder_matches_founder_id_idx 
ON public.founder_matches(founder_id);

CREATE INDEX IF NOT EXISTS founder_matches_matched_founder_id_idx 
ON public.founder_matches(matched_founder_id);

CREATE INDEX IF NOT EXISTS founder_matches_status_idx 
ON public.founder_matches(status);

CREATE INDEX IF NOT EXISTS founder_matches_similarity_idx 
ON public.founder_matches(similarity_score DESC);

CREATE INDEX IF NOT EXISTS founder_matches_created_idx 
ON public.founder_matches(created_at DESC);

-- Enable RLS on founder_matches
ALTER TABLE public.founder_matches ENABLE ROW LEVEL SECURITY;

-- RLS policies for founder_matches
CREATE POLICY "Service role can manage all matches"
ON public.founder_matches
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view their own matches"
ON public.founder_matches
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.founder_profiles 
    WHERE id = founder_id 
    AND user_id = auth.uid()
  )
);

CREATE POLICY "Block anonymous access to matches"
ON public.founder_matches
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- Function to store a match (handles duplicates gracefully)
CREATE OR REPLACE FUNCTION store_founder_match(
  p_founder_id uuid,
  p_matched_founder_id uuid,
  p_similarity_score float
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_match_id uuid;
BEGIN
  -- Validate similarity score
  IF p_similarity_score < 0 OR p_similarity_score > 1 THEN
    RAISE EXCEPTION 'Similarity score must be between 0 and 1';
  END IF;
  
  -- Insert or update match
  INSERT INTO public.founder_matches (founder_id, matched_founder_id, similarity_score)
  VALUES (p_founder_id, p_matched_founder_id, p_similarity_score)
  ON CONFLICT (founder_id, matched_founder_id) 
  DO UPDATE SET 
    similarity_score = EXCLUDED.similarity_score,
    updated_at = now()
  RETURNING id INTO v_match_id;
  
  RETURN v_match_id;
END;
$$;

-- Function to update match status
CREATE OR REPLACE FUNCTION update_match_status(
  p_match_id uuid,
  p_status text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Validate status
  IF p_status NOT IN ('pending', 'accepted', 'rejected', 'expired') THEN
    RAISE EXCEPTION 'Invalid status. Must be: pending, accepted, rejected, or expired';
  END IF;
  
  UPDATE public.founder_matches
  SET 
    status = p_status,
    updated_at = now()
  WHERE id = p_match_id;
  
  RETURN FOUND;
END;
$$;