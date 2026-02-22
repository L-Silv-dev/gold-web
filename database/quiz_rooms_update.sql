-- ============================================
-- ATUALIZAÇÃO DA TABELA QUIZ_ROOMS
-- Execute este SQL no Supabase SQL Editor
-- ============================================

-- Adicionar colunas para controle de status e limite de participantes
ALTER TABLE public.quiz_rooms 
ADD COLUMN IF NOT EXISTS max_participants INTEGER DEFAULT 0, -- 0 = ilimitado
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'waiting' CHECK (status IN ('waiting', 'started', 'finished'));

-- Criar índice para status para melhor performance
CREATE INDEX IF NOT EXISTS idx_quiz_rooms_status ON public.quiz_rooms(status);

-- Atualizar salas existentes para status 'waiting'
UPDATE public.quiz_rooms SET status = 'waiting' WHERE status IS NULL;

-- Adicionar comentários
COMMENT ON COLUMN public.quiz_rooms.max_participants IS 'Número máximo de participantes (0 = ilimitado)';
COMMENT ON COLUMN public.quiz_rooms.status IS 'Status da sala: waiting (aguardando), started (iniciada), finished (finalizada)';

