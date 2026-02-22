-- COPIE E COLE ESTE CÓDIGO NO EDITOR SQL DO SUPABASE (Dashboard -> SQL Editor)

-- Função para o ADMIN adicionar participantes ao grupo
-- Ignora o RLS padrão para permitir que o admin insira registros para outros usuários
CREATE OR REPLACE FUNCTION add_group_participant(
  conversation_id_param UUID,
  user_id_to_add UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verifica se o usuário que está executando a função (auth.uid()) é o admin do grupo
  IF EXISTS (
    SELECT 1 FROM conversations
    WHERE id = conversation_id_param
    AND admin_id = auth.uid()
  ) THEN
    -- Insere o novo participante
    INSERT INTO conversation_participants (conversation_id, user_id)
    VALUES (conversation_id_param, user_id_to_add)
    ON CONFLICT (conversation_id, user_id) DO NOTHING;
  ELSE
    RAISE EXCEPTION 'Permissão negada: Apenas administradores podem adicionar participantes.';
  END IF;
END;
$$;

-- Função para o ADMIN promover outro usuário a admin
CREATE OR REPLACE FUNCTION promote_to_admin(
  conversation_id_param UUID,
  new_admin_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verifica se o usuário atual é o admin do grupo
  IF EXISTS (
    SELECT 1 FROM conversations
    WHERE id = conversation_id_param
    AND admin_id = auth.uid()
  ) THEN
    -- Atualiza o admin do grupo
    UPDATE conversations
    SET admin_id = new_admin_id
    WHERE id = conversation_id_param;
  ELSE
    RAISE EXCEPTION 'Permissão negada: Apenas o administrador atual pode promover outros.';
  END IF;
END;
$$;
