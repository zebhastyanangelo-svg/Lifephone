# SPEC-04: Expo Router frontend and protected navigation

## 1. Scope

This document defines the future Expo/React Native and PWA surface. No interface implementation is part of the current backend Specs. Frontend work must begin with tests for route guards, loading states, empty states, and error states.

Expo Router is the navigation boundary. Supabase Auth is the session source. RLS remains the final authority; route guards improve UX but are not security controls.

## 2. Route organization

Target file structure:

```text
app/
  _layout.tsx
  (auth)/
    sign-in.tsx
  (protected)/
    _layout.tsx
    index.tsx
    (admin)/
      expansion/
        index.tsx
        [leadId].tsx
      products/
        index.tsx
    (orders)/
      orders/
        index.tsx
        [orderId].tsx
    (store)/
      catalog/
        index.tsx
      cart.tsx
      my-orders/
        index.tsx
        [orderId].tsx
src/
  features/
  repositories/
  lib/
```

Route groups are organizational; authorization must be enforced by a shared protected layout and server-side RLS.

## 3. Session and role state

The root layout subscribes to Supabase Auth session changes and exposes a typed state machine:

- `loading`: do not redirect or render protected content yet.
- `anonymous`: redirect protected routes to `/(auth)/sign-in`.
- `authenticated + profile loading`: show a bounded loading state.
- `authenticated + known role`: resolve the role matrix.
- `authenticated + missing/invalid role`: sign out or show an access-denied recovery path; never default to admin.

The profile role is fetched through the typed client. It must not be trusted from AsyncStorage or a URL parameter.

## 4. Role route matrix

| Route area | `super_admin` | `admin` | `staff_orders` | `read_only` | `store_user` |
| --- | --- | --- | --- | --- | --- |
| Expansion CRM | full | full | operational | read-only | redirect/403 |
| Product catalog | full | full | read | read | active products read |
| Order operations | full | full | full | read | own orders and request flow |
| Role/admin settings | full | limited | none | none | none |

Expected redirects:

- Anonymous user -> sign-in.
- `store_user` visiting `/expansion` -> `/catalog` or a typed 403 screen.
- `read_only` attempting a mutation route -> read-only view or 403.
- `staff_orders` visiting role settings -> orders landing page.
- Authenticated user with a valid role visiting `/` -> role-appropriate landing page.

Redirect decisions must be deterministic and must not occur before role loading completes.

## 5. Component boundaries

Feature screens consume repositories/use cases, not raw Supabase calls. Recommended boundaries:

- `AuthProvider`: session lifecycle only.
- `RoleGuard`: route access decision only.
- `ExpansionLeadList` and `ExpansionLeadDetail`: CRM presentation only.
- `ProductCatalog`, `Cart`, `OrderList`, `OrderDetail`: B2B presentation only.
- `LoadingState`, `EmptyState`, `ErrorState`, `ForbiddenState`: shared state rendering.

Components must receive typed data and callbacks. They must not contain RLS policy logic, service-role keys, SQL, or duplicated status transition rules.

## 6. PWA and mobile requirements

- Use responsive layouts for narrow mobile and wide PWA viewports.
- Keep navigation accessible by keyboard and screen reader on web.
- Handle offline/read failure explicitly; never present cached sensitive CRM data to a store user after logout.
- Clear session-bound stores on sign-out and role change.
- Avoid logging tokens, lead details, order details, or full Supabase errors in production.

## 7. Deterministic avatars with Blobatar

Store and user profile avatars must use the official `@blobatar/react-native` library together with `react-native-svg`. The avatar is a visual identity aid, not an authorization mechanism.

Implementation contract:

- Use the stable store name or user name as the Blobatar `seed` so the same entity produces the same avatar across sessions and devices.
- Pass the `size` prop explicitly on every avatar instance. React Native layout limitations make relying on a library default unsafe and can produce inconsistent dimensions in list rows, headers, and profile screens.
- Keep avatar generation deterministic and pure: no random seed generated during render, no token or sensitive profile data in the seed, and no manual SVG replacement when Blobatar is available.
- Add tests for stable seed output, explicit size propagation, missing/empty display names, and rendering in both compact list and profile contexts.
- Verify `@blobatar/react-native` and `react-native-svg` versions and APIs in `package.json` before implementation. The dependency must be introduced by a dedicated frontend Spec and pass the full harness.

The initial Blobatar integration must be added to the shared profile/store avatar component, not copied into individual screens. `RoleGuard` and RLS remain independent of avatar rendering.

## 8. Frontend tests before implementation

Required tests include:

- Anonymous and loading redirect behavior.
- Each role's allowed and denied route matrix.
- Store users never render or request Expansion CRM data.
- Read-only users cannot see mutation controls.
- Auth refresh, sign-out, and missing profile states.
- Mobile/PWA layout smoke tests and accessible labels once screens exist.

Use the repository mocks and Vitest for logic. Add an Expo-compatible component test tool only when the first UI Spec is approved. Run the full harness before marking any frontend task complete.
