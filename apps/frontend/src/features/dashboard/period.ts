export type DashboardPeriod = "today" | "week" | "month" | "year";

export const PERIOD_OPTIONS: { id: DashboardPeriod; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "week", label: "This Week" },
  { id: "month", label: "This Month" },
  { id: "year", label: "This Year" }
];

/** Asia/Kolkata calendar parts as YYYY-MM-DD (en-CA). */
export function indiaDateParts(value: Date = new Date()): { y: number; m: number; d: number; key: string } {
  const key = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(value);
  const [y, m, d] = key.split("-").map(Number);
  return { y, m, d, key };
}

function startOfIndiaDayUtc(y: number, m: number, d: number): Date {
  // IST midnight expressed as a UTC Date for instant comparisons.
  return new Date(Date.UTC(y, m - 1, d, -5, -30, 0, 0));
}

/** Inclusive start instant for the selected period in IST calendar terms. */
export function periodStart(period: DashboardPeriod, now: Date = new Date()): Date {
  const { y, m, d } = indiaDateParts(now);
  if (period === "today") return startOfIndiaDayUtc(y, m, d);
  if (period === "year") return startOfIndiaDayUtc(y, 1, 1);
  if (period === "month") return startOfIndiaDayUtc(y, m, 1);

  const todayStart = startOfIndiaDayUtc(y, m, d);
  const dowName = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Kolkata", weekday: "short" }).format(now);
  const map: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const dow = map[dowName] ?? 1;
  const daysFromMonday = dow === 0 ? 6 : dow - 1;
  return new Date(todayStart.getTime() - daysFromMonday * 24 * 60 * 60 * 1000);
}

export function isInPeriod(iso: string | null | undefined, period: DashboardPeriod, now: Date = new Date()): boolean {
  if (!iso) return false;
  const instant = new Date(iso);
  if (Number.isNaN(instant.getTime())) return false;
  return instant.getTime() >= periodStart(period, now).getTime() && instant.getTime() <= now.getTime();
}
