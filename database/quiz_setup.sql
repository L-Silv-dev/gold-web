-- ============================================
-- SISTEMA DE QUIZ ONLINE
-- Execute este SQL no Supabase SQL Editor
-- ============================================

-- ============================================
-- 1. TABELA DE QUIZZES
-- ============================================

CREATE TABLE IF NOT EXISTS public.quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ============================================
-- 2. TABELA DE PERGUNTAS DO QUIZ
-- ============================================

CREATE TABLE IF NOT EXISTS public.quiz_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID REFERENCES public.quizzes(id) ON DELETE CASCADE NOT NULL,
  question_text TEXT NOT NULL,
  option_a TEXT NOT NULL,
  option_b TEXT NOT NULL,
  option_c TEXT NOT NULL,
  option_d TEXT NOT NULL,
  correct_answer TEXT NOT NULL CHECK (correct_answer IN ('a', 'b', 'c', 'd')),
  time_per_question INTEGER NOT NULL DEFAULT 60, -- tempo em segundos
  question_order INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ============================================
-- 3. TABELA DE SALAS DE QUIZ
-- ============================================

CREATE TABLE IF NOT EXISTS public.quiz_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID REFERENCES public.quizzes(id) ON DELETE CASCADE NOT NULL,
  room_code TEXT UNIQUE NOT NULL, -- código único da sala
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE
);

-- ============================================
-- 4. TABELA DE PARTICIPANTES DA SALA
-- ============================================

CREATE TABLE IF NOT EXISTS public.quiz_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES public.quiz_rooms(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(room_id, user_id)
);

-- ============================================
-- 5. TABELA DE RESULTADOS DO QUIZ
-- ============================================

CREATE TABLE IF NOT EXISTS public.quiz_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES public.quiz_rooms(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  quiz_id UUID REFERENCES public.quizzes(id) ON DELETE CASCADE NOT NULL,
  total_questions INTEGER NOT NULL,
  correct_answers INTEGER NOT NULL,
  score DECIMAL(5,2) NOT NULL, -- porcentagem de acertos
  time_taken INTEGER, -- tempo total em segundos
  answers JSONB, -- armazena as respostas do usuário: {"question_id": "answer", ...}
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(room_id, user_id)
);

-- ============================================
-- 6. HABILITAR RLS
-- ============================================

ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_results ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 7. POLÍTICAS RLS PARA QUIZZES
-- ============================================

-- Política de leitura permanece aberta
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'quizzes' AND policyname = 'Anyone can view quizzes'
  ) THEN
    CREATE POLICY "Anyone can view quizzes"
      ON public.quizzes FOR SELECT
      USING (true);
  END IF;
END $$;

-- Substituir políticas permissivas por políticas de propriedade
DROP POLICY IF EXISTS "Admins can create quizzes" ON public.quizzes;
DROP POLICY IF EXISTS "Admins can update quizzes" ON public.quizzes;
DROP POLICY IF EXISTS "Admins can delete quizzes" ON public.quizzes;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'quizzes' AND policyname = 'Users can create own quizzes'
  ) THEN
    CREATE POLICY "Users can create own quizzes"
      ON public.quizzes FOR INSERT
      WITH CHECK (auth.uid() = created_by);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'quizzes' AND policyname = 'Owner can update quizzes'
  ) THEN
    CREATE POLICY "Owner can update quizzes"
      ON public.quizzes FOR UPDATE
      USING (auth.uid() = created_by)
      WITH CHECK (auth.uid() = created_by);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'quizzes' AND policyname = 'Owner can delete quizzes'
  ) THEN
    CREATE POLICY "Owner can delete quizzes"
      ON public.quizzes FOR DELETE
      USING (auth.uid() = created_by);
  END IF;
END $$;

-- ============================================
-- 8. POLÍTICAS RLS PARA PERGUNTAS
-- ============================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'quiz_questions' AND policyname = 'Anyone can view quiz questions'
  ) THEN
    CREATE POLICY "Anyone can view quiz questions"
      ON public.quiz_questions FOR SELECT
      USING (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'quiz_questions' AND policyname = 'Admins can create quiz questions'
  ) THEN
    CREATE POLICY "Admins can create quiz questions"
      ON public.quiz_questions FOR INSERT
      WITH CHECK (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'quiz_questions' AND policyname = 'Admins can update quiz questions'
  ) THEN
    CREATE POLICY "Admins can update quiz questions"
      ON public.quiz_questions FOR UPDATE
      USING (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'quiz_questions' AND policyname = 'Admins can delete quiz questions'
  ) THEN
    CREATE POLICY "Admins can delete quiz questions"
      ON public.quiz_questions FOR DELETE
      USING (true);
  END IF;
END $$;

-- ============================================
-- 9. POLÍTICAS RLS PARA SALAS
-- ============================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'quiz_rooms' AND policyname = 'Anyone can view active quiz rooms'
  ) THEN
    CREATE POLICY "Anyone can view active quiz rooms"
      ON public.quiz_rooms FOR SELECT
      USING (is_active = true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'quiz_rooms' AND policyname = 'Anyone can create quiz rooms'
  ) THEN
    CREATE POLICY "Anyone can create quiz rooms"
      ON public.quiz_rooms FOR INSERT
      WITH CHECK (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'quiz_rooms' AND policyname = 'Room creator can update quiz rooms'
  ) THEN
    CREATE POLICY "Room creator can update quiz rooms"
      ON public.quiz_rooms FOR UPDATE
      USING (auth.uid() = created_by);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'quiz_rooms' AND policyname = 'Room creator can delete quiz rooms'
  ) THEN
    CREATE POLICY "Room creator can delete quiz rooms"
      ON public.quiz_rooms FOR DELETE
      USING (auth.uid() = created_by);
  END IF;
END $$;

-- ============================================
-- 10. POLÍTICAS RLS PARA PARTICIPANTES
-- ============================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'quiz_participants' AND policyname = 'Anyone can view quiz participants'
  ) THEN
    CREATE POLICY "Anyone can view quiz participants"
      ON public.quiz_participants FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.quiz_rooms 
          WHERE quiz_rooms.id = quiz_participants.room_id 
          AND quiz_rooms.is_active = true
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'quiz_participants' AND policyname = 'Anyone can join quiz rooms'
  ) THEN
    CREATE POLICY "Anyone can join quiz rooms"
      ON public.quiz_participants FOR INSERT
      WITH CHECK (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'quiz_participants' AND policyname = 'Users can leave quiz rooms'
  ) THEN
    CREATE POLICY "Users can leave quiz rooms"
      ON public.quiz_participants FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- ============================================
-- 11. POLÍTICAS RLS PARA RESULTADOS
-- ============================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'quiz_results' AND policyname = 'Users can view their own results'
  ) THEN
    CREATE POLICY "Users can view their own results"
      ON public.quiz_results FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'quiz_results' AND policyname = 'Users can insert their own quiz results'
  ) THEN
    CREATE POLICY "Users can insert their own quiz results"
      ON public.quiz_results FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'quiz_results' AND policyname = 'Users can update their own quiz results'
  ) THEN
    CREATE POLICY "Users can update their own quiz results"
      ON public.quiz_results FOR UPDATE
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- ============================================
-- 12. ÍNDICES PARA PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_quiz_questions_quiz_id ON public.quiz_questions(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_rooms_quiz_id ON public.quiz_rooms(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_rooms_room_code ON public.quiz_rooms(room_code);
CREATE INDEX IF NOT EXISTS idx_quiz_rooms_is_active ON public.quiz_rooms(is_active);
CREATE INDEX IF NOT EXISTS idx_quiz_participants_room_id ON public.quiz_participants(room_id);
CREATE INDEX IF NOT EXISTS idx_quiz_participants_user_id ON public.quiz_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_results_room_id ON public.quiz_results(room_id);
CREATE INDEX IF NOT EXISTS idx_quiz_results_user_id ON public.quiz_results(user_id);

-- ============================================
-- 13. FUNÇÃO PARA GERAR CÓDIGO DA SALA
-- ============================================

CREATE OR REPLACE FUNCTION generate_room_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..6 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 14. TRIGGER PARA ATUALIZAR updated_at
-- ============================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'set_quizzes_updated_at'
  ) THEN
    CREATE TRIGGER set_quizzes_updated_at
      BEFORE UPDATE ON public.quizzes
      FOR EACH ROW
      EXECUTE FUNCTION public.handle_updated_at();
  END IF;
END $$;

-- ============================================
-- 15. POLÍTICAS RLS ROBUSTAS PARA QUIZ_QUESTIONS
-- ============================================
-- Permitir INSERT apenas quando o usuário é criador do quiz
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'quiz_questions' AND policyname = 'Users can insert questions for own quiz'
  ) THEN
    CREATE POLICY "Users can insert questions for own quiz"
      ON public.quiz_questions
      FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.quizzes q
          WHERE q.id = quiz_questions.quiz_id
          AND q.created_by = auth.uid()
        )
      );
  END IF;

  -- Permitir UPDATE apenas quando o usuário é criador do quiz
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'quiz_questions' AND policyname = 'Users can update questions for own quiz'
  ) THEN
    CREATE POLICY "Users can update questions for own quiz"
      ON public.quiz_questions
      FOR UPDATE
      USING (
        EXISTS (
          SELECT 1 FROM public.quizzes q
          WHERE q.id = quiz_questions.quiz_id
          AND q.created_by = auth.uid()
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.quizzes q
          WHERE q.id = quiz_questions.quiz_id
          AND q.created_by = auth.uid()
        )
      );
  END IF;

  -- Permitir DELETE apenas quando o usuário é criador do quiz
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'quiz_questions' AND policyname = 'Users can delete questions for own quiz'
  ) THEN
    CREATE POLICY "Users can delete questions for own quiz"
      ON public.quiz_questions
      FOR DELETE
      USING (
        EXISTS (
          SELECT 1 FROM public.quizzes q
          WHERE q.id = quiz_questions.quiz_id
          AND q.created_by = auth.uid()
        )
      );
  END IF;
END $$;

-- ============================================
-- 16. FUNÇÃO RPC: CRIAR QUIZ COM PERGUNTAS
-- ============================================
CREATE OR REPLACE FUNCTION public.create_quiz_with_questions(
  p_name TEXT,
  p_subject TEXT,
  p_questions JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_quiz_id UUID;
  q JSONB;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  INSERT INTO public.quizzes (name, subject, created_by)
  VALUES (COALESCE(p_name, 'Quiz'), COALESCE(p_subject, 'Geral'), auth.uid())
  RETURNING id INTO v_quiz_id;

  IF p_questions IS NOT NULL THEN
    FOR q IN SELECT jsonb_array_elements(p_questions) LOOP
      INSERT INTO public.quiz_questions (
        quiz_id,
        question_text,
        option_a,
        option_b,
        option_c,
        option_d,
        correct_answer,
        time_per_question,
        question_order
      ) VALUES (
        v_quiz_id,
        q->>'question_text',
        q->>'option_a',
        q->>'option_b',
        q->>'option_c',
        q->>'option_d',
        COALESCE(q->>'correct_answer', 'a'),
        COALESCE(NULLIF(q->>'time_per_question','')::INT, 60),
        COALESCE(NULLIF(q->>'question_order','')::INT, 1)
      );
    END LOOP;
  END IF;

  RETURN v_quiz_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_quiz_with_questions(TEXT, TEXT, JSONB) TO authenticated;
NOTIFY pgrst, 'reload schema';

