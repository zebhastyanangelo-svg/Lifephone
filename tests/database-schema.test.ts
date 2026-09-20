import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

const schemaPath = new URL('../supabase/migrations/001_initial_schema.sql', import.meta.url);
const superAdminPath = new URL('../supabase/migrations/002_super_admin_user.sql', import.meta.url);
const branchFieldsPath = new URL('../supabase/migrations/003_add_branch_fields.sql', import.meta.url);
const dateFieldsPath = new URL('../supabase/migrations/005_add_date_fields.sql', import.meta.url);

describe('contrato relacional de LifePhone', () => {
  it('define el modelo inicial de datos', async () => {
    const schema = await readFile(schemaPath, 'utf8');
    const requiredTables = [
      'roles',
      'profiles',
      'expansion_leads',
      'products',
      'store_orders',
      'order_items'
    ];

    for (const table of requiredTables) {
      expect(schema).toMatch(new RegExp(`create table[^;]*\\b${table}\\b`, 'is'));
    }

    for (const role of ['super_admin', 'admin', 'staff_orders', 'read_only', 'store_user']) {
      expect(schema).toMatch(new RegExp(`'${role}'`, 'i'));
    }
  });

  it('bloquea a store_user del CRM de expansion mediante RLS', async () => {
    const schema = await readFile(schemaPath, 'utf8');

    expect(schema).toMatch(
      /create or replace function public\.check_user_role\s*\(\s*required_role\s+text\s*\)/i
    );
    expect(schema).toMatch(
      /create policy expansion_leads_(select|access)[^;]*on public\.expansion_leads[^;]*using\s*\([^;]*(?:super_admin|admin|staff_orders|read_only)[^;]*\)/is
    );
    expect(schema).not.toMatch(/create policy expansion_leads_[^;]*to\s+store_user/is);
  });
});

describe('Migración de usuario administrador supremo', () => {
  it('la migración 002 existe y configura lifephone687@gmail.com con rol super_admin', async () => {
    const migration = await readFile(superAdminPath, 'utf8');
    expect(migration).toMatch(/lifephone687@gmail\.com/);
    expect(migration).toMatch(/super_admin/);
    expect(migration).toMatch(/public\.profiles/);
    expect(migration).toMatch(/auth\.admin\.create_user/);
  });

  it('la migración es idempotente y usa upsert para perfiles', async () => {
    const migration = await readFile(superAdminPath, 'utf8');
    expect(migration).toMatch(/ON CONFLICT.*DO UPDATE|ON CONFLICT.*DO NOTHING/i);
  });

  it('la migración verifica la existencia del usuario antes de crearlo', async () => {
    const migration = await readFile(superAdminPath, 'utf8');
    expect(migration).toMatch(/SELECT id INTO.*auth\.users.*WHERE email/i);
    expect(migration).toMatch(/IF admin_user_id IS NULL/i);
  });
});

describe('Migración de rol en create_admin_user (013)', () => {
  const fixRolePath = new URL('../supabase/migrations/013_fix_create_admin_user_role.sql', import.meta.url);

  it('define create_admin_user con el parámetro de rol p_role', async () => {
    const migration = await readFile(fixRolePath, 'utf8');

    expect(migration).toMatch(
      /create or replace function public\.create_admin_user\s*\(\s*p_email\s+text\s*,\s*p_password\s+text\s*,\s*p_full_name\s+text\s*,\s*p_role\s+text/i
    );
  });

  it('inserta el perfil con el rol solicitado (role_id proveniente de p_role, sin valor quemado)', async () => {
    const migration = await readFile(fixRolePath, 'utf8');

    expect(migration).toMatch(/SELECT id INTO v_target_role_id FROM public\.roles WHERE name = p_role/i);
    expect(migration).toMatch(
      /INSERT INTO public\.profiles\s*\(\s*id\s*,\s*role_id\s*,\s*full_name\s*\)\s*VALUES\s*\(\s*v_new_user_id\s*,\s*v_target_role_id/i
    );
    expect(migration).toMatch(/user_metadata := jsonb_build_object\('role', p_role/i);
    expect(migration).not.toMatch(/jsonb_build_object\('role',\s*'admin'\)/i);
  });

  it('elimina el RPC roto create_new_administrator y la sobrecarga de 3 argumentos', async () => {
    const migration = await readFile(fixRolePath, 'utf8');

    expect(migration).toMatch(/drop function if exists public\.create_new_administrator\(payload json\)/i);
    expect(migration).toMatch(/drop function if exists public\.create_admin_user\(text, text, text\)/i);
  });

  it('valida el rol con coincidencia exacta (sin ILIKE parcial que ignore el rol solicitado)', async () => {
    const migration = await readFile(fixRolePath, 'utf8');
    const functionBody = migration.split('AS $$')[1] ?? '';

    expect(functionBody).not.toMatch(/ILIKE/i);
    expect(functionBody).not.toMatch(/ORDER BY id LIMIT 1/i);
  });
});

describe('Migración de referencia cruzada en create_admin_user (014)', () => {
  const fixCrossDbPath = new URL('../supabase/migrations/014_fix_cross_database_create_user.sql', import.meta.url);

  it('no invoca auth.admin.create_user (referencia cruzada de base de datos no soportada)', async () => {
    const migration = await readFile(fixCrossDbPath, 'utf8');

    expect(migration).not.toMatch(/auth\.admin\.create_user/i);
  });

  it('crea el usuario insertando directamente en auth.users con contraseña bcrypt', async () => {
    const migration = await readFile(fixCrossDbPath, 'utf8');

    expect(migration).toMatch(/INSERT INTO auth\.users/i);
    expect(migration).toMatch(/crypt\(p_password, gen_salt\('bf'\)\)/i);
    expect(migration).toMatch(/INSERT INTO auth\.identities/i);
  });

  it('mantiene la firma RPC con p_role y el insert del perfil con el rol solicitado', async () => {
    const migration = await readFile(fixCrossDbPath, 'utf8');

    expect(migration).toMatch(
      /create or replace function public\.create_admin_user\s*\(\s*p_email\s+text\s*,\s*p_password\s+text\s*,\s*p_full_name\s+text\s*,\s*p_role\s+text/i
    );
    expect(migration).toMatch(/SELECT id INTO v_target_role_id FROM public\.roles WHERE name = p_role/i);
    expect(migration).toMatch(
      /INSERT INTO public\.profiles\s*\(\s*id\s*,\s*role_id\s*,\s*full_name\s*\)\s*VALUES\s*\(\s*v_new_user_id\s*,\s*v_target_role_id/i
    );
  });

  it('mantiene la metadata de usuario con el rol solicitado (sin valor quemado)', async () => {
    const migration = await readFile(fixCrossDbPath, 'utf8');

    expect(migration).toMatch(/jsonb_build_object\('role', p_role/i);
    expect(migration).not.toMatch(/jsonb_build_object\('role',\s*'admin'\)/i);
  });
});

describe('Migración de listado de administradores (015)', () => {
  const fixListPath = new URL('../supabase/migrations/015_fix_list_admin_users_roles.sql', import.meta.url);

  it('no filtra los perfiles por una lista blanca de roles (incluye read_only, staff_orders, store_user)', async () => {
    const migration = await readFile(fixListPath, 'utf8');

    expect(migration).not.toMatch(/WHERE\s+r\.name\s+IN/i);
  });

  it('mantiene el contrato del RPC: join perfiles/roles/auth.users con nombre de rol', async () => {
    const migration = await readFile(fixListPath, 'utf8');

    expect(migration).toMatch(/create or replace function public\.list_admin_users\s*\(\s*\)/i);
    expect(migration).toMatch(/FROM public\.profiles p/i);
    expect(migration).toMatch(/JOIN public\.roles r ON r\.id = p\.role_id/i);
    expect(migration).toMatch(/JOIN auth\.users u ON u\.id = p\.id/i);
    expect(migration).toMatch(/'role', r\.name/i);
  });
});

describe('Migración de normalización de rol en create_admin_user (018)', () => {
  const fixRoleNormPath = new URL('../supabase/migrations/018_normalize_create_admin_user_role.sql', import.meta.url);

  it('normaliza p_role con lower+trim antes de validarlo contra roles', async () => {
    const migration = await readFile(fixRoleNormPath, 'utf8');

    expect(migration).toMatch(/lower\s*\(\s*trim\s*\(\s*(?:coalesce\s*\(\s*)?p_role/i);
    expect(migration).toMatch(/FROM public\.roles WHERE name = v_role/i);
    expect(migration).not.toMatch(/WHERE name = p_role/i);
  });

  it('usa el rol normalizado en la metadata del usuario y en la respuesta', async () => {
    const migration = await readFile(fixRoleNormPath, 'utf8');

    expect(migration).toMatch(/jsonb_build_object\('role', v_role/i);
    expect(migration).toMatch(/'role', v_role/i);
  });
});

describe('Migración de campos de sucursal (003)', () => {
  it('agrega las columnas rif y google_maps_url a expansion_leads', async () => {
    const migration = await readFile(branchFieldsPath, 'utf8');
    expect(migration).toMatch(/alter table.*public\.expansion_leads/i);
    expect(migration).toMatch(/\brif\b/i);
    expect(migration).toMatch(/\bgoogle_maps_url\b/i);
  });
});

describe('Migración de campos de fecha (005)', () => {
  it('agrega las columnas fecha_creacion, fecha_negociacion y fecha_apertura a expansion_leads', async () => {
    const migration = await readFile(dateFieldsPath, 'utf8');
    expect(migration).toMatch(/alter table.*public\.expansion_leads/i);
    expect(migration).toMatch(/\bfecha_creacion\b/i);
    expect(migration).toMatch(/\bfecha_negociacion\b/i);
    expect(migration).toMatch(/\bfecha_apertura\b/i);
  });

  it('configura fecha_creacion con valor por defecto now()', async () => {
    const migration = await readFile(dateFieldsPath, 'utf8');
    expect(migration).toMatch(/fecha_creacion.*timestamptz.*not null.*default now\(\)/i);
  });
});
