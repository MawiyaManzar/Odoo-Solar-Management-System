import { z } from "zod";
import { ORDER_STATUSES, PAYMENT_KINDS, PAYMENT_METHODS } from "../../db/schema/orders.js";
import { isBeforeTodayInIndia } from "../../lib/dates.js";

export const orderIdSchema = z.object({
  id: z.string().trim().min(1, "Order id is required.")
});

export const orderListQuerySchema = z.object({
  status: z.enum(ORDER_STATUSES).optional()
});

export const orderCreateSchema = z.object({
  quoteId: z.string().trim().min(1, "Quote id is required.")
});

export const orderPatchSchema = z
  .object({
    scheduledInstallAt: z.string().datetime({ message: "Install time must be an ISO datetime." }).nullable().optional(),
    siteAddress: z.string().trim().min(1, "Site address is required.").optional(),
    status: z.enum(ORDER_STATUSES).optional()
  })
  .refine((value) => Object.keys(value).length > 0, { message: "Provide at least one field to update." })
  .superRefine((value, ctx) => {
    if (value.scheduledInstallAt && isBeforeTodayInIndia(value.scheduledInstallAt)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["scheduledInstallAt"],
        message: "Installation can only be scheduled from today onwards."
      });
    }
  });

export const scheduleSchema = z
  .object({
    scheduledInstallAt: z.string().datetime({ message: "Install time must be an ISO datetime." }),
    leadTechnicianId: z.string().trim().min(1, "Lead technician is required.")
  })
  .superRefine((value, ctx) => {
    if (isBeforeTodayInIndia(value.scheduledInstallAt)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["scheduledInstallAt"],
        message: "Installation can only be scheduled from today onwards."
      });
    }
  });

export const paymentBodySchema = z
  .object({
    amountInr: z.number().positive("Amount must be greater than zero.").finite("Amount must be a number."),
    kind: z.enum(PAYMENT_KINDS, { message: "Kind must be advance, balance, full, or service." }),
    method: z.enum(PAYMENT_METHODS, { message: "Method must be upi, neft, cash, or cheque." }).optional(),
    reference: z.string().trim().min(1, "Reference cannot be blank.").optional()
  })
  .superRefine((value, ctx) => {
    if (value.method === "upi") {
      const ref = value.reference?.trim() ?? "";
      if (ref.length < 6) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["reference"],
          message: "Enter the UPI UTR (at least 6 characters)."
        });
      }
    }
  });

export type OrderCreate = z.infer<typeof orderCreateSchema>;
export type OrderPatch = z.infer<typeof orderPatchSchema>;
export type ScheduleInput = z.infer<typeof scheduleSchema>;
export type PaymentInput = z.infer<typeof paymentBodySchema>;
