-- Migration: Add RIF and Google Maps URL fields to expansion_leads
-- Supports storing branch fiscal identification (RIF) and physical location link

alter table if exists public.expansion_leads
  add column if not exists rif text,
  add column if not exists google_maps_url text;

comment on column public.expansion_leads.rif is 'RIF fiscal identification of the branch (e.g. J-12345678-9)';
comment on column public.expansion_leads.google_maps_url is 'Direct Google Maps link to the branch physical location';
