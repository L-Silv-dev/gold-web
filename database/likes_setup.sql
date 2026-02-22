-- ============================================
-- SISTEMA DE CURTIDAS (LIKES)
-- Execute este SQL no Supabase SQL Editor
-- ============================================

-- ============================================
-- 1. TABELA DE LIKES
-- ============================================

-- Criar tabela de likes/curtidas
CREATE TABLE IF NOT EXISTS public.post_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(post_id, user_id) -- Um usuário só pode curtir uma vez cada post
);

-- Habilitar RLS na tabela post_likes
ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 2. POLÍTICAS RLS PARA LIKES
-- ============================================

-- Remover políticas existentes (se houver)
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "likes_select_all" ON public.post_likes;
  DROP POLICY IF EXISTS "likes_insert_own" ON public.post_likes;
  DROP POLICY IF EXISTS "likes_delete_own" ON public.post_likes;
EXCEPTION
  WHEN OTHERS THEN
    NULL;
END $$;

-- Política: Todos podem ver likes
CREATE POLICY "likes_select_all"
  ON public.post_likes FOR SELECT
  USING (true);

-- Política: Usuários autenticados podem curtir posts
CREATE POLICY "likes_insert_own"
  ON public.post_likes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Política: Usuários podem descurtir apenas seus próprios likes
CREATE POLICY "likes_delete_own"
  ON public.post_likes FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- 3. ÍNDICES PARA PERFORMANCE
-- ============================================

-- Índice para buscar likes de um post
CREATE INDEX IF NOT EXISTS post_likes_post_id_idx ON public.post_likes(post_id);

-- Índice para buscar likes de um usuário
CREATE INDEX IF NOT EXISTS post_likes_user_id_idx ON public.post_likes(user_id);

-- Índice composto para verificar se usuário já curtiu
CREATE INDEX IF NOT EXISTS post_likes_post_user_idx ON public.post_likes(post_id, user_id);

-- ============================================
-- 4. FUNÇÕES ÚTEIS
-- ============================================

-- Função para toggle like (curtir/descurtir)
CREATE OR REPLACE FUNCTION public.toggle_post_like(p_post_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_like_exists BOOLEAN;
  v_like_count INTEGER;
  v_is_liked BOOLEAN;
BEGIN
  -- Obter ID do usuário autenticado
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;
  
  -- Verificar se o usuário já curtiu o post
  SELECT EXISTS(
    SELECT 1 FROM public.post_likes 
    WHERE post_id = p_post_id AND user_id = v_user_id
  ) INTO v_like_exists;
  
  IF v_like_exists THEN
    -- Descurtir (remover like)
    DELETE FROM public.post_likes 
    WHERE post_id = p_post_id AND user_id = v_user_id;
    v_is_liked := false;
  ELSE
    -- Curtir (adicionar like)
    INSERT INTO public.post_likes (post_id, user_id)
    VALUES (p_post_id, v_user_id)
    ON CONFLICT (post_id, user_id) DO NOTHING;
    v_is_liked := true;
  END IF;
  
  -- Contar total de likes do post
  SELECT COUNT(*) INTO v_like_count
  FROM public.post_likes
  WHERE post_id = p_post_id;
  
  -- Retornar resultado
  RETURN json_build_object(
    'is_liked', v_is_liked,
    'like_count', v_like_count
  );
END;
$$;

-- Dar permissão para usuários autenticados usarem a função
GRANT EXECUTE ON FUNCTION public.toggle_post_like TO authenticated;

-- Função para verificar se usuário curtiu um post
CREATE OR REPLACE FUNCTION public.is_post_liked(p_post_id UUID, p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_user_id IS NULL THEN
    RETURN false;
  END IF;
  
  RETURN EXISTS(
    SELECT 1 FROM public.post_likes 
    WHERE post_id = p_post_id AND user_id = p_user_id
  );
END;
$$;

-- Dar permissão para usuários autenticados usarem a função
GRANT EXECUTE ON FUNCTION public.is_post_liked TO authenticated;

-- Função para contar likes de um post
CREATE OR REPLACE FUNCTION public.get_post_like_count(p_post_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM public.post_likes
  WHERE post_id = p_post_id;
  
  RETURN COALESCE(v_count, 0);
END;
$$;

-- Dar permissão para todos usarem a função
GRANT EXECUTE ON FUNCTION public.get_post_like_count TO authenticated, anon;

-- ============================================
-- 5. COMENTÁRIOS E DOCUMENTAÇÃO
-- ============================================

COMMENT ON TABLE public.post_likes IS 'Tabela de curtidas/likes dos posts';
COMMENT ON COLUMN public.post_likes.id IS 'ID único do like';
COMMENT ON COLUMN public.post_likes.post_id IS 'ID do post curtido (FK para posts)';
COMMENT ON COLUMN public.post_likes.user_id IS 'ID do usuário que curtiu (FK para auth.users)';

-- ============================================
-- FIM DO SCRIPT
-- ============================================

-- Para verificar se tudo foi criado:
-- SELECT * FROM public.post_likes;
-- SELECT * FROM pg_policies WHERE tablename = 'post_likes';







