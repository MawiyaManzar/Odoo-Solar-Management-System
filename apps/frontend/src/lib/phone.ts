/** Keep only digits for Indian mobile entry (max 10). */
export function digitsOnlyPhone(raw: string, maxLength = 10): string {
  return raw.replace(/\D/g, "").slice(0, maxLength);
}

/** Parse a 10-digit Indian mobile string to a number, or null if incomplete. */
export function parseIndianMobile(raw: string): number | null {
  const digits = digitsOnlyPhone(raw);
  if (!/^[6-9]\d{9}$/.test(digits)) return null;
  return Number(digits);
}
