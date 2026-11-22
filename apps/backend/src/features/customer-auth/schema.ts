import { z } from "zod";
import { indianMobileSchema } from "../../lib/phone.js";

export const phoneSchema = z.object({
  phone: indianMobileSchema
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

export const customerCheckoutSchema = z.object({
  amountInr: z.number().positive("Amount must be greater than zero.").finite("Amount must be a number.")
});

export const customerConfirmCheckoutSchema = z.object({
  sessionId: z.string().trim().min(1, "Stripe session id is required.")
});

export const customerSupportAskSchema = z.object({
  question: z
    .string()
    .trim()
    .min(1, "Ask a question.")
    .max(500, "Keep the question under 500 characters.")
});
