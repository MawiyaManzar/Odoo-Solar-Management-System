import { eq } from "drizzle-orm";
import { buildApp } from "../src/app.ts";
import { db } from "../src/db/client.ts";
import { migrate } from "../src/db/migrate.ts";
import { closePool } from "../src/db/pool.ts";
import { products, quoteLines, serviceTickets } from "../src/db/schema/index.ts";
import { runDatabaseSeed } from "../src/db/seeds/index.ts";
import { DEV_PASSWORD } from "../src/db/seeds/starter.seed.ts";
import { calendarMonthInIndia } from "../src/lib/dates.ts";

function assert(condition, message, state) {
  if (condition) {
    console.log(`  PASS: ${message}`);
    state.passed += 1;
  } else {
    console.error(`  FAIL: ${message}`);
    state.failed += 1;
  }
}

async function login(app, email) {
  const response = await app.inject({
    method: "POST",
    url: "/api/auth/login",
    payload: { email, password: DEV_PASSWORD }
  });
  return response.json().data?.token;
}

async function runTests() {
  const state = { passed: 0, failed: 0 };
  await migrate();
  await runDatabaseSeed();
  const app = await buildApp({ logger: false });
  await app.ready();
  const suffix = Date.now().toString(36);
  const admin = await login(app, "admin@sunpower.in");
  const sales = await login(app, "sales@sunpower.in");
  const auth = (token) => ({ authorization: `Bearer ${token}` });

  console.log("\nUS-3: admin reads job margins");
  const missing = await app.inject({ method: "GET", url: "/api/reports/job-margins" });
  assert(missing.statusCode === 401, "missing token is 401", state);

  console.log("\nUS-4: sales cannot read job margins");
  const forbidden = await app.inject({
    method: "GET",
    url: "/api/reports/job-margins",
    headers: auth(sales)
  });
  assert(forbidden.statusCode === 403, "sales is 403 on job-margins", state);

  const margins = await app.inject({
    method: "GET",
    url: "/api/reports/job-margins",
    headers: auth(admin)
  });
  const marginBody = margins.json();
  const seedRow = marginBody.data?.find((row) => row.orderId === "ord-01");
  assert(margins.statusCode === 200 && seedRow, "admin receives seed order margin row", state);
  assert(typeof seedRow?.customerName === "string" && seedRow.customerName.length > 0, "margin row includes customer name", state);
  assert(typeof seedRow?.revenueInr === "number" && seedRow.revenueInr === 185000, "revenue matches order total", state);
  assert(typeof seedRow?.cogsEstimateInr === "number" && seedRow.cogsEstimateInr > 0, "cogs estimate is positive", state);
  assert(
    seedRow?.grossMarginInr === Math.round((seedRow.revenueInr - seedRow.cogsEstimateInr) * 100) / 100,
    "margin equals revenue minus cogs",
    state
  );
  assert(seedRow?.status === "completed" && seedRow.completedAt, "completed job has completedAt", state);

  const lineCosts = await db
    .select({ qty: quoteLines.qty, unitCostInr: products.unitCostInr })
    .from(quoteLines)
    .innerJoin(products, eq(products.id, quoteLines.productId))
    .where(eq(quoteLines.quoteId, "quo-01"));
  const expectedCogs = Math.round(lineCosts.reduce((sum, line) => sum + line.qty * line.unitCostInr, 0) * 100) / 100;
  assert(seedRow?.cogsEstimateInr === expectedCogs, "cogs matches quote lines × product cost", state);

  console.log("\nUS-5: any staff lists service tickets");
  const ticketMissing = await app.inject({ method: "GET", url: "/api/service-tickets" });
  assert(ticketMissing.statusCode === 401, "tickets without token is 401", state);

  await db.insert(serviceTickets).values({
    id: `tkt-${suffix}`,
    customerId: "cus-01",
    orderId: "ord-01",
    serialUnitId: "ser-inv-01",
    openedBy: "usr-support-01",
    assignedTo: null,
    faultCode: "E-04",
    description: "Inverter fault after monsoon rain",
    underWarranty: true,
    billableInr: 0,
    status: "open"
  });

  const tickets = await app.inject({
    method: "GET",
    url: "/api/service-tickets",
    headers: auth(sales)
  });
  const ticketBody = tickets.json();
  assert(
    tickets.statusCode === 200 && ticketBody.data.some((row) => row.id === `tkt-${suffix}` && row.status === "open"),
    "sales can list open tickets for counts",
    state
  );

  const filtered = await app.inject({
    method: "GET",
    url: "/api/service-tickets?status=closed",
    headers: auth(admin)
  });
  assert(
    filtered.statusCode === 200 && !filtered.json().data.some((row) => row.id === `tkt-${suffix}`),
    "status filter excludes open ticket",
    state
  );

  console.log("\nUS-1 helper: completedAt month is Asia/Kolkata calendar month");
  const month = calendarMonthInIndia(new Date(seedRow.completedAt));
  assert(/^\d{4}-\d{2}$/.test(month), `completedAt maps to month ${month}`, state);

  console.log(`\nReports e2e: ${state.passed} passed, ${state.failed} failed`);
  await app.close();
  await closePool();
  if (state.failed > 0) process.exit(1);
}

runTests().catch(async (error) => {
  console.error(error);
  await closePool();
  process.exit(1);
});
