import type { BadgeProps } from "../../components/ui/Badge";
import type { OrderStatus } from "./types";

export const ORDER_FILTERS: Array<"" | OrderStatus> = [
  "",
  "awaiting_payment",
  "paid",
  "packing",
  "dispatched",
  "installing",
  "completed",
  "cancelled"
];

export function labelStatus(status: string): string {
  return status.replace(/_/g, " ");
}

export function orderStatusVariant(status: string): NonNullable<BadgeProps["variant"]> {
  if (status === "paid" || status === "completed") return "success";
  if (status === "cancelled") return "danger";
  if (status === "dispatched" || status === "installing") return "info";
  if (status === "awaiting_payment") return "warning";
  return "neutral";
}

export function formatInr(value: number): string {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(value);
}

export function formatWhen(value: string | null): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}
