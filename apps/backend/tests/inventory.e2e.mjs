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

async function runTests() {
  const state = { passed: 0, failed: 0 };
  await migrate();
  await runDatabaseSeed();
  const app = await buildApp({ logger: false });
  await app.ready();
  const suffix = Date.now().toString(36);
  const sales = await login(app, "sales@sunpower.in");
  const warehouse = await login(app, "warehouse@sunpower.in");
  const support = await login(app, "support@sunpower.in");
  const auth = (token) => ({ authorization: `Bearer ${token}` });

  const quoteId = `quo-inv-${suffix}`;
  const orderId = `ord-inv-${suffix}`;
  await db.insert(quotes).values({
    id: quoteId,
    enquiryId: "enq-01",
    customerId: "cus-01",
    status: "accepted",
    subtotalInr: 100000,
    discountInr: 0,
    totalInr: 100000
  });
  await db.insert(orders).values({
    id: orderId,
    quoteId,
    customerId: "cus-01",
    enquiryId: "enq-01",
    status: "awaiting_payment",
    systemKw: 3,
    systemKind: "on_grid",
    siteAddress: "Civil Lines test roof, Jalandhar",
    totalInr: 100000
  });

  console.log("\nUS-6: warehouse packs a paid order");
  await app.inject({
    method: "POST",
    url: `/api/orders/${orderId}/payments`,
    headers: auth(sales),
    payload: { amountInr: 50000, kind: "advance", method: "upi", reference: `UTR-50-${suffix}` }
  });
  const denied = await app.inject({
    method: "POST",
    url: "/api/dispatches",
    headers: auth(sales),
    payload: { orderId, vehicleNotes: "Sales cannot pack" }
  });
  assert(denied.statusCode === 403, "sales cannot create a dispatch", state);
  const created = await app.inject({
    method: "POST",
    url: "/api/dispatches",
    headers: auth(warehouse),
    payload: { orderId, vehicleNotes: `Bolero ${suffix}` }
  });
  const dispatch = created.json().data;
  assert(created.statusCode === 201 && dispatch.status === "packing", "dispatch starts packing", state);
  const packedOrder = await app.inject({ method: "GET", url: `/api/orders/${orderId}`, headers: auth(warehouse) });
  assert(packedOrder.json().data.status === "packing", "order moves to packing", state);

  console.log("\nUS-7: scan serials");
  const unknown = await app.inject({
    method: "POST",
    url: "/api/serial-units/ser-missing/scan-out",
    headers: auth(warehouse),
    payload: { orderId, dispatchId: dispatch.id }
  });
  assert(unknown.statusCode === 404, "unknown serial is 404", state);
  const conflict = await app.inject({
    method: "POST",
    url: "/api/serial-units/ser-inv-01/scan-out",
    headers: auth(warehouse),
    payload: { orderId, dispatchId: dispatch.id }
  });
  assert(conflict.statusCode === 404 || conflict.statusCode === 409, "installed serial is not scanned onto a new order", state);

  const added = await app.inject({
    method: "POST",
    url: "/api/serial-units",
    headers: auth(warehouse),
    payload: { productId: "prd-inv3k", serialNumber: `INV-3K-${suffix}` }
  });
  assert(added.statusCode === 201, "new serial is in stock", state);
  const duplicate = await app.inject({
    method: "POST",
    url: "/api/serial-units",
    headers: auth(warehouse),
    payload: { productId: "prd-inv3k", serialNumber: `INV-3K-${suffix}` }
  });
  assert(duplicate.statusCode === 409, "duplicate serial is 409", state);
  const scanned = await app.inject({
    method: "POST",
    url: `/api/serial-units/${added.json().data.id}/scan-out`,
    headers: auth(warehouse),
    payload: { orderId, dispatchId: dispatch.id }
  });
  assert(scanned.statusCode === 200 && scanned.json().data.status === "dispatched", "scan-out links the serial", state);
  const supportRead = await app.inject({
    method: "GET",
    url: `/api/serial-units?serialNumber=INV-3K-${suffix}`,
    headers: auth(support)
  });
  assert(supportRead.json().data[0]?.orderId === orderId, "support can read the scanned serial", state);

  console.log("\nUS-8: deliver starts the warranty clock");
  const transit = await app.inject({
    method: "POST",
    url: `/api/dispatches/${dispatch.id}/in-transit`,
    headers: auth(warehouse)
  });
  assert(transit.statusCode === 200 && transit.json().data.status === "in_transit", "dispatch can leave the warehouse", state);
  const delivered = await app.inject({
    method: "POST",
    url: `/api/dispatches/${dispatch.id}/deliver`,
    headers: auth(warehouse)
  });
  assert(delivered.statusCode === 200 && delivered.json().data.status === "delivered", "deliver marks the dispatch", state);
  assert(Boolean(delivered.json().data.deliveredAt), "dispatch has deliveredAt", state);
  const serial = await app.inject({
    method: "GET",
    url: `/api/serial-units?serialNumber=INV-3K-${suffix}`,
    headers: auth(warehouse)
  });
  assert(Boolean(serial.json().data[0]?.deliveredAt), "serial deliveredAt starts the warranty clock", state);
  const moved = await app.inject({ method: "GET", url: `/api/orders/${orderId}`, headers: auth(sales) });
  assert(moved.json().data.status === "dispatched", "order becomes dispatched", state);

  const stock = await app.inject({ method: "GET", url: "/api/stock", headers: auth(warehouse) });
  assert(stock.statusCode === 200 && stock.json().data.some((row) => row.productSku), "stock list includes product labels", state);
  const stockDenied = await app.inject({
    method: "PATCH",
    url: "/api/stock/prd-inv3k",
    headers: auth(sales),
    payload: { deltaOnHand: 1 }
  });
  assert(stockDenied.statusCode === 403, "sales cannot adjust stock", state);

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
