import type { BadgeProps } from "../../components/ui/Badge";
import type { OrderStatus } from "./types";

export function labelStatus(status: string): string {
  return status.replace(/_/g, " ");
}

export function orderStatusVariant(status: OrderStatus): NonNullable<BadgeProps["variant"]> {
  if (status === "paid" || status === "completed") return "success";
  if (status === "cancelled") return "danger";
  if (status === "dispatched" || status === "installing") return "info";
  if (status === "awaiting_payment") return "warning";
  return "neutral";
}

export function formatInr(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(value);
}

export function calendarMonthInIndia(value: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  })
    .format(value)
    .slice(0, 7);
}

export function isUnfinished(status: OrderStatus): boolean {
  return status !== "completed" && status !== "cancelled";
}

export function countOpenTickets(statuses: string[]): number {
  return statuses.filter((status) => status === "open" || status === "in_progress" || status === "waiting_parts").length;
}
