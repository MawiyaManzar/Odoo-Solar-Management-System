import { z } from "zod";

export const otpRequestSchema = z.object({
  phone: z.string().trim().min(8),
  quoteId: z.string().min(1)
});

export const otpVerifySchema = otpRequestSchema.extend({
  code: z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit code.")
});

export const quoteIdParamSchema = z.object({
  id: z.string().min(1)
});
