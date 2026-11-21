import { http, HttpResponse } from "msw";
import { jobMarginFixtures, serviceTicketFixtures } from "../fixtures/reports.fixture";
import { userFromRequest } from "../session-store";

export const reportsHandlers = [
  http.get("/api/reports/job-margins", ({ request }) => {
    const user = userFromRequest(request);
    if (!user) return HttpResponse.json({ success: false, message: "Authentication required." }, { status: 401 });
    if (user.role !== "admin") {
      return HttpResponse.json({ success: false, message: "You do not have access to this action." }, { status: 403 });
    }
    return HttpResponse.json({ success: true, data: jobMarginFixtures });
  }),

  http.get("/api/service-tickets", ({ request }) => {
    const user = userFromRequest(request);
    if (!user) return HttpResponse.json({ success: false, message: "Authentication required." }, { status: 401 });
    const url = new URL(request.url);
    const status = url.searchParams.get("status");
    const data = status ? serviceTicketFixtures.filter((row) => row.status === status) : serviceTicketFixtures;
    return HttpResponse.json({ success: true, data });
  })
];
