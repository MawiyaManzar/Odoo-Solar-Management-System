# SunPower: Screen Estimate

Source: `docs/Solar_Installation_Management_System.pdf`, `docs/db-schema.md`, `docs/API.md`.  
Format follows `docs/HACKATHON_SCREENS.md`: one list and one detail per module, plus a few task forms.

Look: existing `apps/frontend/DESIGN.md` (flat Odoo-style back office). Beige page, off-white tables, plum primary buttons, teal links and focus, 1px hairlines, no gradients, no shadows, no emoji. Status pills only from the design tokens (success / warning / danger / info / neutral). Lists run edge to edge. Forms and auth are width-limited. Technician screens are the same components stacked for a phone.

**Phase 1: 16 screens.** Phase 2 adds 4 more after the happy path works. Sample names and amounts below are wireframe placeholders from the seed story. Do not hardcode them in components.

---

## Navigation

Top bar on every internal screen. Hide a tab when the role cannot use it. Logo text **S**, product name **SunPower**.

| Tab | Roles | Opens |
| --- | --- | --- |
| Dashboard | all | Screen 2 |
| Enquiries | all (write: sales, admin) | Screen 3, row → Screen 4 |
| Quotes | all (write: sales, admin) | Screen 5, row → Screen 6 |
| Orders | all (write: sales, admin) | Screen 7, row → Screen 8 |
| Warehouse | all (write: warehouse, admin) | Screen 9, row → Screen 10 |
| Installations | all (write: technician, admin) | Screen 11, row → Screen 12 |
| Tickets | all (write: support, admin) | Screen 13, row → Screen 14 |
| Catalog | all (write: admin) | Screen 15, row → Screen 16 |
| Reports | admin | Screen 17 (Phase 1 director view, listed after catalog) |

Login is Screen 1 and has no tab bar.

Pattern: click a table row to open detail. Detail has a back link (teal) to the list, a status pill, and primary actions on the right (plum). Secondary actions are outline buttons.

---

## Screen 1: Login / Signup

- **Purpose:** staff entry. No customer portal in v1.
- **Title:** SunPower
- **Subtitle:** Solar installation operations
- **Layout:** centered auth card (the one place a bordered card is allowed).
- **Actions:** Log in, Sign up
- **Fields:** Email, Password. Signup adds Full name, Company, Role, Password, Accept terms.
- **Roles on signup:** admin, sales, warehouse, technician, support
- **Rules:**
  - Invalid email or short password shows a danger alert on the card.
  - After login, go to Screen 2.
  - Demo hint under the form (muted text, not a banner): password `hackathon`, emails in `docs/SETUP.md`.

---

## Screen 2: Dashboard

- **Purpose:** today’s work for whoever logged in. Same shell, different cards by role.
- **Title:** Today
- **Subtitle:** Jalandhar rooftop operations
- **Layout:** full-bleed. Three summary tiles in a row (section background, hairline, no shadow), then a recent-activity list.

**Tiles (examples):**

| Role | Tiles |
| --- | --- |
| sales | New enquiries · Quotes waiting · Orders awaiting payment |
| warehouse | Orders to pack · Dispatches in transit · Serialized units in stock |
| technician | Surveys today · Installations in progress |
| support | Open tickets · Under warranty · Billable repairs |
| admin | Unfinished jobs · Open tickets · Gross margin this month (link to Reports) |

- **Actions:** the main plum button matches the role — New enquiry, Pack next order, Open my job, New ticket, or Open reports.
- **Rules:**
  - Counts come from list endpoints with status filters. Empty tiles say “None” in muted text.
  - Activity rows are teal links into the matching detail screen.

---

## Screen 3: Enquiries (List)

- **Purpose:** nothing from the web form, WhatsApp, or a call disappears.
- **Title:** Enquiries
- **Subtitle:** One row per enquiry. Click a row to qualify it.
- **Filters (status pills, clickable):** New, Qualifying, Survey scheduled, Survey done, Quoted, Won, Lost
- **Columns:** Customer, Phone, kW, Source, Subsidy, Status, Owner
- **Sample rows:**

| Customer | Phone | kW | Source | Subsidy | Status | Owner |
| --- | --- | --- | --- | --- | --- | --- |
| Amit Verma | 9876543210 | 3.0 | Web form | Yes | Won | Priya Shah |
| — | — | 5.0 | WhatsApp | No | New | Unassigned |

- **Actions:** + New enquiry (sales, admin)
- **Empty:** “No enquiries in this status.” Link: clear filter.
- **API:** `GET /api/enquiries?status=`

---

## Screen 4: Enquiry Detail

- **Purpose:** qualify the roof, book the survey, then only quote after approval.
- **Title:** Enquiry · Amit Verma · 3 kW
- **Header:** status pill · source · wants subsidy
- **Sections (stacked, hairline dividers, not nested cards):**
  1. **Customer** — name, phone, address, city, pincode, residential/commercial. Link “Open customer” is the same page’s customer block (no separate customer module in v1).
  2. **Qualification** — monthly bill (₹), shadow-free roof area (sq ft), grid suitable (yes/no), notes.
  3. **Surveys** — table: scheduled, technician, direction, tilt, cable (m), result.
- **Actions:** Save qualification (sales), Schedule survey (sales), Record survey (technician — opens the survey form on this page), Lost (outline danger).
- **Survey form fields:** roof direction, tilt degrees, cable distance (m), usable area, shadow notes, result (pending / approved / rejected).
- **Rules:**
  - Saving an approved survey sets enquiry status to Survey done.
  - “Create quote” (plum) is enabled only when a survey result is approved. Admin may override.
  - New enquiry modal/page fields: customer name, phone, address, city, requested kW, source, subsidy checkbox. If phone exists, attach to that customer (409 message shown inline).
- **API:** customers + enquiries + `GET/POST /api/enquiries/:id/surveys`, `PATCH /api/surveys/:id`

---

## Screen 5: Quotes (List)

- **Purpose:** every quote, including drafts that used to live in WhatsApp.
- **Title:** Quotes
- **Filters:** Draft, Sent, Accepted, Rejected, Expired
- **Columns:** Quote, Customer, Package, Total (₹), Valid until, Status
- **Sample row:** quo-01 · Amit Verma · On-Grid 3 kW · 1,85,000 · 31 Mar 2026 · Accepted
- **Actions:** + New quote is not on this list. Quotes start from an approved enquiry (Screen 4) so the survey rule cannot be skipped.
- **API:** `GET /api/quotes`

---

## Screen 6: Quote Detail

- **Purpose:** package template fills the parts list. Nobody types panels, inverter, stands, and earthing from memory.
- **Title:** Quote quo-01 · Amit Verma
- **Header:** package code `OG-3KW` · status pill
- **Line table:** Product, Qty, Unit price (₹), Line total (₹)
- **Sample lines:** 330W panel × 10 · 3 kW inverter × 1 · mount set · wiring kit · earthing · installation service
- **Totals row:** Subtotal, Discount (₹ input while draft), Total
- **Actions:** Save draft, Send, Accept, Reject
- **Rules:**
  - Creating from enquiry copies `package_items` into lines. Sales picks the package (1–5 kW, on-grid or off-grid) before save.
  - Line edits only while status is draft.
  - Accept creates the order in Awaiting payment and marks the enquiry Won. Confirm in a short dialog: “Create order for ₹1,85,000?”
  - Send requires at least one line.
- **API:** `POST /api/quotes`, `PATCH`, `POST .../send`, `POST .../accept`

---

## Screen 7: Orders (List)

- **Purpose:** confirmed jobs the warehouse and crew can see without a phone call.
- **Title:** Orders
- **Filters:** Awaiting payment, Paid, Packing, Dispatched, Installing, Completed, Cancelled
- **Columns:** Order, Customer, Site, kW, Kind, Total (₹), Install date, Status
- **Sample row:** ord-01 · Amit Verma · 12 Model Town · 3.0 · On-grid · 1,85,000 · 10 Mar · Completed
- **API:** `GET /api/orders?status=`

---

## Screen 8: Order Detail

- **Purpose:** money in, then the job moves. Director later reads the same totals.
- **Title:** Order ord-01 · Amit Verma
- **Header:** status · system 3 kW on-grid · site address
- **Sections:**
  1. **Schedule** — install datetime (sales can set)
  2. **Payments** — table: date, kind (advance / balance / full), method, reference, amount. Footer: Paid ₹ / Balance ₹
  3. **Links** — dispatch, installation, tickets (teal, only if those rows exist)
- **Actions:** Record payment (sales). Fields: amount, kind, method (UPI / NEFT / cash / cheque), reference.
- **Rules:**
  - When paid sum reaches order total, status becomes Paid and a success line reads “Warehouse can pack this job.”
  - Cancel is an outline danger action for sales/admin, blocked once status is Dispatched or later.
- **API:** `PATCH /api/orders/:id`, `GET/POST /api/orders/:id/payments`

---

## Screen 9: Warehouse (List)

- **Purpose:** what to pack, and what is on the shelf, on one screen.
- **Title:** Warehouse
- **Subtitle:** Stock on hand, then dispatches.
- **Block A — Stock table:** SKU, Product, On hand, Reserved, Available
- **Sample:** INV-3K · 3kW inverter · 20 · 0 · 20
- **Block B — Dispatches:** Order, Customer, Status, Packed by, Left at
- **Filters on dispatches:** Packing, In transit, Delivered, Cancelled
- **Actions:** New dispatch (warehouse) — pick a Paid order.
- **API:** `GET /api/stock`, `GET /api/dispatches`

---

## Screen 10: Dispatch Detail

- **Purpose:** scan every inverter, battery, and controller before the truck leaves. Warranty clock starts on delivery.
- **Title:** Dispatch dsp-01 · ord-01
- **Header:** status pill · vehicle notes
- **Scan row:** serial number input + Scan button (plum). Enter key submits.
- **Scanned table:** Serial, Product, Status
- **Sample:** INV-3K-88421 · 3kW inverter · Dispatched
- **Actions:** Mark in transit, Mark delivered
- **Rules:**
  - Unknown serial shows a danger alert: “Serial not in stock.”
  - Serial already on another order shows 409 message inline.
  - Deliver sets `delivered_at` on the dispatch and each serial, and moves the order to Dispatched. Info line: “Warranty starts from this delivery.”
  - Phase 1 does not show a warranty policy picker. Duration comes from the product’s default months.
- **API:** `POST /api/dispatches`, `POST /api/serial-units/:id/scan-out`, `POST /api/dispatches/:id/deliver`

**Receiving stock (same screen, secondary):** “Add serial” opens a small form — product (serialized only), serial number — for units arriving at the warehouse (`POST /api/serial-units`).

---

## Screen 11: Installations (List)

- **Purpose:** crew schedule. Technician sees their jobs first.
- **Title:** Installations
- **Filters:** Scheduled, In progress, Completed, Blocked
- **Columns:** Order, Customer, Site, Lead tech, Started, Status
- **Phone:** table becomes one card per job (same columns as stacked lines). Still full width, still no shadow.
- **API:** `GET /api/installations`

---

## Screen 12: Installation Detail (crew form)

- **Purpose:** proof the system was fitted and the customer accepted it.
- **Title:** Installation · 12 Model Town
- **Fields:** Start time, Finish time, Confirmed kW, Generation test (yes/no), Customer signed at, Notes, Status
- **Actions:** Start job, Save, Complete job
- **Rules:**
  - Start sets status In progress and order Installing.
  - Complete is disabled until generation test is yes and a signature time is set. Helper text under the button states that.
  - Complete moves installation to Completed, order to Completed, serials on the order to Installed.
  - Photo upload is not on this screen in Phase 1. Signature is a timestamp. Phase 2 Screen 19 adds files.
- **API:** `POST /api/installations`, `PATCH`, `POST .../complete`

---

## Screen 13: Tickets (List)

- **Purpose:** the rainy-season call has a queue until the customer says it works.
- **Title:** Service tickets
- **Search:** phone or serial (one field). Submits `GET /api/customers?phone=` then serials, or `GET /api/serial-units?serialNumber=`.
- **Filters:** Open, In progress, Waiting parts, Resolved, Closed
- **Columns:** Ticket, Customer, Fault, Serial, Warranty, Billable (₹), Status
- **Sample:** tkt-01 · Amit Verma · E-04 · INV-3K-88421 · Under warranty · 0 · Open
- **Actions:** + New ticket (support, admin) — usually after search so customer and serial are already chosen.
- **API:** `GET /api/service-tickets`

---

## Screen 14: Ticket Detail

- **Purpose:** see the exact unit, whether warranty still covers it, and bill only when it does not.
- **Title:** Ticket · inverter fault
- **Header:** status · warranty pill (success “Under warranty” or warning “Out of warranty”)
- **Sections:**
  1. Customer, phone, site
  2. Serial, product, delivered at, warranty end (computed)
  3. Fault code, description
  4. Billable amount (₹) — read-only 0 when under warranty; editable when not
  5. Assignee (technician)
- **Actions:** Save, Mark resolved, Close
- **Rules:**
  - On create, the server sets `underWarranty` and `billableInr`. The form shows the result; support does not type the warranty flag.
  - Close stays disabled until “Customer confirmed” is checked (sets `customerConfirmedAt`).
  - Out-of-warranty jobs show the billable field with helper text: “Parts and labour to invoice.”
- **API:** `POST/PATCH /api/service-tickets`, `POST .../close`

---

## Screen 15: Catalog (List)

- **Purpose:** packages and parts the quote template is built from.
- **Title:** Catalog
- **Two tables on one page:**
  1. **Packages** — Code, Name, Kind, kW, Base price (₹), Active
  2. **Products** — SKU, Name, Category, Price (₹), Cost (₹), Serialized, Warranty (months)
- **Sample package:** OG-3KW · On-Grid 3 kW · On-grid · 3.0 · 1,85,000 · Active
- **Actions:** + Package, + Product (admin only). Others see the tables without those buttons.
- **API:** `GET /api/packages`, `GET /api/products`

---

## Screen 16: Package Detail

- **Purpose:** the bill of materials behind a 1–5 kW template. Product edit is the same layout with product fields instead of a BOM table.
- **Title:** OG-3KW · On-Grid 3 kW
- **Fields:** code, name, kind (on-grid / off-grid / panel set / installation only), capacity kW, base price, active
- **BOM table:** Product, Qty. Admin can add or remove rows before save.
- **Actions:** Save (admin)
- **Rules:** qty must be greater than 0. Inactive packages do not appear in the quote package picker.
- **API:** `POST/GET /api/packages/:id`, `PATCH`

---

## Screen 17: Reports (Director)

- **Purpose:** which jobs made money, which did not, what is unfinished.
- **Title:** This month
- **Roles:** admin only. Others do not see the tab.
- **Layout:** three tiles (Completed jobs, Open tickets, Unfinished orders), then a full-width table.
- **Columns:** Order, Customer, Status, Revenue (₹), Cost estimate (₹), Margin (₹)
- **Sample:** ord-01 · Amit Verma · Completed · 1,85,000 · (sum of line costs) · margin
- **Rules:**
  - Margin = order total − sum(quote line qty × product unit cost). Label the cost column “Estimate” so it is not read as accounts.
  - Negative margin uses the danger text token. Positive uses success text. No red/green outside those tokens.
  - Unfinished = orders whose status is not completed or cancelled. A second short table under the margin table, or a filter chip “Unfinished”.
  - Subsidy paperwork, invoices, and technician hours are Phase 2. This screen does not invent those numbers.
- **API:** `GET /api/reports/job-margins` plus order/ticket list counts for the tiles.

---

## How a screen is built (shared)

| Region | Look |
| --- | --- |
| Page title | Ink, left. One subtitle in muted text. |
| Primary action | Plum button, top right of the title row. |
| Filters | Text buttons or neutral pills; the active filter uses the info (teal) tint. |
| Table | Full width, section-coloured header, hairline rows. Row hover uses the section token. |
| Status | Pill: paid/completed/approved = success; pending/new/open = warning; rejected/lost/fault = danger; info for in-transit and quoted; neutral for draft/cancelled. |
| Money | Right-aligned, grouped as `1,85,000`. Prefix `₹` in the column header, not on every cell. |
| Form errors | Danger alert above the fields. Field-level message under the input. |
| Loading | Existing spinner. Do not flash empty-state copy while loading. |
| Forbidden | If a role hits a write action, the API 403 message is the alert. Hide the button when the role cannot write. |

Technician installation and survey entry must stay usable at ~390px width: one column, plum button full width at the bottom of the form.

---

## Phase 2 screens (not in the first build)

| Screen | When | What it adds |
| --- | --- | --- |
| 18 Warranty on serial | After dispatch deliver writes `warranties` | On dispatch and ticket detail: policy name, start, end, status. Replaces the Phase 1 computed end date. |
| 19 Evidence | Crew and support need files | On installation and ticket: photo and signature file list (`roof_photo`, `earthing_photo`, `customer_signature`). |
| 20 Invoices | Director asks for paperwork | List + detail: invoice no, kind (advance / final / service), amount, sent/paid. Linked from order and from a billable ticket. |
| 21 Subsidy claims | Enquiry had “wants subsidy” | On order detail: scheme, amount, status (docs pending → disbursed). |

Stock movements, warranty policies, and technician hour rows stay admin subsections on Catalog or Installation detail. They do not need their own top-level tabs.

---

## Screen → table map

| Screen | Reads / writes |
| --- | --- |
| 2 Dashboard | counts on enquiries, quotes, orders, dispatches, installations, tickets |
| 3–4 Enquiries | `customers`, `enquiries`, `site_surveys` |
| 5–6 Quotes | `quotes`, `quote_lines`, `packages`, `package_items` |
| 7–8 Orders | `orders`, `payments` |
| 9–10 Warehouse | `stock_levels`, `dispatches`, `serial_units` |
| 11–12 Installations | `installations`, updates `orders` and `serial_units` |
| 13–14 Tickets | `service_tickets`, `customers`, `serial_units`, `products` |
| 15–16 Catalog | `products`, `packages`, `package_items` |
| 17 Reports | `orders`, `quote_lines`, `products`, `service_tickets` |

---

## Cut line for a short hackathon

If time is short, ship in this order. Each pair is list + detail.

1. Login, Dashboard (static counts are not allowed — real counts or an explicit empty state)
2. Enquiries + survey gate
3. Quotes from package `OG-3KW` + accept → order
4. Order payments
5. Dispatch serial scan + deliver
6. Installation complete
7. Ticket lookup by phone/serial
8. Reports margin table
9. Catalog edit (admin can demo with seed data if edit slips)

That path is the PDF week: form → survey → quote → pay → serials → roof → breakdown → director.
