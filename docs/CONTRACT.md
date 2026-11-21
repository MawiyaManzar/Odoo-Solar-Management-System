# Contract (SunPower — agreed foundation)

Changes to roles, table names, status enums, ID prefixes, or endpoint paths need a team announcement and an update to this file + [API.md](API.md) + [db-schema.md](db-schema.md).

| Doc | Owns |
| :--- | :--- |
| [db-schema.md](db-schema.md) | Columns, FKs, enums, build order |
| [API.md](API.md) | HTTP methods, paths, roles, request/response bodies |
| `apps/backend/src/contracts/results.ts` | Zod result shapes (TypeScript source of truth) |
| `apps/backend/src/contracts/id-prefixes.ts` | ID prefixes |

---

## Roles

| Role | May do |
| :--- | :--- |
| `admin` | Catalog CRUD, director/reports, full read; override writes when needed |
| `sales` | Customers, enquiries, quotes, orders, payments |
| `warehouse` | Stock levels, serial units, dispatches |
| `technician` | Site surveys, installations (+ Phase 2 evidences / assignments) |
| `support` | Service tickets; read customers/orders/serials/warranties |

Auth envelope user (login/me/signup) still returns `userId`, `fullName`, `email`, `companyName`, `role`, `createdAt`, `token` on login/signup.

---

## Feature owners (fill names on day)

| Feature | Owner | Branch | Tables it owns |
| :--- | :--- | :--- | :--- |
| schema + auth + contracts | Lead | `main` | `users` (+ foundation) |
| catalog + public landing/inquiry | Dev A | `feat/catalog-landing` | `products`, `packages`, `package_items` (public enquiry also writes `customers`, `enquiries`) |
| enquiries + surveys + quotes | Dev B | `feat/enquiries-quotes` | `customers`, `enquiries`, `site_surveys`, `quotes`, `quote_lines` |
| orders + payments | TBD | `feat/orders` | `orders`, `payments` |
| inventory + dispatch | TBD | `feat/inventory` | `stock_levels`, `serial_units`, `dispatches` |
| installations | TBD | `feat/installations` | `installations` |
| service tickets | TBD | `feat/tickets` | `service_tickets` |
| Phase 2 (warranties, evidence, …) | TBD | after Phase 1 | see db-schema Phase 2 |
| records (template reference) | — | keep on main | `records` |

---

## Tables

**Phase 1 (required):** `users`, `customers`, `enquiries`, `site_surveys`, `products`, `packages`, `package_items`, `quotes`, `quote_lines`, `orders`, `payments`, `stock_levels`, `serial_units`, `dispatches`, `installations`, `service_tickets` (+ template `records`).

**Phase 2 (tables exist; APIs deferred):** `warranty_policies`, `warranties`, `evidences`, `invoices`, `stock_movements`, `subsidy_claims`, `technician_assignments`.

Full column specs: [db-schema.md](db-schema.md).

---

## Endpoint index (Phase 1)

Full request/response detail: [API.md](API.md).

| Method | Path | Roles | Owner feature |
| :--- | :--- | :--- | :--- |
| GET | `/api/health` | public | health |
| POST | `/api/auth/signup` | public | auth |
| POST | `/api/auth/login` | public | auth |
| GET | `/api/auth/me` | any auth | auth |
| GET | `/api/public/packages` | public | catalog |
| GET | `/api/public/packages/:id` | public | catalog |
| POST | `/api/public/enquiries` | public | catalog |
| GET | `/api/staff` | any auth | enquiries |
| GET/POST | `/api/customers` | read: any · write: sales, admin | enquiries |
| GET/PATCH | `/api/customers/:id` | read: any · write: sales, admin | enquiries |
| GET/POST | `/api/enquiries` | read: any · write: sales, admin | enquiries |
| GET/PATCH | `/api/enquiries/:id` | read: any · write: sales, admin | enquiries |
| GET/POST | `/api/enquiries/:id/surveys` | read: any · write schedule: sales, technician, admin | enquiries |
| PATCH | `/api/surveys/:id` | technician, admin | enquiries |
| GET/POST | `/api/products` | read: any · write: admin | catalog |
| PATCH | `/api/products/:id` | admin | catalog |
| GET/POST | `/api/packages` | read: any · write: admin | catalog |
| GET | `/api/packages/:id` | any auth | catalog |
| GET/POST | `/api/quotes` | read: any · write: sales, admin | quotes |
| GET/PATCH | `/api/quotes/:id` | read: any · write: sales, admin | quotes |
| POST | `/api/quotes/:id/send` | sales, admin | quotes |
| POST | `/api/quotes/:id/accept` | sales, admin | quotes |
| POST | `/api/quotes/:id/reject` | sales, admin | quotes |
| POST | `/api/customer-auth/otp` | public | customer OTP |
| POST | `/api/customer-auth/verify` | public | customer OTP |
| GET | `/api/customer/quotes/:id` | customer (own quote) | customer OTP |
| POST | `/api/customer/quotes/:id/accept` | customer (own quote) | customer OTP |
| POST | `/api/customer/quotes/:id/reject` | customer (own quote) | customer OTP |
| GET/POST | `/api/orders` | read: any · write: sales, admin | orders |
| GET/PATCH | `/api/orders/:id` | read: any · write: sales, admin | orders |
| GET/POST | `/api/orders/:id/payments` | read: any · write: sales, admin | orders |
| GET | `/api/stock` | any auth | inventory |
| PATCH | `/api/stock/:productId` | warehouse, admin | inventory |
| GET/POST | `/api/serial-units` | read: any · write: warehouse, admin | inventory |
| POST | `/api/serial-units/:id/scan-out` | warehouse, admin | inventory |
| GET/POST | `/api/dispatches` | read: any · write: warehouse, admin | inventory |
| POST | `/api/dispatches/:id/deliver` | warehouse, admin | inventory |
| GET/POST | `/api/installations` | read: any · write: technician, admin | installations |
| PATCH | `/api/installations/:id` | technician, admin | installations |
| POST | `/api/installations/:id/complete` | technician, admin | installations |
| GET/POST | `/api/service-tickets` | read: any · write: support, admin | tickets |
| GET/PATCH | `/api/service-tickets/:id` | read: any · write: support, admin | tickets |
| POST | `/api/service-tickets/:id/close` | support, admin | tickets |
| GET | `/api/reports/job-margins` | admin | reports |
| GET/POST/PATCH | `/api/records`… | template; write: admin, sales | records |

Phase 2 endpoint stubs are listed at the bottom of [API.md](API.md) — implement only after Phase 1 happy path works in `pnpm dev:real`.

---

## Cross-feature dependencies

1. **Quotes** require survey `result = approved` (or admin override) and read `packages` / `package_items` / `products`.
2. **Orders** created only from `quotes.status = accepted`; payments gate packing.
3. **Dispatches** assign `serial_units` to `order_id`; deliver sets `delivered_at` (warranty clock).
4. **Installations** move order → `completed` and serials → `installed`.
5. **Service tickets** resolve customer → order → serial; Phase 1 warranty from `products.default_warranty_months` + `serial_units.delivered_at`.

Producer merges before consumer. Prefer reading another feature’s table via `db/schema` over importing an unmerged service.

---

## Order of merges

1. This foundation on `main` (schema, migration, seed, contracts, docs).
2. Catalog + customers/enquiries (producers).
3. Quotes → orders/payments → inventory/dispatch → installations → tickets.
4. Phase 2 tables already migrated; wire APIs last.

---

## Demo credentials

Password for all: `hackathon`  
`admin@sunpower.in` · `sales@sunpower.in` · `warehouse@sunpower.in` · `tech@sunpower.in` · `support@sunpower.in`
