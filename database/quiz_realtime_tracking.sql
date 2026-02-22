-- ============================================
-- RASTREAMENTO EM TEMPO REAL DO QUIZ
-- Execute este SQL no Supabase SQL Editor
-- ============================================

-- Adicionar colunas para acompanhar o progresso em tempo real
ALTER TABLE public.quiz_participants 
ADD COLUMN IF NOT EXISTS current_progress INTEGER DEFAULT 0, -- Número de questões respondidas
ADD COLUMN IF NOT EXISTS current_score INTEGER DEFAULT 0, -- Pontuação atual (número de acertos)
ADD COLUMN IF NOT EXISTS last_updated TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW());

-- Adicionar política para permitir que o usuário atualize seu próprio progresso
-- (Já existe política de UPDATE para o próprio usuário? Vamos garantir)

DROP POLICY IF EXISTS "Users can update their own progress" ON public.quiz_participants;

CREATE POLICY "Users can update their own progress"
  ON public.quiz_participants FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Criar índice para performance em consultas de tempo real
CREATE INDEX IF NOT EXISTS idx_quiz_participants_progress ON public.quiz_participants(room_id, current_score DESC, current_progress DESC);
