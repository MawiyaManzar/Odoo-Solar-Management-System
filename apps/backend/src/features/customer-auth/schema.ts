import { z } from "zod";

export const phoneSchema = z.object({
  phone: z.string().trim().min(8, "Enter the mobile number from your inquiry.")
});

export const signInVerifySchema = phoneSchema.extend({
  code: z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit code.")
});

export const otpRequestSchema = phoneSchema.extend({
  quoteId: z.string().min(1)
});

export const otpVerifySchema = otpRequestSchema.extend({
  code: z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit code.")
});

export const quoteIdParamSchema = z.object({
  id: z.string().min(1)
});

export const customerPaymentSchema = z.object({
  amountInr: z.number().positive("Amount must be greater than zero.").finite("Amount must be a number."),
  kind: z.enum(["advance", "balance", "full"], { message: "Kind must be advance, balance, or full." }),
  reference: z.string().trim().min(6, "Enter the UPI UTR (at least 6 characters).")
});
