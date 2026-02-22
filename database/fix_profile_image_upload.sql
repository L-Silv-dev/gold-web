-- ============================================
-- CORREÇÃO COMPLETA PARA UPLOAD DE FOTO DE PERFIL
-- Execute este SQL no Supabase SQL Editor
-- ============================================

-- ============================================
-- 1. VERIFICAR E CRIAR TABELA PROFILES (se não existir)
-- ============================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  username TEXT UNIQUE,
  bio TEXT,
  school TEXT,
  profile_image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Garantir que a coluna profile_image_url existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'profile_image_url'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN profile_image_url TEXT;
  END IF;
END $$;

-- ============================================
-- 2. HABILITAR RLS E CONFIGURAR POLÍTICAS
-- ============================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Remover políticas antigas
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
  DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
  DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
  DROP POLICY IF EXISTS "Users can delete own profile" ON public.profiles;
EXCEPTION
  WHEN OTHERS THEN
    NULL;
END $$;

-- Política: Todos podem ver perfis
CREATE POLICY "Public profiles are viewable by everyone"
  ON public.profiles FOR SELECT
  USING (true);

-- Política: Usuários podem inserir seu próprio perfil
CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Política: Usuários podem atualizar apenas seu próprio perfil
-- IMPORTANTE: Esta política permite atualizar profile_image_url
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Política: Usuários podem deletar apenas seu próprio perfil
CREATE POLICY "Users can delete own profile"
  ON public.profiles FOR DELETE
  USING (auth.uid() = id);

-- ============================================
-- 3. CRIAR/ATUALIZAR BUCKET profile-pictures
-- ============================================

-- Criar bucket se não existir
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'profile-pictures',
  'profile-pictures',
  true,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

-- ============================================
-- 4. REMOVER E RECRIAR POLÍTICAS DE STORAGE
-- ============================================

-- Remover todas as políticas antigas
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "profile_pictures_select" ON storage.objects;
  DROP POLICY IF EXISTS "profile_pictures_insert" ON storage.objects;
  DROP POLICY IF EXISTS "profile_pictures_update" ON storage.objects;
  DROP POLICY IF EXISTS "profile_pictures_delete" ON storage.objects;
  DROP POLICY IF EXISTS "Public Access" ON storage.objects;
  DROP POLICY IF EXISTS "Users can upload own profile picture" ON storage.objects;
  DROP POLICY IF EXISTS "Users can update own profile picture" ON storage.objects;
  DROP POLICY IF EXISTS "Users can delete own profile picture" ON storage.objects;
EXCEPTION
  WHEN OTHERS THEN
    NULL;
END $$;

-- Política 1: SELECT (Leitura Pública)
CREATE POLICY "profile_pictures_select"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'profile-pictures');

-- Política 2: INSERT (Upload)
-- Permite upload na pasta do próprio usuário
-- Estrutura: {userId}/profile.{ext}
CREATE POLICY "profile_pictures_insert"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'profile-pictures'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Política 3: UPDATE (Atualização)
-- Permite atualizar arquivos na própria pasta
CREATE POLICY "profile_pictures_update"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'profile-pictures'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'profile-pictures'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Política 4: DELETE (Exclusão)
-- Permite deletar arquivos da própria pasta
CREATE POLICY "profile_pictures_delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'profile-pictures'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ============================================
-- 5. VERIFICAÇÕES
-- ============================================

-- Verificar tabela profiles
SELECT 
  '✅ Tabela profiles:' as status,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'profiles'
ORDER BY ordinal_position;

-- Verificar bucket
SELECT 
  '✅ Bucket:' as status,
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
FROM storage.buckets
WHERE id = 'profile-pictures';

-- Verificar políticas RLS da tabela profiles
SELECT 
  '✅ Políticas RLS profiles:' as status,
  schemaname,
  tablename,
  policyname,
  cmd as operation
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'profiles'
ORDER BY policyname;

-- Verificar políticas de storage
SELECT 
  '✅ Políticas Storage:' as status,
  schemaname,
  tablename,
  policyname,
  cmd as operation
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
  AND policyname LIKE 'profile_pictures%'
ORDER BY policyname;

-- ============================================
-- FIM DO SCRIPT
-- ============================================

-- 📋 O QUE ESTE SCRIPT FAZ:
-- ✅ Garante que a tabela profiles existe com a coluna profile_image_url
-- ✅ Configura RLS corretamente na tabela profiles
-- ✅ Cria/atualiza o bucket profile-pictures
-- ✅ Configura todas as políticas de storage necessárias
-- ✅ Verifica se tudo foi criado corretamente
--
-- 🔍 POSSÍVEIS PROBLEMAS RESOLVIDOS:
-- 1. Tabela profiles não existe ou falta coluna profile_image_url
-- 2. Políticas RLS bloqueando UPDATE
-- 3. Bucket não existe ou não está público
-- 4. Políticas de storage incorretas ou ausentes



