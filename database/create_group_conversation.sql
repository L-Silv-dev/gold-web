-- ============================================
-- FUNÇÃO: criar conversa de grupo
-- Resolve PGRST202: função public.create_group_conversation ausente
-- Execute este SQL no Supabase SQL Editor
-- ============================================

CREATE OR REPLACE FUNCTION public.create_group_conversation(
  group_name TEXT,
  participant_ids UUID[],
  creator_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_conversation_id UUID;
  v_name TEXT := COALESCE(group_name, 'Grupo');
  v_only_admins BOOLEAN := false;
  has_is_admin BOOLEAN := FALSE;
  uid UUID;
  pid UUID;
BEGIN
  -- Determinar o criador: se não vier, usa auth.uid()
  IF creator_id IS NULL THEN
    uid := auth.uid();
  ELSE
    uid := creator_id;
  END IF;

  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Verificar se conversation_participants tem coluna is_admin
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'conversation_participants'
      AND column_name = 'is_admin'
  ) INTO has_is_admin;

  -- Criar conversa de grupo
  INSERT INTO public.conversations (is_group, name, admin_id, only_admins_can_post, created_at, updated_at)
  VALUES (true, v_name, uid, v_only_admins, NOW(), NOW())
  RETURNING id INTO v_conversation_id;

  -- Inserir o criador como participante (admin se coluna existir)
  IF has_is_admin THEN
    INSERT INTO public.conversation_participants (conversation_id, user_id, is_admin)
    VALUES (v_conversation_id, uid, true);
  ELSE
    INSERT INTO public.conversation_participants (conversation_id, user_id)
    VALUES (v_conversation_id, uid);
  END IF;

  -- Inserir demais participantes, evitando duplicatas e o próprio criador
  IF participant_ids IS NOT NULL AND array_length(participant_ids, 1) IS NOT NULL THEN
    FOREACH pid IN ARRAY participant_ids LOOP
      CONTINUE WHEN pid IS NULL OR pid = uid;
      -- Verificar se já existe
      IF NOT EXISTS (
        SELECT 1 FROM public.conversation_participants
        WHERE conversation_id = v_conversation_id AND user_id = pid
      ) THEN
        IF has_is_admin THEN
          INSERT INTO public.conversation_participants (conversation_id, user_id, is_admin)
          VALUES (v_conversation_id, pid, false);
        ELSE
          INSERT INTO public.conversation_participants (conversation_id, user_id)
          VALUES (v_conversation_id, pid);
        END IF;
      END IF;
    END LOOP;
  END IF;

  RETURN v_conversation_id;
END;
$$;

COMMENT ON FUNCTION public.create_group_conversation(TEXT, UUID[], UUID)
IS 'Cria uma conversa de grupo, adiciona participantes e retorna o ID da conversa.';

-- Opcional: garantir execução por roles comuns
GRANT EXECUTE ON FUNCTION public.create_group_conversation(TEXT, UUID[], UUID) TO authenticated;

-- Atualizar cache do schema para PostgREST
NOTIFY pgrst, 'reload schema';

