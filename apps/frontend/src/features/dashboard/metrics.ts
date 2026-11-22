import { countOpenTickets, isUnfinished } from "../reports/status";
import type { JobMarginItem } from "../reports/types";
import type { EnquiryItem } from "../enquiries/types";
import type { OrderItem } from "../orders/types";
import type { QuoteItem } from "../quotes/types";
import type { DashboardPeriod } from "./period";
import { isInPeriod } from "./period";

const ACTIVE_JOB_STATUSES = new Set(["packing", "dispatched", "installing"]);
const JOB_TABLE_CAP = 12;

export interface DirectorKpis {
  revenueInr: number;
  /** Lifetime sum — period filter not applied (no payments-by-date API). */
  paymentsCollectedInr: number;
  /** Lifetime sum — current balances. */
  outstandingInr: number;
  activeJobs: number;
  revenuePeriodApplied: boolean;
}

export interface PipelineCounts {
  enquiries: number;
  surveys: number;
  quotes: number;
  orders: number;
  completed: number;
}

export interface ProfitabilityTotals {
  revenueInr: number;
  estimatedCostInr: number;
  grossMarginInr: number;
  marginPct: number | null;
  periodApplied: boolean;
}

export interface AttentionItem {
  id: string;
  title: string;
  description: string;
  count: number;
  href: string;
  urgency: "danger" | "warning" | "neutral";
}

export interface JobProfitRow {
  orderId: string;
  customerName: string;
  systemKw: number | null;
  revenueInr: number;
  estimatedCostInr: number;
  grossMarginInr: number;
  status: JobMarginItem["status"];
}

function money(value: number): number {
  return Math.round(value * 100) / 100;
}

export function completedMarginsInPeriod(
  margins: JobMarginItem[],
  period: DashboardPeriod,
  now: Date = new Date()
): JobMarginItem[] {
  return margins.filter(
    (row) => row.status === "completed" && isInPeriod(row.completedAt, period, now)
  );
}

export function buildKpis(
  margins: JobMarginItem[],
  orders: OrderItem[],
  period: DashboardPeriod,
  now: Date = new Date()
): DirectorKpis {
  const completedInPeriod = completedMarginsInPeriod(margins, period, now);
  const revenueInr = money(completedInPeriod.reduce((sum, row) => sum + row.revenueInr, 0));
  const paymentsCollectedInr = money(orders.reduce((sum, row) => sum + row.paidInr, 0));
  const outstandingInr = money(orders.reduce((sum, row) => sum + Math.max(0, row.balanceInr), 0));
  const activeJobs = orders.filter((row) => ACTIVE_JOB_STATUSES.has(row.status)).length;
  return {
    revenueInr,
    paymentsCollectedInr,
    outstandingInr,
    activeJobs,
    revenuePeriodApplied: true
  };
}

export function buildPipeline(enquiries: EnquiryItem[], quotes: QuoteItem[], orders: OrderItem[]): PipelineCounts {
  return {
    enquiries: enquiries.filter((row) => row.status !== "won" && row.status !== "lost").length,
    surveys: enquiries.filter((row) => row.status === "survey_scheduled").length,
    quotes: quotes.filter((row) => row.status !== "rejected" && row.status !== "expired").length,
    orders: orders.filter((row) => isUnfinished(row.status)).length,
    completed: orders.filter((row) => row.status === "completed").length
  };
}

export function buildProfitability(
  margins: JobMarginItem[],
  period: DashboardPeriod,
  now: Date = new Date()
): ProfitabilityTotals {
  const rows = completedMarginsInPeriod(margins, period, now);
  const revenueInr = money(rows.reduce((sum, row) => sum + row.revenueInr, 0));
  const estimatedCostInr = money(rows.reduce((sum, row) => sum + row.cogsEstimateInr, 0));
  const grossMarginInr = money(revenueInr - estimatedCostInr);
  const marginPct = revenueInr > 0 ? money((grossMarginInr / revenueInr) * 100) : null;
  return { revenueInr, estimatedCostInr, grossMarginInr, marginPct, periodApplied: true };
}

export function buildAttention(
  enquiries: EnquiryItem[],
  quotes: QuoteItem[],
  orders: OrderItem[],
  ticketStatuses: string[]
): AttentionItem[] {
  const openTickets = countOpenTickets(ticketStatuses);
  return [
    {
      id: "enquiries-follow-up",
      title: "Enquiries awaiting follow-up",
      description: "New enquiries not contacted yet.",
      count: enquiries.filter((row) => row.status === "new").length,
      href: "/app/enquiries",
      urgency: "danger"
    },
    {
      id: "surveys-pending",
      title: "Surveys pending",
      description: "Assigned surveys not yet completed.",
      count: enquiries.filter((row) => row.status === "survey_scheduled").length,
      href: "/app/enquiries",
      urgency: "warning"
    },
    {
      id: "quotes-awaiting",
      title: "Quotes awaiting response",
      description: "Quotations sent to customers awaiting a decision.",
      count: quotes.filter((row) => row.status === "sent").length,
      href: "/app/quotes",
      urgency: "warning"
    },
    {
      id: "orders-payment",
      title: "Orders awaiting payment",
      description: "Advance or balance payment pending.",
      count: orders.filter((row) => row.status === "awaiting_payment").length,
      href: "/app/orders",
      urgency: "danger"
    },
    {
      id: "open-tickets",
      title: "Open service tickets",
      description: "Customer issues requiring resolution.",
      count: openTickets,
      href: "/app/reports",
      urgency: openTickets > 0 ? "danger" : "neutral"
    }
  ];
}

export function buildJobRows(margins: JobMarginItem[], orders: OrderItem[]): JobProfitRow[] {
  const kwByOrder = new Map(orders.map((row) => [row.id, row.systemKw]));
  const activeFirst = (status: JobMarginItem["status"]) => {
    if (status === "installing" || status === "dispatched" || status === "packing") return 0;
    if (status === "awaiting_payment" || status === "paid") return 1;
    return 2;
  };
  const unfinished = margins
    .filter((row) => isUnfinished(row.status))
    .sort((a, b) => activeFirst(a.status) - activeFirst(b.status));
  const completed = margins
    .filter((row) => row.status === "completed")
    .sort((a, b) => {
      const aTime = a.completedAt ? new Date(a.completedAt).getTime() : 0;
      const bTime = b.completedAt ? new Date(b.completedAt).getTime() : 0;
      return bTime - aTime;
    });

  const completedSlots = Math.min(3, completed.length, JOB_TABLE_CAP);
  const unfinishedSlots = JOB_TABLE_CAP - completedSlots;
  const selected = [...unfinished.slice(0, unfinishedSlots), ...completed.slice(0, completedSlots)];
  return selected.map((row) => ({
    orderId: row.orderId,
    customerName: row.customerName,
    systemKw: kwByOrder.get(row.orderId) ?? null,
    revenueInr: row.revenueInr,
    estimatedCostInr: row.cogsEstimateInr,
    grossMarginInr: row.grossMarginInr,
    status: row.status
  }));
}
