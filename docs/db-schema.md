# SunPower — Database Schema

Source: `docs/Solar_Installation_Management_System.pdf`  
Stack convention: PostgreSQL + Drizzle (`apps/backend/src/db/schema/`), text primary keys, `timestamptz`, CHECK constraints for enums.

Build in **two phases**. Phase 1 is enough for the happy path (enquiry → quote → pay → dispatch → install → ticket → director glance). Phase 2 adds warranty automation, proof-of-work, and subsidy/margin polish.

---

## Priority order

| Phase | Tables | When |
| --- | --- | --- |
| **1 — Essential (16)** | `users`, `customers`, `enquiries`, `site_surveys`, `products`, `packages`, `package_items`, `quotes`, `quote_lines`, `orders`, `payments`, `stock_levels`, `serial_units`, `dispatches`, `installations`, `service_tickets` | Foundation commit / first feature branches |
| **2 — Extra** | `warranty_policies`, `warranties`, `evidences`, `invoices`, `stock_movements`, `subsidy_claims`, `technician_assignments` | Tables ship in the foundation migration; **APIs** wait until Phase 1 screens work end-to-end |

Phase 2 **tables** are included in the foundation migration so teammates do not fight schema drift. Phase 2 **HTTP routes** stay deferred (see [API.md](API.md)). Warranty *display* in Phase 1 can still use `serial_units.delivered_at` + `products.default_warranty_months`; prefer `warranties` once that feature is wired.

---

## Entity relationship (Phase 1)

```
users ──────────────────────────────────────────────┐
                                                    │ assigned_to / created_by
customers ──< enquiries ──< site_surveys            │
    │              │                                │
    │              └──── < quotes ──< quote_lines >─┼── products
    │                       │                       │
    │                       │ from packages ──< package_items >── products
    │                       ▼
    └──── < orders ──< payments
              │
              ├──< dispatches ── updates ──> serial_units (product_id, order_id)
              ├──< installations
              └──< service_tickets
stock_levels (product_id)   // warehouse qty, non-serialized summary
```

---

## Phase 1 — Essential tables (16)

### 1. `users` — staff accounts

Who: sales, warehouse, technicians, support, director/admin.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | text PK | |
| `email` | text UNIQUE NOT NULL | |
| `password_hash` | text NOT NULL | |
| `name` | text NOT NULL | |
| `role` | text NOT NULL | `admin` \| `sales` \| `warehouse` \| `technician` \| `support` |
| `phone` | text | optional |
| `is_active` | boolean NOT NULL DEFAULT true | |
| `created_at` | timestamptz NOT NULL DEFAULT now() | |

**App usage:** Auth, RBAC on every route. Sales owns enquiries/quotes; warehouse owns dispatch/serials; technicians own installations; support owns tickets; admin sees director dashboard.

**Example**

```sql
INSERT INTO users (id, email, password_hash, name, role)
VALUES ('usr_sales1', 'priya@sunpower.in', '...', 'Priya Shah', 'sales');
```

---

### 2. `customers` — homeowners / small factories

| Column | Type | Notes |
| --- | --- | --- |
| `id` | text PK | |
| `name` | text NOT NULL | |
| `phone` | text NOT NULL | unique per company practice |
| `email` | text | |
| `address_line` | text NOT NULL | |
| `city` | text NOT NULL | |
| `pincode` | text | |
| `customer_type` | text NOT NULL DEFAULT 'residential' | `residential` \| `commercial` |
| `created_at` | timestamptz NOT NULL DEFAULT now() | |

**App usage:** Created when an enquiry lands (or linked if phone already exists). Looked up instantly on service calls (“find customer + inverter serial in seconds”).

**Example — rooftop inquiry**

```sql
INSERT INTO customers (id, name, phone, address_line, city, pincode, customer_type)
VALUES ('cus_01', 'Amit Verma', '9876543210', '12 Model Town', 'Jalandhar', '144001', 'residential');
```

---

### 3. `enquiries` — inbound demand

| Column | Type | Notes |
| --- | --- | --- |
| `id` | text PK | |
| `customer_id` | text NOT NULL FK → customers | |
| `source` | text NOT NULL | `web_form` \| `whatsapp` \| `call` |
| `requested_kw` | numeric(4,1) NOT NULL | e.g. 3.0 |
| `system_kind` | text | `on_grid` \| `off_grid` \| null until known |
| `wants_subsidy` | boolean NOT NULL DEFAULT false | |
| `monthly_bill_inr` | numeric(12,2) | filled on qualification call |
| `roof_area_sqft` | numeric(10,2) | qualification |
| `grid_suitable` | boolean | qualification |
| `status` | text NOT NULL | `new` \| `qualifying` \| `survey_scheduled` \| `survey_done` \| `quoted` \| `won` \| `lost` |
| `assigned_to` | text FK → users | sales owner |
| `notes` | text | |
| `created_at` | timestamptz NOT NULL DEFAULT now() | |
| `updated_at` | timestamptz NOT NULL DEFAULT now() | |

**App usage:** Sales inbox. Status drives the pipeline. Qualification call updates bill / roof / grid fields before a survey is booked.

**Example**

```sql
INSERT INTO enquiries (id, customer_id, source, requested_kw, wants_subsidy, status, assigned_to)
VALUES ('enq_01', 'cus_01', 'web_form', 3.0, true, 'new', 'usr_sales1');
```

---

### 4. `site_surveys` — roof visit before quote

| Column | Type | Notes |
| --- | --- | --- |
| `id` | text PK | |
| `enquiry_id` | text NOT NULL FK → enquiries | |
| `technician_id` | text FK → users | |
| `scheduled_at` | timestamptz | |
| `completed_at` | timestamptz | |
| `roof_direction` | text | e.g. `south` |
| `tilt_degrees` | numeric(5,2) | |
| `cable_distance_m` | numeric(8,2) | |
| `usable_area_sqft` | numeric(10,2) | |
| `shadow_notes` | text | |
| `result` | text | `approved` \| `rejected` \| `pending` |
| `created_at` | timestamptz NOT NULL DEFAULT now() | |

**App usage:** Only after `result = approved` may sales issue a quote (PDF rule). Technician mobile form writes measurement fields.

**Example**

```sql
INSERT INTO site_surveys (id, enquiry_id, technician_id, roof_direction, tilt_degrees, cable_distance_m, result)
VALUES ('sur_01', 'enq_01', 'usr_tech1', 'south', 18.0, 12.5, 'approved');
UPDATE enquiries SET status = 'survey_done' WHERE id = 'enq_01';
```

---

### 5. `products` — sellable / stockable parts and services

| Column | Type | Notes |
| --- | --- | --- |
| `id` | text PK | |
| `sku` | text UNIQUE NOT NULL | |
| `name` | text NOT NULL | |
| `category` | text NOT NULL | `panel` \| `inverter` \| `battery` \| `charge_controller` \| `mount` \| `wiring` \| `safety` \| `service` |
| `unit` | text NOT NULL DEFAULT 'pcs' | |
| `unit_price_inr` | numeric(12,2) NOT NULL | selling price |
| `unit_cost_inr` | numeric(12,2) NOT NULL DEFAULT 0 | for margin |
| `is_serialized` | boolean NOT NULL DEFAULT false | true for inverter, battery, charge controller, often panels |
| `default_warranty_months` | int | Phase 1 only; Phase 2 uses `warranty_policies` |
| `is_active` | boolean NOT NULL DEFAULT true | |

**App usage:** Catalog + BOM building blocks. Serialized products require a `serial_units` row on dispatch.

**Example**

```sql
INSERT INTO products (id, sku, name, category, unit_price_inr, unit_cost_inr, is_serialized, default_warranty_months)
VALUES
  ('prd_panel330', 'PNL-330', '330W Solar Panel', 'panel', 6500, 4800, true, 240),
  ('prd_inv3k', 'INV-3K', '3kW On-Grid Inverter', 'inverter', 28000, 21000, true, 24),
  ('prd_install', 'SVC-INST', 'Installation & testing', 'service', 15000, 8000, false, NULL);
```

---

### 6. `packages` — ready-made systems (1–5 kW, on/off grid)

| Column | Type | Notes |
| --- | --- | --- |
| `id` | text PK | |
| `code` | text UNIQUE NOT NULL | e.g. `OG-3KW` |
| `name` | text NOT NULL | `On-Grid 3 kW System` |
| `system_kind` | text NOT NULL | `on_grid` \| `off_grid` \| `panel_set` \| `installation_only` |
| `capacity_kw` | numeric(4,1) | null for pure service packages |
| `base_price_inr` | numeric(12,2) NOT NULL | |
| `is_active` | boolean NOT NULL DEFAULT true | |

**App usage:** Quote starts from a package template so “nobody remembers every small part.”

---

### 7. `package_items` — BOM lines on a package

| Column | Type | Notes |
| --- | --- | --- |
| `id` | text PK | |
| `package_id` | text NOT NULL FK → packages | |
| `product_id` | text NOT NULL FK → products | |
| `qty` | numeric(10,2) NOT NULL | |

**App usage:** Selecting package `OG-3KW` copies these rows into `quote_lines`.

**Example**

```sql
-- 3 kW on-grid ≈ 10×330W panels + 1 inverter + stands + install service
INSERT INTO packages (id, code, name, system_kind, capacity_kw, base_price_inr)
VALUES ('pkg_og3', 'OG-3KW', 'On-Grid 3 kW System', 'on_grid', 3.0, 185000);

INSERT INTO package_items (id, package_id, product_id, qty) VALUES
  ('pki_1', 'pkg_og3', 'prd_panel330', 10),
  ('pki_2', 'pkg_og3', 'prd_inv3k', 1),
  ('pki_3', 'pkg_og3', 'prd_install', 1);
```

---

### 8. `quotes`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | text PK | |
| `enquiry_id` | text NOT NULL FK → enquiries | |
| `customer_id` | text NOT NULL FK → customers | |
| `package_id` | text FK → packages | template used |
| `status` | text NOT NULL | `draft` \| `sent` \| `accepted` \| `rejected` \| `expired` |
| `subtotal_inr` | numeric(14,2) NOT NULL DEFAULT 0 | |
| `discount_inr` | numeric(14,2) NOT NULL DEFAULT 0 | |
| `total_inr` | numeric(14,2) NOT NULL DEFAULT 0 | |
| `valid_until` | date | |
| `created_by` | text FK → users | |
| `created_at` | timestamptz NOT NULL DEFAULT now() | |
| `updated_at` | timestamptz NOT NULL DEFAULT now() | |

**App usage:** Sales creates after survey approval; customer accepts → creates `orders` + payment expectation.

---

### 9. `quote_lines`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | text PK | |
| `quote_id` | text NOT NULL FK → quotes | |
| `product_id` | text NOT NULL FK → products | |
| `description` | text | snapshot name |
| `qty` | numeric(10,2) NOT NULL | |
| `unit_price_inr` | numeric(12,2) NOT NULL | snapshot |
| `line_total_inr` | numeric(14,2) NOT NULL | |

**App usage:** Exact parts list on the quote PDF/UI. Warehouse later packs against the winning quote’s lines (via the order).

**Example — customer says yes to 3 kW**

```sql
INSERT INTO quotes (id, enquiry_id, customer_id, package_id, status, subtotal_inr, total_inr, created_by)
VALUES ('quo_01', 'enq_01', 'cus_01', 'pkg_og3', 'sent', 185000, 185000, 'usr_sales1');

INSERT INTO quote_lines (id, quote_id, product_id, description, qty, unit_price_inr, line_total_inr)
SELECT 'ql_' || product_id, 'quo_01', product_id, p.name, pi.qty, p.unit_price_inr, pi.qty * p.unit_price_inr
FROM package_items pi JOIN products p ON p.id = pi.product_id
WHERE pi.package_id = 'pkg_og3';
```

---

### 10. `orders` — confirmed jobs (installation projects)

| Column | Type | Notes |
| --- | --- | --- |
| `id` | text PK | |
| `quote_id` | text NOT NULL UNIQUE FK → quotes | one order per accepted quote |
| `customer_id` | text NOT NULL FK → customers | |
| `enquiry_id` | text NOT NULL FK → enquiries | |
| `status` | text NOT NULL | `awaiting_payment` \| `paid` \| `packing` \| `dispatched` \| `installing` \| `completed` \| `cancelled` |
| `system_kw` | numeric(4,1) NOT NULL | |
| `system_kind` | text NOT NULL | `on_grid` \| `off_grid` |
| `site_address` | text NOT NULL | |
| `scheduled_install_at` | timestamptz | crew schedule |
| `total_inr` | numeric(14,2) NOT NULL | |
| `created_at` | timestamptz NOT NULL DEFAULT now() | |
| `updated_at` | timestamptz NOT NULL DEFAULT now() | |

**App usage:** Single spine for warehouse schedule and technician job list. Director unfinished work = orders not `completed`.

**Example**

```sql
UPDATE quotes SET status = 'accepted' WHERE id = 'quo_01';
INSERT INTO orders (id, quote_id, customer_id, enquiry_id, status, system_kw, system_kind, site_address, total_inr)
VALUES ('ord_01', 'quo_01', 'cus_01', 'enq_01', 'awaiting_payment', 3.0, 'on_grid', '12 Model Town, Jalandhar', 185000);
UPDATE enquiries SET status = 'won' WHERE id = 'enq_01';
```

---

### 11. `payments`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | text PK | |
| `order_id` | text NOT NULL FK → orders | |
| `amount_inr` | numeric(14,2) NOT NULL | |
| `kind` | text NOT NULL | `advance` \| `balance` \| `full` \| `service` |
| `method` | text | `upi` \| `neft` \| `cash` \| `cheque` |
| `paid_at` | timestamptz NOT NULL DEFAULT now() | |
| `reference` | text | UTR / receipt no. |
| `recorded_by` | text FK → users | |

**App usage:** Gate before packing. Sum of payments vs `orders.total_inr` drives `awaiting_payment` → `paid`. Director margin views need this revenue side.

**Example**

```sql
INSERT INTO payments (id, order_id, amount_inr, kind, method, reference, recorded_by)
VALUES ('pay_01', 'ord_01', 92500, 'advance', 'upi', 'UTR123', 'usr_sales1');
-- later full settlement
INSERT INTO payments (id, order_id, amount_inr, kind, method, recorded_by)
VALUES ('pay_02', 'ord_01', 92500, 'balance', 'neft', 'usr_sales1');
UPDATE orders SET status = 'paid' WHERE id = 'ord_01';
```

---

### 12. `stock_levels` — warehouse qty (non-serial summary)

| Column | Type | Notes |
| --- | --- | --- |
| `id` | text PK | |
| `product_id` | text NOT NULL UNIQUE FK → products | one row per SKU for hackathon |
| `qty_on_hand` | numeric(12,2) NOT NULL DEFAULT 0 | |
| `qty_reserved` | numeric(12,2) NOT NULL DEFAULT 0 | reserved for paid orders |
| `updated_at` | timestamptz NOT NULL DEFAULT now() | |

**App usage:** Packing screen: available = on_hand − reserved. For serialized goods, `serial_units` is source of truth for *which* unit; this table still holds counts for dashboards.

---

### 13. `serial_units` — tracked high-value units

| Column | Type | Notes |
| --- | --- | --- |
| `id` | text PK | |
| `product_id` | text NOT NULL FK → products | |
| `serial_number` | text NOT NULL UNIQUE | scanned barcode |
| `status` | text NOT NULL | `in_stock` \| `reserved` \| `dispatched` \| `installed` \| `returned` \| `scrapped` |
| `order_id` | text FK → orders | set when assigned to a job |
| `dispatch_id` | text FK → dispatches | set on scan-out |
| `delivered_at` | timestamptz | warranty clock start (Phase 1) |
| `created_at` | timestamptz NOT NULL DEFAULT now() | |

**App usage:** Truck leaves with ₹1.5L of kit — every inverter/battery/controller scanned. Support finds “exact inverter serial” from customer → order → serial_units.

**Example — dispatch scan**

```sql
INSERT INTO serial_units (id, product_id, serial_number, status)
VALUES ('ser_inv1', 'prd_inv3k', 'INV-3K-88421', 'in_stock');

-- on scan-out for ord_01
UPDATE serial_units
SET status = 'dispatched', order_id = 'ord_01', dispatch_id = 'dsp_01', delivered_at = now()
WHERE serial_number = 'INV-3K-88421';
```

Phase 1 warranty check (no policy table yet):

```sql
SELECT s.serial_number, p.name, p.default_warranty_months,
       s.delivered_at + (p.default_warranty_months || ' months')::interval AS warranty_ends,
       now() <= s.delivered_at + (p.default_warranty_months || ' months')::interval AS under_warranty
FROM serial_units s
JOIN products p ON p.id = s.product_id
WHERE s.order_id = 'ord_01' AND p.category = 'inverter';
```

---

### 14. `dispatches` — outbound delivery to site

| Column | Type | Notes |
| --- | --- | --- |
| `id` | text PK | |
| `order_id` | text NOT NULL FK → orders | |
| `status` | text NOT NULL | `packing` \| `in_transit` \| `delivered` \| `cancelled` |
| `dispatched_at` | timestamptz | |
| `delivered_at` | timestamptz | |
| `packed_by` | text FK → users | warehouse |
| `vehicle_notes` | text | |
| `created_at` | timestamptz NOT NULL DEFAULT now() | |

**App usage:** Warehouse queue. Marking `delivered` should set `serial_units.delivered_at` and bump `orders.status` to `dispatched` / ready to install. Phase 2: same event creates `warranties` rows.

**Example**

```sql
INSERT INTO dispatches (id, order_id, status, dispatched_at, packed_by)
VALUES ('dsp_01', 'ord_01', 'in_transit', now(), 'usr_wh1');
-- on delivery confirmation
UPDATE dispatches SET status = 'delivered', delivered_at = now() WHERE id = 'dsp_01';
UPDATE orders SET status = 'dispatched' WHERE id = 'ord_01';
```

---

### 15. `installations` — on-roof job record

| Column | Type | Notes |
| --- | --- | --- |
| `id` | text PK | |
| `order_id` | text NOT NULL FK → orders | |
| `lead_technician_id` | text FK → users | |
| `started_at` | timestamptz | |
| `finished_at` | timestamptz | |
| `system_kw_confirmed` | numeric(4,1) | |
| `generation_test_ok` | boolean | |
| `customer_signed_at` | timestamptz | Phase 1: timestamp only; signature file in Phase 2 `evidences` |
| `status` | text NOT NULL | `scheduled` \| `in_progress` \| `completed` \| `blocked` |
| `notes` | text | |
| `created_at` | timestamptz NOT NULL DEFAULT now() | |

**App usage:** Technician phone form: start/finish, confirm size, generation test. Completing installation → `orders.status = completed`, serials → `installed`.

**Example**

```sql
INSERT INTO installations (id, order_id, lead_technician_id, started_at, finished_at,
  system_kw_confirmed, generation_test_ok, customer_signed_at, status)
VALUES ('ins_01', 'ord_01', 'usr_tech1', '2026-03-10 09:00+05:30', '2026-03-10 16:30+05:30',
  3.0, true, '2026-03-10 16:35+05:30', 'completed');
UPDATE orders SET status = 'completed' WHERE id = 'ord_01';
UPDATE serial_units SET status = 'installed' WHERE order_id = 'ord_01';
```

---

### 16. `service_tickets` — rainy-season breakdowns and repairs

| Column | Type | Notes |
| --- | --- | --- |
| `id` | text PK | |
| `customer_id` | text NOT NULL FK → customers | |
| `order_id` | text FK → orders | |
| `serial_unit_id` | text FK → serial_units | exact inverter etc. |
| `opened_by` | text FK → users | support |
| `assigned_to` | text FK → users | technician |
| `fault_code` | text | e.g. inverter display code |
| `description` | text NOT NULL | |
| `under_warranty` | boolean | set when ticket opens |
| `billable_inr` | numeric(12,2) NOT NULL DEFAULT 0 | 0 if warranty covers |
| `status` | text NOT NULL | `open` \| `in_progress` \| `waiting_parts` \| `resolved` \| `closed` |
| `resolved_at` | timestamptz | |
| `customer_confirmed_at` | timestamptz | close only after confirm |
| `created_at` | timestamptz NOT NULL DEFAULT now() | |
| `updated_at` | timestamptz NOT NULL DEFAULT now() | |

**App usage:** Support search by phone → customer → orders → serials → ticket. If under warranty, `billable_inr = 0`; else auto-suggest parts + labour. Stay open until customer confirms.

**Example — 18 months later**

```sql
INSERT INTO service_tickets (
  id, customer_id, order_id, serial_unit_id, opened_by, fault_code, description,
  under_warranty, billable_inr, status
) VALUES (
  'tkt_01', 'cus_01', 'ord_01', 'ser_inv1', 'usr_sup1', 'E-04',
  'Inverter fault, zero power during rain',
  true,  -- delivered_at + 24 months still valid
  0, 'open'
);
```

---

## Phase 1 end-to-end story (one week)

| Scene (PDF) | Tables touched |
| --- | --- |
| Rooftop inquiry + qualification call | `customers`, `enquiries` |
| Technician survey | `site_surveys`, `enquiries.status` |
| Quote from template | `packages`, `package_items`, `products`, `quotes`, `quote_lines` |
| Advance / full pay | `orders`, `payments` |
| Pack + serial scan | `stock_levels`, `serial_units`, `dispatches` |
| On the roof | `installations` (+ Phase 2 `evidences`) |
| Breakdown call | `service_tickets`, `serial_units`, `products.default_warranty_months` |
| Director month-end | aggregates on `orders`, `payments`, `products.unit_cost_inr`, `service_tickets`, unfinished `orders` / `installations` |

### Director margin sketch (Phase 1)

```sql
SELECT o.id,
       o.total_inr AS revenue,
       COALESCE(SUM(p.unit_cost_inr * ql.qty), 0) AS cogs_estimate,
       o.total_inr - COALESCE(SUM(p.unit_cost_inr * ql.qty), 0) AS gross_margin
FROM orders o
JOIN quotes q ON q.id = o.quote_id
JOIN quote_lines ql ON ql.quote_id = q.id
JOIN products p ON p.id = ql.product_id
WHERE o.status = 'completed'
GROUP BY o.id, o.total_inr;
```

---

## Phase 2 — Extra tables

Build these after the Phase 1 loop works in `pnpm dev:real`.

### 17. `warranty_policies`

Catalog of warranty rules (panel 20y, inverter 2y, etc.), versioned so old installs keep the rule they were sold under.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | text PK | |
| `product_id` | text FK → products | null = category-wide |
| `category` | text | fallback when product_id null |
| `name` | text NOT NULL | `Standard inverter 2y` |
| `duration_months` | int NOT NULL | |
| `covers_parts` | boolean NOT NULL DEFAULT true | |
| `covers_labour` | boolean NOT NULL DEFAULT true | |
| `is_active` | boolean NOT NULL DEFAULT true | |

Then drop reliance on `products.default_warranty_months` for new sales.

---

### 18. `warranties` — one row per serial (or per order line)

Created automatically when dispatch is `delivered`.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | text PK | |
| `serial_unit_id` | text NOT NULL UNIQUE FK → serial_units | |
| `policy_id` | text NOT NULL FK → warranty_policies | |
| `order_id` | text NOT NULL FK → orders | |
| `starts_at` | timestamptz NOT NULL | = delivery |
| `ends_at` | timestamptz NOT NULL | |
| `status` | text NOT NULL | `active` \| `expired` \| `void` \| `claimed` |

**App usage:** Ticket open path becomes `JOIN warranties WHERE status = 'active' AND ends_at > now()` instead of computing from product defaults.

---

### 19. `evidences` — photos, signature, documents

| Column | Type | Notes |
| --- | --- | --- |
| `id` | text PK | |
| `order_id` | text FK → orders | |
| `installation_id` | text FK → installations | |
| `ticket_id` | text FK → service_tickets | |
| `kind` | text NOT NULL | `roof_photo` \| `earthing_photo` \| `customer_signature` \| `invoice_scan` \| `other` |
| `storage_url` | text NOT NULL | object storage / local path |
| `uploaded_by` | text FK → users | |
| `captured_at` | timestamptz NOT NULL DEFAULT now() | |

**App usage:** Proof of job for disputes; signature acceptance; before/after repair photos on tickets.

---

### 20. `invoices`

Formal billing documents (advance receipt, final invoice, billable repair).

| Column | Type | Notes |
| --- | --- | --- |
| `id` | text PK | |
| `order_id` | text FK → orders | |
| `ticket_id` | text FK → service_tickets | repair invoices |
| `invoice_no` | text UNIQUE NOT NULL | |
| `kind` | text NOT NULL | `advance` \| `final` \| `service` |
| `amount_inr` | numeric(14,2) NOT NULL | |
| `issued_at` | timestamptz NOT NULL DEFAULT now() | |
| `status` | text NOT NULL | `draft` \| `sent` \| `paid` \| `void` |

Link to `payments` via optional `payment_id` if you need 1:1 receipt tracking.

---

### 21. `stock_movements` — audit of inventory changes

| Column | Type | Notes |
| --- | --- | --- |
| `id` | text PK | |
| `product_id` | text NOT NULL FK → products | |
| `serial_unit_id` | text FK → serial_units | |
| `delta_qty` | numeric(12,2) NOT NULL | + purchase, − dispatch |
| `reason` | text NOT NULL | `purchase` \| `reserve` \| `dispatch` \| `return` \| `adjust` |
| `order_id` | text FK → orders | |
| `created_by` | text FK → users | |
| `created_at` | timestamptz NOT NULL DEFAULT now() | |

Use when you need a purchase/COGS trail for the director beyond quote-line cost estimates.

---

### 22. `subsidy_claims`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | text PK | |
| `order_id` | text NOT NULL FK → orders | |
| `scheme_name` | text | e.g. state rooftop subsidy |
| `amount_inr` | numeric(14,2) | |
| `status` | text NOT NULL | `not_started` \| `docs_pending` \| `submitted` \| `approved` \| `rejected` \| `disbursed` |
| `submitted_at` | timestamptz | |
| `notes` | text | |

**App usage:** Director paperwork tracker; enquiry `wants_subsidy` flags that an order likely needs a claim row.

---

### 23. `technician_assignments` — crew on a job (optional multi-tech)

| Column | Type | Notes |
| --- | --- | --- |
| `id` | text PK | |
| `installation_id` | text NOT NULL FK → installations | |
| `technician_id` | text NOT NULL FK → users | |
| `role_on_job` | text | `lead` \| `helper` |
| `hours_worked` | numeric(6,2) | for payroll / cost |

---

## Suggested build order for Drizzle files

Implement Phase 1 in this order so FKs always resolve:

1. `users` (extend starter roles)  
2. `customers`  
3. `products` → `packages` → `package_items`  
4. `enquiries` → `site_surveys`  
5. `quotes` → `quote_lines`  
6. `orders` → `payments`  
7. `stock_levels` → `serial_units` (nullable `dispatch_id` first) → `dispatches` (then backfill FK if needed)  
8. `installations`  
9. `service_tickets`  

Phase 2:

10. `warranty_policies` → `warranties`  
11. `evidences`  
12. `invoices` → `stock_movements` → `subsidy_claims` → `technician_assignments`  

Circular tip: create `serial_units` without `dispatch_id` FK first, add `dispatches`, then attach the FK in a follow-up migration — or store assignment only on `serial_units.order_id` and keep dispatch membership via a thin `dispatch_serials(dispatch_id, serial_unit_id)` join table if you prefer zero cycles.

---

## Role → table write map

| Role | Primarily writes | Reads |
| --- | --- | --- |
| `sales` | `customers`, `enquiries`, `quotes`, `quote_lines`, `orders`, `payments` | packages, surveys |
| `warehouse` | `dispatches`, `serial_units`, `stock_levels` | orders, quote_lines |
| `technician` | `site_surveys`, `installations` (+ `evidences`) | assigned orders |
| `support` | `service_tickets` | customers, serials, warranties |
| `admin` | catalog (`products`, `packages`, policies) | everything (director views) |

---

## Out of scope for v1 schema

- Multi-warehouse / multi-company tenancy  
- Full accounting ledger / GST e-invoice compliance  
- Real-time IoT generation telemetry  
- Customer self-serve login portal tables (can reuse `customers` + a portal user later)

These can wait; they are not required to demonstrate the PDF week narrative.

---

## Hand-off checklist for the schema lead

- [x] Phase 1 + Phase 2 tables landed in `apps/backend/src/db/schema/` + migration  
- [x] Seed: OG-3KW package, products, Amit Verma job through `completed` (+ sample warranties)  
- [x] Roles CHECK constraint matches the map above  
- [x] Phase 2 APIs deferred in [API.md](API.md) / [CONTRACT.md](CONTRACT.md)  
- [x] Result Zod schemas in `apps/backend/src/contracts/results.ts` 

When a feature branch starts, treat this doc as the contract: do not invent parallel tables for the same concept (e.g. do not add both `jobs` and `orders`).
