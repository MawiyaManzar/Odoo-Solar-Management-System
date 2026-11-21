import { eq } from "drizzle-orm";
import { buildApp } from "../src/app.ts";
import { db } from "../src/db/client.ts";
import { migrate } from "../src/db/migrate.ts";
import { closePool } from "../src/db/pool.ts";
import { orders, quotes } from "../src/db/schema/index.ts";
import { runDatabaseSeed } from "../src/db/seeds/index.ts";
import { DEV_PASSWORD } from "../src/db/seeds/starter.seed.ts";

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

async function seedAwaitingOrder(suffix, totalInr) {
  const quoteId = `quo-od-${suffix}`;
  const orderId = `ord-od-${suffix}`;
  await db.insert(quotes).values({
    id: quoteId,
    enquiryId: "enq-01",
    customerId: "cus-01",
    status: "accepted",
    subtotalInr: totalInr,
    discountInr: 0,
    totalInr
  });
  await db.insert(orders).values({
    id: orderId,
    quoteId,
    customerId: "cus-01",
    enquiryId: "enq-01",
    status: "awaiting_payment",
    systemKw: 3,
    systemKind: "on_grid",
    siteAddress: "Model Town test roof, Jalandhar",
    totalInr
  });
  return orderId;
}

async function runTests() {
  const state = { passed: 0, failed: 0 };
  await migrate();
  await runDatabaseSeed();
  const app = await buildApp({ logger: false });
  await app.ready();
  const suffix = Date.now().toString(36);
  const sales = await login(app, "sales@sunpower.in");
  const warehouse = await login(app, "warehouse@sunpower.in");
  const auth = (token) => ({ authorization: `Bearer ${token}` });

  console.log("\nUS-1: sales lists orders");
  const missing = await app.inject({ method: "GET", url: "/api/orders" });
  assert(missing.statusCode === 401, "missing token is 401", state);
  const listed = await app.inject({ method: "GET", url: "/api/orders", headers: auth(sales) });
  const body = listed.json();
  assert(listed.statusCode === 200 && body.data.some((row) => row.id === "ord-01" && row.customerName), "seed order is listed with a customer", state);

  console.log("\nUS-2 and US-3: 30 percent UPI advance unlocks paid");
  const orderId = await seedAwaitingOrder(suffix, 100000);
  const shortPay = await app.inject({
    method: "POST",
    url: `/api/orders/${orderId}/payments`,
    headers: auth(sales),
    payload: { amountInr: 29999, kind: "advance", method: "upi", reference: `UTR-${suffix}` }
  });
  assert(shortPay.statusCode === 201, "short payment is stored", state);
  const stillWaiting = await app.inject({ method: "GET", url: `/api/orders/${orderId}`, headers: auth(sales) });
  assert(stillWaiting.json().data.status === "awaiting_payment", "below 30 percent stays awaiting payment", state);
  assert(stillWaiting.json().data.paidInr === 29999, "paid total is persisted", state);

  const gate = await app.inject({
    method: "POST",
    url: `/api/orders/${orderId}/payments`,
    headers: auth(sales),
    payload: { amountInr: 1, kind: "advance", method: "upi", reference: `UTR-${suffix}-b` }
  });
  assert(gate.statusCode === 201, "rupee that crosses 30 percent is stored", state);
  const paid = await app.inject({ method: "GET", url: `/api/orders/${orderId}`, headers: auth(sales) });
  assert(paid.json().data.status === "paid" && paid.json().data.paidInr === 30000, "status becomes paid at 30 percent", state);

  const forbidden = await app.inject({
    method: "POST",
    url: `/api/orders/${orderId}/payments`,
    headers: auth(warehouse),
    payload: { amountInr: 10, kind: "balance", method: "cash" }
  });
  assert(forbidden.statusCode === 403, "warehouse cannot record a payment", state);

  const bad = await app.inject({
    method: "POST",
    url: `/api/orders/${orderId}/payments`,
    headers: auth(sales),
    payload: { amountInr: -1, kind: "advance" }
  });
  assert(bad.statusCode === 400, "negative amount is 400", state);

  const missingUtr = await app.inject({
    method: "POST",
    url: `/api/orders/${orderId}/payments`,
    headers: auth(sales),
    payload: { amountInr: 10, kind: "balance", method: "upi" }
  });
  assert(missingUtr.statusCode === 400, "UPI without UTR is 400", state);

  const overpayStaff = await app.inject({
    method: "POST",
    url: `/api/orders/${orderId}/payments`,
    headers: auth(sales),
    payload: { amountInr: 200000, kind: "balance", method: "cash", reference: "CASH-OVER" }
  });
  assert(overpayStaff.statusCode === 201, "sales may record above balance", state);

  console.log("\nUS-5: schedule after the gate");
  const tooSoonId = await seedAwaitingOrder(`${suffix}b`, 80000);
  const blocked = await app.inject({
    method: "POST",
    url: `/api/orders/${tooSoonId}/schedule`,
    headers: auth(sales),
    payload: { scheduledInstallAt: "2026-12-02T09:30:00.000Z", leadTechnicianId: "usr-tech-01" }
  });
  assert(blocked.statusCode === 422, "schedule before 30 percent is 422", state);
  const pastInstall = await app.inject({
    method: "POST",
    url: `/api/orders/${orderId}/schedule`,
    headers: auth(sales),
    payload: { scheduledInstallAt: "2020-01-01T09:30:00.000Z", leadTechnicianId: "usr-tech-01" }
  });
  assert(pastInstall.statusCode === 400, "past install schedule is 400", state);
  const scheduled = await app.inject({
    method: "POST",
    url: `/api/orders/${orderId}/schedule`,
    headers: auth(sales),
    payload: { scheduledInstallAt: "2026-12-02T09:30:00.000Z", leadTechnicianId: "usr-tech-01" }
  });
  assert(scheduled.statusCode === 200 && scheduled.json().data.leadTechnicianId === "usr-tech-01", "lead technician is saved", state);
  assert(Boolean(scheduled.json().data.installationId), "installation row exists", state);

  const dupUtr = await app.inject({
    method: "POST",
    url: `/api/orders/${orderId}/payments`,
    headers: auth(sales),
    payload: { amountInr: 10, kind: "balance", method: "upi", reference: `UTR-${suffix}` }
  });
  assert(dupUtr.statusCode === 409, "duplicate UTR on the same order is 409", state);

  const techs = await app.inject({ method: "GET", url: "/api/staff?role=technician", headers: auth(sales) });
  assert(techs.json().data.some((row) => row.id === "usr-tech-01"), "technician list includes Harpreet", state);

  console.log("\nUS-4: dispatch before the gate is rejected");
  const early = await app.inject({
    method: "POST",
    url: "/api/dispatches",
    headers: auth(warehouse),
    payload: { orderId: tooSoonId }
  });
  assert(early.statusCode === 422, "unpaid order cannot be packed", state);

  await db.delete(orders).where(eq(orders.id, tooSoonId));
  await db.delete(quotes).where(eq(quotes.id, `quo-od-${suffix}b`));

  await app.close();
  console.log(`\n${state.passed} passed, ${state.failed} failed`);
  if (state.failed > 0) process.exitCode = 1;
}

runTests()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => closePool());
