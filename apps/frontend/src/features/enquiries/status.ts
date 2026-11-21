import type { BadgeProps } from "../../components/ui/Badge";

export function statusVariant(status: string): NonNullable<BadgeProps["variant"]> {
  if (["won", "accepted", "approved", "paid", "completed"].includes(status)) return "success";
  if (["lost", "rejected"].includes(status)) return "danger";
  if (["quoted", "sent", "survey_scheduled", "survey_done"].includes(status)) return "info";
  if (["draft", "expired"].includes(status)) return "neutral";
  return "warning";
}

export function labelStatus(status: string): string {
  return status.replace(/_/g, " ");
}
