-- Create a rate limiting table for tracking requests
CREATE TABLE public.rate_limits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create an index for efficient lookups
CREATE INDEX idx_rate_limits_key_created ON public.rate_limits (key, created_at DESC);

-- Enable RLS but allow service role access (edge functions use service role)
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Block all client access - only service role can access
CREATE POLICY "Block anonymous access to rate_limits"
ON public.rate_limits
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

CREATE POLICY "Block authenticated access to rate_limits"
ON public.rate_limits
FOR ALL
TO authenticated
USING (false)
WITH CHECK (false);

-- Create a function to clean up old rate limit entries (older than 24 hours)
CREATE OR REPLACE FUNCTION public.cleanup_old_rate_limits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.rate_limits WHERE created_at < now() - interval '24 hours';
END;
$$;