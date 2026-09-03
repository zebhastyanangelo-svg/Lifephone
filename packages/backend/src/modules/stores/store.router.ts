import { initTRPC, TRPCError } from '@trpc/server';
import { z } from 'zod';
import { createStore, deleteStore, getStoreById, getStoreMetrics, listStores, updateStore } from './store.service';
import { STORE_STATUSES } from './store.model';

export interface StoreTRPCContext {
  token: string;
}

const t = initTRPC.context<StoreTRPCContext>().create();
const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.token) throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Token requerido' });
  return next({ ctx });
});

const storeInput = z.object({
  name: z.string().min(1),
  cuit: z.string().min(1),
  status: z.enum(STORE_STATUSES),
  manager_id: z.string().uuid().nullable(),
  metadata: z.record(z.unknown()),
  address: z.string().min(1),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

const filters = z.object({
  cuit: z.string().optional(),
  status: z.enum(STORE_STATUSES).optional(),
  manager_id: z.string().uuid().optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  radius_km: z.number().positive().optional(),
  page: z.number().int().positive().optional(),
  limit: z.number().int().positive().max(100).optional(),
});

export const storeRouter = t.router({
  list: protectedProcedure.input(filters.optional()).query(({ input, ctx }) => listStores(input ?? {}, ctx.token)),
  getById: protectedProcedure.input(z.object({ id: z.string().uuid() })).query(({ input, ctx }) => getStoreById(input.id, ctx.token)),
  create: protectedProcedure.input(storeInput).mutation(({ input, ctx }) => createStore(input, ctx.token)),
  update: protectedProcedure.input(z.object({ id: z.string().uuid(), data: storeInput.partial() })).mutation(({ input, ctx }) => updateStore(input.id, input.data, ctx.token)),
  remove: protectedProcedure.input(z.object({ id: z.string().uuid() })).mutation(({ input, ctx }) => deleteStore(input.id, ctx.token)),
  metrics: protectedProcedure.query(({ ctx }) => getStoreMetrics(ctx.token)),
});

export type StoreRouter = typeof storeRouter;