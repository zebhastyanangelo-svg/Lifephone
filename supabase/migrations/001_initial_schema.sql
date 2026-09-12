create extension if not exists "pgcrypto";

create table if not exists public.roles (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (name in ('super_admin', 'admin', 'staff_orders', 'read_only', 'store_user')),
  description text,
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role_id uuid not null references public.roles(id),
  full_name text not null,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.expansion_leads (
  id uuid primary key default gen_random_uuid(),
  store_name text not null,
  contact_name text not null,
  phone text,
  email text,
  state text not null,
  city text not null,
  status text not null default 'new' check (status in ('new', 'contacted', 'qualified', 'negotiating', 'won', 'lost')),
  notes text,
  owner_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  sku text not null unique,
  name text not null,
  description text,
  wholesale_price numeric(12, 2) not null check (wholesale_price >= 0),
  stock_quantity integer not null default 0 check (stock_quantity >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.store_orders (
  id uuid primary key default gen_random_uuid(),
  store_profile_id uuid not null references public.profiles(id),
  status text not null default 'requested' check (status in ('requested', 'confirmed', 'preparing', 'shipped', 'completed', 'cancelled')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.store_orders(id) on delete cascade,
  product_id uuid not null references public.products(id),
  quantity integer not null check (quantity > 0),
  unit_price numeric(12, 2) not null check (unit_price >= 0),
  created_at timestamptz not null default now(),
  unique (order_id, product_id)
);

insert into public.roles (name, description) values
  ('super_admin', 'Control total de la plataforma'),
  ('admin', 'Administracion operativa'),
  ('staff_orders', 'Gestion de solicitudes y pedidos'),
  ('read_only', 'Consulta sin escritura'),
  ('store_user', 'Usuario de tienda aliada')
on conflict (name) do nothing;

alter table public.roles enable row level security;
alter table public.profiles enable row level security;
alter table public.expansion_leads enable row level security;
alter table public.products enable row level security;
alter table public.store_orders enable row level security;
alter table public.order_items enable row level security;

create or replace function public.check_user_role(required_role text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles as profile
    join public.roles as role on role.id = profile.role_id
    where profile.id = auth.uid()
      and role.name = required_role
  );
$$;

revoke all on function public.check_user_role(text) from public;
grant execute on function public.check_user_role(text) to authenticated;

drop policy if exists expansion_leads_select on public.expansion_leads;
create policy expansion_leads_select
on public.expansion_leads
for select
to authenticated
using (
  public.check_user_role('super_admin')
  or public.check_user_role('admin')
  or public.check_user_role('staff_orders')
  or public.check_user_role('read_only')
);

drop policy if exists expansion_leads_insert on public.expansion_leads;
create policy expansion_leads_insert
on public.expansion_leads
for insert
to authenticated
with check (
  public.check_user_role('super_admin')
  or public.check_user_role('admin')
  or public.check_user_role('staff_orders')
);

drop policy if exists expansion_leads_update on public.expansion_leads;
create policy expansion_leads_update
on public.expansion_leads
for update
to authenticated
using (
  public.check_user_role('super_admin')
  or public.check_user_role('admin')
  or public.check_user_role('staff_orders')
)
with check (
  public.check_user_role('super_admin')
  or public.check_user_role('admin')
  or public.check_user_role('staff_orders')
);

drop policy if exists expansion_leads_delete on public.expansion_leads;
create policy expansion_leads_delete
on public.expansion_leads
for delete
to authenticated
using (
  public.check_user_role('super_admin')
  or public.check_user_role('admin')
);