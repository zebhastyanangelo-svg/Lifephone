# Diseño: Integración ImgBB para fotos de concesionarios

Fecha: 2026-08-25

## Objetivo

Cada concesionario puede tener una imagen asignada, cargada y modificada exclusivamente por administradores, almacenada en ImgBB y referenciada en Supabase (`concesionarios.image_url`).

## Decisiones

1. **Transporte:** el frontend envía `multipart/form-data` al backend (multer en memoria); el backend reenvía la imagen a ImgBB como base64. La API key nunca sale del servidor.
2. **Endpoint dedicado:** `POST /api/v1/concesionarios/:id/imagen` (subir/reemplazar) y `DELETE /api/v1/concesionarios/:id/imagen` (quitar). El CRUD existente queda intacto.
3. **Sin borrado en ImgBB:** al reemplazar, la imagen anterior queda huérfana en ImgBB (la API pública no ofrece delete). Aceptado por el usuario.
4. **Seguridad:** ambas rutas protegidas con `requireAdmin`. Límite 5 MB, solo tipos `image/*`.

## Componentes

### Base de datos

Migración `002_concesionario_imagen.sql`:

```sql
ALTER TABLE public.concesionarios ADD COLUMN IF NOT EXISTS image_url TEXT;
NOTIFY pgrst, 'reload schema';
```

### Backend (`packages/backend/`)

- `.env`: `IMGBB_API_KEY=<clave>` (gitignored). Error claro al invocar el servicio si no está configurada.
- `src/services/imgbb.service.ts`: recibe buffer, hace POST a `https://api.imgbb.com/1/upload?key=...`, devuelve `data.url`. Errores → `ApiError 502`.
- Dependencias: `multer`, `@types/multer`.
- Módulo concesionarios: rutas nuevas con `requireAdmin`; service valida existencia del concesionario (404) y guarda/limpia `image_url`.
- Modelo: campo opcional `image_url?: string | null`.

### Frontend (`packages/frontend/`)

- Tipos: `Concesionario.image_url?: string | null`.
- `services/api.ts`: `subirImagenConcesionario(id, file)` y `quitarImagenConcesionario(id)`.
- `ConcesionarioModal.tsx`: input file con previsualización local y botón para quitar imagen (solo admin ya controlado por ruta).
- Tarjetas/tabla/detalle: muestran la foto con fallback a iniciales.

## Verificación

- `npx.cmd tsc --noEmit` backend sin errores nuevos.
- Frontend: sin errores nuevos respecto al estado actual (fallos preexistentes documentados).
- Commit y push a `main` solicitados explícitamente por el usuario para desplegar.
