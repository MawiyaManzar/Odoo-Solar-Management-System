# Mock Inventory & API Migration Tracker

## Status Definitions

- `MOCK ONLY`: Endpoint is currently served only by an MSW handler in `apps/frontend/src/mocks/handlers/`.
- `REAL API IMPLEMENTED`: Fastify route exists and talks to PostgreSQL.
- `REAL API VERIFIED`: Checked against Fastify + PostgreSQL, including a reload or the API test suite.

## Active Inventory

| Feature | Mock endpoint | Real API | Status | Notes |
| :--- | :--- | :--- | :--- | :--- |
| Auth / Signup | `POST /api/auth/signup` | `POST /api/auth/signup` | `REAL API VERIFIED` | Closed — always 403; use Staff |
| Staff create | `POST /api/staff` | `POST /api/staff` | `REAL API IMPLEMENTED` | Admin only; sales/warehouse/technician/support |
| Auth / Login | `POST /api/auth/login` | `POST /api/auth/login` | `REAL API VERIFIED` | Demo password is in `docs/SETUP.md` |
| Auth / Session | `GET /api/auth/me` | `GET /api/auth/me` | `REAL API VERIFIED` | Requires `Authorization: Bearer` |
| Public packages | `GET /api/public/packages` | `GET /api/public/packages` | `REAL API VERIFIED` | Active packages for the landing page |
| Public package | `GET /api/public/packages/:id` | `GET /api/public/packages/:id` | `REAL API IMPLEMENTED` | 404 when inactive |
| Public enquiry | `POST /api/public/enquiries` | `POST /api/public/enquiries` | `REAL API VERIFIED` | Upserts customer by phone, `source: web_form`. Optional `answers[]` stored in `inquiry_form_answers` and mapped to columns/notes |
| Public inquiry form | — | `GET /api/public/inquiry-form` | `REAL API VERIFIED` | Active questions for `/inquire`; no MSW handler (own feature) |
| Admin inquiry questions | — | `GET/POST/PATCH/DELETE /api/admin/inquiry-questions` | `REAL API VERIFIED` | Admin-only form builder; no MSW handler (own feature) |
| Products | `GET/POST /api/products`, `PATCH /api/products/:id` | same | `REAL API IMPLEMENTED` | Write: admin |
| Packages | `GET/POST /api/packages`, `GET/PATCH /api/packages/:id` | same | `REAL API VERIFIED` | Public list read during the quote smoke; write is admin |
| Staff list | `GET /api/staff` | `GET /api/staff` | `REAL API VERIFIED` | Active users, optional `role` |
| Enquiries | `GET/PATCH /api/enquiries` | same | `REAL API VERIFIED` | Write: sales, admin |
| Surveys | `GET/POST /api/enquiries/:id/surveys`, `PATCH /api/surveys/:id` | same | `REAL API VERIFIED` | Schedule: sales, technician, admin. Result: technician, admin |
| Quotes | `GET/POST /api/quotes`, `POST /api/quotes/:id/send|accept|reject|revise` | same | `REAL API VERIFIED` | Write: sales, admin. Accept creates an order (MSW also adds a customer-orders row). Send adds `customerPath`. Reject keeps enquiry quoted; revise clones a draft |
| Customer OTP | `POST /api/customer-auth/otp`, `POST /api/customer-auth/verify` | same | `REAL API VERIFIED` | Dev responses include `devCode` outside production |
| Customer quote | `GET /api/customer/quotes/:id`, `POST .../accept`, `POST .../reject` | same | `REAL API VERIFIED` | Owner only. A customer token on staff routes returns 403 |
| Customer sign-in | `POST /api/customer-auth/sign-in/otp`, `POST .../verify` | same | `REAL API VERIFIED` | Unknown phone is told to submit an inquiry |
| Customer orders | `GET /api/customer/orders` | same | `REAL API VERIFIED` | Payments, dispatch, serials, warranty |
| Customer Stripe checkout | `POST /api/customer/orders/:id/checkout` | same | `REAL API IMPLEMENTED` | Creates Stripe Checkout Session (test keys) |
| Customer Stripe confirm | `POST /api/customer/orders/:id/payments/confirm` | same | `REAL API IMPLEMENTED` | Records `method: stripe` after paid session; same 30% gate |
| Customer quotes list | `GET /api/customer/quotes` | same | `REAL API IMPLEMENTED` | Portal UI; sent/accepted/rejected/expired |
| Customer support ask | `POST /api/customer/support/ask` | same | `REAL API IMPLEMENTED` | Rule-based bot; no chat table |
| Customer service tickets | `GET/POST /api/customer/service-tickets` | same | `REAL API IMPLEMENTED` | Own tickets; delivered serials only |
| Orders | `GET/POST /api/orders`, `GET/PATCH /api/orders/:id`, `POST .../schedule` | same | `REAL API VERIFIED` | No MSW handler. 30% payment gate. Schedule assigns lead technician |
| Payments | `GET/POST /api/orders/:id/payments` | same | `REAL API VERIFIED` | Staff records UPI, NEFT, cash, or cheque |
| Stock | `GET /api/stock`, `PATCH /api/stock/:productId` | same | `REAL API VERIFIED` | Write: warehouse, admin |
| Serials | `GET/POST /api/serial-units`, `POST .../scan-out` | same | `REAL API VERIFIED` | Scan-out links a unit to a dispatch |
| Dispatches | `GET/POST /api/dispatches`, `POST .../in-transit`, `POST .../deliver` | same | `REAL API VERIFIED` | Deliver sets `deliveredAt` and moves the order to dispatched |
| Job margins | `GET /api/reports/job-margins` | same | `REAL API VERIFIED` | Admin only. Includes customerName and completedAt |
| Service tickets list | `GET /api/service-tickets` | same | `REAL API VERIFIED` | List/counts only; create/detail UI deferred |

## When a real endpoint is done

1. Exercise it with `pnpm dev`.
2. Confirm the JSON matches the feature `types.ts` file.
3. Refresh the browser and confirm the row is still there.
4. Update this table.
5. Keep the MSW handler so `pnpm dev:mock` still works.
