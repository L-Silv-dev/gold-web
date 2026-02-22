-- ============================================
-- CRIAÇÃO DA FUNÇÃO GET_POST_COMMENTS
-- Execute este SQL no Supabase SQL Editor para corrigir o erro PGRST202
-- ============================================

-- Função para buscar comentários com informações do autor
CREATE OR REPLACE FUNCTION public.get_post_comments(p_post_id UUID)
RETURNS TABLE (
  id UUID,
  content TEXT,
  created_at TIMESTAMPTZ,
  user_id UUID,
  author_name TEXT,
  author_avatar TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.content,
    c.created_at,
    c.user_id,
    p.full_name AS author_name,
    p.profile_image_url AS author_avatar
  FROM public.post_comments c
  JOIN public.profiles p ON c.user_id = p.id
  WHERE c.post_id = p_post_id
  ORDER BY c.created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
