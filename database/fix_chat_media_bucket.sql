-- ============================================
-- Ajustar bucket 'chat-media' para permitir PDFs e outros tipos
-- Execute este SQL no Supabase SQL Editor
-- ============================================

-- Atualizar ou criar configuração do bucket com tipos permitidos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chat-media',
  'chat-media',
  true,
  26214400, -- 25MB
  ARRAY[
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    'video/mp4', 'video/quicktime',
    'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/aac',
    'application/pdf'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Políticas padrão (mantém leitura pública e upload por autenticados)
DO $$
BEGIN
  -- SELECT
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'chat_media_select'
  ) THEN
    CREATE POLICY "chat_media_select"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'chat-media');
  END IF;

  -- INSERT
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'chat_media_insert'
  ) THEN
    CREATE POLICY "chat_media_insert"
      ON storage.objects FOR INSERT
      WITH CHECK (
        bucket_id = 'chat-media'
        AND auth.role() = 'authenticated'
      );
  END IF;

  -- UPDATE
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'chat_media_update'
  ) THEN
    CREATE POLICY "chat_media_update"
      ON storage.objects FOR UPDATE
      USING (
        bucket_id = 'chat-media'
        AND auth.role() = 'authenticated'
        AND (storage.foldername(name))[1] = auth.uid()::text
      );
  END IF;

  -- DELETE
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'chat_media_delete'
  ) THEN
    CREATE POLICY "chat_media_delete"
      ON storage.objects FOR DELETE
      USING (
        bucket_id = 'chat-media'
        AND auth.role() = 'authenticated'
        AND (storage.foldername(name))[1] = auth.uid()::text
      );
  END IF;
END $$;

