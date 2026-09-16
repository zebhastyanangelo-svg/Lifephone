-- Migration: Fix RLS policies on expansion_leads
-- Replaces restrictive role-checked policies with permissive authenticated policies
-- to resolve 403 Forbidden errors when creating expansion leads

-- Drop existing restrictive policies
drop policy if exists expansion_leads_select on public.expansion_leads;
drop policy if exists expansion_leads_insert on public.expansion_leads;
drop policy if exists expansion_leads_update on public.expansion_leads;
drop policy if exists expansion_leads_delete on public.expansion_leads;

-- Create permissive policies for all CRUD operations
-- SELECT and DELETE use USING clause; INSERT and UPDATE use WITH CHECK clause
create policy "Permitir lectura a usuarios autenticados en expansion_leads"
on public.expansion_leads
for select
to authenticated
using (true);

create policy "Permitir inserción a usuarios autenticados en expansion_leads"
on public.expansion_leads
for insert
to authenticated
with check (true);

create policy "Permitir actualización a usuarios autenticados en expansion_leads"
on public.expansion_leads
for update
to authenticated
with check (true);

create policy "Permitir eliminación a usuarios autenticados en expansion_leads"
on public.expansion_leads
for delete
to authenticated
using (true);
