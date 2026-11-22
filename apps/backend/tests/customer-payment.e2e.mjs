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

async function runTests() {
  const state = { passed: 0, failed: 0 };
  await migrate();
  await runDatabaseSeed();
  const app = await buildApp({ logger: false });
  await app.ready();
  const suffix = Date.now().toString(36);
  const quoteId = `quo-cus-${suffix}`;
  const orderId = `ord-cus-${suffix}`;
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
    siteAddress: "Model Town, Jalandhar",
    totalInr: 100000
  });

  const otp = await app.inject({
    method: "POST",
    url: "/api/customer-auth/sign-in/otp",
    payload: { phone: 9876543210 }
  });
  const verified = await app.inject({
    method: "POST",
    url: "/api/customer-auth/sign-in/verify",
    payload: { phone: 9876543210, code: otp.json().devCode }
  });
  const token = verified.json().data?.token;
  const auth = { authorization: `Bearer ${token}` };

  console.log("\nCustomer UPI payment on an awaiting order");
  const missing = await app.inject({
    method: "POST",
    url: `/api/customer/orders/${orderId}/payments`,
    payload: { amountInr: 30000, kind: "advance", reference: "UTR123456" }
  });
  assert(missing.statusCode === 401, "missing token is 401", state);

  const staffLogin = await app.inject({
    method: "POST",
    url: "/api/auth/login",
    payload: { email: "sales@sunpower.in", password: DEV_PASSWORD }
  });
  const staffPay = await app.inject({
    method: "POST",
    url: `/api/customer/orders/${orderId}/payments`,
    headers: { authorization: `Bearer ${staffLogin.json().data.token}` },
    payload: { amountInr: 30000, kind: "advance", reference: "UTR123456" }
  });
  assert(staffPay.statusCode === 403, "staff token cannot use the customer payment route", state);

  const shortRef = await app.inject({
    method: "POST",
    url: `/api/customer/orders/${orderId}/payments`,
    headers: auth,
    payload: { amountInr: 30000, kind: "advance", reference: "12" }
  });
  assert(shortRef.statusCode === 400, "short UTR is 400", state);

  const paid = await app.inject({
    method: "POST",
    url: `/api/customer/orders/${orderId}/payments`,
    headers: auth,
    payload: { amountInr: 30000, kind: "advance", reference: `UTR${suffix}` }
  });
  assert(paid.statusCode === 201 && paid.json().data.method === "upi", "customer payment is stored as UPI", state);

  const jobs = await app.inject({ method: "GET", url: "/api/customer/orders", headers: auth });
  const job = jobs.json().data.find((row) => row.id === orderId);
  assert(job?.status === "paid" && job?.paidInr === 30000, "30 percent moves the order to paid", state);

  const foreign = await app.inject({
    method: "POST",
    url: "/api/customer/orders/ord-does-not-exist/payments",
    headers: auth,
    payload: { amountInr: 1000, kind: "advance", reference: "UTR999999" }
  });
  assert(foreign.statusCode === 404, "unknown order is 404", state);

  const overpay = await app.inject({
    method: "POST",
    url: `/api/customer/orders/${orderId}/payments`,
    headers: auth,
    payload: { amountInr: 70001, kind: "balance", reference: "UTR70001X" }
  });
  assert(overpay.statusCode === 422, "customer cannot pay more than the balance", state);

  const adminSignup = await app.inject({
    method: "POST",
    url: "/api/auth/signup",
    payload: {
      fullName: "Bad Admin",
      email: `bad-admin-${suffix}@example.com`,
      companyName: "Hack",
      role: "admin",
      password: "password1",
      agreeToTerms: true
    }
  });
  assert(adminSignup.statusCode === 403, "public signup is closed", state);

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
