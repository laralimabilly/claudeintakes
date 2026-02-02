-- Upgrade founder_matches table to store detailed matching scores
-- This migration is safe to run on production - all changes are additive or rename existing columns

-- 1. Rename similarity_score to total_score
ALTER TABLE public.founder_matches 
RENAME COLUMN similarity_score TO total_score;

-- 2. Add compatibility level column
ALTER TABLE public.founder_matches 
ADD COLUMN compatibility_level TEXT CHECK (compatibility_level IN ('highly_compatible', 'somewhat_compatible'));

-- 3. Add detailed score breakdown columns (all nullable to preserve existing data)
ALTER TABLE public.founder_matches 
ADD COLUMN score_skills DECIMAL(5,2),
ADD COLUMN score_stage DECIMAL(5,2),
ADD COLUMN score_communication DECIMAL(5,2),
ADD COLUMN score_vision DECIMAL(5,2),
ADD COLUMN score_values DECIMAL(5,2),
ADD COLUMN score_geo DECIMAL(5,2),
ADD COLUMN score_advantages DECIMAL(5,2);

-- 4. Add notification and interest tracking columns
ALTER TABLE public.founder_matches 
ADD COLUMN notified_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN a_interested BOOLEAN,
ADD COLUMN b_interested BOOLEAN,
ADD COLUMN intro_sent_at TIMESTAMP WITH TIME ZONE;

-- 5. Add index for querying by compatibility level
CREATE INDEX idx_founder_matches_compatibility_level ON public.founder_matches(compatibility_level);

-- 6. Add index for querying unnotified matches
CREATE INDEX idx_founder_matches_notified_at ON public.founder_matches(notified_at) WHERE notified_at IS NULL;