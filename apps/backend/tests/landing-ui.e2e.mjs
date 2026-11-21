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

async function runTests() {
  const state = { passed: 0, failed: 0 };
  await migrate();
  await runDatabaseSeed();
  const app = await buildApp({ logger: false });
  await app.ready();

  console.log("\nUS-2: public packages list");
  const packages = await app.inject({ method: "GET", url: "/api/public/packages" });
  const packageRows = packages.json().data ?? [];
  assert(packages.statusCode === 200, "packages are 200", state);
  assert(Array.isArray(packageRows) && packageRows.length > 0, "at least one active package", state);
  assert(packageRows.every((row) => row.isActive !== false), "listed packages are active", state);

  console.log("\nUS-3: phased public enquiry stores bill, roof area, and notes");
  const phone = `98${String(Date.now()).slice(-8)}`;
  const created = await app.inject({
    method: "POST",
    url: "/api/public/enquiries",
    payload: {
      name: "Priya Sharma",
      phone,
      addressLine: "12 Model Town",
      city: "Jalandhar",
      pincode: "144001",
      customerType: "residential",
      requestedKw: 3,
      systemKind: "on_grid",
      wantsSubsidy: true,
      monthlyBillInr: 2000,
      roofAreaSqft: 300,
      gridSuitable: true,
      notes: "Roof ownership: Yes\nRoof type: Concrete roof\nTerrace size: 200 – 400 sqft / Medium\nPower cuts: No power cut\nMonthly bill band: ₹1,500 – ₹2,500"
    }
  });
  const body = created.json();
  assert(created.statusCode === 201, "enquiry create is 201", state);
  assert(Boolean(body.data?.enquiry?.id), "enquiry id returned", state);
  assert(body.data?.enquiry?.monthlyBillInr === 2000, "monthly bill stored", state);
  assert(body.data?.enquiry?.roofAreaSqft === 300, "roof area stored", state);
  assert(body.data?.enquiry?.gridSuitable === true, "grid suitable stored", state);
  assert(String(body.data?.enquiry?.notes ?? "").includes("Roof type: Concrete roof"), "phase notes stored", state);

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
