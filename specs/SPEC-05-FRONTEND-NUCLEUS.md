# SPEC-05: Frontend nucleus — session, role-aware navigation, and shared view state

## 1. Goal and relationship to SPEC-04

SPEC-04 defines the future Expo Router surface, the role route matrix, and the Blobatar contract. This Spec
implements the **platform-agnostic frontend logic core** that every future screen consumes. It is the required
prerequisite before any Expo/React Native screen Spec is approved.

No live UI is part of this Spec. No Expo, React Native, `@blobatar/react-native`, or `react-native-svg`
dependency is added here. Per SPEC-04 §8, an Expo-compatible component test tool is introduced only when the
first UI Spec is approved; that tooling decision belongs to a later Spec.

## 2. Scope

Production code lands in `src/frontend/` as pure TypeScript modules with no new dependencies:

- `src/frontend/sessionState.ts`: typed session phase machine and deterministic redirect resolution.
- `src/frontend/roleLanding.ts`: role-to-landing-route resolution for the `/` index redirect.
- `src/frontend/expoRouteAccess.ts`: bridge from SPEC-04 Expo paths to the existing route guards.
- `src/frontend/mutationVisibility.ts`: whether mutation controls may render for a role and area.
- `src/frontend/viewState.ts`: discriminated union for shared loading/empty/error/forbidden view states and a
  safe mapper over `handleSupabaseError`.
- `src/frontend/avatarSeed.ts`: deterministic Blobatar seed and explicit size descriptor (rendering deferred).

Tests land first in `tests/frontend/` and pass through the standard Vitest suite.

## 3. Session state machine

Replaces the discrete bullets in SPEC-04 §3 with a typed, pure function so the future `AuthProvider` has zero
decision logic.

```ts
type SessionPhase =
  | { phase: 'loading' }                       // auth or profile still loading; never redirect
  | { phase: 'anonymous' }                     // no active session -> sign-in
  | { phase: 'authenticated'; role: UserRole } // profile role resolved through the typed client
  | { phase: 'invalid_role' };                 // authenticated but role missing/unknown -> recovery path

resolveSessionPhase(input: { sessionActive: boolean; roleLoading: boolean; role: UserRole | null }): SessionPhase
```

Rules (SPEC-04 §3):

- `sessionActive === false` -> `anonymous`.
- `sessionActive === true && roleLoading === true` -> `loading`. Redirect decisions must not occur before role
  loading completes.
- `sessionActive === true && roleLoading === false && role !== null` -> `authenticated`.
- `sessionActive === true && roleLoading === false && role === null` -> `invalid_role`. Never default to `admin`.

`resolveSessionRedirect(phase)` returns:

- `loading` -> `null` (no redirect).
- `anonymous` -> `/sign-in`.
- `authenticated` -> `resolveRoleLanding(role)`.
- `invalid_role` -> `/access-denied` (recovery path; the screen offers sign out, never admin access).

## 4. Role landing and route resolution

### 4.1 Role landing (`/` index)

Deterministic per SPEC-04 §4 "Authenticated user with a valid role visiting `/`":

| Role | Landing path |
| --- | --- |
| `super_admin` | `/expansion` |
| `admin` | `/expansion` |
| `staff_orders` | `/orders` |
| `read_only` | `/expansion` |
| `store_user` | `/catalog` |

### 4.2 Expo path bridge

`resolveExpoRouteAccess(role, path, action)` maps the SPEC-04 route tree to the existing guard keys and reuses
`canAccessRoute` from `src/utils/routeGuards.ts` as the single source of truth. The guard types
(`ProtectedRoute`, `RouteAction`) may be extended but never weakened.

| Expo path area | Guard key |
| --- | --- |
| `/expansion`, `/expansion/[leadId]` | `/expansion` |
| `/products` (admin product management) | `/catalog` |
| `/orders`, `/orders/[orderId]` (internal) | `/orders` |
| `/catalog` | `/catalog` |
| `/cart` (request flow) | `/orders` |
| `/my-orders`, `/my-orders/[orderId]` | `/orders` |

No path may bypass the guard layer to reach a screen or a repository call. A denied route is a typed
`forbidden`/`unauthenticated` result, never an empty success.

### 4.3 Request action

SPEC-03 and SPEC-04 grant `store_user` "own orders and request flow". Extend the action space with `'request'`,
allowed only when the orders capability is `own`, `operate`, or `manage`, so:

- `store_user` may `request` on `/cart` and `/my-orders`.
- `read_only` may never `request`.
- `staff_orders`, `admin`, and `super_admin` may `request` on internal order routes.

## 5. Mutation visibility

`canRenderMutationControls(role, area: 'expansion' | 'products' | 'orders' | 'roles')` centralizes the
"does this user see mutation controls?" rule per Spec. It must agree with `canAccessRoute(..., 'manage')`
for internal areas; `store_user` orders use the `request` action instead.

| Area | Mutation controls visible to |
| --- | --- |
| `expansion` | `super_admin`, `admin`, `staff_orders` |
| `products` | `super_admin`, `admin` |
| `orders` | `super_admin`, `admin`, `staff_orders`; `store_user` only in owned request flow |
| `roles` | `super_admin` only |

`read_only` never sees mutation controls anywhere.

## 6. Shared view state primitives

Consumes `handleSupabaseError`; raw Supabase messages are never placed in user-visible text (SPEC-04 §7 and the
errorHandler contract).

```ts
type ViewState =
  | { status: 'loading'; label?: string }
  | { status: 'empty'; title: string; message: string }
  | { status: 'error'; kind: HandledSupabaseError['kind']; message: string; retryable: boolean }
  | { status: 'forbidden'; message: string };

loadingState(label?): ViewState
emptyState(title, message): ViewState
forbiddenState(message?): ViewState
errorStateFromUnknown(error: unknown): ViewState   // wraps handleSupabaseError, never throws
```

These four states map to the shared `LoadingState`, `EmptyState`, `ErrorState`, `ForbiddenState` components in
SPEC-04 §5 once the UI Spec is approved.

## 7. Blobatar preparation (logic only)

Rendering stays out of scope; only the deterministic contract from SPEC-04 §7 is implemented:

```ts
type AvatarSpec = { seed: string; size: number; isFallback: boolean };

buildAvatarSpec(displayName: string | null | undefined, size: number): AvatarSpec
```

- `seed` is the trimmed stable display name; empty/missing/whitespace-only names produce a fixed fallback seed
  (`'anonymous'`) and `isFallback = true`.
- `size` must be a positive integer and is propagated verbatim so list rows, headers, and profiles render the
  same dimensions.
- The seed never contains tokens, emails, or other sensitive profile data; the function only accepts a display
  name.

Verification of the installed `@blobatar/react-native` and `react-native-svg` APIs in `package.json`, plus the
shared avatar component with render tests, is a separate dedicated UI Spec (SPEC-06 placeholder) per SPEC-04 §7.

## 8. Tests before implementation

Each acceptance criterion becomes a Vitest test under `tests/frontend/`:

1. `sessionState.test.ts` — anonymous, loading (no redirect), authenticated with known role, and `invalid_role`
   (never defaults to `admin`); redirect map for all four phases.
2. `roleLanding.test.ts` — every role resolves the expected landing; result is deterministic.
3. `expoRouteAccess.test.ts` — `store_user` is forbidden on `/expansion` and `/expansion/[leadId]` and allowed on
   `/catalog`, `/cart`, `/my-orders`; `read_only` cannot `manage`; `staff_orders` cannot reach `/admin/roles`;
   the bridge maps every SPEC-04 area without weakening the guard.
4. `mutationVisibility.test.ts` — matrix per area; `read_only` sees no mutation controls.
5. `viewState.test.ts` — `42501` maps to a non-retryable authorization error with a safe message; network errors
   are retryable; empty/loading/forbidden builders are typed; unknown errors never leak internal messages.
6. `avatarSeed.test.ts` — stable seed across calls, trimmed input, fallback for empty names, explicit positive
   `size` propagation, and rejection of non-positive sizes.

Run the red tests first, then implement the smallest production change, then green.

## 9. Harness and Definition of Done

- No new runtime or dev dependency. `package.json` and the lockfile do not change.
- Since these modules are pure TypeScript consumed later by Expo, the existing `tsconfig.json` and Vitest
  configuration remain valid.
- Done requires: Spec present, tests written before implementation and green, the full role matrix and RLS
  boundary respected, `npm test`, `npm run typecheck`, and `bash .harness/scripts/init.sh` passing.
- The UI screen work (SPEC-04 tree) starts only after this nucleus and the Blobatar render Spec (SPEC-06) are
  approved and green.