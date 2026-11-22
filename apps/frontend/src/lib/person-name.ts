/** Keep letters and spaces only (no digits or special characters). */
export function lettersOnlyName(raw: string): string {
  return raw.replace(/[^\p{L}\s]/gu, "").replace(/\s+/g, " ");
}

/** Non-empty name made of letters and spaces only. */
export function isValidPersonName(raw: string): boolean {
  const trimmed = raw.trim();
  if (!trimmed) return false;
  return /^[\p{L}]+(?:\s+[\p{L}]+)*$/u.test(trimmed);
}
