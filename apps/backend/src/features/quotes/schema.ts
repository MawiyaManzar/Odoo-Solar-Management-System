import { z } from "zod";
import { QUOTE_STATUSES } from "../../db/schema/quotes.js";

export const idParamSchema = z.object({ id: z.string().min(1) });

export const quoteListQuerySchema = z.object({
  status: z.enum(QUOTE_STATUSES).optional(),
  customerId: z.string().min(1).optional()
});

export const quoteCreateSchema = z.object({
  enquiryId: z.string().min(1),
  packageId: z.string().min(1),
  discountInr: z.number().nonnegative().optional(),
  validUntil: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()
});

const linePatchSchema = z.object({
  id: z.string().min(1),
  qty: z.number().positive(),
  unitPriceInr: z.number().nonnegative()
});

export const quotePatchSchema = z.object({
  discountInr: z.number().nonnegative().optional(),
  validUntil: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  lines: z.array(linePatchSchema).optional()
});

export type QuoteCreate = z.infer<typeof quoteCreateSchema>;
export type QuotePatch = z.infer<typeof quotePatchSchema>;
