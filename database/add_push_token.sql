-- Add expo_push_token to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS expo_push_token TEXT;

-- Index for faster lookups (optional but good practice)
CREATE INDEX IF NOT EXISTS profiles_expo_push_token_idx ON public.profiles(expo_push_token);
