-- =================================================================
-- 9. SISTEMA DE GRÁFICOS ESCOLARES
-- =================================================================

CREATE TABLE IF NOT EXISTS public.school_charts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  chart_type TEXT DEFAULT 'geral',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.schools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chart_id UUID REFERENCES public.school_charts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  performance INTEGER DEFAULT 0,
  rendimento JSONB, -- Armazena dados de rendimento por unidade
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE public.school_charts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;

-- Políticas para school_charts
CREATE POLICY "Users can view their own charts" ON public.school_charts FOR SELECT USING (auth.uid() = created_by);
CREATE POLICY "Users can insert their own charts" ON public.school_charts FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Users can update their own charts" ON public.school_charts FOR UPDATE USING (auth.uid() = created_by) WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Users can delete their own charts" ON public.school_charts FOR DELETE USING (auth.uid() = created_by);

-- Políticas para schools
CREATE POLICY "Users can view schools of their charts" ON public.schools FOR SELECT USING (EXISTS (SELECT 1 FROM public.school_charts WHERE school_charts.id = schools.chart_id AND school_charts.created_by = auth.uid()));
CREATE POLICY "Users can insert schools to their charts" ON public.schools FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.school_charts WHERE school_charts.id = schools.chart_id AND school_charts.created_by = auth.uid()));
CREATE POLICY "Users can update schools of their charts" ON public.schools FOR UPDATE USING (EXISTS (SELECT 1 FROM public.school_charts WHERE school_charts.id = schools.chart_id AND school_charts.created_by = auth.uid()));
CREATE POLICY "Users can delete schools of their charts" ON public.schools FOR DELETE USING (EXISTS (SELECT 1 FROM public.school_charts WHERE school_charts.id = schools.chart_id AND school_charts.created_by = auth.uid()));

-- Triggers para updated_at
CREATE TRIGGER set_school_charts_updated_at BEFORE UPDATE ON public.school_charts FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_schools_updated_at BEFORE UPDATE ON public.schools FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
