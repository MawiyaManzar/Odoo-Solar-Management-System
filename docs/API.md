# SunPower API — source of truth

Companion docs: [CONTRACT.md](CONTRACT.md) (index + owners) · [db-schema.md](db-schema.md) (tables) · Zod results in `apps/backend/src/contracts/results.ts` · ID prefixes in `apps/backend/src/contracts/id-prefixes.ts`.

Do not invent alternate paths, field names, or status strings. Feature `schema.ts` files validate requests; services map DB rows to the result schemas named below.

---

## Conventions

### Envelope

```json
{ "success": true, "data": { }, "message": "optional" }
{ "success": false, "message": "Human-readable error." }
```

| Situation | Status | Body |
| :--- | :--- | :--- |
| OK | 200 | `{ success: true, data }` |
| Created | 201 | `{ success: true, data, message? }` |
| Validation | 400 | `{ success: false, message }` (first Zod issue) |
| Unauthorized | 401 | `{ success: false, message: "Authentication required." }` |
| Forbidden | 403 | `{ success: false, message: "You do not have access to this action." }` |
| Not found | 404 | `{ success: false, message }` |
| Conflict | 409 | `{ success: false, message }` |

### Auth

- Protected routes: `Authorization: Bearer <jwt>`.
- `requireAuth` = any logged-in role; `requireRole(...)` as listed per endpoint.
- JSON field names are **camelCase**. Money and qty are **numbers**. Timestamps are **ISO-8601** strings.

### List responses

Unless noted, list endpoints return `data` as an **array** of result objects (same shape as GET-by-id). Optional query filters are documented per resource.

### ID prefixes

| Entity | Prefix | Example |
| :--- | :--- | :--- |
| user | `usr-` | `usr-sales-01` |
| customer | `cus-` | `cus-01` |
| enquiry | `enq-` | `enq-01` |
| site survey | `sur-` | `sur-01` |
| product | `prd-` | `prd-inv3k` |
| package | `pkg-` | `pkg-og3` |
| package item | `pki-` | `pki-1` |
| quote | `quo-` | `quo-01` |
| quote line | `ql-` | `ql-1` |
| order | `ord-` | `ord-01` |
| payment | `pay-` | `pay-01` |
| stock level | `stk-` | `stk-1` |
| serial unit | `ser-` | `ser-inv-01` |
| dispatch | `dsp-` | `dsp-01` |
| installation | `ins-` | `ins-01` |
| service ticket | `tkt-` | `tkt-01` |
| warranty policy | `wpol-` | `wpol-inverter` |
| warranty | `war-` | `war-inv-01` |
| evidence | `evd-` | `evd-01` |
| invoice | `inv-` | `inv-01` |
| stock movement | `smv-` | `smv-01` |
| subsidy claim | `sub-` | `sub-01` |
| tech assignment | `tas-` | `tas-01` |

---

## Auth (existing)

### `POST /api/auth/signup` — public → 201 `AuthUser + token`

Body: `{ fullName, email, companyName, role, password, agreeToTerms }`  
`role` ∈ `admin | sales | warehouse | technician | support`

### `POST /api/auth/login` — public → 200

Body: `{ email, password }` → `{ …user fields, token }`

### `GET /api/auth/me` — any auth → 200

---

## Public landing (no auth)

Active packages only. Inactive packages return 404 on the public detail route.

| Method | Path | Roles | Body / notes |
| :--- | :--- | :--- | :--- |
| GET | `/api/public/packages` | public | Active packages. Same `PackageResult` shape, items omitted |
| GET | `/api/public/packages/:id` | public | Active package including `items` |
| POST | `/api/public/enquiries` | public | `{ name, phone, email?, addressLine, city, pincode?, customerType?, requestedKw, systemKind?, wantsSubsidy?, notes? }` |

Creates or updates the customer matched by phone, then inserts an enquiry with `source: web_form` and `status: new`. Response: `{ customer: CustomerResult, enquiry: EnquiryResult }`.

---

## Customers — result: `CustomerResult`

```ts
{
  id, name, phone, email, addressLine, city, pincode,
  customerType, // residential | commercial
  createdAt
}
```

| Method | Path | Roles | Body / notes |
| :--- | :--- | :--- | :--- |
| GET | `/api/customers` | any auth | Query: `?phone=` exact match for support lookup |
| POST | `/api/customers` | sales, admin | `{ name, phone, email?, addressLine, city, pincode?, customerType? }` · 409 if phone exists |
| GET | `/api/customers/:id` | any auth | |
| PATCH | `/api/customers/:id` | sales, admin | partial of create body |

---

## Enquiries — result: `EnquiryResult`

```ts
{
  id, customerId, source, // web_form | whatsapp | call
  requestedKw, systemKind, // on_grid | off_grid | null
  wantsSubsidy, monthlyBillInr, roofAreaSqft, gridSuitable,
  status, // new | qualifying | survey_scheduled | survey_done | quoted | won | lost
  assignedTo, notes, createdAt, updatedAt,
  customerName, customerPhone, addressLine, city
}
```

| Method | Path | Roles | Body / notes |
| :--- | :--- | :--- | :--- |
| GET | `/api/staff` | any auth | `{ id, name, email, role }[]` · query `?role=` · used to assign a technician |
| GET | `/api/enquiries` | any auth | Query: `?status=&assignedTo=` · includes customer name, phone, address |
| POST | `/api/enquiries` | sales, admin | `{ customerId, source, requestedKw, systemKind?, wantsSubsidy?, notes? }` · status starts `new` |
| GET | `/api/enquiries/:id` | any auth | |
| PATCH | `/api/enquiries/:id` | sales, admin | qualification fields + status transitions |

**Rule:** status may move forward along the pipeline; `lost` is terminal. Setting survey-related statuses should match survey rows.

---

## Site surveys — result: `SiteSurveyResult`

| Method | Path | Roles | Body / notes |
| :--- | :--- | :--- | :--- |
| GET | `/api/enquiries/:id/surveys` | any auth | list for enquiry |
| POST | `/api/enquiries/:id/surveys` | sales, technician, admin | `{ scheduledAt?, technicianId? }` · result starts `pending`; enquiry → `survey_scheduled`. Sales books the visit; they do not record the result |
| PATCH | `/api/surveys/:id` | technician, admin | `{ roofDirection?, tiltDegrees?, cableDistanceM?, usableAreaSqft?, shadowNotes?, result?, completedAt? }` |

**Rule:** when `result` becomes `approved`, set enquiry status `survey_done`. Quotes should refuse create unless approved (or admin).

---

## Products — result: `ProductResult`

| Method | Path | Roles | Body / notes |
| :--- | :--- | :--- | :--- |
| GET | `/api/products` | any auth | Query: `?category=&active=true` |
| POST | `/api/products` | admin | `{ sku, name, category, unit?, unitPriceInr, unitCostInr?, isSerialized?, defaultWarrantyMonths?, isActive? }` |
| GET | `/api/products/:id` | any auth | |
| PATCH | `/api/products/:id` | admin | partial |

`category` ∈ `panel | inverter | battery | charge_controller | mount | wiring | safety | service`

---

## Packages — result: `PackageResult` (optional nested `items: PackageItemResult[]`)

| Method | Path | Roles | Body / notes |
| :--- | :--- | :--- | :--- |
| GET | `/api/packages` | any auth | |
| POST | `/api/packages` | admin | `{ code, name, systemKind, capacityKw?, basePriceInr, items: [{ productId, qty }] }` creates package + items in one transaction |
| GET | `/api/packages/:id` | any auth | include `items` |
| PATCH | `/api/packages/:id` | admin | package fields; replace items only via dedicated body `items` if provided |

`systemKind` ∈ `on_grid | off_grid | panel_set | installation_only`

---

## Quotes — result: `QuoteResult` (optional nested `lines`)

```ts
{
  id, enquiryId, customerId, packageId, status, // draft | sent | accepted | rejected | expired
  subtotalInr, discountInr, totalInr, validUntil, createdBy, createdAt, updatedAt,
  lines?: QuoteLineResult[]
}
```

| Method | Path | Roles | Body / notes |
| :--- | :--- | :--- | :--- |
| GET | `/api/quotes` | any auth | Query: `?status=&customerId=` |
| POST | `/api/quotes` | sales, admin | `{ enquiryId, packageId, discountInr?, validUntil? }` · copies BOM from package into `quote_lines`; enquiry → `quoted` |
| GET | `/api/quotes/:id` | any auth | include `lines` |
| PATCH | `/api/quotes/:id` | sales, admin | draft-only line edits: `{ discountInr?, lines?: [...] }` |
| POST | `/api/quotes/:id/send` | sales, admin | draft → `sent`. Response adds `customerPath` (`/my/quotes/:id`) |
| POST | `/api/quotes/:id/accept` | sales, admin | `sent` → `accepted`; **creates** `orders` row (`awaiting_payment`); enquiry → `won` |
| POST | `/api/quotes/:id/reject` | sales, admin | `draft` or `sent` → `rejected`; enquiry → `lost` |

**Rule:** reject create if linked survey is not `approved` (unless actor is `admin`). Staff may still Accept or Reject. The customer may also decide after a phone OTP (below).

---

## Customer OTP — quote decision

Homeowners are not staff users. A `customer_accounts` row is created on the first successful code and points at `customers.id`. Tokens use `actor: "customer"` and are rejected by staff `requireAuth`.

| Method | Path | Who | Body / notes |
| :--- | :--- | :--- | :--- |
| POST | `/api/customer-auth/otp` | public | `{ phone, quoteId }` · phone must match the quote’s customer · quote must be `sent`, `accepted`, or `rejected` · 6-digit code, 10 minutes, 5 attempts |
| POST | `/api/customer-auth/verify` | public | `{ phone, quoteId, code }` → `{ token, customerId }` |
| GET | `/api/customer/quotes/:id` | that customer | lines and totals |
| POST | `/api/customer/quotes/:id/accept` | that customer | `sent` only · same order + `won` effect as staff accept |
| POST | `/api/customer/quotes/:id/reject` | that customer | `sent` only · enquiry → `lost` |

When `NODE_ENV` is not `production`, the OTP response includes `devCode` and the server logs the code. Production omits `devCode`. Wrong phone on a quote: `400` “Use the mobile number from your inquiry.”

Sign-in without a quote (returning customer):

| Method | Path | Who | Body / notes |
| :--- | :--- | :--- | :--- |
| POST | `/api/customer-auth/sign-in/otp` | public | `{ phone }` · 400 `Submit an inquiry before signing in.` if the phone is not a customer |
| POST | `/api/customer-auth/sign-in/verify` | public | `{ phone, code }` → `{ token, customerId }` |
| GET | `/api/customer/orders` | that customer | Own orders with `payments`, `dispatches`, and `serials` (`warrantyEndsAt`, `underWarranty`). Staff token → 403 |

---

## Orders — result: `OrderResult`

```ts
{
  id, quoteId, customerId, enquiryId,
  status, // awaiting_payment | paid | packing | dispatched | installing | completed | cancelled
  systemKw, systemKind, siteAddress, scheduledInstallAt, totalInr, createdAt, updatedAt
}
```

| Method | Path | Roles | Body / notes |
| :--- | :--- | :--- | :--- |
| GET | `/api/orders` | any auth | Query: `?status=` |
| POST | `/api/orders` | sales, admin | Prefer create via quote accept; direct POST only if quote already `accepted` and no order exists |
| GET | `/api/orders/:id` | any auth | |
| PATCH | `/api/orders/:id` | sales, admin | `{ scheduledInstallAt?, siteAddress?, status? }` · limited transitions |

---

## Payments — result: `PaymentResult`

| Method | Path | Roles | Body / notes |
| :--- | :--- | :--- | :--- |
| GET | `/api/orders/:id/payments` | any auth | |
| POST | `/api/orders/:id/payments` | sales, admin | `{ amountInr, kind, method?, reference? }` · `kind` ∈ `advance \| balance \| full \| service` |

**Rule:** when sum(payments) ≥ `orders.totalInr`, set order status `paid` (ready for warehouse).

---

## Stock levels — result: `StockLevelResult`

| Method | Path | Roles | Body / notes |
| :--- | :--- | :--- | :--- |
| GET | `/api/stock` | any auth | |
| PATCH | `/api/stock/:productId` | warehouse, admin | `{ qtyOnHand?, qtyReserved? }` or `{ deltaOnHand }` adjust |

Available for packing UI: `qtyOnHand - qtyReserved`.

---

## Serial units — result: `SerialUnitResult`

| Method | Path | Roles | Body / notes |
| :--- | :--- | :--- | :--- |
| GET | `/api/serial-units` | any auth | Query: `?serialNumber=&orderId=&status=&productId=` |
| POST | `/api/serial-units` | warehouse, admin | `{ productId, serialNumber }` · status `in_stock` · 409 on duplicate serial |
| POST | `/api/serial-units/:id/scan-out` | warehouse, admin | `{ orderId, dispatchId }` · status `dispatched`; links order + dispatch |

Support lookup example: `GET /api/serial-units?serialNumber=INV-3K-88421`.

---

## Dispatches — result: `DispatchResult` (optional `serialUnitIds`)

| Method | Path | Roles | Body / notes |
| :--- | :--- | :--- | :--- |
| GET | `/api/dispatches` | any auth | Query: `?orderId=&status=` |
| POST | `/api/dispatches` | warehouse, admin | `{ orderId, vehicleNotes? }` · status `packing`; order → `packing` |
| GET | `/api/dispatches/:id` | any auth | include scanned serial ids |
| POST | `/api/dispatches/:id/deliver` | warehouse, admin | sets `delivered` + `deliveredAt` on dispatch and linked serials; order → `dispatched` |

**Phase 1 warranty clock:** `serial_units.delivered_at` + `products.default_warranty_months`.  
**Phase 2:** same action also inserts `warranties` rows from `warranty_policies`.

---

## Installations — result: `InstallationResult`

| Method | Path | Roles | Body / notes |
| :--- | :--- | :--- | :--- |
| GET | `/api/installations` | any auth | Query: `?orderId=&status=` |
| POST | `/api/installations` | technician, admin | `{ orderId, leadTechnicianId?, scheduled implicitly via order }` · status `scheduled`; order → `installing` |
| GET | `/api/installations/:id` | any auth | |
| PATCH | `/api/installations/:id` | technician, admin | `{ startedAt?, finishedAt?, systemKwConfirmed?, generationTestOk?, customerSignedAt?, notes?, status? }` |
| POST | `/api/installations/:id/complete` | technician, admin | requires generation test + signature timestamp; status `completed`; order → `completed`; serials on order → `installed` |

---

## Service tickets — result: `ServiceTicketResult`

| Method | Path | Roles | Body / notes |
| :--- | :--- | :--- | :--- |
| GET | `/api/service-tickets` | any auth | Query: `?status=&customerId=` |
| POST | `/api/service-tickets` | support, admin | `{ customerId, orderId?, serialUnitId?, faultCode?, description, assignedTo? }` · server sets `underWarranty` + `billableInr` |
| GET | `/api/service-tickets/:id` | any auth | |
| PATCH | `/api/service-tickets/:id` | support, admin | status / assignment / billable |
| POST | `/api/service-tickets/:id/close` | support, admin | requires customer confirmation fields; → `closed` |

**Warranty (Phase 1):**

```
underWarranty = serial.deliveredAt + product.defaultWarrantyMonths > now()
billableInr = underWarranty ? 0 : <parts+labour estimate or manual>
```

---

## Reports

| Method | Path | Roles | Response `data` |
| :--- | :--- | :--- | :--- |
| GET | `/api/reports/job-margins` | admin | `JobMarginResult[]` — `{ orderId, revenueInr, cogsEstimateInr, grossMarginInr, status }` |

---

## Template: records (keep for copy-paste)

| Method | Path | Roles |
| :--- | :--- | :--- |
| GET | `/api/records` | any auth |
| GET | `/api/records/:id` | any auth |
| POST | `/api/records` | admin, sales |
| PATCH | `/api/records/:id` | admin, sales |

---

## Phase 2 endpoints (tables exist — implement later)

Result schemas already defined in `contracts/results.ts`.

| Method | Path | Roles | Notes |
| :--- | :--- | :--- | :--- |
| GET/POST | `/api/warranty-policies` | admin write | |
| GET | `/api/warranties` | any auth | Query by `serialUnitId` / `orderId` |
| GET/POST | `/api/evidences` | technician, support, admin | `{ orderId?, installationId?, ticketId?, kind, storageUrl }` |
| GET/POST | `/api/invoices` | sales, admin | |
| GET | `/api/stock-movements` | warehouse, admin | |
| GET/POST/PATCH | `/api/subsidy-claims` | sales, admin | |
| GET/POST | `/api/installations/:id/assignments` | technician, admin | `TechnicianAssignmentResult` |

Do not block Phase 1 feature PRs on these routes.

---

## Example flow (seed mirrors this)

1. Sales: `POST /api/customers` → `POST /api/enquiries` for Amit Verma 3 kW subsidy.
2. Tech: `POST /api/enquiries/:id/surveys` → `PATCH /api/surveys/:id` with `result: "approved"`.
3. Sales: `POST /api/quotes` with `packageId: "pkg-og3"` → `POST .../send` → `POST .../accept` (creates order).
4. Sales: `POST /api/orders/:id/payments` advance + balance → order `paid`.
5. Warehouse: `POST /api/dispatches` → `POST /api/serial-units/:id/scan-out` → `POST .../deliver`.
6. Tech: `POST /api/installations` → `POST .../complete`.
7. Support (later): `GET /api/customers?phone=9876543210` → `GET /api/serial-units?orderId=` → `POST /api/service-tickets`.
8. Admin: `GET /api/reports/job-margins`.

---

## Implementation checklist (each feature)

- [ ] Request Zod in `features/<feature>/schema.ts` (reuse enum consts from `db/schema`)
- [ ] Mapper to matching `*Result` in `contracts/results.ts`
- [ ] `requireRole` matches this document
- [ ] IDs use `ID_PREFIXES`
- [ ] Route registered append-only in `app.ts`
- [ ] MSW handler + [MOCK_INVENTORY.md](MOCK_INVENTORY.md) if UI ships first
- [ ] Verified with `pnpm dev:real` (refresh persists)
