import { z } from "zod";

/** Indian mobile as a number. Uses bigint in Postgres — values exceed 32-bit int. */
export const indianMobileSchema = z.coerce
  .number("Enter a valid mobile number.")
  .int("Enter a valid mobile number.")
  .refine((value) => value >= 6_000_000_000 && value <= 9_999_999_999, {
    message: "Enter a 10-digit Indian mobile number."
  });

export const optionalIndianMobileSchema = z.preprocess((value) => {
  if (value === null || value === undefined || value === "") return null;
  return value;
}, indianMobileSchema.nullable());

/** Optional Indian PIN: empty, or exactly 6 digits starting 1–9 (no letters). */
export const optionalIndianPincodeSchema = z.preprocess((value) => {
  if (value === null || value === undefined) return undefined;
  if (typeof value === "string" && value.trim() === "") return undefined;
  return typeof value === "string" ? value.trim() : value;
}, z.string().regex(/^[1-9]\d{5}$/, "PIN code must be 6 digits.").optional());

/** Person name: letters and spaces only (no digits or special characters). */
export const personNameSchema = z
  .string()
  .trim()
  .min(1, "Full name is required.")
  .regex(/^[\p{L}]+(?:\s+[\p{L}]+)*$/u, "Name must contain letters only (no numbers or special characters).");
