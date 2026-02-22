-- ============================================
-- SISTEMA DE SEGUIDORES/AMIGOS
-- ============================================

-- Criar tabela para relacionamentos de seguidores
CREATE TABLE IF NOT EXISTS public.user_followers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(follower_id, following_id) -- Evita duplicatas
);

-- Criar índices para melhorar consultas
CREATE INDEX IF NOT EXISTS idx_followers_follower ON public.user_followers(follower_id);
CREATE INDEX IF NOT EXISTS idx_followers_following ON public.user_followers(following_id);

-- Habilitar RLS na tabela
ALTER TABLE public.user_followers ENABLE ROW LEVEL SECURITY;

-- Remover políticas existentes (se houver)
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "followers_select_own" ON public.user_followers;
  DROP POLICY IF EXISTS "followers_insert_own" ON public.user_followers;
  DROP POLICY IF EXISTS "followers_delete_own" ON public.user_followers;
EXCEPTION
  WHEN OTHERS THEN
    NULL;
END $$;

-- Política: Usuários podem ver seus próprios seguidores/seguindo
CREATE POLICY "followers_select_own"
  ON public.user_followers FOR SELECT
  USING (auth.uid() = follower_id OR auth.uid() = following_id);

-- Política: Usuários podem seguir outros usuários
CREATE POLICY "followers_insert_own"
  ON public.user_followers FOR INSERT
  WITH CHECK (auth.uid() = follower_id);

-- Política: Usuários podem deixar de seguir
CREATE POLICY "followers_delete_own"
  ON public.user_followers FOR DELETE
  USING (auth.uid() = follower_id);

-- Função para verificar se um usuário segue outro
CREATE OR REPLACE FUNCTION public.is_following(follower_uuid UUID, following_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.user_followers 
    WHERE follower_id = follower_uuid 
    AND following_id = following_uuid
  );
END;
$$ LANGUAGE plpgsql STABLE;
