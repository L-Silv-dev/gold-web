-- ============================================
-- SISTEMA DE POSTS DE TEXTO
-- Execute este SQL no Supabase SQL Editor
-- ============================================

-- ============================================
-- 1. TABELA DE POSTS
-- ============================================

-- Criar tabela de posts
CREATE TABLE IF NOT EXISTS public.posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  author TEXT NOT NULL,
  author_avatar TEXT,
  content TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'text', -- 'text', 'image', 'video'
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Habilitar RLS na tabela posts
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 2. POLÍTICAS RLS PARA POSTS
-- ============================================

-- Remover políticas existentes (se houver)
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "posts_select_all" ON public.posts;
  DROP POLICY IF EXISTS "posts_insert_own" ON public.posts;
  DROP POLICY IF EXISTS "posts_update_own" ON public.posts;
  DROP POLICY IF EXISTS "posts_delete_own" ON public.posts;
EXCEPTION
  WHEN OTHERS THEN
    NULL;
END $$;

-- Política: Todos podem ver posts (para feed)
CREATE POLICY "posts_select_all"
  ON public.posts FOR SELECT
  USING (true);

-- Política: Usuários autenticados podem criar posts
CREATE POLICY "posts_insert_own"
  ON public.posts FOR INSERT
  WITH CHECK (auth.uid() = author_id);

-- Política: Usuários podem atualizar apenas seus próprios posts
CREATE POLICY "posts_update_own"
  ON public.posts FOR UPDATE
  USING (auth.uid() = author_id)
  WITH CHECK (auth.uid() = author_id);

-- Política: Usuários podem deletar apenas seus próprios posts
CREATE POLICY "posts_delete_own"
  ON public.posts FOR DELETE
  USING (auth.uid() = author_id);

-- ============================================
-- 3. TRIGGERS E FUNÇÕES
-- ============================================

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION public.handle_posts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::text, NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar updated_at
DROP TRIGGER IF EXISTS set_posts_updated_at ON public.posts;

CREATE TRIGGER set_posts_updated_at
  BEFORE UPDATE ON public.posts
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_posts_updated_at();

-- Função para criar post com dados do autor automaticamente
CREATE OR REPLACE FUNCTION public.create_post_with_author(
  p_content TEXT,
  p_type TEXT DEFAULT 'text',
  p_image_url TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  author_id UUID,
  author TEXT,
  author_avatar TEXT,
  content TEXT,
  type TEXT,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_author_name TEXT;
  v_author_avatar TEXT;
  v_username TEXT;
  v_new_post_id UUID;
BEGIN
  -- Obter ID do usuário autenticado
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;
  
  -- Buscar dados do perfil do autor
  SELECT 
    COALESCE(p.full_name, 'Usuário'),
    COALESCE(p.profile_image_url, ''),
    COALESCE(p.username, split_part(p.email, '@', 1))
  INTO v_author_name, v_author_avatar, v_username
  FROM public.profiles p
  WHERE p.id = v_user_id;
  
  -- Se não encontrou perfil, usar dados básicos
  IF v_author_name IS NULL THEN
    SELECT 
      COALESCE(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name', 'Usuário'),
      COALESCE(raw_user_meta_data->>'username', split_part(email, '@', 1))
    INTO v_author_name, v_username
    FROM auth.users
    WHERE id = v_user_id;
  END IF;
  
  -- Usar username se disponível, senão usar nome
  IF v_username IS NOT NULL AND v_username != '' THEN
    v_author_name := '@' || v_username;
  END IF;
  
  -- Inserir o post e capturar o ID
  INSERT INTO public.posts (author_id, author, author_avatar, content, type, image_url)
  VALUES (v_user_id, v_author_name, v_author_avatar, p_content, p_type, p_image_url)
  RETURNING posts.id INTO v_new_post_id;
  
  -- Retornar o post criado
  RETURN QUERY
  SELECT 
    p.id,
    p.author_id,
    p.author,
    p.author_avatar,
    p.content,
    p.type,
    p.image_url,
    p.created_at,
    p.updated_at
  FROM public.posts p
  WHERE p.id = v_new_post_id;
END;
$$;

-- Dar permissão para usuários autenticados usarem a função
GRANT EXECUTE ON FUNCTION public.create_post_with_author TO authenticated;

-- ============================================
-- 4. ÍNDICES PARA PERFORMANCE
-- ============================================

-- Índice para buscar posts por autor
CREATE INDEX IF NOT EXISTS posts_author_id_idx ON public.posts(author_id);

-- Índice para ordenar posts por data (mais recentes primeiro)
CREATE INDEX IF NOT EXISTS posts_created_at_idx ON public.posts(created_at DESC);

-- Índice para buscar posts por tipo
CREATE INDEX IF NOT EXISTS posts_type_idx ON public.posts(type);

-- ============================================
-- 5. COMENTÁRIOS E DOCUMENTAÇÃO
-- ============================================

COMMENT ON TABLE public.posts IS 'Tabela de posts/publicações dos usuários';
COMMENT ON COLUMN public.posts.id IS 'ID único do post';
COMMENT ON COLUMN public.posts.author_id IS 'ID do autor (FK para auth.users)';
COMMENT ON COLUMN public.posts.author IS 'Nome do autor (para exibição)';
COMMENT ON COLUMN public.posts.author_avatar IS 'URL do avatar do autor';
COMMENT ON COLUMN public.posts.content IS 'Conteúdo do post (texto)';
COMMENT ON COLUMN public.posts.type IS 'Tipo do post: text, image, video';
COMMENT ON COLUMN public.posts.image_url IS 'URL da imagem (se tipo for image)';

-- ============================================
-- FIM DO SCRIPT
-- ============================================

-- Para verificar se tudo foi criado:
-- SELECT * FROM public.posts ORDER BY created_at DESC LIMIT 10;
-- SELECT * FROM pg_policies WHERE tablename = 'posts';

