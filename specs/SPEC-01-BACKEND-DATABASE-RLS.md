# SPEC-01: Backend, relational database, and RLS

## 1. Goal

Provide the authoritative relational contract for LifePhone's Expansion CRM and B2B portal. Supabase PostgreSQL is the source of truth. Client code must use typed Supabase queries and must never implement authorization as a replacement for database RLS.

The current baseline migration is `supabase/migrations/001_initial_schema.sql`. It creates the six tables, enables RLS on all six, seeds roles, creates `check_user_role`, and defines the Expansion CRM policies. Policies for catalog and order workflows are specified here and must be added before those workflows are exposed.

## 2. Roles and identity

Supported roles are exactly:

| Role | Scope |
| --- | --- |
| `super_admin` | Full platform administration and security ownership. |
| `admin` | Operational administration, CRM, catalog, and order management. |
| `staff_orders` | Order operations and CRM workflow support; no role administration. |
| `read_only` | Read-only CRM visibility; no mutations. |
| `store_user` | A store ally's B2B catalog and own order workflow only. |

`auth.users.id` is the identity key. `profiles.id` references it one-to-one. A profile references exactly one row in `roles`. The role must be resolved from the authenticated database session, never from a request body, local storage, or a client-supplied header.

## 3. Tables

### 3.1 `roles`

- `id uuid primary key default gen_random_uuid()`.
- `name text not null unique` constrained to the five supported role values.
- `description text`.
- `created_at timestamptz not null default now()`.

Role seed data is idempotent using `on conflict (name) do nothing`.

### 3.2 `profiles`

- `id uuid primary key references auth.users(id) on delete cascade`.
- `role_id uuid not null references roles(id)`.
- `full_name text not null`.
- `phone text`.
- `created_at` and `updated_at` as `timestamptz`.

A future profile update trigger may maintain `updated_at`; it must not allow a user to self-escalate `role_id`.

### 3.3 `expansion_leads`

- `id uuid primary key default gen_random_uuid()`.
- `store_name`, `contact_name`, `state`, and `city` are required text fields.
- `phone`, `email`, and `notes` are nullable.
- `status` is constrained to `new`, `contacted`, `qualified`, `negotiating`, `won`, or `lost`; default `new`.
- `owner_id uuid` references `profiles(id)` with `on delete set null`.
- `created_at` and `updated_at` are `timestamptz`.

The application DTO may call `contact_name` `owner_name` and may group `state` and `city` as `location`; the repository owns that mapping.

### 3.4 `products`

- `id uuid primary key default gen_random_uuid()`.
- `sku text not null unique`.
- `name text not null` and nullable `description`.
- `wholesale_price numeric(12,2) not null check (wholesale_price >= 0)`.
- `stock_quantity integer not null default 0 check (stock_quantity >= 0)`.
- `is_active boolean not null default true`.
- `created_at` and `updated_at`.

Prices and inventory must not be accepted as unchecked client strings.

### 3.5 `store_orders`

- `id uuid primary key default gen_random_uuid()`.
- `store_profile_id uuid not null references profiles(id)`.
- `status` is constrained to `requested`, `confirmed`, `preparing`, `shipped`, `completed`, or `cancelled`; default `requested`.
- Nullable `notes`, plus `created_at` and `updated_at`.

The store user may only read orders whose `store_profile_id = auth.uid()`.

### 3.6 `order_items`

- `id uuid primary key default gen_random_uuid()`.
- `order_id uuid not null references store_orders(id) on delete cascade`.
- `product_id uuid not null references products(id)`.
- `quantity integer not null check (quantity > 0)`.
- `unit_price numeric(12,2) not null check (unit_price >= 0)`.
- `created_at timestamptz`.
- Unique `(order_id, product_id)`.

`unit_price` is the price snapshot at request time. Never recalculate historical order totals from the current product price.

## 4. `check_user_role`

The helper is:

```sql
public.check_user_role(required_role text) returns boolean
```

It is `stable`, `security definer`, and fixes `search_path = public`. It joins `profiles` to `roles` for `auth.uid()` and compares the database role name with `required_role`. Execute permission is granted to `authenticated`; public execution is revoked.

Security requirements:

- Do not accept `user_id` as an argument.
- Do not read a role from JWT metadata when the database relationship is available.
- Keep the function narrowly scoped and review all `security definer` changes.
- Add regression tests for null sessions and nonexistent profiles.

## 5. RLS policy matrix

RLS is enabled on every public table before data is exposed. PostgreSQL's default deny behavior is intentional: a table with RLS and no matching policy is inaccessible.

| Resource | `super_admin` | `admin` | `staff_orders` | `read_only` | `store_user` |
| --- | --- | --- | --- | --- | --- |
| `roles` | manage | read | no role management | read | no access |
| `profiles` | manage | operational read/update | own operational read | read | own profile read |
| `expansion_leads` | CRUD | CRUD | read/create/update | read | no access |
| `products` | CRUD | CRUD | read | read | active read |
| `store_orders` | CRUD | CRUD | CRUD | read | own create/read, status-limited updates |
| `order_items` | CRUD | CRUD | CRUD | read | items of own orders |

The CRM guarantee is strict: every `expansion_leads` policy must use an allow-list of internal roles and no policy may grant `store_user`. The current migration implements select, insert, update, and delete policies for authenticated internal roles. `store_user` therefore receives no CRM row access, even if the client calls `from('expansion_leads')` directly.

## 6. Required tests and acceptance

- Static migration tests assert tables, role values, RLS enablement, helper signature, and absence of a `store_user` lead policy.
- Vitest client tests simulate `42501` and assert rejection propagation.
- When Supabase local or Cloud test credentials are available, add an integration test with one user per role and verify select/insert/update/delete policy outcomes.
- Run `npm test`, `npm run typecheck`, and `bash .harness/scripts/init.sh` successfully.
