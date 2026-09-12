# LifePhone Specs

These documents are the agent-facing source of truth for LifePhone. They complement the executable contracts in `.harness/specs/` and the implementation in `src/` and `supabase/`.

## Reading order

1. [WORKFLOW_AND_SDLC.md](WORKFLOW_AND_SDLC.md): mandatory SDD/TDD process and Definition of Done.
2. [SPEC-01-BACKEND-DATABASE-RLS.md](SPEC-01-BACKEND-DATABASE-RLS.md): tables, identity, RLS, and role isolation.
3. [SPEC-02-CRM-EXPANSION.md](SPEC-02-CRM-EXPANSION.md): Expansion CRM domain and repository contract.
4. [SPEC-03-B2B-CATALOG-ORDERS.md](SPEC-03-B2B-CATALOG-ORDERS.md): catalog and allied-store order workflow.
5. [SPEC-04-FRONTEND-EXPO-ROUTER.md](SPEC-04-FRONTEND-EXPO-ROUTER.md): future Expo Router navigation and role-aware frontend.
6. [SPEC-05-FRONTEND-NUCLEUS.md](SPEC-05-FRONTEND-NUCLEUS.md): platform-agnostic frontend logic core (session machine, role navigation, view states, Blobatar seed) required before any UI Spec.
7. [SPEC-06-UI-EXPO-ROUTER.md](SPEC-06-UI-EXPO-ROUTER.md): typed Expo Router screen layer (screen manifest, per-phase/per-role route resolution, page model with ViewState and Blobatar); the `.tsx` mount under `app/` is Phase 2 → SPEC-07.

## Agent procedure

Before editing, read the workflow document and the Spec for the active task. Confirm the current implementation baseline, write or update tests first, run the red test, implement the smallest change, and finish with:

```bash
npm test
npm run typecheck
bash .harness/scripts/init.sh
```

When a Spec and code disagree, do not silently reinterpret either one. Update the Spec and its acceptance tests in the same task, or stop and request clarification.
