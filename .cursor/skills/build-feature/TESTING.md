# Testing steps

Run in this order. Fix failures before moving to the next layer.

Do **not** add Playwright, Cypress, or other browser E2E frameworks. Frontend verification is Cursor browser + manual real-mode checks only.

## 1. Backend integration and acceptance

Do not edit the shared `apps/backend/test-backend-e2e.mjs` (hot file, merge conflicts). Create `apps/backend/tests/<feature>.e2e.mjs` by copying that file's header (imports, `assert` helper, `migrate()`, `runDatabaseSeed()`, `buildApp`, `app.inject`, results footer). Run:

```bash
docker compose up -d
pnpm --filter backend exec tsx tests/<feature>.e2e.mjs
pnpm test:backend    # the shared suite must still pass
```

Cover, with real Postgres and `app.inject` (no mocks):

| Layer | What to assert |
| :--- | :--- |
| Auth matrix | For every endpoint and every role in the contract: no token 401, forbidden role 403, allowed role 200/201. |
| Validation | Each required field missing, wrong type, out-of-range, and bad enum gives 400 with the Zod message. |
| Not found / conflict | Unknown id 404; duplicate or illegal state change 409 or the contract's code. |
| Integration | Create then read back then update then list; the row is in the DB (query via the service or a follow-up GET). Multi-table writes are atomic. |
| Business rules | Every calculation, status transition, and limit from the requirements, using values from the doc. |
| Acceptance | One numbered block per user story ID in Part A, titled with that ID (`US-3: Manager can approve ...`), written Given/When/Then. |

Test data created by the tests uses unique suffixes (`Date.now().toString(36)`) so reruns do not collide.

## 2. Frontend verification (Cursor browser)

Use the Cursor browser tools against a running app (`pnpm dev` or `pnpm dev:real`). Log in with demo accounts from `docs/SETUP.md`. Drive the UI the way a user would (role/label selectors). Do not write Playwright specs or install `@playwright/test`.

Per user story in Part A:

- Happy path for each role allowed to do it.
- Negative path: restricted role cannot see or use the action.
- Validation: submitting an invalid form shows the server or client message and does not create a row.
- Persistence: perform the write, reload, and assert the data is still there.

### States (required)

| State | How to check |
| :--- | :--- |
| Loading | Trigger a list/detail load; assert `[data-testid="<feature>-skeleton"]` (or the screen's loading UI) appears briefly, then content. |
| Empty | Prefer a real filter or search that matches nothing; assert `[data-testid="<feature>-empty"]` plus the create action for allowed roles. |
| Error | Trigger a failing request if feasible (e.g. stop backend briefly, or use a bad id); assert the danger alert and Retry. |
| Forbidden | Log in as the restricted role; assert the message or hidden action. |

For layout, spacing, and tokens, take snapshots/screenshots and compare to `DESIGN.md`.

## 3. Real-mode verification (required by AGENTS.md)

1. `pnpm dev:real`. Do the full user flow by hand or via Cursor browser.
2. Refresh the browser. Records you created must still be there.
3. Confirm in the DB: `pnpm db:studio` or `docker compose exec postgres psql -U hackcore -d hackcore`.
4. Run `pnpm check:mock-leakage` and both `tsc --noEmit` checks.
5. If any dependency is still mocked, say so in the hand-off report and test that part with `pnpm dev:mock` separately.

## Report

Print a table: layer, command (or "Cursor browser"), pass/fail counts. Anything not run is listed as not run with the reason. Never report a layer as passing without running it.
