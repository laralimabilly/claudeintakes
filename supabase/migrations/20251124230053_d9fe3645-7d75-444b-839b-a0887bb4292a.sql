-- Add RLS policy to allow reading founder profiles
-- Note: This is a temporary solution. For production, use an edge function with service role key.
CREATE POLICY "Allow public read access to founder profiles"
ON public.founder_profiles
FOR SELECT
TO public
USING (true);

-- Keep write operations restricted (only service role via edge functions)
CREATE POLICY "Restrict insert to service role only"
ON public.founder_profiles
FOR INSERT
TO public
WITH CHECK (false);

CREATE POLICY "Restrict update to service role only"
ON public.founder_profiles
FOR UPDATE
TO public
USING (false);

CREATE POLICY "Restrict delete to service role only"
ON public.founder_profiles
FOR DELETE
TO public
USING (false);