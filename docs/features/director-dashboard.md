# Director Dashboard UI

Owner: Charityatease | Branch: `feat/director-dashboard` | Status: built

## Part A: Spec (contract for teammates)

### User stories
| ID | Role | Story | Acceptance |
| :--- | :--- | :--- | :--- |
| US-1 | admin | See Business Overview header | Given admin is signed in, When Dashboard loads, Then title is `Business Overview`, subtitle explains solar ops performance, and a date-period control is visible |
| US-2 | admin | Read KPI cards from live data | Given admin, When Dashboard loads, Then four cards show Revenue (completed jobs), Payments Collected, Outstanding, and Active Jobs from real list APIs — no hardcoded INR |
| US-3 | admin | See Operations Pipeline counts | Given admin, When Dashboard loads, Then Enquiries → Surveys → Quotes → Orders → Completed show counts from enquiries/quotes/orders APIs; stages link to filtered staff pages when filters exist |
| US-4 | admin | See Business Profitability | Given admin, When Dashboard loads, Then Revenue, Estimated Cost, Gross Margin, and margin % use the existing job-margins COGS calculation (not a new formula); progress bar reflects margin % |
| US-5 | admin | See Attention Required | Given admin, When Dashboard loads, Then supported alert rows show icon, title, description, count badge, and View; unsupported metrics are omitted or marked unavailable — never fabricated |
| US-6 | admin | See Job Profitability table | Given admin, When Dashboard loads, Then a table shows Order ID, Customer, System Size, Revenue, Estimated Cost, Gross Margin, Status from job-margins + orders; positive/negative margin use success/danger text tokens; link to `/app/reports` |
| US-7 | non-admin | Keep role-specific dashboard | Given sales/warehouse/technician/support, When Dashboard loads, Then they do **not** see the director layout (decision pending — see assumptions) |
| US-8 | admin | Loading / empty / error | Given admin, When data is loading / empty / failing, Then skeleton (`dashboard-skeleton`), empty copy, or danger Alert + Retry appear; no fake fallback data |

### Roles and permissions
| Action | admin | sales | warehouse | technician | support |
| :--- | :---: | :---: | :---: | :---: | :---: |
| Director dashboard layout | yes | no* | no* | no* | no* |
| `GET /api/reports/job-margins` | yes | no | no | no | no |
| `GET /api/orders`, enquiries, quotes, tickets | yes | per existing RBAC | per existing | per existing | per existing |

\* Non-admin behaviour: keep current role tiles unless assumption #1 decides otherwise.

### API contract

**No new backend endpoints in the default plan.** Compose from existing real APIs:

| Method / path | Roles | Used for |
| :--- | :--- | :--- |
| `GET /api/reports/job-margins` | admin | Revenue (completed), Business Profitability, Job Profitability table, margin % |
| `GET /api/orders` | auth (staff) | Payments collected (`paidInr`), Outstanding (`balanceInr`), Active jobs, pipeline Orders/Completed, awaiting payment, systemKw join |
| `GET /api/enquiries` | sales/admin/… | Pipeline Enquiries/Surveys; Attention “new” / survey_scheduled |
| `GET /api/quotes` | sales/admin/… | Pipeline Quotes; Attention quotes `sent` |
| `GET /api/service-tickets` | any staff | Open service tickets count |

Existing shapes unchanged (`JobMarginResult`, `OrderResult` with `paidInr` / `balanceInr` / `systemKw`, enquiry/quote statuses, ticket statuses).

**Not available today (do not invent):**
- Period query params on any of the above
- Aggregate payments-by-date endpoint (only per-order `GET /api/orders/:id/payments`)
- Trend / prior-period comparison payload
- Explicit “delayed order” SLA field
- System size on job-margins (join from `orders.systemKw` instead)

### Screens

#### Director Dashboard (`/app/dashboard`, admin)

**Purpose:** operational status and estimated profitability at a glance.

**Layout (desktop):**
1. Header: Business Overview + subtitle + date filter (Today / This Week / This Month / This Year)
2. KPI row: 4 equal cards — Revenue, Payments Collected, Outstanding, Active Jobs
3. Mid row (~60/40): Operations Pipeline | Business Profitability
4. Bottom row (~38–40% / 60–62%): Attention Required | Job Profitability

**Removed:** Recent Activity, Quick Actions (not present in current code; do not add).

**Fields / metrics (data rules):**
| Element | Source | Notes |
| :--- | :--- | :--- |
| Revenue KPI | Sum `revenueInr` where order `status === completed` (and period filter if decided) | INR `en-IN` |
| Payments Collected | Sum `paidInr` from orders (period TBD) | No global payment ledger by date |
| Outstanding | Sum `balanceInr` where balance > 0 | |
| Active Jobs | Count orders in `packing` \| `dispatched` \| `installing` | Description: packing, dispatch, installation |
| Trend badges / sparklines | Omit unless comparison data exists | Spec forbids faking |
| Pipeline Enquiries | Count enquiries not `won`/`lost` (or all open — TBD) | Link `/app/enquiries` |
| Pipeline Surveys | Count `survey_scheduled` | Link with status filter if UI supports |
| Pipeline Quotes | Count quotes not terminal | Link `/app/quotes` |
| Pipeline Orders | Count unfinished orders | Link `/app/orders` |
| Pipeline Completed | Count `completed` | |
| Profitability | Sum revenue / COGS / margin from job-margins for selected completed set | Same formula as Reports |
| Attention rows | See table below | View → filtered list pages |
| Job table | Join margins + orders for `systemKw`; show most relevant subset; View Full Report → `/app/reports` | |

**Attention Required rows:**
| Row | Count rule | Supported? |
| :--- | :--- | :--- |
| Enquiries awaiting follow-up | `status === "new"` | yes |
| Surveys pending | `status === "survey_scheduled"` | yes |
| Quotes awaiting response | `status === "sent"` | yes |
| Orders awaiting payment | `status === "awaiting_payment"` | yes |
| Delayed orders | no SLA in API | **assumption #3** |
| Open service tickets | open / in_progress / waiting_parts | yes |

**States:** `dashboard-skeleton` matching layout; empty metrics show `₹0` / `0` with quiet empty copy where a section has no rows; error Alert + Retry; non-admin forbidden or alternate tiles per assumption #1.

**Visual:** HackCore tokens only — plum/brand, success, warning, accent(teal) for card accents (map reference purple/green/amber/blue). Flat hairlines, no shadows, no gradients, no emoji. Status colours only from DESIGN.md.

### Depends on
| Dependency | Endpoint | Status |
| :--- | :--- | :--- |
| Reports / job-margins | `GET /api/reports/job-margins` | real on main |
| Orders | `GET /api/orders` | real on main |
| Enquiries | `GET /api/enquiries` | real on main |
| Quotes | `GET /api/quotes` | real on main |
| Service tickets | `GET /api/service-tickets` | real on main |

### Assumptions (reviewed with the developer)
| # | Assumption | Decision |
| :--- | :--- | :--- |
| 1 | Director layout is **admin-only**; other roles keep today’s role tiles | **1A** |
| 2 | Date filter: UI shown; apply **client-side** filters only where timestamps exist (e.g. `completedAt` for completed revenue/margins). Lifetime totals for payments/outstanding/active when period cannot be proven. Do not N+1 fetch every order’s payments for period. No new backend period API in this feature | **2A** |
| 3 | Delayed orders row: **omit** (no SLA / expected-stage timestamp) rather than invent a heuristic | **3A** — omitted |
| 4 | Job Profitability table shows unfinished orders plus recent completed (cap ~12), with View Full Report for the rest | **4A** |
| 5 | Pipeline “Enquiries” count = enquiries whose status is not `won` or `lost` | **5A** (developer: do not invent alternate count rules) |
| 6 | No backend changes; frontend compose only | **6A** |
| 7 | Accent mapping: Revenue→brand/plum, Payments→success, Outstanding→warning, Active Jobs→accent/teal (not inventing purple/blue hex outside tokens) | **7A** |

## Part B: Walkthrough

### 1. Try it live

1. Run `pnpm dev` (or `pnpm dev:real`). Sign in as `admin@sunpower.in` / `hackathon`.
2. Land on **Dashboard** → **Business Overview**. Confirm period chips (Today / This Week / This Month / This Year); default **This Month**.
3. Confirm four KPI cards: Revenue (completed jobs in period), Payments Collected, Outstanding, Active Jobs — values from live APIs, not the mock screenshot numbers.
4. Confirm **Operations Pipeline** stages Enquiries → Surveys → Quotes → Orders → Completed with live counts; click a stage to open the matching staff list.
5. Confirm **Business Profitability** uses the same job-margins COGS as Reports. Switch to **This Year** — seed job `ord-01` (completed 10 Mar 2026, revenue ₹1,85,000, cost estimate ₹92,500, margin ₹92,500 / 50%) should appear in the totals when its `completedAt` falls in the year.
6. Confirm **Attention Required** rows (no Delayed orders). Each **View** opens enquiries / quotes / orders / reports.
7. Confirm **Job Profitability** table has System Size (kW), financial columns right-aligned, green/red margins, status badges, and **View Full Report →** to `/app/reports`.
8. Refresh — same counts persist (Postgres).
9. Sign out. Sign in as `sales@sunpower.in` / `hackathon`. Confirm the compact **Today** role tiles, not the director layout.

### 2. How it works

Admin `DashboardPage` renders `DirectorDashboard`, which loads via `useDirectorDashboard` → `listJobMargins` / `listOrders` / `listEnquiries` / `listQuotes` / `listServiceTickets` through `apiClient`. Aggregations live in `metrics.ts` (pure). Period filtering uses IST calendar bounds in `period.ts` only on `completedAt` for revenue and profitability. Payments and outstanding stay lifetime because there is no payments-by-date API. Margin formula is unchanged: `revenueInr - cogsEstimateInr` from Reports.

### 3. What you can add next

1. Backend `?period=` on job-margins and a payments ledger endpoint — medium; unlock honest period KPIs for collections.
2. Deep-link query params on Enquiries/Quotes/Orders filters — small; pipeline and Attention View become filtered.
3. Delayed-orders SLA once stage timestamps exist — medium.
4. Trend vs prior period — medium; needs prior window aggregates.
5. CSV export from the Job Profitability strip — small.

### 4. Test coverage

| Story | Proof |
| :--- | :--- |
| US-1–US-6 | Cursor browser: admin Business Overview layout with live seed data |
| US-7 | Cursor browser: sales keeps role tiles |
| US-8 | Skeleton `dashboard-skeleton`; error Alert + Retry path in UI |
| Backend | No new endpoints; existing reports e2e still owns job-margins |

Not covered: Playwright; period API; Delayed orders.
