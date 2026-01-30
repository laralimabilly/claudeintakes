-- Drop the public read policy that allows unrestricted access
DROP POLICY IF EXISTS "Allow public read access to founder profiles" ON public.founder_profiles;

-- Create a new restrictive policy that only allows service role access
-- This ensures only admin dashboard (using service role key) can read profiles
CREATE POLICY "Restrict read to service role only" 
ON public.founder_profiles 
FOR SELECT 
USING (false);

-- Service role key automatically bypasses RLS, so admins can still access via dashboard