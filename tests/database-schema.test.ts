import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

const schemaPath = new URL('../supabase/migrations/001_initial_schema.sql', import.meta.url);
const superAdminPath = new URL('../supabase/migrations/002_super_admin_user.sql', import.meta.url);

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
