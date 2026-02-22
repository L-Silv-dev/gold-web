-- ATENÇÃO: EXECUTE ESTE SCRIPT NO SUPABASE SQL EDITOR

-- 1. Adicionar coluna is_admin na tabela de participantes
ALTER TABLE conversation_participants 
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- 2. Migrar administradores existentes (da tabela conversations para participants)
UPDATE conversation_participants cp
SET is_admin = TRUE
FROM conversations c
WHERE cp.conversation_id = c.id AND cp.user_id = c.admin_id;

-- 3. Função para promover a Admin (agora suporta múltiplos admins)
CREATE OR REPLACE FUNCTION promote_to_admin(
  conversation_id_param UUID,
  new_admin_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verifica se quem chamou é admin
  IF EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_id = conversation_id_param
    AND user_id = auth.uid()
    AND is_admin = TRUE
  ) THEN
    UPDATE conversation_participants
    SET is_admin = TRUE
    WHERE conversation_id = conversation_id_param AND user_id = new_admin_id;
  ELSE
    RAISE EXCEPTION 'Permissão negada: Apenas administradores podem promover outros.';
  END IF;
END;
$$;

-- 4. Função para remover Admin (rebaixar)
CREATE OR REPLACE FUNCTION dismiss_admin(
  conversation_id_param UUID,
  target_user_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_id = conversation_id_param
    AND user_id = auth.uid()
    AND is_admin = TRUE
  ) THEN
    UPDATE conversation_participants
    SET is_admin = FALSE
    WHERE conversation_id = conversation_id_param AND user_id = target_user_id;
  ELSE
    RAISE EXCEPTION 'Permissão negada: Apenas administradores podem rebaixar outros.';
  END IF;
END;
$$;

-- 5. Função para Admin apagar mensagens (exceto de outros admins)
CREATE OR REPLACE FUNCTION delete_message_as_admin(
  message_id_param UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_conversation_id UUID;
  v_sender_id UUID;
  v_sender_is_admin BOOLEAN;
BEGIN
  -- Obter dados da mensagem
  SELECT conversation_id, sender_id INTO v_conversation_id, v_sender_id
  FROM messages
  WHERE id = message_id_param;

  IF v_conversation_id IS NULL THEN
    RAISE EXCEPTION 'Mensagem não encontrada.';
  END IF;

  -- Se for minha própria mensagem, sempre posso apagar (o RLS padrão já permitiria, mas aqui reforçamos)
  IF v_sender_id = auth.uid() THEN
     DELETE FROM messages WHERE id = message_id_param;
     RETURN;
  END IF;

  -- Verificar se quem chamou é admin
  IF EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_id = v_conversation_id
    AND user_id = auth.uid()
    AND is_admin = TRUE
  ) THEN
    -- Verificar se o REMETENTE da mensagem também é admin
    SELECT is_admin INTO v_sender_is_admin
    FROM conversation_participants
    WHERE conversation_id = v_conversation_id
    AND user_id = v_sender_id;

    -- Se o remetente for admin e não for eu mesmo (já checado acima), NÃO posso apagar
    IF v_sender_is_admin IS TRUE THEN
      RAISE EXCEPTION 'Permissão negada: Administradores não podem apagar mensagens de outros administradores.';
    ELSE
      -- Remetente não é admin, posso apagar
      DELETE FROM messages WHERE id = message_id_param;
    END IF;
  ELSE
    RAISE EXCEPTION 'Permissão negada: Apenas administradores podem apagar mensagens de outros.';
  END IF;
END;
$$;

-- 6. Atualizar add_group_participant para verificar a flag is_admin
CREATE OR REPLACE FUNCTION add_group_participant(
  conversation_id_param UUID,
  user_id_to_add UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_id = conversation_id_param
    AND user_id = auth.uid()
    AND is_admin = TRUE
  ) THEN
    INSERT INTO conversation_participants (conversation_id, user_id)
    VALUES (conversation_id_param, user_id_to_add)
    ON CONFLICT (conversation_id, user_id) DO NOTHING;
  ELSE
    RAISE EXCEPTION 'Permissão negada: Apenas administradores podem adicionar participantes.';
  END IF;
END;
$$;

-- 7. Atualizar remove_group_participant
CREATE OR REPLACE FUNCTION remove_group_participant(
  conversation_id_param UUID,
  user_id_to_remove UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_id = conversation_id_param
    AND user_id = auth.uid()
    AND is_admin = TRUE
  ) THEN
    DELETE FROM conversation_participants
    WHERE conversation_id = conversation_id_param AND user_id = user_id_to_remove;
  ELSE
    RAISE EXCEPTION 'Permissão negada: Apenas administradores podem remover participantes.';
  END IF;
END;
$$;
