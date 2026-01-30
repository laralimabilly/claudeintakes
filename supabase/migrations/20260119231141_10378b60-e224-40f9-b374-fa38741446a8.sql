-- Drop the existing restrictive policies that block all access
DROP POLICY IF EXISTS "Service role can delete founder_profiles" ON public.founder_profiles;
DROP POLICY IF EXISTS "Service role can insert founder_profiles" ON public.founder_profiles;
DROP POLICY IF EXISTS "Service role can select founder_profiles" ON public.founder_profiles;
DROP POLICY IF EXISTS "Service role can update founder_profiles" ON public.founder_profiles;

-- Create PERMISSIVE policies for proper access control

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
ON public.founder_profiles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles"
ON public.founder_profiles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
ON public.founder_profiles
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Admins can update all profiles
CREATE POLICY "Admins can update all profiles"
ON public.founder_profiles
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Admins can insert profiles
CREATE POLICY "Admins can insert profiles"
ON public.founder_profiles
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Admins can delete profiles
CREATE POLICY "Admins can delete profiles"
ON public.founder_profiles
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Block anonymous access completely
CREATE POLICY "Block anonymous select"
ON public.founder_profiles
FOR SELECT
TO anon
USING (false);

CREATE POLICY "Block anonymous insert"
ON public.founder_profiles
FOR INSERT
TO anon
WITH CHECK (false);

CREATE POLICY "Block anonymous update"
ON public.founder_profiles
FOR UPDATE
TO anon
USING (false)
WITH CHECK (false);

CREATE POLICY "Block anonymous delete"
ON public.founder_profiles
FOR DELETE
TO anon
USING (false);