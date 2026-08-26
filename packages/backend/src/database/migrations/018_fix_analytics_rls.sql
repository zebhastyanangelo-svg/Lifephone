-- Migration 018: Fix RLS policy for user_analytics
-- Cambia la política de INSERT para permitir a cualquier usuario autenticado
-- insertar sus propios eventos (antes solo permitía service_role).
-- Ejecutar solo si la migración 017 ya fue aplicada.

-- Eliminar política anterior si existe
DROP POLICY IF EXISTS " service_role_insert" ON public.user_analytics;

-- Nueva política: cualquier usuario autenticado puede insertar sus propios eventos
CREATE POLICY "authenticated_insert" ON public.user_analytics
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
