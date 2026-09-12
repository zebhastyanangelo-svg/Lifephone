# LifePhone

CRM de expansión y portal B2B mayorista para tiendas aliadas en Venezuela, construido con React/Expo y Supabase Cloud.

## Flujo de calidad

El arnés se integra desde `.harness/`. Antes de cerrar una tarea se ejecuta:

```bash
bash .harness/scripts/init.sh
```

El hook `pre-commit` ejecuta el mismo gate automáticamente. La especificación inicial de datos está en `.harness/specs/001-relational-database.md` y su migración en `supabase/migrations/001_initial_schema.sql`.

## Cliente Expo

El cliente tipado vive en `src/lib/supabase.ts` y solo lee `EXPO_PUBLIC_SUPABASE_URL` y `EXPO_PUBLIC_SUPABASE_ANON_KEY`. Copia `.env.example` a `.env` para desarrollo local; nunca uses una `service_role` key en Expo ni la incluyas en el repositorio.

Las pruebas de contrato y del cliente usan Vitest:

```bash
npm test
npm run typecheck
```