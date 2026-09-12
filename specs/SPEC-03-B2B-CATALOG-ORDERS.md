# SPEC-03: B2B catalog and store orders

## 1. Goal

Provide allied stores with a controlled wholesale catalog and an internal request workflow. A store user can discover active products and submit order requests without seeing CRM expansion data or another store's orders.

## 2. Product catalog

The `products` table is the catalog source:

- `sku` is unique and stable.
- `name` is required; `description` is optional.
- `wholesale_price` is a non-negative numeric snapshot source.
- `stock_quantity` is a non-negative integer.
- `is_active` controls whether a product is visible to store users.
- `created_at` and `updated_at` support audit and synchronization.

Store users read active products only. Internal roles may manage products according to the RLS matrix. The client must not trust a hidden or disabled product: the database query must include the active constraint and insert validation must re-check product availability.

Future pagination requirements: order by `name` then `id`, use a stable cursor, and never load the entire catalog into memory for production data volumes.

## 3. Order aggregate

`store_orders` is the aggregate root. `order_items` belongs to exactly one order and references a product.

Required request statuses:

1. `requested`: created by an allied store and awaiting internal review.
2. `confirmed`: accepted by operations.
3. `preparing`: inventory is being prepared.
4. `shipped`: delivered to the carrier or dispatch flow.
5. `completed`: closed successfully.
6. `cancelled`: rejected or cancelled with an audit reason in a future history table.

The current migration enforces status values, positive quantities, non-negative unit prices, foreign keys, cascade item deletion, and one item per product per order.

## 4. Creation flow

1. Authenticated `store_user` selects active products.
2. Client builds an in-memory request with product IDs and positive quantities.
3. Repository validates non-empty items, integer quantities, and no duplicate product IDs.
4. Database transaction verifies active product rows and available inventory.
5. Server copies the current wholesale price into `order_items.unit_price`.
6. Server creates `store_orders` in `requested` status and its items atomically.
7. The client displays the returned order ID and status; it does not infer success from a local optimistic object.

The transaction and inventory reservation mechanism require a follow-up SQL/RPC Spec before production. A client-side loop of inserts is not atomic and is forbidden for the final implementation.

## 5. Role and RLS rules

- `store_user`: read active products; create orders for own `profiles.id`; read own orders and items; cannot update an order after internal confirmation; cannot set status to an internal state.
- `staff_orders`: read and process orders; may update operational statuses; cannot manage roles.
- `admin` and `super_admin`: full catalog and order administration.
- `read_only`: read-only catalog/order reporting as allowed by policy.
- No role has access to `expansion_leads` solely because it can access catalog data.

Policies must filter `store_orders.store_profile_id = auth.uid()` and join `order_items` through an order visible to that user. All mutation policies require both role and row/state checks.

## 6. Error and consistency behavior

User-visible categories:

- `42501`: authorization denied; preserve the error and show an access-safe message.
- Validation error: no network mutation is attempted.
- Product unavailable or insufficient stock: transaction rolls back and the order is not partially created.
- Network/unknown error: retry only idempotent reads; do not duplicate order creation without an idempotency key.

The final workflow should add an order history/outbox mechanism for audit, notifications, and reliable status transitions.

## 7. Tests and acceptance

Required contract tests:

- Active catalog filtering and typed product rows.
- Valid request creates one order and item set.
- Empty, duplicate, zero, negative, and unavailable item requests reject.
- Store users cannot read another store's order.
- Store users cannot forge price, owner, or internal status.
- RLS and transaction errors are propagated.
- Repeated request with the same idempotency key does not create a duplicate.

Implement only after tests are red and the migration/RPC contract is specified. Run `npm test`, `npm run typecheck`, and `bash .harness/scripts/init.sh`.
