# SPEC-02: Expansion CRM backend and domain logic

## 1. Goal and actors

The Expansion CRM tracks potential allied stores and negotiations across Venezuela. It is an internal workflow, separate from the B2B store portal.

Actors:

- `super_admin` and `admin`: manage all lead records and ownership.
- `staff_orders`: create and operate negotiations according to assigned workflow permissions.
- `read_only`: inspect CRM data and metrics without mutations.
- `store_user`: has no access to this module, enforced by Supabase RLS rather than UI hiding.

## 2. Lead contract

The database contract is `expansion_leads` in `supabase/migrations/001_initial_schema.sql`.

The domain input is:

```ts
{
  store_name: string;
  owner_name: string;
  location: { state: string; city: string };
  status: 'new' | 'contacted' | 'qualified' | 'negotiating' | 'won' | 'lost';
}
```

The repository maps it to `store_name`, `contact_name`, `state`, `city`, and `status`. `phone`, `email`, `notes`, and `owner_id` may be added by a later Spec without changing the domain naming boundary.

Validation rules:

- `store_name`, `owner_name`, `location.state`, and `location.city` are non-empty after trimming.
- `status` must be one of the database enum/check values.
- Venezuela location values are stored as text; state and city normalization belongs to a later reference-data Spec.
- No client-provided `owner_id` may grant ownership or authorization.

## 3. Status lifecycle

| Status | Meaning | Allowed next states |
| --- | --- | --- |
| `new` | Captured but not contacted. | `contacted`, `lost` |
| `contacted` | First outreach completed. | `qualified`, `lost` |
| `qualified` | Commercial fit confirmed. | `negotiating`, `lost` |
| `negotiating` | Active commercial negotiation. | `won`, `lost` |
| `won` | Approved/active allied store. | Operational onboarding only |
| `lost` | Closed without agreement. | Reopen requires an explicit future workflow |

The current repository validates database errors but does not yet implement a client-side transition command. A transition service must be specified and tested before allowing arbitrary status updates.

## 4. Repository contract

Implemented in `src/repositories/expansionLeadsRepository.ts`:

- `createExpansionLead(client, lead)`: inserts one mapped lead, selects the inserted row, and rejects on any Supabase error.
- `listExpansionLeads(client)`: selects all permitted rows and propagates RLS errors.
- `getExpansionMetrics(client)`: selects statuses and returns `{ totalInNegotiation, totalApprovedActive }`.

The repository receives a typed `SupabaseClient` boundary. It must not create a second client, read tokens directly, bypass RLS, or swallow errors. Error code `42501` is an authorization failure and must remain observable to the caller.

## 5. Growth metrics

### 5.1 Current metrics

- `totalInNegotiation`: count of rows with `status = 'negotiating'`.
- `totalApprovedActive`: count of rows with `status = 'won'`.

These counts are authorization-filtered by RLS; an internal user sees only rows allowed by their policy.

### 5.2 Weekly and monthly national growth

The future metrics service must use `created_at` and the business timezone `America/Caracas`:

- Weekly window: local Monday 00:00:00 through the next Monday boundary.
- Monthly window: local first day 00:00:00 through the next first-day boundary.
- `newLeads`: rows created in the window.
- `negotiationsOpened`: rows entering `negotiating` in the window. This requires a status-history table or event timestamp; counting current status alone is insufficient.
- `approvedActive`: rows entering `won` in the window.
- `conversionRate`: `approvedActive / negotiationsOpened`, returning `0` when the denominator is zero.

Metrics must document whether they count lead rows or distinct stores. The initial schema has no canonical store identity; duplicate detection and a future `stores` table must be specified before claiming distinct-store growth.

## 6. Tests and acceptance

`tests/expansionLeads.test.ts` is the contract-first test suite. It covers insertion mapping, metrics, and RLS rejection for read and mutation paths.

Additional required tests before production:

- Empty metrics return zeroes.
- Supabase query failure rejects for all repository methods.
- Invalid status and blank location are rejected before network calls.
- Weekly/monthly boundary timestamps in `America/Caracas`.
- A `store_user` cannot retrieve or mutate a lead even when it calls the repository directly.

Acceptance requires the Spec, tests before implementation, `npm test`, `npm run typecheck`, and the harness gate in green.
