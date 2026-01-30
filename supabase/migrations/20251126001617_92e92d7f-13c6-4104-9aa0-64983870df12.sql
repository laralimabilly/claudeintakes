-- Add status column for tracking founder pipeline stages
CREATE TYPE public.founder_status AS ENUM ('new', 'reviewed', 'matched', 'contacted');

ALTER TABLE public.founder_profiles 
ADD COLUMN status public.founder_status NOT NULL DEFAULT 'new';

-- Add index for better filtering performance
CREATE INDEX idx_founder_profiles_status ON public.founder_profiles(status);

-- Add notes column for admin tracking
ALTER TABLE public.founder_profiles 
ADD COLUMN admin_notes text;