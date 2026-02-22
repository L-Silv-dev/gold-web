# 🔧 INSTRUÇÕES PARA CRIAR BUCKETS DE STORAGE

## ❌ Erro: "Bucket profile-pictures não encontrado"

Este erro ocorre porque os buckets de storage não foram criados no Supabase.

## ✅ SOLUÇÃO 1: Criar pelo Dashboard (MAIS FÁCIL)

1. Acesse o **Supabase Dashboard**
2. Vá em **Storage** (menu lateral)
3. Clique em **"New bucket"**
4. Crie o bucket **`profile-pictures`**:
   - **Name**: `profile-pictures`
   - **Public bucket**: ✅ **SIM** (marque como público)
   - **File size limit**: `5242880` (5MB)
   - **Allowed MIME types**: `image/jpeg, image/png, image/webp, image/gif`
5. Clique em **"Create bucket"**
6. Repita para criar o bucket **`post-images`**:
   - **Name**: `post-images`
   - **Public bucket**: ✅ **SIM**
   - **File size limit**: `10485760` (10MB)
   - **Allowed MIME types**: `image/jpeg, image/png, image/webp, image/gif`

## ✅ SOLUÇÃO 2: Executar SQL

1. Abra o **Supabase Dashboard**
2. Vá em **SQL Editor**
3. Abra o arquivo `database/fix_buckets_simple.sql`
4. Copie todo o conteúdo
5. Cole no SQL Editor
6. Clique em **"Run"**
7. Verifique se apareceu "Success"

## 🔍 Verificar se funcionou

Execute esta query no SQL Editor:

```sql
SELECT id, name, public FROM storage.buckets 
WHERE id IN ('profile-pictures', 'post-images');
```

Se aparecerem os dois buckets, está funcionando! ✅

## 📝 Depois de criar os buckets

Após criar os buckets, você ainda precisa criar as **políticas RLS**. Execute este SQL:

```sql
-- Políticas para profile-pictures
CREATE POLICY "Public Access"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'profile-pictures');

CREATE POLICY "Users can upload own profile picture"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'profile-pictures' 
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can update own profile picture"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'profile-pictures' 
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete own profile picture"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'profile-pictures' 
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Políticas para post-images
CREATE POLICY "Public Access to post images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'post-images');

CREATE POLICY "Authenticated users can upload post images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'post-images' 
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Users can update own post images"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'post-images' 
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete own post images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'post-images' 
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
```

## 🎯 Resumo

1. ✅ Criar bucket `profile-pictures` (público, 5MB)
2. ✅ Criar bucket `post-images` (público, 10MB)
3. ✅ Executar SQL das políticas RLS
4. ✅ Testar upload de imagem de perfil

Depois disso, o erro deve desaparecer! 🎉

