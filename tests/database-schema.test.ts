import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

const schemaPath = new URL('../supabase/migrations/001_initial_schema.sql', import.meta.url);

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