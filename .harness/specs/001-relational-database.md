# SPEC-001: Base relacional Supabase

## Propósito

Definir el contrato inicial de datos para el CRM de expansión de LifePhone y el portal B2B de tiendas aliadas.

## Alcance

- `roles` y `profiles` soportan `super_admin`, `admin`, `staff_orders`, `read_only` y `store_user`.
- `expansion_leads` representa negociaciones y tiendas potenciales en Venezuela.
- `products` representa el catálogo digital mayorista y su inventario.
- `store_orders` y `order_items` representan solicitudes de compra de tiendas aliadas.

## Criterios de aceptación

1. La migración `supabase/migrations/001_initial_schema.sql` crea las seis tablas con claves primarias y relaciones declaradas.
2. Los roles permitidos están restringidos por una condición de base de datos y se insertan de forma idempotente.
3. Cantidades, precios, estados y referencias invalidas son rechazados por restricciones SQL.
4. Las tablas quedan con Row Level Security habilitado antes de exponer datos mediante Supabase.
5. `check_user_role` resuelve el rol desde el perfil autenticado sin aceptar el rol desde el cliente.
6. Ninguna política de `expansion_leads` concede acceso a `store_user`; las operaciones autorizadas usan roles internos explícitos.
7. `npm test` y `bash .harness/scripts/init.sh` terminan con código cero.

## Orden TDD

La prueba `tests/database-schema.test.js` comprueba la presencia de tablas, roles, `check_user_role` y las políticas RLS del CRM. La prueba es un contrato de migración; la verificación contra un proyecto Supabase efímero se añadirá cuando el entorno local de Supabase forme parte del toolchain.