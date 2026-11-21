import { http, HttpResponse } from "msw";
import type { EnquiryItem, SurveyItem } from "../../features/enquiries/types";
import type { QuoteItem, QuoteLineItem } from "../../features/quotes/types";
import { packageFixture, productFixture } from "../fixtures/catalog.fixture";
import { userFromRequest } from "../session-store";

const enquiries: EnquiryItem[] = [
  {
    id: "enq-web-1",
    customerId: "cus-web-1",
    source: "web_form",
    requestedKw: 3,
    systemKind: "on_grid",
    wantsSubsidy: true,
    monthlyBillInr: null,
    roofAreaSqft: null,
    gridSuitable: null,
    status: "new",
    assignedTo: null,
    notes: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    customerName: "Amit Verma",
    customerPhone: "9876543210",
    addressLine: "12 Model Town",
    city: "Jalandhar"
  }
];

const surveys: SurveyItem[] = [];
const quotes: QuoteItem[] = [];

function unauthorized() {
  return HttpResponse.json({ success: false, message: "Authentication required." }, { status: 401 });
}

function forbidden() {
  return HttpResponse.json({ success: false, message: "You do not have access to this action." }, { status: 403 });
}

function staffOk(request: Request, roles?: string[]) {
  const user = userFromRequest(request);
  if (!user) return unauthorized();
  if (roles && !roles.includes(user.role)) return forbidden();
  return null;
}

export const pipelineHandlers = [
  http.get("/api/staff", ({ request }) => {
    const denied = staffOk(request);
    if (denied) return denied;
    const role = new URL(request.url).searchParams.get("role");
    const people = [
      { id: "usr-tech-01", name: "Harpreet Singh", email: "tech@sunpower.in", role: "technician" },
      { id: "usr-sales-01", name: "Priya Shah", email: "sales@sunpower.in", role: "sales" }
    ].filter((item) => !role || item.role === role);
    return HttpResponse.json({ success: true, data: people });
  }),

  http.get("/api/enquiries", ({ request }) => {
    const denied = staffOk(request);
    if (denied) return denied;
    const status = new URL(request.url).searchParams.get("status");
    return HttpResponse.json({ success: true, data: enquiries.filter((item) => !status || item.status === status) });
  }),

  http.get("/api/enquiries/:id/surveys", ({ request, params }) => {
    const denied = staffOk(request);
    if (denied) return denied;
    return HttpResponse.json({ success: true, data: surveys.filter((item) => item.enquiryId === params.id) });
  }),

  http.get("/api/enquiries/:id", ({ request, params }) => {
    const denied = staffOk(request);
    if (denied) return denied;
    const found = enquiries.find((item) => item.id === params.id);
    if (!found) return HttpResponse.json({ success: false, message: "Enquiry not found." }, { status: 404 });
    return HttpResponse.json({ success: true, data: found });
  }),

  http.patch("/api/enquiries/:id", async ({ request, params }) => {
    const denied = staffOk(request, ["sales", "admin"]);
    if (denied) return denied;
    const found = enquiries.find((item) => item.id === params.id);
    if (!found) return HttpResponse.json({ success: false, message: "Enquiry not found." }, { status: 404 });
    const body = (await request.json()) as Partial<EnquiryItem>;
    Object.assign(found, body, { updatedAt: new Date().toISOString() });
    return HttpResponse.json({ success: true, data: found });
  }),

  http.post("/api/enquiries/:id/surveys", async ({ request, params }) => {
    const denied = staffOk(request, ["sales", "technician", "admin"]);
    if (denied) return denied;
    const enquiry = enquiries.find((item) => item.id === params.id);
    if (!enquiry) return HttpResponse.json({ success: false, message: "Enquiry not found." }, { status: 404 });
    const body = (await request.json()) as { scheduledAt?: string; technicianId?: string };
    const survey: SurveyItem = {
      id: `sur-${Date.now().toString(36)}`,
      enquiryId: enquiry.id,
      technicianId: body.technicianId ?? null,
      scheduledAt: body.scheduledAt ?? null,
      completedAt: null,
      roofDirection: null,
      tiltDegrees: null,
      cableDistanceM: null,
      usableAreaSqft: null,
      shadowNotes: null,
      result: "pending",
      createdAt: new Date().toISOString()
    };
    surveys.unshift(survey);
    enquiry.status = "survey_scheduled";
    return HttpResponse.json({ success: true, data: survey }, { status: 201 });
  }),

  http.patch("/api/surveys/:id", async ({ request, params }) => {
    const denied = staffOk(request, ["technician", "admin"]);
    if (denied) return denied;
    const survey = surveys.find((item) => item.id === params.id);
    if (!survey) return HttpResponse.json({ success: false, message: "Survey not found." }, { status: 404 });
    const body = (await request.json()) as Partial<SurveyItem>;
    Object.assign(survey, body);
    if (survey.result === "approved") {
      const enquiry = enquiries.find((item) => item.id === survey.enquiryId);
      if (enquiry) enquiry.status = "survey_done";
    }
    return HttpResponse.json({ success: true, data: survey });
  }),

  http.get("/api/quotes", ({ request }) => {
    const denied = staffOk(request);
    if (denied) return denied;
    const status = new URL(request.url).searchParams.get("status");
    return HttpResponse.json({
      success: true,
      data: quotes.filter((item) => !status || item.status === status).map(({ lines: _lines, ...rest }) => rest)
    });
  }),

  http.get("/api/quotes/:id", ({ request, params }) => {
    const denied = staffOk(request);
    if (denied) return denied;
    const found = quotes.find((item) => item.id === params.id);
    if (!found) return HttpResponse.json({ success: false, message: "Quote not found." }, { status: 404 });
    return HttpResponse.json({ success: true, data: found });
  }),

  http.post("/api/quotes", async ({ request }) => {
    const denied = staffOk(request, ["sales", "admin"]);
    if (denied) return denied;
    const body = (await request.json()) as { enquiryId: string; packageId: string };
    const enquiry = enquiries.find((item) => item.id === body.enquiryId);
    const pkg = packageFixture.find((item) => item.id === body.packageId);
    if (!enquiry || !pkg) return HttpResponse.json({ success: false, message: "Enquiry or package not found." }, { status: 404 });
    if (!surveys.some((item) => item.enquiryId === enquiry.id && item.result === "approved")) {
      return HttpResponse.json({ success: false, message: "A survey must be approved before a quote." }, { status: 400 });
    }
    const id = `quo-${Date.now().toString(36)}`;
    const lines: QuoteLineItem[] = (pkg.items ?? []).map((item) => {
      const product = productFixture.find((row) => row.id === item.productId);
      const unit = product?.unitPriceInr ?? 0;
      return {
        id: `ql-${item.id}`,
        quoteId: id,
        productId: item.productId,
        description: product?.name ?? item.productId,
        qty: item.qty,
        unitPriceInr: unit,
        lineTotalInr: unit * item.qty
      };
    });
    const subtotal = lines.reduce((sum, line) => sum + line.lineTotalInr, 0);
    const quote: QuoteItem = {
      id,
      enquiryId: enquiry.id,
      customerId: enquiry.customerId,
      packageId: pkg.id,
      status: "draft",
      subtotalInr: subtotal,
      discountInr: 0,
      totalInr: subtotal,
      validUntil: null,
      createdBy: "usr-sales-01",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      customerName: enquiry.customerName,
      packageCode: pkg.code,
      lines
    };
    quotes.unshift(quote);
    enquiry.status = "quoted";
    return HttpResponse.json({ success: true, data: quote }, { status: 201 });
  }),

  http.post("/api/quotes/:id/send", ({ request, params }) => {
    const denied = staffOk(request, ["sales", "admin"]);
    if (denied) return denied;
    const quote = quotes.find((item) => item.id === params.id);
    if (!quote) return HttpResponse.json({ success: false, message: "Quote not found." }, { status: 404 });
    quote.status = "sent";
    return HttpResponse.json({ success: true, data: quote, message: "Quote sent." });
  }),

  http.post("/api/quotes/:id/accept", ({ request, params }) => {
    const denied = staffOk(request, ["sales", "admin"]);
    if (denied) return denied;
    const quote = quotes.find((item) => item.id === params.id);
    if (!quote) return HttpResponse.json({ success: false, message: "Quote not found." }, { status: 404 });
    quote.status = "accepted";
    const enquiry = enquiries.find((item) => item.id === quote.enquiryId);
    if (enquiry) enquiry.status = "won";
    return HttpResponse.json({ success: true, data: quote, message: "Quote accepted." });
  }),

  http.post("/api/quotes/:id/reject", ({ request, params }) => {
    const denied = staffOk(request, ["sales", "admin"]);
    if (denied) return denied;
    const quote = quotes.find((item) => item.id === params.id);
    if (!quote) return HttpResponse.json({ success: false, message: "Quote not found." }, { status: 404 });
    quote.status = "rejected";
    const enquiry = enquiries.find((item) => item.id === quote.enquiryId);
    if (enquiry) enquiry.status = "lost";
    return HttpResponse.json({ success: true, data: quote, message: "Quote rejected." });
  })
];
