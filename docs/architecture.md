# Arquitectura LifePhone

## Propósito

LifePhone será un CRM de expansión para negociar con tiendas potenciales en Venezuela y un portal B2B mayorista para que las tiendas aliadas consulten productos y soliciten pedidos.

## Capas

- **Expo/React:** aplicaciones móviles y web, incorporadas después del contrato de datos.
- **Servicios de dominio:** casos de uso para leads, catálogo, inventario y pedidos.
- **Supabase Cloud:** PostgreSQL, Auth, RLS y almacenamiento; la migración inicial vive en `supabase/migrations/`.
- **Arnés SDD/TDD:** specs en `.harness/specs/`, pruebas automatizadas y gate de pre-commit.

## Límites iniciales

La UI no se implementa en esta fase. Cada siguiente feature debe añadir primero su Spec y una prueba roja, y solamente después código de producción.