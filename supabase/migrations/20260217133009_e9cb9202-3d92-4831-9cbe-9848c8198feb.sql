-- Add unique constraint on phone_number to prevent duplicate profiles
ALTER TABLE public.founder_profiles ADD CONSTRAINT founder_profiles_phone_number_unique UNIQUE (phone_number);