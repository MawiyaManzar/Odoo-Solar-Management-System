# Customer portal

Owner: Charity | Branch: feat/customer-portal | Status: verified

## Part A: Spec (contract for teammates)

### User stories
| ID | Role | Story | Acceptance |
| :--- | :--- | :--- | :--- |
| US-1 | customer | Sign in with the inquiry phone and a development OTP | Given the phone is on `customers`, when they request a code, then a dev code is returned outside production. An unknown phone is told to submit an inquiry and no account is created. |
| US-2 | customer | See own orders, payments, and dispatch after a quote is accepted | Given a customer token, when they open My job, then only their orders are listed with paid amount, balance, and dispatch status. Staff tokens are rejected. |
| US-3 | customer | See serial numbers and warranty | Given serials delivered on their order, when they open My job, then each serial shows its number, warranty end, and whether it is still covered. Undelivered orders say warranty has not started. |

### Roles and permissions
| Action | customer | staff |
| :--- | :--- | :--- |
| Request sign-in OTP | public, phone must already be a customer | n/a |
| Read own orders | yes | no (403) |
| Record payment or dispatch | no | existing staff features, not this screen |

### API contract
`POST /api/customer-auth/sign-in/otp` public `{ phone }` → `{ success, devCode? }`. 400 `Submit an inquiry before signing in.` when the phone is unknown.

`POST /api/customer-auth/sign-in/verify` public `{ phone, code }` → `{ token, customerId }`.

`GET /api/customer/orders` customer token → `{ id, status, systemKw, systemKind, siteAddress, totalInr, paidInr, balanceInr, payments[], dispatches[], serials[] }`. Serials include `serialNumber`, `productName`, `deliveredAt`, `warrantyEndsAt`, `underWarranty`.

### Screens
Sign in (`/login`): Staff keeps email and password. Customer enters phone, requests a code, sees Development code when the API returns `devCode`, then signs in to `/my/jobs`. Unknown phone shows the server message and a link to `/inquire`. States: idle, submitting, error.

My job (`/my/jobs`): no staff tabs. One block per order: status, site, total, paid, balance, payments, dispatches, serials and warranty. Loading, empty (“No orders yet”), error. No edit actions.

### Depends on
`customers`, `customer_accounts`, `customer_otps`, `orders`, `payments`, `dispatches`, `serial_units`, `products`. All real. Quote accept already creates the order.

### Assumptions (reviewed with the developer)
| # | Assumption | Decision |
| :--- | :--- | :--- |
| 1 | This feature does not add staff screens to record payments or dispatches | Customer view is read-only. Rows appear when staff (or seed data) have written them. |
| 2 | A new phone cannot create a customer from sign-in | User asked to send them to the inquiry form. |
| 3 | OTP is the existing development code, not SMS | User asked for a developer OTP. |
| 4 | Warranty uses `serial_units.delivered_at` plus `products.default_warranty_months` | Phase 1 rule in `docs/db-schema.md`. |

## Part B: Walkthrough

### 1. Try it live
1. Open `/login`. Choose Customer sign in. Type `9000000001` and Request code. You should see “Submit an inquiry before signing in” and a link to fill an inquiry.
2. Change the number to Amit Verma’s `9876543210`. Request code. The development code appears on the card.
3. Type that code and Sign in. My job shows order `ord-01`, paid ₹1,85,000, balance 0, dispatch Delivered, panel serial `PNL-330-10001` under warranty until 2046, inverter `INV-3K-88421` under warranty until 2028.
4. Refresh `/my/jobs`. The same order is still there.
5. Staff sign in still goes to the sales dashboard, which does not show this customer layout.

### 2. How it works
`/login` calls `requestSignInOtp` and `verifySignInOtp` in `customer-quote.api.ts`. Those hit `customer-auth/routes.ts`, which only issues a code when `customers.phone` already exists, then stores a customer JWT (`actor: "customer"`). `/my/jobs` calls `GET /api/customer/orders`. `listCustomerOrders` reads that customer’s `orders`, `payments`, `dispatches`, and `serial_units` joined to `products`. Warranty end is delivery date plus `default_warranty_months`. Staff tokens are rejected.

### 3. What you can add next
- Sales screen to record a payment (medium, `orders` feature).
- Warehouse screen to create a dispatch and scan serials (large, inventory feature).
- SMS instead of the development code (medium, `customer-auth/service.ts`).
- A quote list on My job before an order exists (small).

### 4. Test coverage
US-1, US-2, and US-3 are in `apps/backend/tests/customer-portal.e2e.mjs`. The browser check covered unknown phone, Amit sign-in, the job page, and refresh. Staff payment entry is not in this feature.
