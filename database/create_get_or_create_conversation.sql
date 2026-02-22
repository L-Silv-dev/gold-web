-- ============================================
-- FUNÇÃO PARA OBTER OU CRIAR CONVERSA (1-para-1)
-- Execute este SQL no Supabase SQL Editor
-- ============================================

CREATE OR REPLACE FUNCTION public.get_or_create_conversation(
  user1_id UUID,
  user2_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER -- Executa com permissões elevadas para garantir criação
SET search_path = public
AS $$
DECLARE
  v_conversation_id UUID;
BEGIN
  -- 1. Tentar encontrar uma conversa existente entre os dois usuários
  -- Buscamos conversas que não são grupos e têm ambos os participantes
  SELECT c.id INTO v_conversation_id
  FROM conversations c
  JOIN conversation_participants cp1 ON c.id = cp1.conversation_id
  JOIN conversation_participants cp2 ON c.id = cp2.conversation_id
  WHERE c.is_group = false
  AND cp1.user_id = user1_id
  AND cp2.user_id = user2_id
  LIMIT 1;

  -- 2. Se encontrou, retorna o ID
  IF v_conversation_id IS NOT NULL THEN
    RETURN v_conversation_id;
  END IF;

  -- 3. Se não encontrou, cria uma nova conversa
  INSERT INTO conversations (is_group, created_at, updated_at)
  VALUES (false, NOW(), NOW())
  RETURNING id INTO v_conversation_id;

  -- 4. Adiciona os participantes
  -- Removida coluna 'joined_at' que não existe na tabela
  INSERT INTO conversation_participants (conversation_id, user_id)
  VALUES 
    (v_conversation_id, user1_id),
    (v_conversation_id, user2_id);

  RETURN v_conversation_id;
END;
$$;

-- Permissões
GRANT EXECUTE ON FUNCTION public.get_or_create_conversation(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_or_create_conversation(UUID, UUID) TO service_role;

-- Comentário
COMMENT ON FUNCTION public.get_or_create_conversation IS 'Obtém ID de conversa existente entre dois usuários ou cria uma nova se não existir';
