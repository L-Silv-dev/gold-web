-- ============================================
-- VERIFICAR E CORRIGIR STORAGE BUCKETS
-- Execute este SQL no Supabase SQL Editor
-- ============================================

-- 1. VERIFICAR SE OS BUCKETS EXISTEM
SELECT id, name, public, file_size_limit, allowed_mime_types 
FROM storage.buckets 
WHERE id IN ('profile-pictures', 'post-images');

-- 2. SE NÃO EXISTIREM, CRIAR OS BUCKETS
-- Criar bucket para imagens de perfil (se não existir)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'profile-pictures',
  'profile-pictures',
  true,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Criar bucket para imagens de posts (se não existir)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'post-images',
  'post-images',
  true,
  10485760, -- 10MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 3. REMOVER TODAS AS POLÍTICAS EXISTENTES PARA EVITAR CONFLITOS
DO $$ 
BEGIN
  -- Remover políticas antigas do profile-pictures
  DROP POLICY IF EXISTS "Public Access" ON storage.objects;
  DROP POLICY IF EXISTS "Users can upload own profile picture" ON storage.objects;
  DROP POLICY IF EXISTS "Users can update own profile picture" ON storage.objects;
  DROP POLICY IF EXISTS "Users can delete own profile picture" ON storage.objects;
  
  -- Remover políticas antigas do post-images
  DROP POLICY IF EXISTS "Public Access to post images" ON storage.objects;
  DROP POLICY IF EXISTS "Authenticated users can upload post images" ON storage.objects;
  DROP POLICY IF EXISTS "Users can update own post images" ON storage.objects;
  DROP POLICY IF EXISTS "Users can delete own post images" ON storage.objects;
EXCEPTION
  WHEN OTHERS THEN
    NULL;
END $$;

-- 4. CRIAR POLÍTICAS CORRETAS PARA profile-pictures

-- Política 1: Qualquer um pode ver imagens de perfil (público)
CREATE POLICY "profile_pictures_select"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'profile-pictures');

-- Política 2: Usuários autenticados podem fazer upload na sua própria pasta
CREATE POLICY "profile_pictures_insert"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'profile-pictures' 
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Política 3: Usuários podem atualizar suas próprias imagens
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

-- Política 4: Usuários podem deletar suas próprias imagens
CREATE POLICY "profile_pictures_delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'profile-pictures' 
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- 5. CRIAR POLÍTICAS CORRETAS PARA post-images

-- Política 1: Qualquer um pode ver imagens de posts (público)
CREATE POLICY "post_images_select"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'post-images');

-- Política 2: Usuários autenticados podem fazer upload
CREATE POLICY "post_images_insert"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'post-images' 
    AND auth.role() = 'authenticated'
  );

-- Política 3: Usuários podem atualizar suas próprias imagens
CREATE POLICY "post_images_update"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'post-images' 
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'post-images' 
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Política 4: Usuários podem deletar suas próprias imagens
CREATE POLICY "post_images_delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'post-images' 
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- 6. VERIFICAR SE TUDO FOI CRIADO CORRETAMENTE
SELECT 
  'Buckets criados:' as info,
  id, 
  name, 
  public, 
  file_size_limit,
  allowed_mime_types
FROM storage.buckets 
WHERE id IN ('profile-pictures', 'post-images');

SELECT 
  'Políticas criadas:' as info,
  name as policy_name,
  bucket_id,
  operation
FROM storage.policies 
WHERE bucket_id IN ('profile-pictures', 'post-images')
ORDER BY bucket_id, operation;

-- ============================================
-- FIM DO SCRIPT
-- ============================================








