-- ============================================
-- SISTEMA DE MENSAGENS
-- ============================================

-- Criar tabela de conversas
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Tabela de participantes da conversa
CREATE TABLE IF NOT EXISTS public.conversation_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(conversation_id, user_id)
);

-- Tabela de mensagens
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Índices para melhorar desempenho
CREATE INDEX IF NOT EXISTS idx_conversation_participants_conversation ON public.conversation_participants(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_participants_user ON public.conversation_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON public.messages(sender_id);

-- Habilitar RLS nas tabelas
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Função para obter ou criar uma conversa entre dois usuários
CREATE OR REPLACE FUNCTION public.get_or_create_conversation(user1_id UUID, user2_id UUID)
RETURNS UUID AS $$
DECLARE
  conversation_id UUID;
  existing_conversation RECORD;
BEGIN
  -- Verificar se já existe uma conversa entre os dois usuários
  SELECT cp1.conversation_id INTO existing_conversation
  FROM conversation_participants cp1
  JOIN conversation_participants cp2 ON cp1.conversation_id = cp2.conversation_id
  WHERE cp1.user_id = user1_id AND cp2.user_id = user2_id
  LIMIT 1;

  IF existing_conversation IS NOT NULL THEN
    RETURN existing_conversation.conversation_id;
  END IF;

  -- Criar nova conversa
  INSERT INTO public.conversations DEFAULT VALUES RETURNING id INTO conversation_id;
  
  -- Adicionar participantes à conversa
  INSERT INTO public.conversation_participants (conversation_id, user_id)
  VALUES (conversation_id, user1_id), (conversation_id, user2_id);
  
  RETURN conversation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para obter as conversas de um usuário
CREATE OR REPLACE FUNCTION public.get_user_conversations(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  other_user_id UUID,
  other_user_username TEXT,
  other_user_avatar TEXT,
  last_message TEXT,
  last_message_at TIMESTAMP WITH TIME ZONE,
  unread_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  WITH user_conversations AS (
    SELECT 
      c.id,
      cp.user_id as other_user_id,
      p.username as other_user_username,
      p.profile_image_url as other_user_avatar,
      c.updated_at
    FROM conversations c
    JOIN conversation_participants cp ON c.id = cp.conversation_id
    JOIN profiles p ON cp.user_id = p.id
    WHERE c.id IN (
      SELECT conversation_id 
      FROM conversation_participants 
      WHERE user_id = p_user_id
    )
    AND cp.user_id != p_user_id
  ),
  last_messages AS (
    SELECT 
      m.conversation_id,
      m.content as last_message,
      m.created_at as last_message_at,
      m.read as is_read
    FROM messages m
    INNER JOIN (
      SELECT conversation_id, MAX(created_at) as max_created_at
      FROM messages
      GROUP BY conversation_id
    ) lm ON m.conversation_id = lm.conversation_id AND m.created_at = lm.max_created_at
  ),
  unread_counts AS (
    SELECT 
      conversation_id,
      COUNT(*)::INTEGER as unread_count
    FROM messages
    WHERE read = FALSE AND sender_id != p_user_id
    GROUP BY conversation_id
  )
  SELECT 
    uc.id,
    uc.other_user_id,
    uc.other_user_username,
    uc.other_user_avatar,
    lm.last_message,
    lm.last_message_at,
    COALESCE(uc2.unread_count, 0) as unread_count
  FROM user_conversations uc
  LEFT JOIN last_messages lm ON uc.id = lm.conversation_id
  LEFT JOIN unread_counts uc2 ON uc.id = uc2.conversation_id
  ORDER BY lm.last_message_at DESC NULLS LAST, uc.updated_at DESC;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Políticas de segurança para conversas
CREATE POLICY "Users can view their own conversations"
  ON public.conversations FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM conversation_participants cp 
    WHERE cp.conversation_id = conversations.id 
    AND cp.user_id = auth.uid()
  ));

-- Políticas de segurança para participantes
CREATE POLICY "Users can view their own conversation participants"
  ON public.conversation_participants FOR SELECT
  USING (user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM conversation_participants cp
    WHERE cp.conversation_id = conversation_participants.conversation_id
    AND cp.user_id = auth.uid()
  ));

-- Políticas de segurança para mensagens
CREATE POLICY "Users can view messages in their conversations"
  ON public.messages FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM conversation_participants cp
    WHERE cp.conversation_id = messages.conversation_id
    AND cp.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert their own messages"
  ON public.messages FOR INSERT
  WITH CHECK (sender_id = auth.uid() AND EXISTS (
    SELECT 1 FROM conversation_participants cp
    WHERE cp.conversation_id = messages.conversation_id
    AND cp.user_id = auth.uid()
  ));

-- Trigger para atualizar updated_at nas conversas
CREATE OR REPLACE FUNCTION public.update_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations
  SET updated_at = NOW()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_conversation_timestamp_trigger
AFTER INSERT OR UPDATE ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.update_conversation_timestamp();

-- Função para marcar mensagens como lidas
CREATE OR REPLACE FUNCTION public.mark_messages_as_read(p_conversation_id UUID, p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.messages
  SET read = TRUE
  WHERE conversation_id = p_conversation_id
  AND sender_id != p_user_id
  AND read = FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
