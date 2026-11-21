# Reports and admin dashboard

Owner: Charityatease | Branch: feat/reports | Status: verified

## Part A: Spec (contract for teammates)

### User stories
| ID | Role | Story | Acceptance |
| :--- | :--- | :--- | :--- |
| US-1 | admin | See today's director tiles on Dashboard | Given admin is signed in, When Dashboard loads, Then tiles show Unfinished jobs, Open tickets, and Gross margin this month (INR), and the primary action is Open reports |
| US-2 | admin | Open the Reports screen | Given admin, When they open Reports (nav or CTA), Then they see tiles Completed jobs, Open tickets, Unfinished orders, plus a job-margin table |
| US-3 | admin | Read job margins from the API | Given admin token, When `GET /api/reports/job-margins`, Then each non-missing order returns revenue, cost estimate, margin, status, customer name, and completion time when known |
| US-4 | non-admin | Cannot open Reports or job-margins | Given sales (or other non-admin), When they hit Reports or `GET /api/reports/job-margins`, Then nav hides Reports and the API returns 403 |
| US-5 | any auth | List service tickets for counts | Given any staff token, When `GET /api/service-tickets`, Then open / in-progress / waiting_parts rows are returned for dashboard and report tiles |

### Roles and permissions
| Action | admin | sales | warehouse | technician | support |
| :--- | :---: | :---: | :---: | :---: | :---: |
| Dashboard admin tiles | yes | no (role-specific tiles) | role tiles | role tiles | role tiles |
| Reports nav + page | yes | no | no | no | no |
| `GET /api/reports/job-margins` | yes | no | no | no | no |
| `GET /api/service-tickets` | yes | yes | yes | yes | yes |
| Ticket create / detail UI | out of scope | — | — | — | — |

### API contract

#### `GET /api/reports/job-margins`
- Roles: `admin` only (401 without token, 403 other roles)
- Response `data`: `JobMarginResult[]` ordered by order id
  - `orderId` string
  - `customerName` string (additive for Screen 17)
  - `revenueInr` number — `orders.totalInr`
  - `cogsEstimateInr` number — sum(`quote_lines.qty * products.unitCostInr`) for the order's quote
  - `grossMarginInr` number — `revenueInr - cogsEstimateInr`
  - `status` order status enum
  - `completedAt` string ISO \| null — `installations.finishedAt` when present, else `orders.updatedAt` when status is `completed`, else null
- Errors: 401, 403

#### `GET /api/service-tickets`
- Roles: any authenticated staff
- Query: `status` optional (`open` \| `in_progress` \| `waiting_parts` \| `resolved` \| `closed`)
- Response `data`: `ServiceTicketResult[]` (existing contract shape)
- Write endpoints and ticket screens: out of scope (decision 2A)

### Screens

#### Dashboard (admin only tiles)
- Purpose: today’s director snapshot
- Tiles: Unfinished jobs (orders not `completed`/`cancelled`) → `/app/orders`; Open tickets (status in open / in_progress / waiting_parts) → `/app/reports`; Gross margin this month (sum of `grossMarginInr` where `status === completed` and `completedAt` falls in current Asia/Kolkata calendar month) → `/app/reports`
- Primary action: Open reports (plum)
- States: skeleton `dashboard-skeleton`; error + Retry; empty tile values show `None` (or `₹0` for margin)

#### Reports (`/app/reports`, admin only)
- Purpose: which jobs made money, which did not, what is unfinished
- Title: This month
- Tiles: Completed jobs; Open tickets; Unfinished orders
- Table columns: Order, Customer, Status, Revenue (₹), Cost estimate (₹), Margin (₹)
- Filter chip: All \| Unfinished (status not completed/cancelled)
- Margin colour: positive → success text token; negative → danger text token
- States: `reports-skeleton`, `reports-empty` when no rows, error + Retry, forbidden if a non-admin somehow lands on the route

### Depends on
| Dependency | Endpoint | Status |
| :--- | :--- | :--- |
| Orders | `GET /api/orders` | real (for unfinished count / links) |
| Quotes + products | tables via reports service | real |
| Installations | join for `finishedAt` | real (table; no installations UI required) |
| Service tickets | `GET /api/service-tickets` | implemented in this feature (list only) |

### Assumptions (reviewed with the developer)
| # | Assumption | Decision |
| :--- | :--- | :--- |
| 1 | Scope includes Reports page + job-margins, not tiles alone | 1B |
| 2 | Tickets: list API only for counts; no ticket screens | 2A |
| 3 | Gross margin this month = sum margins for completed jobs whose completion is in the current IST month | 3A |
| 4 | Unfinished jobs = orders not completed or cancelled | 4A |
| 5 | Completion instant = installation `finishedAt`, else order `updatedAt` when status is completed | Recorded here (needed for 3A; no completedAt column on orders) |
| 6 | `customerName` and `completedAt` added to job-margins payload for the screen | Additive; teammates may rely on them |

## Part B: Walkthrough (written when the feature is built)

### 1. Try it live

1. Run `pnpm dev` (or `pnpm dev:real`). Sign in as `admin@sunpower.in` / `hackathon`.
2. On **Dashboard**, confirm tiles: Unfinished jobs, Open tickets, Gross margin this month, and the plum **Open reports** button.
3. Open **Reports** (nav after Catalog, or the CTA). Confirm tiles Completed jobs / Open tickets / Unfinished orders, then the margin table with Order, Customer, Status, Revenue, Cost estimate, Margin.
4. Click **Unfinished** — completed and cancelled rows drop out. Click **All** to restore.
5. Refresh the browser — the same counts and rows remain (Postgres-backed).
6. Sign out. Sign in as `sales@sunpower.in` / `hackathon`. Confirm **Reports** is absent from the nav and Dashboard shows sales tiles (New enquiries, Quotes waiting, Surveys scheduled), not director tiles.

Indian scenario check: seed job `ord-01` (Model Town, Jalandhar) should appear with revenue ₹1,85,000 and a positive margin from package costs. Gross margin this month shows **None** until a job is completed in the current Asia/Kolkata calendar month.

### 2. How it works

Admin Dashboard (`DashboardPage.tsx`) loads `GET /api/orders`, `GET /api/service-tickets`, and `GET /api/reports/job-margins` via `orders.api` / `reports.api` → `apiClient`. Reports page does the same for tiles and the table. Backend `reports/service.ts` joins orders, customers, quote lines, products, and installations; COGS = sum(qty × unitCostInr). `service-tickets/routes.ts` exposes list-only reads for counts. Role gate: `requireRole("admin")` on job-margins; Reports nav is `roles: ["admin"]` in `feature-registry.tsx`.

### 3. What you can add next

1. Full service ticket list/detail UI (Screens 13–14) — medium; new frontend pages on top of list API, plus POST/PATCH/close routes.
2. Period switcher (today / this week / this month) on Reports — small; query param on job-margins.
3. CSV export of margins for the director — small; frontend blob from current table.
4. Dedicated `orders.completedAt` column — medium; migration + installation complete write.
5. Subsidy / invoice / technician-hour tiles (PDF Phase 2) — large; new tables already sketched in phase2 schema.

### 4. Test coverage

| Story | Proof |
| :--- | :--- |
| US-1 | Cursor browser: admin dashboard tiles + Open reports |
| US-2 | Cursor browser: Reports page tiles + margin table |
| US-3 | `apps/backend/tests/reports.e2e.mjs` — admin job-margins shape and COGS |
| US-4 | e2e 403 for sales + browser: Reports hidden for sales |
| US-5 | e2e list + status filter for service tickets |

Not covered: Playwright; ticket create/close (out of scope).
