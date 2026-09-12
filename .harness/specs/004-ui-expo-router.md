# SPEC-004: Vistas y pantallas UI con Expo Router — capa de pantallas tipada por rol

## Propósito

Implementar la capa de pantallas plataforma-agnóstica de SPEC-06 (fase 1) que consumirán los `.tsx` de Expo
Router en fase 2 (SPEC-07): manifest tipado del árbol de SPEC-04, resolución determinista `wait/render/redirect`
por fase de sesión y rol, y page model que compone título, `ViewState` y Blobatar. La fase 2 (toolchain
Expo/React Native, `@blobatar/react-native`, `react-native-svg` y tool de tests de componentes) queda fuera de
este spec y se rige por SPEC-04 §7/§8.

## Contrato

- `src/frontend/screenTree.ts`: `ScreenPath`, `ExpoScreenKey`, `ScreenMeta` y `SCREEN_TREE` (11 pantallas con
  ruta lógica, segmento objetivo `app/`, título, área, `protected` y proveedor de avatar `profile | store`),
  más `resolveScreenEntry`, `screenForPath` e `isScreenPath`.
- `src/frontend/screenRouting.ts`: `RouteResolution` (`wait | render | redirect`) y `resolveScreenRoute` sin
  debilitar guards: delega en `resolveExpoRouteAccess`; los mapas de arrendamiento (store ↔ staff) solo remapean
  rutas que el guard ya permite; las denegadas redirigen al aterrizaje del rol.
- `src/frontend/pageModel.ts`: `ScreenPageModel` que compone título, `ViewState` (verbigracia desde
  `errorStateFromUnknown`) y `AvatarSpec` vía `buildAvatarSpec` (size explícito del manifest, seed nunca con
  datos sensibles; avatar solo si la pantalla declara proveedor y el nombre no está vacío).

## Reglas de aislamiento

- Sin proyecto Expo ni `app/` todavía. Sin dependencias nuevas en `package.json`. Sin `.tsx`.
- `routeGuards.ts` y RLS siguen siendo la autoridad; `resolveScreenRoute` nunca abre una ruta denegada por el
  guard y en fase `loading` nunca redirige ni renderiza contenido protegido.
- `read_only` jamás ve controles de mutación; `store_user` jamás accede a vistas internas del CRM.

## TDD y aceptación

Pruebas primero en `tests/frontend/` (`screenTree`, `screenRouting`, `pageModel`). Aceptación: `npm test`,
`npm run typecheck` y `bash .harness/scripts/init.sh` en verde.