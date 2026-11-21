import { z } from "zod";
import { PACKAGE_SYSTEM_KINDS, PRODUCT_CATEGORIES } from "../../db/schema/catalog.js";
import { CUSTOMER_TYPES } from "../../db/schema/customers.js";
import { ENQUIRY_SYSTEM_KINDS } from "../../db/schema/enquiries.js";

export const idParamSchema = z.object({
  id: z.string().min(1)
});

export const productListQuerySchema = z.object({
  category: z.enum(PRODUCT_CATEGORIES).optional(),
  active: z.enum(["true", "false"]).optional()
});

export const productBodySchema = z.object({
  sku: z.string().trim().min(1),
  name: z.string().trim().min(1),
  category: z.enum(PRODUCT_CATEGORIES),
  unit: z.string().trim().min(1).optional(),
  unitPriceInr: z.number().nonnegative(),
  unitCostInr: z.number().nonnegative().optional(),
  isSerialized: z.boolean().optional(),
  defaultWarrantyMonths: z.number().int().positive().nullable().optional(),
  isActive: z.boolean().optional()
});

export const productPatchSchema = productBodySchema.partial();

const packageItemInputSchema = z.object({
  productId: z.string().min(1),
  qty: z.number().positive()
});

export const packageBodySchema = z.object({
  code: z.string().trim().min(1),
  name: z.string().trim().min(1),
  systemKind: z.enum(PACKAGE_SYSTEM_KINDS),
  capacityKw: z.number().positive().nullable().optional(),
  basePriceInr: z.number().nonnegative(),
  isActive: z.boolean().optional(),
  items: z.array(packageItemInputSchema).min(1)
});

export const packagePatchSchema = z.object({
  code: z.string().trim().min(1).optional(),
  name: z.string().trim().min(1).optional(),
  systemKind: z.enum(PACKAGE_SYSTEM_KINDS).optional(),
  capacityKw: z.number().positive().nullable().optional(),
  basePriceInr: z.number().nonnegative().optional(),
  isActive: z.boolean().optional(),
  items: z.array(packageItemInputSchema).min(1).optional()
});

export const publicEnquiryBodySchema = z.object({
  name: z.string().trim().min(1),
  phone: z.string().trim().min(8),
  email: z.string().trim().email().optional().or(z.literal("")),
  addressLine: z.string().trim().min(1),
  city: z.string().trim().min(1),
  pincode: z.string().trim().optional(),
  customerType: z.enum(CUSTOMER_TYPES).optional(),
  requestedKw: z.number().positive(),
  systemKind: z.enum(ENQUIRY_SYSTEM_KINDS).optional(),
  wantsSubsidy: z.boolean().optional(),
  notes: z.string().trim().optional()
});

export type ProductInput = z.infer<typeof productBodySchema>;
export type ProductPatch = z.infer<typeof productPatchSchema>;
export type PackageInput = z.infer<typeof packageBodySchema>;
export type PackagePatch = z.infer<typeof packagePatchSchema>;
export type PublicEnquiryInput = z.infer<typeof publicEnquiryBodySchema>;
