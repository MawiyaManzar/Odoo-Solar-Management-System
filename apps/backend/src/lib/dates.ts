/** Calendar day YYYY-MM-DD in Asia/Kolkata (SunPower India ops). */
export function calendarDayInIndia(value: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(value);
}

export function isBeforeTodayInIndia(iso: string): boolean {
  return calendarDayInIndia(new Date(iso)) < calendarDayInIndia(new Date());
}
