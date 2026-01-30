-- Drop existing broken policies on founder_profiles
DROP POLICY IF EXISTS "Restrict delete to service role only" ON public.founder_profiles;
DROP POLICY IF EXISTS "Restrict insert to service role only" ON public.founder_profiles;
DROP POLICY IF EXISTS "Restrict read to service role only" ON public.founder_profiles;
DROP POLICY IF EXISTS "Restrict update to service role only" ON public.founder_profiles;

-- Create proper permissive policies that explicitly document service-role-only access
-- Note: Service role bypasses RLS anyway, but these policies make the intent clear
-- and prevent any authenticated/anon access

CREATE POLICY "Service role can select founder_profiles"
ON public.founder_profiles
FOR SELECT
TO authenticated, anon
USING (false);

CREATE POLICY "Service role can insert founder_profiles"
ON public.founder_profiles
FOR INSERT
TO authenticated, anon
WITH CHECK (false);

CREATE POLICY "Service role can update founder_profiles"
ON public.founder_profiles
FOR UPDATE
TO authenticated, anon
USING (false)
WITH CHECK (false);

CREATE POLICY "Service role can delete founder_profiles"
ON public.founder_profiles
FOR DELETE
TO authenticated, anon
USING (false);

-- Apply same fix to whatsapp_messages table
DROP POLICY IF EXISTS "Restrict delete to service role only" ON public.whatsapp_messages;
DROP POLICY IF EXISTS "Restrict insert to service role only" ON public.whatsapp_messages;
DROP POLICY IF EXISTS "Restrict read to service role only" ON public.whatsapp_messages;
DROP POLICY IF EXISTS "Restrict update to service role only" ON public.whatsapp_messages;

CREATE POLICY "Service role can select whatsapp_messages"
ON public.whatsapp_messages
FOR SELECT
TO authenticated, anon
USING (false);

CREATE POLICY "Service role can insert whatsapp_messages"
ON public.whatsapp_messages
FOR INSERT
TO authenticated, anon
WITH CHECK (false);

CREATE POLICY "Service role can update whatsapp_messages"
ON public.whatsapp_messages
FOR UPDATE
TO authenticated, anon
USING (false)
WITH CHECK (false);

CREATE POLICY "Service role can delete whatsapp_messages"
ON public.whatsapp_messages
FOR DELETE
TO authenticated, anon
USING (false);