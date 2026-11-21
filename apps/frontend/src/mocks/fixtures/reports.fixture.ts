import type { JobMarginItem, ServiceTicketItem } from "../../features/reports/types";

export const jobMarginFixtures: JobMarginItem[] = [
  {
    orderId: "ord-01",
    customerName: "Amit Verma",
    revenueInr: 185000,
    cogsEstimateInr: 120000,
    grossMarginInr: 65000,
    status: "completed",
    completedAt: new Date().toISOString()
  }
];

export const serviceTicketFixtures: ServiceTicketItem[] = [];
