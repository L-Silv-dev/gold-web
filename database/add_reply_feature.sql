-- Adicionar coluna reply_to_id na tabela messages
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS reply_to_id UUID REFERENCES public.messages(id) ON DELETE SET NULL;

-- Criar índice para reply_to_id
CREATE INDEX IF NOT EXISTS idx_messages_reply_to ON public.messages(reply_to_id);

-- Política para permitir que usuários apaguem suas próprias mensagens
DROP POLICY IF EXISTS "Users can delete their own messages" ON public.messages;
CREATE POLICY "Users can delete their own messages"
  ON public.messages FOR DELETE
  USING (sender_id = auth.uid());

-- Atualizar a view ou query de mensagens pode ser necessário no front-end
-- Mas no banco está tudo certo.
