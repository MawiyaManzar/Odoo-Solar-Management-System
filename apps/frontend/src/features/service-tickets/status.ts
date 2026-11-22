import type { BadgeProps } from "../../components/ui/Badge";

export function labelStatus(status: string): string {
  return status.replace(/_/g, " ");
}

export function ticketStatusVariant(status: string): NonNullable<BadgeProps["variant"]> {
  if (status === "resolved" || status === "closed") return "success";
  if (status === "waiting_parts") return "warning";
  if (status === "in_progress") return "info";
  if (status === "open") return "neutral";
  return "neutral";
}
