-- ============================================
-- CRIAÇÃO DA TABELA DE COMENTÁRIOS
-- Execute este SQL no Supabase SQL Editor
-- ============================================

-- Criar a tabela de comentários
CREATE TABLE IF NOT EXISTS public.post_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Criar índice para melhorar buscas por post_id
CREATE INDEX IF NOT EXISTS idx_post_comments_post_id ON public.post_comments(post_id);

-- Habilitar RLS na tabela de comentários
ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;

-- Remover políticas existentes (se houver)
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

-- Política: Qualquer pessoa pode ver os comentários
CREATE POLICY "Comments are viewable by everyone"
  ON public.post_comments FOR SELECT
  USING (true);

-- Política: Usuários autenticados podem inserir seus próprios comentários
CREATE POLICY "Users can insert their own comments"
  ON public.post_comments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Política: Usuários podem atualizar apenas seus próprios comentários
CREATE POLICY "Users can update their own comments"
  ON public.post_comments FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Política: Usuários podem deletar apenas seus próprios comentários
CREATE POLICY "Users can delete their own comments"
  ON public.post_comments FOR DELETE
  USING (auth.uid() = user_id);

-- Adicionar trigger para atualizar updated_at
CREATE TRIGGER update_post_comments_updated_at
  BEFORE UPDATE ON public.post_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

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

-- Comentários para documentação
COMMENT ON TABLE public.post_comments IS 'Tabela de comentários em posts';
COMMENT ON COLUMN public.post_comments.id IS 'ID único do comentário';
COMMENT ON COLUMN public.post_comments.post_id IS 'ID do post (FK para posts)';
COMMENT ON COLUMN public.post_comments.user_id IS 'ID do autor do comentário (FK para auth.users)';
COMMENT ON COLUMN public.post_comments.content IS 'Conteúdo do comentário';
COMMENT ON COLUMN public.post_comments.created_at IS 'Data de criação do comentário';
COMMENT ON COLUMN public.post_comments.updated_at IS 'Data da última atualização do comentário';

-- ============================================
-- FIM DO SCRIPT
-- ============================================
