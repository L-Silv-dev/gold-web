-- ============================================
-- LIVROS: TABELA E STORAGE
-- Execute este SQL no Supabase SQL Editor
-- ============================================
CREATE TABLE IF NOT EXISTS public.books (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  author TEXT NOT NULL,
  subject TEXT NOT NULL,
  topic TEXT NOT NULL,
  description TEXT,
  cover_url TEXT,
  pdf_url TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'books' AND policyname = 'Books are viewable by everyone'
  ) THEN
    CREATE POLICY "Books are viewable by everyone"
      ON public.books FOR SELECT
      USING (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'books' AND policyname = 'Authenticated can insert books'
  ) THEN
    CREATE POLICY "Authenticated can insert books"
      ON public.books FOR INSERT
      WITH CHECK (auth.role() = 'authenticated');
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'books' AND policyname = 'Creators can update books'
  ) THEN
    CREATE POLICY "Creators can update books"
      ON public.books FOR UPDATE
      USING (auth.uid() = created_by)
      WITH CHECK (auth.uid() = created_by);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'books' AND policyname = 'Creators can delete books'
  ) THEN
    CREATE POLICY "Creators can delete books"
      ON public.books FOR DELETE
      USING (auth.uid() = created_by);
  END IF;
END $$;
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'book-pdfs',
  'book-pdfs',
  true,
  26214400,
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'book_pdfs_select'
  ) THEN
    CREATE POLICY "book_pdfs_select"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'book-pdfs');
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'book_pdfs_insert'
  ) THEN
    CREATE POLICY "book_pdfs_insert"
      ON storage.objects FOR INSERT
      WITH CHECK (
        bucket_id = 'book-pdfs' AND auth.role() = 'authenticated'
      );
  END IF;
END $$;
