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
    customerPhone: 9876543210,
    addressLine: "12 Model Town",
    city: "Jalandhar"
  }
];

const surveys: SurveyItem[] = [];
const quotes: QuoteItem[] = [];
const otpByPhone = new Map<number, string>();

type MockCustomerOrder = {
  id: string;
  customerId: string;
  status: string;
  systemKw: number;
  systemKind: string;
  siteAddress: string;
  totalInr: number;
  paidInr: number;
  balanceInr: number;
  payments: { id: string; amountInr: number; kind: string; method: string | null; paidAt: string; reference: string | null }[];
  dispatches: { id: string; status: string; dispatchedAt: string | null; deliveredAt: string | null; vehicleNotes: string | null }[];
  serials: {
    id: string;
    serialNumber: string;
    productName: string;
    status: string;
    deliveredAt: string | null;
    warrantyEndsAt: string | null;
    underWarranty: boolean | null;
  }[];
};

const customerTickets: {
  id: string;
  orderId: string | null;
  serialUnitId: string | null;
  faultCode: string | null;
  description: string;
  underWarranty: boolean | null;
  billableInr: number;
  status: string;
  serialNumber: string | null;
  productName: string | null;
  createdAt: string;
}[] = [];

const customerOrders: MockCustomerOrder[] = [
  {
    id: "ord-01",
    customerId: "cus-01",
    status: "completed",
    systemKw: 3,
    systemKind: "on_grid",
    siteAddress: "12 Model Town, Jalandhar",
    totalInr: 185000,
    paidInr: 185000,
    balanceInr: 0,
    payments: [
      {
        id: "pay-01",
        amountInr: 92500,
        kind: "advance",
        method: "upi",
        paidAt: "2026-03-01T00:00:00.000Z",
        reference: "UTR-DEMO-001"
      }
    ],
    dispatches: [
      {
        id: "dsp-01",
        status: "delivered",
        dispatchedAt: null,
        deliveredAt: "2026-03-08T04:30:00.000Z",
        vehicleNotes: "Tata Ace"
      }
    ],
    serials: [
      {
        id: "ser-inv-01",
        serialNumber: "INV-3K-88421",
        productName: "3kW On-Grid Inverter",
        status: "installed",
        deliveredAt: "2026-03-08T04:30:00.000Z",
        warrantyEndsAt: "2028-03-08T04:30:00.000Z",
        underWarranty: true
      }
    ]
  }
];

function orderFromAcceptedQuote(quote: QuoteItem, enquiry: EnquiryItem): MockCustomerOrder {
  return {
    id: `ord-mock-${quote.id}`,
    customerId: quote.customerId,
    status: "awaiting_payment",
    systemKw: enquiry.requestedKw,
    systemKind: enquiry.systemKind ?? "on_grid",
    siteAddress: [enquiry.addressLine, enquiry.city].filter(Boolean).join(", "),
    totalInr: quote.totalInr,
    paidInr: 0,
    balanceInr: quote.totalInr,
    payments: [],
    dispatches: [],
    serials: []
  };
}

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
    if (body.scheduledAt) {
      const day = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
      });
      if (day.format(new Date(body.scheduledAt)) < day.format(new Date())) {
        return HttpResponse.json(
          { success: false, message: "Survey can only be scheduled from today onwards." },
          { status: 400 }
        );
      }
    }
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
    return HttpResponse.json({
      success: true,
      data: { ...quote, customerPath: `/my/quotes/${quote.id}` },
      message: "Quote sent."
    });
  }),

  http.post("/api/quotes/:id/accept", ({ request, params }) => {
    const denied = staffOk(request, ["sales", "admin"]);
    if (denied) return denied;
    const quote = quotes.find((item) => item.id === params.id);
    if (!quote) return HttpResponse.json({ success: false, message: "Quote not found." }, { status: 404 });
    if (
      enquiries.find((item) => item.id === quote.enquiryId)?.status === "won" ||
      quotes.some((q) => q.enquiryId === quote.enquiryId && q.status === "accepted") ||
      customerOrders.some((row) => row.id === `ord-mock-${quote.id}`)
    ) {
      return HttpResponse.json({ success: false, message: "This enquiry already has an order." }, { status: 409 });
    }
    quote.status = "accepted";
    const enquiry = enquiries.find((item) => item.id === quote.enquiryId);
    if (enquiry) {
      enquiry.status = "won";
      customerOrders.unshift(orderFromAcceptedQuote(quote, enquiry));
    }
    for (const other of quotes) {
      if (other.enquiryId === quote.enquiryId && other.id !== quote.id && (other.status === "draft" || other.status === "sent")) {
        other.status = "rejected";
      }
    }
    return HttpResponse.json({ success: true, data: quote, message: "Quote accepted." });
  }),

  http.post("/api/customer-auth/sign-in/otp", async ({ request }) => {
    const body = (await request.json()) as { phone: number };
    if (Number(body.phone) !== 9876543210) {
      return HttpResponse.json({ success: false, message: "Submit an inquiry before signing in." }, { status: 400 });
    }
    return HttpResponse.json({ success: true, devCode: "123456", message: "Code sent." });
  }),

  http.post("/api/customer-auth/sign-in/verify", async ({ request }) => {
    const body = (await request.json()) as { phone: number; code: string };
    if (Number(body.phone) !== 9876543210 || body.code !== "123456") {
      return HttpResponse.json({ success: false, message: "That code is not correct." }, { status: 400 });
    }
    return HttpResponse.json({ success: true, data: { token: "customer.cus-01", customerId: "cus-01" } });
  }),

  http.get("/api/customer/orders", ({ request }) => {
    const token = request.headers.get("authorization") ?? "";
    if (!token.startsWith("Bearer customer.")) {
      return HttpResponse.json({ success: false, message: "Authentication required." }, { status: 401 });
    }
    const customerId = token.replace(/^Bearer customer\./, "");
    const data = customerOrders
      .filter((row) => row.customerId === customerId)
      .map(({ customerId: _customerId, ...rest }) => rest);
    return HttpResponse.json({ success: true, data });
  }),

  http.post("/api/customer/orders/:id/checkout", async ({ request, params }) => {
    const token = request.headers.get("authorization") ?? "";
    if (!token.startsWith("Bearer customer.")) {
      return HttpResponse.json({ success: false, message: "Authentication required." }, { status: 401 });
    }
    const customerId = token.replace(/^Bearer customer\./, "");
    const order = customerOrders.find((row) => row.id === params.id && row.customerId === customerId);
    if (!order) return HttpResponse.json({ success: false, message: "Order not found." }, { status: 404 });
    const body = (await request.json()) as { amountInr: number };
    const sessionId = `cs_test_mock_${params.id}_${Date.now()}`;
    const url = `/my/jobs?paid=1&order_id=${encodeURIComponent(String(params.id))}&session_id=${encodeURIComponent(sessionId)}&mock_amount=${body.amountInr}`;
    return HttpResponse.json({ success: true, data: { sessionId, url }, message: "Stripe checkout ready." });
  }),

  http.post("/api/customer/orders/:id/payments/confirm", async ({ request, params }) => {
    const token = request.headers.get("authorization") ?? "";
    if (!token.startsWith("Bearer customer.")) {
      return HttpResponse.json({ success: false, message: "Authentication required." }, { status: 401 });
    }
    const customerId = token.replace(/^Bearer customer\./, "");
    const order = customerOrders.find((row) => row.id === params.id && row.customerId === customerId);
    if (!order) return HttpResponse.json({ success: false, message: "Order not found." }, { status: 404 });
    const body = (await request.json()) as { sessionId: string };
    const already = order.payments.find((row) => row.reference === body.sessionId);
    if (already) {
      return HttpResponse.json({ success: true, data: { id: already.id }, message: "Payment recorded." }, { status: 201 });
    }
    const amountInr = Math.min(Math.max(order.balanceInr * 0.3, 1), order.balanceInr);
    const kind = amountInr >= order.balanceInr ? "full" : order.paidInr > 0 ? "balance" : "advance";
    const payment = {
      id: `pay-mock-${Date.now()}`,
      amountInr,
      kind,
      method: "stripe",
      paidAt: new Date().toISOString(),
      reference: body.sessionId
    };
    order.payments.push(payment);
    order.paidInr += amountInr;
    order.balanceInr = Math.max(order.totalInr - order.paidInr, 0);
    if (order.status === "awaiting_payment" && order.paidInr * 10 >= order.totalInr * 3) {
      order.status = "paid";
    }
    return HttpResponse.json({ success: true, data: { id: payment.id }, message: "Payment recorded." }, { status: 201 });
  }),

  http.get("/api/customer/quotes", ({ request }) => {
    const token = request.headers.get("authorization") ?? "";
    if (!token.startsWith("Bearer customer.")) {
      return HttpResponse.json({ success: false, message: "Authentication required." }, { status: 401 });
    }
    const customerId = token.replace(/^Bearer customer\./, "");
    const data = quotes.filter(
      (item) => item.customerId === customerId && ["sent", "accepted", "rejected", "expired"].includes(item.status)
    );
    return HttpResponse.json({ success: true, data });
  }),

  http.get("/api/customer/service-tickets", ({ request }) => {
    const token = request.headers.get("authorization") ?? "";
    if (!token.startsWith("Bearer customer.")) {
      return HttpResponse.json({ success: false, message: "Authentication required." }, { status: 401 });
    }
    return HttpResponse.json({ success: true, data: customerTickets });
  }),

  http.post("/api/customer/service-tickets", async ({ request }) => {
    const token = request.headers.get("authorization") ?? "";
    if (!token.startsWith("Bearer customer.")) {
      return HttpResponse.json({ success: false, message: "Authentication required." }, { status: 401 });
    }
    const body = (await request.json()) as {
      serialUnitId: string;
      faultCode?: string;
      description: string;
      billableInr?: number;
    };
    const serial = customerOrders.flatMap((order) => order.serials).find((item) => item.id === body.serialUnitId);
    if (!serial || !serial.deliveredAt) {
      return HttpResponse.json({ success: false, message: "Serial not found on your orders." }, { status: 404 });
    }
    const ticket = {
      id: `tkt-mock-${Date.now()}`,
      orderId: customerOrders.find((order) => order.serials.some((item) => item.id === body.serialUnitId))?.id ?? null,
      serialUnitId: body.serialUnitId,
      faultCode: body.faultCode ?? null,
      description: body.description,
      underWarranty: serial.underWarranty,
      billableInr: serial.underWarranty ? 0 : (body.billableInr ?? 0),
      status: "open",
      serialNumber: serial.serialNumber,
      productName: serial.productName,
      createdAt: new Date().toISOString()
    };
    customerTickets.unshift(ticket);
    return HttpResponse.json({ success: true, data: ticket, message: "Service request opened." }, { status: 201 });
  }),

  http.post("/api/customer/support/ask", async ({ request }) => {
    const token = request.headers.get("authorization") ?? "";
    if (!token.startsWith("Bearer customer.")) {
      return HttpResponse.json({ success: false, message: "Authentication required." }, { status: 401 });
    }
    const customerId = token.replace(/^Bearer customer\./, "");
    const body = (await request.json()) as { question: string };
    const order = customerOrders.find((row) => row.customerId === customerId);
    const q = (body.question ?? "").toLowerCase();
    if (/\b(pay|payment|balance)\b/.test(q) && order) {
      return HttpResponse.json({
        success: true,
        data: {
          topic: "payment",
          answer: `Order ${order.id} balance is ₹${order.balanceInr.toLocaleString("en-IN")}.`
        }
      });
    }
    return HttpResponse.json({
      success: true,
      data: {
        topic: "general",
        answer: "Ask about payment, dispatch, warranty, quote, installation, or service."
      }
    });
  }),

  http.post("/api/customer-auth/otp", async ({ request }) => {
    const body = (await request.json()) as { phone: number; quoteId: string };
    const phone = Number(body.phone);
    const quote = quotes.find((item) => item.id === body.quoteId);
    const enquiry = enquiries.find((item) => item.id === quote?.enquiryId);
    if (!quote || !enquiry || enquiry.customerPhone !== phone) {
      return HttpResponse.json({ success: false, message: "Use the mobile number from your inquiry." }, { status: 400 });
    }
    if (!["sent", "accepted", "rejected"].includes(quote.status)) {
      return HttpResponse.json({ success: false, message: "This quote is not ready to view." }, { status: 400 });
    }
    otpByPhone.set(phone, "123456");
    return HttpResponse.json({ success: true, devCode: "123456", message: "Code sent." });
  }),

  http.post("/api/customer-auth/verify", async ({ request }) => {
    const body = (await request.json()) as { phone: number; quoteId: string; code: string };
    const phone = Number(body.phone);
    if (otpByPhone.get(phone) !== body.code) {
      return HttpResponse.json({ success: false, message: "That code is not correct." }, { status: 400 });
    }
    const quote = quotes.find((item) => item.id === body.quoteId);
    return HttpResponse.json({
      success: true,
      data: { token: `customer.${quote?.customerId ?? "cus"}`, customerId: quote?.customerId ?? "" }
    });
  }),

  http.get("/api/customer/quotes/:id", ({ request, params }) => {
    const token = request.headers.get("authorization") ?? "";
    if (!token.startsWith("Bearer customer.")) return HttpResponse.json({ success: false, message: "Authentication required." }, { status: 401 });
    const quote = quotes.find((item) => item.id === params.id);
    if (!quote || !token.endsWith(quote.customerId)) {
      return HttpResponse.json({ success: false, message: "This quote is not yours." }, { status: 403 });
    }
    return HttpResponse.json({ success: true, data: quote });
  }),

  http.post("/api/customer/quotes/:id/accept", ({ request, params }) => {
    const token = request.headers.get("authorization") ?? "";
    const quote = quotes.find((item) => item.id === params.id);
    if (!quote || !token.endsWith(quote.customerId)) {
      return HttpResponse.json({ success: false, message: "This quote is not yours." }, { status: 403 });
    }
    if (quote.status !== "sent") return HttpResponse.json({ success: false, message: "This quote is already decided." }, { status: 400 });
    if (customerOrders.some((row) => row.id === `ord-mock-${quote.id}`)) {
      return HttpResponse.json({ success: false, message: "This enquiry already has an order." }, { status: 409 });
    }
    quote.status = "accepted";
    const enquiry = enquiries.find((item) => item.id === quote.enquiryId);
    if (enquiry) {
      enquiry.status = "won";
      customerOrders.unshift(orderFromAcceptedQuote(quote, enquiry));
    }
    return HttpResponse.json({ success: true, data: quote, message: "Quote accepted." });
  }),

  http.post("/api/customer/quotes/:id/reject", ({ request, params }) => {
    const token = request.headers.get("authorization") ?? "";
    const quote = quotes.find((item) => item.id === params.id);
    if (!quote || !token.endsWith(quote.customerId)) {
      return HttpResponse.json({ success: false, message: "This quote is not yours." }, { status: 403 });
    }
    if (quote.status !== "sent") return HttpResponse.json({ success: false, message: "This quote is already decided." }, { status: 400 });
    quote.status = "rejected";
    const enquiry = enquiries.find((item) => item.id === quote.enquiryId);
    if (enquiry) enquiry.status = "lost";
    return HttpResponse.json({ success: true, data: quote, message: "Quote rejected." });
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
