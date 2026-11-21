import { z } from "zod";
import { DISPATCH_STATUSES, SERIAL_UNIT_STATUSES } from "../../db/schema/inventory.js";

export const idParamSchema = z.object({
  id: z.string().trim().min(1, "Id is required.")
});

export const productIdParamSchema = z.object({
  productId: z.string().trim().min(1, "Product id is required.")
});

export const serialListQuerySchema = z.object({
  serialNumber: z.string().trim().min(1).optional(),
  orderId: z.string().trim().min(1).optional(),
  dispatchId: z.string().trim().min(1).optional(),
  status: z.enum(SERIAL_UNIT_STATUSES).optional(),
  productId: z.string().trim().min(1).optional()
});

export const serialCreateSchema = z.object({
  productId: z.string().trim().min(1, "Product is required."),
  serialNumber: z.string().trim().min(1, "Serial number is required.")
});

export const scanOutSchema = z.object({
  orderId: z.string().trim().min(1, "Order id is required."),
  dispatchId: z.string().trim().min(1, "Dispatch id is required.")
});

export const dispatchListQuerySchema = z.object({
  orderId: z.string().trim().min(1).optional(),
  status: z.enum(DISPATCH_STATUSES).optional()
});

export const dispatchCreateSchema = z.object({
  orderId: z.string().trim().min(1, "Order id is required."),
  vehicleNotes: z.string().trim().min(1, "Vehicle notes cannot be blank.").optional()
});

export const stockPatchSchema = z
  .object({
    qtyOnHand: z.number().nonnegative("On hand cannot be negative.").finite().optional(),
    qtyReserved: z.number().nonnegative("Reserved cannot be negative.").finite().optional(),
    deltaOnHand: z.number().finite("Delta must be a number.").optional()
  })
  .refine((value) => value.qtyOnHand !== undefined || value.qtyReserved !== undefined || value.deltaOnHand !== undefined, {
    message: "Provide a quantity to update."
  });

export type SerialCreate = z.infer<typeof serialCreateSchema>;
export type ScanOut = z.infer<typeof scanOutSchema>;
export type DispatchCreate = z.infer<typeof dispatchCreateSchema>;
export type StockPatch = z.infer<typeof stockPatchSchema>;
