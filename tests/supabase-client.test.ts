import { beforeEach, describe, expect, it, vi } from 'vitest';
import { canAccessExpansionCrm } from '../src/features/expansion/roles';

const { createClientMock } = vi.hoisted(() => ({
  createClientMock: vi.fn()
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: createClientMock
}));

describe('cliente Supabase de Expo', () => {
  beforeEach(() => {
    vi.resetModules();
    createClientMock.mockReset();
  });

  it('usa únicamente la URL y anon key públicas de Lifephone', async () => {
    await import('../src/lib/supabase');

    expect(createClientMock).toHaveBeenCalledWith(
      'https://fdsiutxsduuzayfmgocd.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZkc2l1dHhzZHV1emF5Zm1nb2NkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkyMzEyOTMsImV4cCI6MjEwNDgwNzI5M30.aEv14p1IhEfLFJy6dtKruiDokUB4YgbhlgzBhxXyREc',
      expect.objectContaining({
        auth: expect.objectContaining({
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: false,
        }),
        db: expect.objectContaining({
          schema: 'public',
        }),
        realtime: expect.objectContaining({
          params: expect.objectContaining({
            eventsPerSecond: 10,
          }),
        }),
      })
    );
  });

  it('rechaza y propaga un acceso RLS denegado a expansion_leads', async () => {
    const rlsError = { code: '42501', message: 'permission denied for table expansion_leads' };
    const select = vi.fn().mockResolvedValue({ data: null, error: rlsError });
    const from = vi.fn().mockReturnValue({ select });
    createClientMock.mockReturnValue({ from });

    const { listExpansionLeads } = await import('../src/features/expansion/leadsRepository');
    await expect(listExpansionLeads({ from })).rejects.toMatchObject(rlsError);
    expect(from).toHaveBeenCalledWith('expansion_leads');
  });

  it('distingue los roles internos de store_user para el CRM', () => {
    expect(canAccessExpansionCrm('super_admin')).toBe(true);
    expect(canAccessExpansionCrm('admin')).toBe(true);
    expect(canAccessExpansionCrm('staff_orders')).toBe(true);
    expect(canAccessExpansionCrm('read_only')).toBe(true);
    expect(canAccessExpansionCrm('store_user')).toBe(false);
  });
});