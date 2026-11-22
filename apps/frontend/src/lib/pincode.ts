/** Keep only digits for Indian PIN entry (max 6). */
export function digitsOnlyPincode(raw: string, maxLength = 6): string {
  return raw.replace(/\D/g, "").slice(0, maxLength);
}

/** True when empty (optional) or a full 6-digit Indian PIN (first digit 1–9). */
export function isValidOptionalIndianPincode(raw: string): boolean {
  const digits = digitsOnlyPincode(raw);
  if (!digits) return true;
  return /^[1-9]\d{5}$/.test(digits);
}

/**
 * Allow digits and at most one decimal point while typing a number field.
 * Strips letters and other symbols (e.g. "12a3" → "123").
 */
export function sanitizeDecimalInput(raw: string): string {
  const cleaned = raw.replace(/[^\d.]/g, "");
  const firstDot = cleaned.indexOf(".");
  if (firstDot === -1) return cleaned;
  return cleaned.slice(0, firstDot + 1) + cleaned.slice(firstDot + 1).replace(/\./g, "");
}

/** Parse a typed decimal; empty or incomplete trailing "." returns null. */
export function parseDecimalInput(raw: string | number): number | null {
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : null;
  const trimmed = raw.trim();
  if (!trimmed || trimmed === "." || trimmed.endsWith(".")) return null;
  const num = Number(trimmed);
  return Number.isFinite(num) ? num : null;
}
