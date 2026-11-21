import { buildApp } from "../src/app.ts";
import { migrate } from "../src/db/migrate.ts";
import { closePool } from "../src/db/pool.ts";
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

async function runTests() {
  const state = { passed: 0, failed: 0 };
  await migrate();
  await runDatabaseSeed();
  const app = await buildApp({ logger: false });
  await app.ready();

  console.log("\nUS-1: unknown phone cannot sign in");
  const unknown = await app.inject({
    method: "POST",
    url: "/api/customer-auth/sign-in/otp",
    payload: { phone: "9000000001" }
  });
  assert(unknown.statusCode === 400, "unknown phone is 400", state);
  assert(unknown.json().message === "Submit an inquiry before signing in.", "message tells them to inquire", state);

  console.log("\nUS-1: Amit requests a development code");
  const otp = await app.inject({
    method: "POST",
    url: "/api/customer-auth/sign-in/otp",
    payload: { phone: "9876543210" }
  });
  const otpBody = otp.json();
  assert(otp.statusCode === 200, "known phone is 200", state);
  assert(typeof otpBody.devCode === "string" && otpBody.devCode.length === 6, "dev code is 6 digits", state);

  const verified = await app.inject({
    method: "POST",
    url: "/api/customer-auth/sign-in/verify",
    payload: { phone: "9876543210", code: otpBody.devCode }
  });
  const token = verified.json().data?.token;
  assert(verified.statusCode === 200 && Boolean(token), "verify returns a token", state);

  console.log("\nUS-2 and US-3: Amit sees payment, dispatch, and serial warranty");
  const orders = await app.inject({
    method: "GET",
    url: "/api/customer/orders",
    headers: { authorization: `Bearer ${token}` }
  });
  const job = orders.json().data?.find((row) => row.id === "ord-01");
  assert(orders.statusCode === 200 && job, "ord-01 is in his jobs", state);
  assert(job?.paidInr === 185000 && job?.balanceInr === 0, "payments sum to the order total", state);
  assert(job?.dispatches?.some((row) => row.status === "delivered"), "dispatch is delivered", state);
  assert(job?.serials?.some((row) => row.serialNumber === "INV-3K-88421" && row.underWarranty === true), "inverter serial is under warranty", state);

  const staff = await app.inject({
    method: "POST",
    url: "/api/auth/login",
    payload: { email: "sales@sunpower.in", password: DEV_PASSWORD }
  });
  const staffOrders = await app.inject({
    method: "GET",
    url: "/api/customer/orders",
    headers: { authorization: `Bearer ${staff.json().data.token}` }
  });
  assert(staffOrders.statusCode === 403, "staff token cannot open the customer job list", state);

  const locked = await app.inject({ method: "GET", url: "/api/customer/orders" });
  assert(locked.statusCode === 401, "missing token is 401", state);

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
