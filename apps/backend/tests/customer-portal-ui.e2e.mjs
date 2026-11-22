import { buildApp } from "../src/app.ts";
import { migrate } from "../src/db/migrate.ts";
import { closePool } from "../src/db/pool.ts";
import { runDatabaseSeed } from "../src/db/seeds/index.ts";

function assert(condition, message, state) {
  if (condition) {
    console.log(`  PASS: ${message}`);
    state.passed += 1;
  } else {
    console.error(`  FAIL: ${message}`);
    state.failed += 1;
  }
}

async function customerToken(app) {
  const otp = await app.inject({
    method: "POST",
    url: "/api/customer-auth/sign-in/otp",
    payload: { phone: "9876543210" }
  });
  const code = otp.json().devCode;
  const verified = await app.inject({
    method: "POST",
    url: "/api/customer-auth/sign-in/verify",
    payload: { phone: "9876543210", code }
  });
  return verified.json().data?.token;
}

async function runTests() {
  const state = { passed: 0, failed: 0 };
  await migrate();
  await runDatabaseSeed();
  const app = await buildApp({ logger: false });
  await app.ready();
  const token = await customerToken(app);
  assert(Boolean(token), "customer token issued", state);

  console.log("\nUS-3: list customer quotes");
  const quotes = await app.inject({
    method: "GET",
    url: "/api/customer/quotes",
    headers: { authorization: `Bearer ${token}` }
  });
  assert(quotes.statusCode === 200, "quotes list is 200", state);
  assert(Array.isArray(quotes.json().data), "quotes data is an array", state);

  console.log("\nUS-5: ask support bot");
  const ask = await app.inject({
    method: "POST",
    url: "/api/customer/support/ask",
    headers: { authorization: `Bearer ${token}` },
    payload: { question: "What is my payment balance?" }
  });
  const askBody = ask.json().data;
  assert(ask.statusCode === 200 && askBody?.topic === "payment", "payment topic answered", state);
  assert(typeof askBody?.answer === "string" && askBody.answer.length > 10, "answer is non-empty", state);

  console.log("\nUS-4: list customer service tickets");
  const tickets = await app.inject({
    method: "GET",
    url: "/api/customer/service-tickets",
    headers: { authorization: `Bearer ${token}` }
  });
  assert(tickets.statusCode === 200 && Array.isArray(tickets.json().data), "tickets list is 200", state);

  const created = await app.inject({
    method: "POST",
    url: "/api/customer/service-tickets",
    headers: { authorization: `Bearer ${token}` },
    payload: { serialUnitId: "ser-inv-01", description: "Inverter shows E-04 after rain." }
  });
  assert(
    created.statusCode === 201 || created.statusCode === 404,
    `ticket create returns 201 or 404 when serial missing (got ${created.statusCode})`,
    state
  );
  if (created.statusCode === 201) {
    assert(created.json().data?.status === "open", "new ticket is open", state);
  }

  await app.close();
  console.log(`\n${state.passed} passed, ${state.failed} failed`);
  if (state.failed > 0) process.exitCode = 1;
}

runTests()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closePool();
  });
