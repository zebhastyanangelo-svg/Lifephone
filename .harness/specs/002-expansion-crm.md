# SPEC-002: Módulo de Expansión CRM

## Propósito

Gestionar negociaciones y tiendas potenciales en Venezuela mediante un repositorio tipado sobre `expansion_leads`.

## Contrato

- `createExpansionLead` recibe `store_name`, `owner_name`, `location` y `status`, y los mapea a `store_name`, `contact_name`, `state`, `city` y `status`.
- `listExpansionLeads` consulta leads y propaga cualquier error RLS.
- `getExpansionMetrics` cuenta `negotiating` como negociación y `won` como aprobada/activa.
- Ninguna función del repositorio intenta elevar permisos; un error `42501` se propaga al consumidor.

## TDD y aceptación

La prueba [expansionLeads.test.ts](../../tests/expansionLeads.test.ts) precede a la implementación y cubre inserción, métricas y denegación de consulta/mutación. La aceptación exige `npm test`, `npm run typecheck` y `bash .harness/scripts/init.sh` en verde.