-- ============================================
-- FIX: GET POST COMMENTS FUNCTION
-- Resolves "Could not find the function public.get_post_comments" error
-- Execute this SQL in Supabase SQL Editor
-- ============================================

-- 1. Ensure the extension for UUID generation is enabled
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Drop the function if it exists to ensure clean recreation
DROP FUNCTION IF EXISTS public.get_post_comments(UUID);

-- 3. Ensure table post_comments exists
CREATE TABLE IF NOT EXISTS public.post_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;

-- 4. Recreate policies to ensure access
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Comments are viewable by everyone" ON public.post_comments;
  DROP POLICY IF EXISTS "Users can insert their own comments" ON public.post_comments;
  DROP POLICY IF EXISTS "Users can update their own comments" ON public.post_comments;
  DROP POLICY IF EXISTS "Users can delete their own comments" ON public.post_comments;
EXCEPTION
  WHEN OTHERS THEN
    NULL;
END $$;

CREATE POLICY "Comments are viewable by everyone" ON public.post_comments FOR SELECT USING (true);
CREATE POLICY "Users can insert their own comments" ON public.post_comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own comments" ON public.post_comments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own comments" ON public.post_comments FOR DELETE USING (auth.uid() = user_id);

-- 5. Create the function correctly
CREATE OR REPLACE FUNCTION public.get_post_comments(p_post_id UUID)
RETURNS TABLE (
  id UUID,
  content TEXT,
  created_at TIMESTAMPTZ,
  user_id UUID,
  author_name TEXT,
  author_avatar TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.content,
    c.created_at,
    c.user_id,
    COALESCE(p.full_name, p.username, 'Usuário') AS author_name,
    p.profile_image_url AS author_avatar
  FROM public.post_comments c
  LEFT JOIN public.profiles p ON c.user_id = p.id
  WHERE c.post_id = p_post_id
  ORDER BY c.created_at ASC;
END;
$$;

-- 6. Grant execution permission (CRITICAL STEP)
GRANT EXECUTE ON FUNCTION public.get_post_comments(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_post_comments(UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.get_post_comments(UUID) TO public;

-- 7. Comment for documentation
COMMENT ON FUNCTION public.get_post_comments IS 'Fetches comments for a post with author details.';

-- 8. Refresh schema cache hint (sometimes needed)
NOTIFY pgrst, 'reload schema';
