# Mock Inventory & API Migration Tracker

## Status Definitions

- `MOCK ONLY`: Endpoint is currently served only by an MSW handler in `apps/frontend/src/mocks/handlers/`.
- `REAL API IMPLEMENTED`: Fastify route exists and talks to PostgreSQL.
- `REAL API VERIFIED`: Checked against Fastify + PostgreSQL, including a reload or the API test suite.

## Active Inventory

| Feature | Mock endpoint | Real API | Status | Notes |
| :--- | :--- | :--- | :--- | :--- |
| Auth / Signup | `POST /api/auth/signup` | `POST /api/auth/signup` | `REAL API VERIFIED` | Persists a user and returns a JWT |
| Auth / Login | `POST /api/auth/login` | `POST /api/auth/login` | `REAL API VERIFIED` | Demo password is in `docs/SETUP.md` |
| Auth / Session | `GET /api/auth/me` | `GET /api/auth/me` | `REAL API VERIFIED` | Requires `Authorization: Bearer` |
| Records list | `GET /api/records` | `GET /api/records` | `REAL API VERIFIED` | Any signed-in role |
| Record detail | `GET /api/records/:id` | `GET /api/records/:id` | `REAL API VERIFIED` | Used by the edit dialog |
| Record create | `POST /api/records` | `POST /api/records` | `REAL API VERIFIED` | `admin` and `manager` only |
| Record update | `PATCH /api/records/:id` | `PATCH /api/records/:id` | `REAL API VERIFIED` | `admin` and `manager` only |
| Public packages | `GET /api/public/packages` | `GET /api/public/packages` | `REAL API VERIFIED` | Active packages for the landing page |
| Public package | `GET /api/public/packages/:id` | `GET /api/public/packages/:id` | `REAL API IMPLEMENTED` | 404 when inactive |
| Public enquiry | `POST /api/public/enquiries` | `POST /api/public/enquiries` | `REAL API VERIFIED` | Upserts customer by phone, `source: web_form` |
| Products | `GET/POST /api/products`, `PATCH /api/products/:id` | same | `REAL API IMPLEMENTED` | Write: admin |
| Packages | `GET/POST /api/packages`, `GET/PATCH /api/packages/:id` | same | `REAL API VERIFIED` | Public list read during the quote smoke; write is admin |
| Staff list | `GET /api/staff` | `GET /api/staff` | `REAL API VERIFIED` | Active users, optional `role` |
| Enquiries | `GET/PATCH /api/enquiries` | same | `REAL API VERIFIED` | Write: sales, admin |
| Surveys | `GET/POST /api/enquiries/:id/surveys`, `PATCH /api/surveys/:id` | same | `REAL API VERIFIED` | Schedule: sales, technician, admin. Result: technician, admin |
| Quotes | `GET/POST /api/quotes`, `POST /api/quotes/:id/send|accept|reject` | same | `REAL API VERIFIED` | Write: sales, admin. Accept creates an order. Send adds `customerPath` |
| Customer OTP | `POST /api/customer-auth/otp`, `POST /api/customer-auth/verify` | same | `REAL API VERIFIED` | Dev responses include `devCode` outside production |
| Customer quote | `GET /api/customer/quotes/:id`, `POST .../accept`, `POST .../reject` | same | `REAL API VERIFIED` | Owner only. A customer token on staff routes returns 403 |
| Customer sign-in | `POST /api/customer-auth/sign-in/otp`, `POST .../verify` | same | `REAL API VERIFIED` | Unknown phone is told to submit an inquiry |
| Customer orders | `GET /api/customer/orders` | same | `REAL API VERIFIED` | Read-only payments, dispatch, serials, warranty |

## When a real endpoint is done

1. Exercise it with `pnpm dev`.
2. Confirm the JSON matches the feature `types.ts` file.
3. Refresh the browser and confirm the row is still there.
4. Update this table.
5. Keep the MSW handler so `pnpm dev:mock` still works.
