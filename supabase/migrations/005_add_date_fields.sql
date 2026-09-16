alter table public.expansion_leads
  add column if not exists fecha_creacion timestamptz not null default now();

alter table public.expansion_leads
  add column if not exists fecha_negociacion timestamptz;

alter table public.expansion_leads
  add column if not exists fecha_apertura timestamptz;
