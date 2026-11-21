# Run SunPower locally

Needs Node 20+, pnpm 10+, and Docker.

For auth/RBAC, tests, Drizzle Studio, team workflow, and mocks, read [HACKATHON_PLAYBOOK.md](HACKATHON_PLAYBOOK.md).

**Source of truth for the team:** [CONTRACT.md](CONTRACT.md) (roles + feature owners + endpoint index) · [API.md](API.md) (request/response shapes) · [db-schema.md](db-schema.md) (tables).

```bash
pnpm install
docker compose up -d
cp apps/backend/.env.example apps/backend/.env
pnpm db:migrate
pnpm db:seed
pnpm dev
```

Open http://localhost:5173. The backend listens on port 3000. Vite proxies `/api` to it. Postgres is published on host port **5435**.

## Demo logins

Shared password: `hackathon`

| Email | Role | Typical writes |
| :--- | :--- | :--- |
| admin@sunpower.in | admin | catalog, director views, everything |
| sales@sunpower.in | sales | customers, enquiries, quotes, orders, payments |
| warehouse@sunpower.in | warehouse | stock, serials, dispatches |
| tech@sunpower.in | technician | site surveys, installations |
| support@sunpower.in | support | service tickets |

Seed includes a completed demo job: customer **Amit Verma** (`cus-01`), order `ord-01`, inverter serial `INV-3K-88421`.

Reset the database:

```bash
docker compose down -v
docker compose up -d
pnpm db:migrate && pnpm db:seed
```

## During the hackathon

1. Tables already live in `apps/backend/src/db/schema/` — do not invent parallel tables. See [db-schema.md](db-schema.md).
2. Result (response) Zod shapes live in `apps/backend/src/contracts/results.ts`. Map DB rows to these.
3. Implement your feature folder `apps/backend/src/features/<feature>/` (schema → service → routes) per [API.md](API.md).
4. Register the route in `apps/backend/src/app.ts` (append-only).
5. Add one object to `apps/frontend/src/app/feature-registry.tsx`.
6. Mocks only in `apps/frontend/src/mocks/`; list them in [MOCK_INVENTORY.md](MOCK_INVENTORY.md).
7. Demo with `pnpm dev` / `pnpm dev:real` so a refresh still shows the data.
