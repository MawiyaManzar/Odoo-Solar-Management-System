import { eq } from "drizzle-orm";
import { buildApp } from "../src/app.ts";
import { db } from "../src/db/client.ts";
import { migrate } from "../src/db/migrate.ts";
import { closePool } from "../src/db/pool.ts";
import { customers, enquiries, quotes, siteSurveys } from "../src/db/schema/index.ts";
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
  const res = await app.inject({
    method: "POST",
    url: "/api/auth/login",
    payload: { email, password: DEV_PASSWORD }
  });
  return res.json().data.token;
}

async function runTests() {
  const state = { passed: 0, failed: 0 };
  await migrate();
  await runDatabaseSeed();
  const app = await buildApp({ logger: false });
  await app.ready();
  const suffix = Date.now().toString(36);
  const sales = await login(app, "sales@sunpower.in");
  const tech = await login(app, "tech@sunpower.in");
  const auth = { authorization: `Bearer ${sales}` };
  const techAuth = { authorization: `Bearer ${tech}` };

  const customerId = `cus-edge-${suffix}`;
  const enquiryId = `enq-edge-${suffix}`;
  await db.insert(customers).values({
    id: customerId,
    name: "Edge Case Customer",
    phone: `98${suffix.slice(-8)}`,
    addressLine: "1 Test Road",
    city: "Jalandhar",
    pincode: "144001"
  });
  await db.insert(enquiries).values({
    id: enquiryId,
    customerId,
    source: "call",
    requestedKw: 3,
    systemKind: "on_grid",
    wantsSubsidy: false,
    status: "survey_scheduled",
    assignedTo: "usr-sales-01"
  });

  console.log("\nSurvey reject returns enquiry to qualifying");
  const surveyId = `svy-edge-${suffix}`;
  await db.insert(siteSurveys).values({
    id: surveyId,
    enquiryId,
    technicianId: "usr-tech-01",
    result: "pending"
  });
  const rejected = await app.inject({
    method: "PATCH",
    url: `/api/surveys/${surveyId}`,
    headers: techAuth,
    payload: { result: "rejected" }
  });
  assert(rejected.statusCode === 200, "survey reject succeeds", state);
  const afterReject = await app.inject({ method: "GET", url: `/api/enquiries/${enquiryId}`, headers: auth });
  assert(afterReject.json().data.status === "qualifying", "rejected survey moves enquiry to qualifying", state);

  console.log("\nSurvey create does not regress quoted enquiry");
  await db.update(enquiries).set({ status: "quoted" }).where(eq(enquiries.id, enquiryId));
  const surveyOnQuoted = await app.inject({
    method: "POST",
    url: `/api/enquiries/${enquiryId}/surveys`,
    headers: auth,
    payload: { technicianId: "usr-tech-01" }
  });
  assert(surveyOnQuoted.statusCode === 201, "survey can be added on quoted enquiry", state);
  const stillQuoted = await app.inject({ method: "GET", url: `/api/enquiries/${enquiryId}`, headers: auth });
  assert(stillQuoted.json().data.status === "quoted", "quoted enquiry status is unchanged", state);

  console.log("\nMark lost rejects open quotes");
  const draftId = `quo-edge-d-${suffix}`;
  const sentId = `quo-edge-s-${suffix}`;
  await db.insert(quotes).values([
    {
      id: draftId,
      enquiryId,
      customerId,
      packageId: "pkg-og3",
      status: "draft",
      subtotalInr: 100000,
      discountInr: 0,
      totalInr: 100000,
      createdBy: "usr-sales-01"
    },
    {
      id: sentId,
      enquiryId,
      customerId,
      packageId: "pkg-og3",
      status: "sent",
      subtotalInr: 100000,
      discountInr: 0,
      totalInr: 100000,
      createdBy: "usr-sales-01"
    }
  ]);
  const lost = await app.inject({
    method: "PATCH",
    url: `/api/enquiries/${enquiryId}`,
    headers: auth,
    payload: { status: "lost" }
  });
  assert(lost.statusCode === 200 && lost.json().data.status === "lost", "enquiry marked lost", state);
  const draft = await app.inject({ method: "GET", url: `/api/quotes/${draftId}`, headers: auth });
  const sent = await app.inject({ method: "GET", url: `/api/quotes/${sentId}`, headers: auth });
  assert(draft.json().data.status === "rejected", "draft quote rejected on lost", state);
  assert(sent.json().data.status === "rejected", "sent quote rejected on lost", state);

  console.log("\nSurvey cannot be booked in the past");
  const enquiry3 = `enq-edge3-${suffix}`;
  await db.insert(enquiries).values({
    id: enquiry3,
    customerId,
    source: "call",
    requestedKw: 3,
    systemKind: "on_grid",
    wantsSubsidy: false,
    status: "qualifying",
    assignedTo: "usr-sales-01"
  });
  const pastSurvey = await app.inject({
    method: "POST",
    url: `/api/enquiries/${enquiry3}/surveys`,
    headers: auth,
    payload: { technicianId: "usr-tech-01", scheduledAt: "2020-01-01T10:00:00.000Z" }
  });
  assert(pastSurvey.statusCode === 400, "past survey schedule is 400", state);

  console.log("\nExpired sent quote cannot be accepted");
  const enquiry2 = `enq-edge2-${suffix}`;
  const quoteExp = `quo-edge-exp-${suffix}`;
  await db.insert(enquiries).values({
    id: enquiry2,
    customerId,
    source: "call",
    requestedKw: 3,
    systemKind: "on_grid",
    wantsSubsidy: false,
    status: "quoted",
    assignedTo: "usr-sales-01"
  });
  await db.insert(quotes).values({
    id: quoteExp,
    enquiryId: enquiry2,
    customerId,
    packageId: "pkg-og3",
    status: "sent",
    subtotalInr: 100000,
    discountInr: 0,
    totalInr: 100000,
    validUntil: "2020-01-01",
    createdBy: "usr-sales-01"
  });
  const expiredGet = await app.inject({ method: "GET", url: `/api/quotes/${quoteExp}`, headers: auth });
  assert(expiredGet.json().data.status === "expired", "past validUntil becomes expired on read", state);
  const acceptExpired = await app.inject({
    method: "POST",
    url: `/api/quotes/${quoteExp}/accept`,
    headers: auth
  });
  assert(acceptExpired.statusCode === 400, "expired quote cannot be accepted", state);

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
