-- Migration: Fix UPDATE RLS policy on expansion_leads
-- The existing UPDATE policy has qual=null (missing USING clause).
-- PostgreSQL requires an explicit USING clause for UPDATE policies to
-- determine which rows are eligible for update. Without it, Supabase
-- returns an empty result set (0 rows updated) instead of a 403 error.

-- Drop the broken policy
drop policy if exists "Permitir actualización a usuarios autenticados en expansion_leads" on public.expansion_leads;
drop policy if exists "Permitir actualización a usuarios autenticados en expansion_le" on public.expansion_leads;

-- Recreate with explicit USING (true) AND WITH CHECK (true)
create policy "Permitir actualización a usuarios autenticados en expansion_leads"
on public.expansion_leads
for update
to authenticated
using (true)
with check (true);
