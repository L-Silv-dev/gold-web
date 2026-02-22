ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS theme_mode TEXT DEFAULT 'claro';

UPDATE public.profiles SET theme_mode = COALESCE(theme_mode, 'claro');
