# LifePhone: Workflow and SDLC

## 1. Purpose

This document is the operating contract for every LifePhone agent and contributor. LifePhone uses Spec-Driven Development (SDD) and Test-Driven Development (TDD) under `mi-arnes-ia`. No feature is considered implemented because it compiles or looks correct: it must satisfy an approved specification, automated tests, type validation, and the harness gate.

The project has four execution surfaces:

- Expo/React client for mobile and PWA experiences.
- Typed application services and repositories.
- Supabase Cloud PostgreSQL, Auth, RLS, and migrations.
- The harness in `.harness/`, which owns task state, quality rules, and the pre-commit gate.

## 2. Mandatory SDD cycle

Every feature starts with a versioned document in `specs/` and a corresponding task in `.harness/tasks/featurelist.json`.

1. Define scope, actors, data contracts, authorization rules, failure states, and acceptance criteria.
2. Identify the owning module and dependencies. Do not create UI to compensate for an undefined backend contract.
3. Convert each acceptance criterion into one or more automated tests.
4. Run the test suite before implementation and record the expected red result.
5. Implement the smallest production change that makes the tests green.
6. Review types, error propagation, RLS assumptions, and affected data flows.
7. Run the complete gate and update the task and progress records only after it passes.

A specification must state what is implemented, what is planned, and what external prerequisite remains. Static SQL contract tests do not count as a live Supabase integration test.

## 3. Mandatory TDD rules

- Tests are written before production code for every new behavior.
- Repository tests must cover success, empty results, validation boundaries, and propagated Supabase errors.
- RLS-sensitive tests must model a rejected response with PostgreSQL error code `42501` and assert that the repository rejects; no client code may convert denial into an empty success.
- Metrics tests must use fixed fixtures and explicitly document status semantics and time windows.
- TypeScript code is compiled with `strict: true`; `any` and untyped globals are forbidden.
- Interface tests are not a substitute for domain and repository tests.

## 4. Harness and pre-commit

The official local gate is:

```bash
bash .harness/scripts/init.sh
```

The gate must:

- Verify `agents.md` and `.harness/tasks/featurelist.json` exist.
- Run `npm test`, currently Vitest.
- Run `npm run typecheck` when the script exists.
- Exit non-zero on any failure.

The versioned hook template is `.githooks/pre-commit`; the harness installs it into `.git/hooks/pre-commit`. A commit is blocked when tests, typechecking, or harness integrity fail. Never bypass the hook with `--no-verify` for feature work.

## 5. Required commands

```bash
npm test
npm run typecheck
bash .harness/scripts/init.sh
```

`npm install` must be followed by review of the lockfile. Dependencies must be verified against the installed version before using a new API. The current official client is `@supabase/supabase-js`; the current test runner is Vitest.

## 6. Branch and task hygiene

- Keep one coherent Spec/task slice per change.
- Update `.harness/tasks/current.json` while the task is active and mark it `done` only after the gate passes.
- Do not mix UI work, schema work, and unrelated refactors in one task.
- Preserve user changes in a dirty worktree.
- Never commit secrets, `.env`, Supabase service-role keys, generated credentials, or production data.

## 7. Definition of Done

A task is done only when:

- Its Spec and acceptance criteria are present.
- Tests were created before the implementation and are green.
- `npm test`, `npm run typecheck`, and the harness gate pass.
- The change respects the role matrix and RLS boundary.
- Error behavior is explicit and documented.
- Documentation and task state describe the resulting behavior accurately.
