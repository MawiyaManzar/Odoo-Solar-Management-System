# Customer portal UI

Owner: Charity | Branch: feat/customer-portal-ui | Status: built

## Part A: Spec (contract for teammates)

### User stories
| ID | Role | Story | Acceptance |
| :--- | :--- | :--- | :--- |
| US-1 | customer | Use a sidebar shell (My Job, My Quotes, Service Requests, Ask Support) | Given a customer token, when they open `/my/*`, Then the left nav highlights the active item and Sign out works |
| US-2 | customer | See My Job with stepper, pay card, and tabs | Given own orders, when they open `/my/jobs`, Then they see status stepper, total/paid/balance on the pay card, payment actions, and tabbed Payments / Dispatch / Serials / Service (no duplicate right-rail summary) |
| US-3 | customer | List own quotes | Given a customer token, when GET `/api/customer/quotes`, Then only their viewable quotes are returned |
| US-4 | customer | Open Service Requests | Given a customer token, when they open `/my/service`, Then they see own tickets (or empty) and can raise a request for a delivered serial |
| US-5 | customer | Ask Support bot | Given a customer token, when they POST a question to `/api/customer/support/ask`, Then they get a plain-language answer grounded in their orders/quotes (no chat table) |

### Roles and permissions
| Action | customer | staff |
| :--- | :--- | :--- |
| Sidebar + My Job / Quotes / Service / Support | yes | no (403 on customer APIs) |
| Pay own order (UPI UTR) | yes | staff use `/api/orders/:id/payments` |
| Accept / reject quote | yes (existing) | sales/admin |
| Create / list own service tickets | yes | support/admin staff paths |
| Ask support bot | yes | n/a |

### API contract

Existing (unchanged):
- `POST /api/customer-auth/sign-in/otp|verify`
- `GET /api/customer/orders`
- `POST /api/customer/orders/:id/payments` `{ amountInr, kind, reference }`
- `GET|POST /api/customer/quotes/:id`, `.../accept`, `.../reject`

New:
| Method | Path | Who | Body / notes |
| :--- | :--- | :--- | :--- |
| GET | `/api/customer/quotes` | that customer | List viewable quotes (`sent`, `accepted`, `rejected`, `expired`). Shape matches quote list fields (no draft) |
| GET | `/api/customer/service-tickets` | that customer | Own tickets with serial/product labels |
| POST | `/api/customer/service-tickets` | that customer | `{ serialUnitId, faultCode?, description, billableInr? }` · serial must belong to customer and be delivered · under-warranty sets billable 0 |
| POST | `/api/customer/support/ask` | that customer | `{ question }` (1–500 chars) → `{ answer, topic }` · rule-based from live orders/quotes; no new DB table |

### Screens
**Customer shell** (`/my/*`): Left sidebar BrandMark, nav My Job / My Quotes / Service Requests / Ask Support, bottom Need help CTA. Top bar: page title area stays in page; user badge Customer + Sign out. DESIGN.md tokens only (plum/beige/teal). No purple from the mock. No hero image.

**My Job** (`/my/jobs`): Control panel title + subtitle. Per order: status card (id, Active/cancelled badge, site, kW/kind; Request Service only after a serial is delivered), horizontal stepper (Confirmed → Advance received / Paid in full → Dispatch → Installation → Completed), Remaining Payment card (Stripe Checkout; 30%/50% before advance, installment + remaining after), tabs Payments / Dispatch / Serials & Warranty / Service Requests. Support CTA lives in the shell sidebar only. States: `customer-jobs-skeleton`, `customer-jobs-empty`, danger Alert + Retry.

**My Quotes** (`/my/quotes`): List own quotes (status, total, valid until, open link). Empty when none. Detail remain `/my/quotes/:quoteId`.

**Service Requests** (`/my/service`): List tickets; form to raise against a delivered serial from own orders.

**Ask Support** (`/my/support`): Chat-style Q&A calling support/ask. Suggested prompts for payment, dispatch, warranty, quote.

### Depends on
Orders, payments, dispatches, serials, quotes, service_tickets tables — all real on main. Payment remains UPI UTR (existing portal contract).

### Assumptions (reviewed with the developer)
| # | Assumption | Decision |
| :--- | :--- | :--- |
| 1 | Ask Support | Working rule-based bot this sprint; no new chat tables (schema forbids inventing) |
| 2 | My Quotes | Real `GET /api/customer/quotes` list |
| 3 | Order hero image | Skip; text + stepper only |
| 4 | Branch | `feat/customer-portal-ui` from `main` |
| 5 | Scope | Full shell: My Job + My Quotes + Service Requests + Ask Support |
| 6 | Pay CTA vs mock “Pay with Card” | Stripe Checkout with 30%/50% choices; staff still record offline UPI/NEFT/cash/cheque |
| 7 | Service tickets for customer | Add customer list/create on existing `service_tickets` table |

## Part B: Walkthrough (written when the feature is built)

### 1. Try it live
1. `pnpm dev:real` (or `pnpm dev`). Open `/login` → Customer sign in.
2. Phone `9876543210` (Amit Verma, Jalandhar). Request code, enter the development code, Sign in.
3. `/my/jobs` shows the sidebar (My Job, My Quotes, Service Requests, Ask Support), order `#ord-01`, status stepper, Remaining Payment card, and tabs. Colours are plum/beige from DESIGN.md (not the mock purple).
4. Open **Ask Support**. Click “What is my payment balance?” — answer uses live paid/balance for the order.
5. Open **My Quotes** — list loads from `GET /api/customer/quotes`.
6. Open **Service Requests**. If serials are delivered, submit a fault for `INV-3K-88421`. Refresh — the ticket remains.
7. Sign out from the top bar. Staff login still uses `/app/...` and never sees this shell.

### 2. How it works
Customer JWT (`actor: "customer"`) hits `customer-auth/routes.ts` and `service-tickets/routes.ts`. The shell is `CustomerShell.tsx`; pages call `customer-quote.api.ts` → `apiClient`. Support answers are computed in `askCustomerSupport` from `listCustomerOrders` / `listCustomerQuotes` (no chat table). Payment stays UPI UTR via `POST /api/customer/orders/:id/payments`.

### 3. What you can add next
- Persist support threads (needs a schema decision; medium).
- SMS OTP instead of `devCode` (medium, `customer-auth/service.ts`).
- Mobile collapse for the left sidebar (small).
- Stripe Checkout if product wants card pay instead of UPI UTR (medium; changes payment contract).
- Customer quote accept deep-link from My Quotes empty state (small).

### 4. Test coverage
| Story | Proof |
| :--- | :--- |
| US-3 quotes list | `apps/backend/tests/customer-portal-ui.e2e.mjs` |
| US-4 tickets | same file (`GET` / optional `POST`) |
| US-5 support ask | same file |
| US-1 / US-2 jobs | existing `customer-portal.e2e.mjs` + UI shell |

Not covered in automation: every tab click in the browser; responsive sidebar.
