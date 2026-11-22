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

async function login(app, email) {
  const response = await app.inject({
    method: "POST",
    url: "/api/auth/login",
    payload: { email, password: "hackathon" }
  });
  return response.json().data?.token;
}

async function runTests() {
  const state = { passed: 0, failed: 0 };
  await migrate();
  await runDatabaseSeed();
  const app = await buildApp({ logger: false });
  await app.ready();

  const adminToken = await login(app, "admin@sunpower.in");
  const salesToken = await login(app, "sales@sunpower.in");

  console.log("\nAuth matrix: public form");
  const publicForm = await app.inject({ method: "GET", url: "/api/public/inquiry-form" });
  const publicQuestions = publicForm.json().data?.questions ?? [];
  assert(publicForm.statusCode === 200, "public form is 200", state);
  assert(publicQuestions.length >= 5, "seeded questions are active", state);
  assert(
    publicQuestions.some((q) => q.key === "ownership" && q.label.includes("own the roof")),
    "ownership question seeded",
    state
  );

  console.log("\nAuth matrix: admin vs sales");
  const adminList = await app.inject({
    method: "GET",
    url: "/api/admin/inquiry-questions",
    headers: { authorization: `Bearer ${adminToken}` }
  });
  assert(adminList.statusCode === 200, "admin can list questions", state);

  const salesList = await app.inject({
    method: "GET",
    url: "/api/admin/inquiry-questions",
    headers: { authorization: `Bearer ${salesToken}` }
  });
  assert(salesList.statusCode === 403, "sales cannot list questions", state);

  const anonList = await app.inject({ method: "GET", url: "/api/admin/inquiry-questions" });
  assert(anonList.statusCode === 401, "anonymous cannot list questions", state);

  console.log("\nUS-1: admin creates, updates, and removes a question");
  const suffix = Date.now().toString(36);
  const created = await app.inject({
    method: "POST",
    url: "/api/admin/inquiry-questions",
    headers: { authorization: `Bearer ${adminToken}` },
    payload: {
      key: `extra_note_${suffix}`,
      label: "Any shading on the roof?",
      fieldType: "text",
      sortOrder: 200,
      isRequired: false,
      isActive: true
    }
  });
  const createdBody = created.json();
  assert(created.statusCode === 201, "create question is 201", state);
  assert(Boolean(createdBody.data?.id), "created id returned", state);

  const patched = await app.inject({
    method: "PATCH",
    url: `/api/admin/inquiry-questions/${createdBody.data.id}`,
    headers: { authorization: `Bearer ${adminToken}` },
    payload: { label: "Any heavy shading on the roof?" }
  });
  assert(patched.statusCode === 200, "patch question is 200", state);
  assert(patched.json().data?.label === "Any heavy shading on the roof?", "label updated", state);

  const removed = await app.inject({
    method: "DELETE",
    url: `/api/admin/inquiry-questions/${createdBody.data.id}`,
    headers: { authorization: `Bearer ${adminToken}` }
  });
  assert(removed.statusCode === 200, "delete unused question is 200", state);
  assert(removed.json().data?.deleted === "hard", "unused question hard-deleted", state);

  console.log("\nValidation: choice without options");
  const bad = await app.inject({
    method: "POST",
    url: "/api/admin/inquiry-questions",
    headers: { authorization: `Bearer ${adminToken}` },
    payload: {
      key: `bad_choice_${suffix}`,
      label: "Bad choice",
      fieldType: "single_choice",
      sortOrder: 210,
      options: []
    }
  });
  assert(bad.statusCode === 400, "choice without options is 400", state);

  console.log("\nUS-2: public submit with dynamic answers");
  const ownership = publicQuestions.find((q) => q.key === "ownership");
  const roofType = publicQuestions.find((q) => q.key === "roof_type");
  const terrace = publicQuestions.find((q) => q.key === "terrace");
  const powerCuts = publicQuestions.find((q) => q.key === "power_cuts");
  const bill = publicQuestions.find((q) => q.key === "monthly_bill");
  const requestedKw = publicQuestions.find((q) => q.key === "requested_kw");
  const systemKind = publicQuestions.find((q) => q.key === "system_kind");
  const subsidy = publicQuestions.find((q) => q.key === "wants_subsidy");

  const phone = `97${String(Date.now()).slice(-8)}`;
  const answers = [
    { questionId: ownership.id, value: "yes" },
    { questionId: roofType.id, value: "concrete" },
    { questionId: terrace.id, value: "medium" },
    { questionId: powerCuts.id, value: "none" },
    { questionId: bill.id, value: "1500_2500" },
    { questionId: requestedKw.id, value: 3 },
    { questionId: systemKind.id, value: "on_grid" },
    { questionId: subsidy.id, value: true }
  ];

  const enquiry = await app.inject({
    method: "POST",
    url: "/api/public/enquiries",
    payload: {
      name: "Harpreet Kaur",
      phone,
      addressLine: "22 Civil Lines",
      city: "Jalandhar",
      pincode: "144001",
      customerType: "residential",
      requestedKw: 3,
      answers
    }
  });
  const enquiryBody = enquiry.json();
  assert(enquiry.statusCode === 201, "enquiry with answers is 201", state);
  assert(enquiryBody.data?.enquiry?.monthlyBillInr === 2000, "bill mapped from option mapValue", state);
  assert(enquiryBody.data?.enquiry?.roofAreaSqft === 300, "terrace mapped to roof area", state);
  assert(enquiryBody.data?.enquiry?.gridSuitable === true, "ownership mapped to gridSuitable", state);
  assert(String(enquiryBody.data?.enquiry?.notes ?? "").includes("Concrete roof"), "notes include roof type", state);

  console.log("\nUS-2 negative: missing required answer");
  const missing = await app.inject({
    method: "POST",
    url: "/api/public/enquiries",
    payload: {
      name: "Missing Answers",
      phone: `96${String(Date.now()).slice(-8)}`,
      addressLine: "1 Test Road",
      city: "Ludhiana",
      requestedKw: 3,
      answers: [{ questionId: ownership.id, value: "yes" }]
    }
  });
  assert(missing.statusCode === 400, "missing required answers is 400", state);

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
