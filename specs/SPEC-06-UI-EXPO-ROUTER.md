# SPEC-06: Expo Router screen structure and role-aware view layer

## 1. Goal and relationship to SPEC-04 / SPEC-05

SPEC-04 defines the target Expo Router file tree, the role route matrix, the shared state components, and the
Blobatar contract. SPEC-05 delivered the platform-agnostic frontend logic core in `src/frontend/` (session
machine, role landing, route bridge, mutation visibility, view states, avatar seed).

This Spec adds the **screen layer**: the typed screen manifest of the SPEC-04 tree, the deterministic
per-phase/per-role route resolution (what renders, what redirects, what waits), and the **page model** that
composes screen chrome (title), `ViewState`, and the Blobatar `AvatarSpec` into the prop object that the future
screens consume.

The selector layer must never bypass `resolveExpoRouteAccess` (which delegates to `canAccessRoute`) and never
weaken the RLS/guard authority. `resolveScreenRoute` may only *remap* guard-legal routes between tenant views
(e.g. `store_user` sees `my-orders`, staff sees `orders`) and *redirect* guard-denied routes to the role
landing.

### 1.1 Scope boundaries (phasing)

- **Phase 1 (this Spec):** pure TypeScript screen layer in `src/frontend/` + tests. No new dependency;
  `package.json`, `tsconfig.json` and the Vitest configuration remain valid.
- **Phase 2 (SPEC-07, separate):** the actual `.tsx` mount under `app/` as defined in SPEC-04 §2, together with
  the Expo/React Native toolchain, `@blobatar/react-native` + `react-native-svg` (installed and verified per
  SPEC-04 §7) and an Expo-compatible component test tool (SPEC-04 §8). Phase 2 depends on Phase 1 being green.

## 2. Screen inventory (logical path → screen → target `app/` segment)

| Logical path | `ExpoScreenKey` | Target `app/` segment (Phase 2) | Title | Area | Protected | Avatar provider |
| --- | --- | --- | --- | --- | --- | --- |
| `/sign-in` | `sign-in` | `(auth)/sign-in` | Iniciar sesión | auth | no | – |
| `/access-denied` | `access-denied` | `(protected)/access-denied` | Acceso denegado | auth | yes | – |
| `/expansion` | `expansion-index` | `(protected)/(admin)/expansion/index` | Expansión | expansion | yes | profile |
| `/expansion/[leadId]` | `lead-detail` | `(protected)/(admin)/expansion/[leadId]` | Detalle de lead | expansion | yes | profile |
| `/products` | `products-index` | `(protected)/(admin)/products/index` | Productos | products | yes | profile |
| `/orders` | `orders-index` | `(protected)/(orders)/orders/index` | Pedidos | orders | yes | profile |
| `/orders/[orderId]` | `order-detail` | `(protected)/(orders)/orders/[orderId]` | Detalle de pedido | orders | yes | profile |
| `/catalog` | `catalog-index` | `(protected)/(store)/catalog/index` | Catálogo | catalog | yes | store |
| `/cart` | `cart` | `(protected)/(store)/cart` | Carrito | catalog | yes | store |
| `/my-orders` | `my-orders-index` | `(protected)/(store)/my-orders/index` | Mis pedidos | orders | yes | store |
| `/my-orders/[orderId]` | `my-orders-detail` | `(protected)/(store)/my-orders/[orderId]` | Detalle de mi pedido | orders | yes | store |

The `/` index is not a screen: `resolveScreenRoute` resolves it deterministically to the role landing
(`/expansion`, `/orders` or `/catalog`).
## 3. Session-phase routing

`resolveScreenRoute({ phase, path }) -> { kind: 'wait' } | { kind: 'render'; screen } | { kind: 'redirect'; to; reason }`

| Phase | Decision |
| --- | --- |
| `loading` | `wait` for any path. Never redirect, never render protected content (SPEC-04 §3). |
| `anonymous` + `/sign-in` | `render sign-in` |
| `anonymous` + anything else | `redirect /sign-in` (`unauthenticated`) |
| `invalid_role` + `/access-denied` | `render access-denied` (recovery path offers sign out) |
| `invalid_role` + anything else | `redirect /access-denied` (`no_role`) |
| `authenticated` + `/` or `/sign-in` | `redirect resolveRoleLanding(role)` (`landing`) |
| `authenticated` + `/access-denied` | `render access-denied` (manual visit is harmless) |
| `authenticated` + unknown path | `redirect /access-denied` (`forbidden`) |
| `authenticated` + protected path | see §5 |

## 4. Tenant view remap (guard-legal, deterministic UX)

Both tenant views are permitted by the guard for these routes; the remap picks the right *screen* per role
without changing the guard outcome:

- `store_user` visiting `/orders` or `/orders/[orderId]` → `redirect` to `/my-orders` (or `/my-orders/[orderId]`);
  `/products` → `/catalog`.
- Staff roles (`super_admin`, `admin`, `staff_orders`, `read_only`) visiting `/my-orders`, `/my-orders/[orderId]`
  or `/cart` → `redirect` to `/orders` (or `/orders/[orderId]` for the detail remap).

## 5. Access enforcement

- For every remaining protected path, call `resolveExpoRouteAccess(role, path, 'read')`. This is the single
  source of truth (`canAccessRoute`); selectors never open a path the guard denies.
- `allowed` → `render screenForPath(path)`.
- `unauthenticated` → `redirect /sign-in`. `unknown_route` → `redirect /access-denied`.
- `forbidden` → `redirect resolveRoleLanding(role)` (deterministic; avoids 403 loops, SPEC-04 §4).

## 6. View state wiring

Every renderable screen is delivered through a `ScreenPageModel` carrying a `ViewState` verbatim:

```ts
type ScreenPageModel = {
  screen: ExpoScreenKey;
  title: string;
  viewState: ViewState;   // loading | empty | error | forbidden
  avatar: AvatarSpec | null;
};
```

In Phase 2, `loading`/`empty`/`error`/`forbidden` map one-to-one to the shared `LoadingState`, `EmptyState`,
`ErrorState`, `ForbiddenState` components (SPEC-04 §5). Raw Supabase messages never reach the UI: errors must
be produced through `errorStateFromUnknown` (SPEC-05 §6).

## 7. Blobatar wiring

- `screen.avatar` is populated only for screens that declare an avatar provider **and** receive a non-empty
  display name; otherwise it is `null` (no anonymous-avatar clutter in headers).
- The provider determines the identity source: `store` screens seed from the store name, back-office screens
  seed from the profile display name.
- The `size` comes from the manifest entry (explicit positive integer) so list rows, headers, and profiles
  render identical dimensions (SPEC-04 §7). Seeds never contain tokens, emails, or URL parameters.
- Rendering itself (the shared `Avatar` component plus `@blobatar/react-native` verification) is Phase 2.

## 8. Tests before implementation (TDD)

- `tests/frontend/screenTree.test.ts` — manifest completeness (11 screens), unique keys/paths/segments,
  protection flags, avatar providers, `resolveScreenEntry`, `screenForPath`, `isScreenPath`, and every
  protected path passes `resolveExpoRouteAccess(..., super_admin, 'read')`.
- `tests/frontend/screenRouting.test.ts` — `loading` never redirects or renders; anonymous/invalid redirect
  rules; authenticated landings; every role×path in the matrix; tenant remaps; unknown paths; guard-denied
  routes land on `resolveRoleLanding`.
- `tests/frontend/pageModel.test.ts` — title/chrome, avatar only when provider + non-empty name, `ViewState`
  passthrough, safe error mapping, `RangeError` on unknown screen keys.

## 9. Definition of Done

- Spec present; tests written and green; selectors consume only SPEC-05/TDD-tested contracts.
- Route guards (`routeGuards.ts`) and RLS remain the authority; no security rule weakened.
- `npm test`, `npm run typecheck` and `bash .harness/scripts/init.sh` pass.
- No new dependency; `package.json`, lockfile, `tsconfig.json` and Vitest config unchanged.
- Phase 2 (`app/` `.tsx` mount, Expo/RN/blobatar tooling, component tests) is tracked as SPEC-07.