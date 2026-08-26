-- Migration 017: Tabla de analíticas de usuario
-- Tabla ligera optimizada para inserciones rápidas de eventos de tracking.

CREATE TABLE IF NOT EXISTS public.user_analytics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para lecturas rápidas del dashboard admin
CREATE INDEX IF NOT EXISTS idx_user_analytics_user_id ON public.user_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_user_analytics_event_type ON public.user_analytics(event_type);
CREATE INDEX IF NOT EXISTS idx_user_analytics_created_at ON public.user_analytics(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_analytics_type_date ON public.user_analytics(event_type, created_at DESC);

-- Habilitar RLS
ALTER TABLE public.user_analytics ENABLE ROW LEVEL SECURITY;

-- Solo service role puede insertar (backend usa supabaseAdmin)
CREATE POLICY " service_role_insert" ON public.user_analytics
  FOR INSERT TO service_role
  WITH CHECK (true);

-- Solo usuarios admin pueden leer
CREATE POLICY "admin_select" ON public.user_analytics
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.rol = 'admin'
    )
  );
