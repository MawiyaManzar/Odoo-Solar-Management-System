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

  console.log("\nUS-1: Public signup is closed");
  const closed = await app.inject({
    method: "POST",
    url: "/api/auth/signup",
    payload: {
      fullName: "Nope",
      email: `closed-${suffix}@example.com`,
      companyName: "SunPower",
      role: "sales",
      password: "Password123!",
      agreeToTerms: true
    }
  });
  assert(closed.statusCode === 403, "signup returns 403", state);

  console.log("\nUS-2: Admin creates staff");
  const email = `staff-${suffix}@sunpower.in`;
  const created = await app.inject({
    method: "POST",
    url: "/api/staff",
    headers: auth(admin),
    payload: {
      fullName: "Neha Kapoor",
      email,
      companyName: "SunPower Solutions",
      role: "sales",
      password: "Password123!"
    }
  });
  const body = created.json();
  assert(created.statusCode === 201, "create returns 201", state);
  assert(body.data?.email === email, "email matches", state);
  assert(body.data?.role === "sales", "role is sales", state);

  console.log("\nUS-3: New staff can log in");
  const staffLogin = await app.inject({
    method: "POST",
    url: "/api/auth/login",
    payload: { email, password: "Password123!" }
  });
  assert(staffLogin.statusCode === 200, "new staff can sign in", state);

  console.log("\nUS-4: Sales cannot create staff");
  const forbidden = await app.inject({
    method: "POST",
    url: "/api/staff",
    headers: auth(sales),
    payload: {
      fullName: "Blocked",
      email: `blocked-${suffix}@sunpower.in`,
      companyName: "SunPower Solutions",
      role: "technician",
      password: "Password123!"
    }
  });
  assert(forbidden.statusCode === 403, "sales create is 403", state);

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
