-- Adiciona a coluna author_avatar à tabela posts
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS author_avatar TEXT;

-- Atualiza os posts existentes do administrador com a imagem de perfil atual
UPDATE public.posts
SET author_avatar = (
  SELECT profile_image_url 
  FROM public.profiles 
  WHERE profiles.name = posts.author
  LIMIT 1
)
WHERE author_avatar IS NULL;