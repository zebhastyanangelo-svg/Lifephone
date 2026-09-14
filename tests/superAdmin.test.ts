import { describe, expect, it } from 'vitest';

describe('Super admin user migration', () => {
  it('la migración 002 existe y contiene la creación del usuario administrador', async () => {
    const { readFile } = await import('node:fs/promises');
    const migration = await readFile(
      new URL('../supabase/migrations/002_super_admin_user.sql', import.meta.url),
      'utf8'
    );

    expect(migration).toMatch(/lifephone687@gmail\.com/);
    expect(migration).toMatch(/auth\.admin\.create_user/);
    expect(migration).toMatch(/super_admin/);
    expect(migration).toMatch(/public\.profiles/);
  });

  it('la migración es idempotente y usa upsert para perfiles', async () => {
    const { readFile } = await import('node:fs/promises');
    const migration = await readFile(
      new URL('../supabase/migrations/002_super_admin_user.sql', import.meta.url),
      'utf8'
    );

    expect(migration).toMatch(/ON CONFLICT.*DO UPDATE|ON CONFLICT.*DO NOTHING/i);
  });

  it('la migración verifica la existencia del usuario antes de crearlo', async () => {
    const { readFile } = await import('node:fs/promises');
    const migration = await readFile(
      new URL('../supabase/migrations/002_super_admin_user.sql', import.meta.url),
      'utf8'
    );

    expect(migration).toMatch(/SELECT id INTO.*auth\.users.*WHERE email/i);
    expect(migration).toMatch(/IF admin_user_id IS NULL/i);
  });
});
