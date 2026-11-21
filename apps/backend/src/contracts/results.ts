/**
 * Shared API result (response) schemas — source of truth for JSON shapes.
 * Feature services must map DB rows through these shapes (ISO dates, camelCase, numbers).
 * Request/body Zod lives in each feature's schema.ts; do not duplicate enums — import from db/schema.
 */
import { z } from "zod";
import {
  EVIDENCE_KINDS,
  INVOICE_KINDS,
  INVOICE_STATUSES,
  STOCK_MOVEMENT_REASONS,
  SUBSIDY_CLAIM_STATUSES,
  TECHNICIAN_JOB_ROLES,
  WARRANTY_STATUSES
} from "../db/schema/phase2.js";
import {
  CUSTOMER_TYPES
} from "../db/schema/customers.js";
import {
  PACKAGE_SYSTEM_KINDS,
  PRODUCT_CATEGORIES
} from "../db/schema/catalog.js";
import {
  ENQUIRY_SOURCES,
  ENQUIRY_STATUSES,
  ENQUIRY_SYSTEM_KINDS,
  SURVEY_RESULTS
} from "../db/schema/enquiries.js";
import {
  DISPATCH_STATUSES,
  SERIAL_UNIT_STATUSES
} from "../db/schema/inventory.js";
import { INSTALLATION_STATUSES } from "../db/schema/installations.js";
import {
  ORDER_STATUSES,
  ORDER_SYSTEM_KINDS,
  PAYMENT_KINDS,
  PAYMENT_METHODS
} from "../db/schema/orders.js";
import { QUOTE_STATUSES } from "../db/schema/quotes.js";
import { SERVICE_TICKET_STATUSES } from "../db/schema/service-tickets.js";
import { USER_ROLES } from "../db/schema/users.js";

const isoDateTime = z.string().datetime({ offset: true });
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD");

export const userResultSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string(),
  companyName: z.string(),
  role: z.enum(USER_ROLES),
  phone: z.string().nullable(),
  isActive: z.boolean(),
  createdAt: isoDateTime
});
export type UserResult = z.infer<typeof userResultSchema>;

export const customerResultSchema = z.object({
  id: z.string(),
  name: z.string(),
  phone: z.string(),
  email: z.string().nullable(),
  addressLine: z.string(),
  city: z.string(),
  pincode: z.string().nullable(),
  customerType: z.enum(CUSTOMER_TYPES),
  createdAt: isoDateTime
});
export type CustomerResult = z.infer<typeof customerResultSchema>;

export const productResultSchema = z.object({
  id: z.string(),
  sku: z.string(),
  name: z.string(),
  category: z.enum(PRODUCT_CATEGORIES),
  unit: z.string(),
  unitPriceInr: z.number(),
  unitCostInr: z.number(),
  isSerialized: z.boolean(),
  defaultWarrantyMonths: z.number().int().nullable(),
  isActive: z.boolean()
});
export type ProductResult = z.infer<typeof productResultSchema>;

export const packageItemResultSchema = z.object({
  id: z.string(),
  packageId: z.string(),
  productId: z.string(),
  qty: z.number()
});
export type PackageItemResult = z.infer<typeof packageItemResultSchema>;

export const packageResultSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  systemKind: z.enum(PACKAGE_SYSTEM_KINDS),
  capacityKw: z.number().nullable(),
  basePriceInr: z.number(),
  isActive: z.boolean(),
  items: z.array(packageItemResultSchema).optional()
});
export type PackageResult = z.infer<typeof packageResultSchema>;

export const enquiryResultSchema = z.object({
  id: z.string(),
  customerId: z.string(),
  source: z.enum(ENQUIRY_SOURCES),
  requestedKw: z.number(),
  systemKind: z.enum(ENQUIRY_SYSTEM_KINDS).nullable(),
  wantsSubsidy: z.boolean(),
  monthlyBillInr: z.number().nullable(),
  roofAreaSqft: z.number().nullable(),
  gridSuitable: z.boolean().nullable(),
  status: z.enum(ENQUIRY_STATUSES),
  assignedTo: z.string().nullable(),
  notes: z.string().nullable(),
  createdAt: isoDateTime,
  updatedAt: isoDateTime
});
export type EnquiryResult = z.infer<typeof enquiryResultSchema>;

export const siteSurveyResultSchema = z.object({
  id: z.string(),
  enquiryId: z.string(),
  technicianId: z.string().nullable(),
  scheduledAt: isoDateTime.nullable(),
  completedAt: isoDateTime.nullable(),
  roofDirection: z.string().nullable(),
  tiltDegrees: z.number().nullable(),
  cableDistanceM: z.number().nullable(),
  usableAreaSqft: z.number().nullable(),
  shadowNotes: z.string().nullable(),
  result: z.enum(SURVEY_RESULTS).nullable(),
  createdAt: isoDateTime
});
export type SiteSurveyResult = z.infer<typeof siteSurveyResultSchema>;

export const quoteLineResultSchema = z.object({
  id: z.string(),
  quoteId: z.string(),
  productId: z.string(),
  description: z.string().nullable(),
  qty: z.number(),
  unitPriceInr: z.number(),
  lineTotalInr: z.number()
});
export type QuoteLineResult = z.infer<typeof quoteLineResultSchema>;

export const quoteResultSchema = z.object({
  id: z.string(),
  enquiryId: z.string(),
  customerId: z.string(),
  packageId: z.string().nullable(),
  status: z.enum(QUOTE_STATUSES),
  subtotalInr: z.number(),
  discountInr: z.number(),
  totalInr: z.number(),
  validUntil: isoDate.nullable(),
  createdBy: z.string().nullable(),
  createdAt: isoDateTime,
  updatedAt: isoDateTime,
  lines: z.array(quoteLineResultSchema).optional()
});
export type QuoteResult = z.infer<typeof quoteResultSchema>;

export const orderResultSchema = z.object({
  id: z.string(),
  quoteId: z.string(),
  customerId: z.string(),
  enquiryId: z.string(),
  status: z.enum(ORDER_STATUSES),
  systemKw: z.number(),
  systemKind: z.enum(ORDER_SYSTEM_KINDS),
  siteAddress: z.string(),
  scheduledInstallAt: isoDateTime.nullable(),
  totalInr: z.number(),
  createdAt: isoDateTime,
  updatedAt: isoDateTime
});
export type OrderResult = z.infer<typeof orderResultSchema>;

export const paymentResultSchema = z.object({
  id: z.string(),
  orderId: z.string(),
  amountInr: z.number(),
  kind: z.enum(PAYMENT_KINDS),
  method: z.enum(PAYMENT_METHODS).nullable(),
  paidAt: isoDateTime,
  reference: z.string().nullable(),
  recordedBy: z.string().nullable()
});
export type PaymentResult = z.infer<typeof paymentResultSchema>;

export const stockLevelResultSchema = z.object({
  id: z.string(),
  productId: z.string(),
  qtyOnHand: z.number(),
  qtyReserved: z.number(),
  updatedAt: isoDateTime
});
export type StockLevelResult = z.infer<typeof stockLevelResultSchema>;

export const serialUnitResultSchema = z.object({
  id: z.string(),
  productId: z.string(),
  serialNumber: z.string(),
  status: z.enum(SERIAL_UNIT_STATUSES),
  orderId: z.string().nullable(),
  dispatchId: z.string().nullable(),
  deliveredAt: isoDateTime.nullable(),
  createdAt: isoDateTime
});
export type SerialUnitResult = z.infer<typeof serialUnitResultSchema>;

export const dispatchResultSchema = z.object({
  id: z.string(),
  orderId: z.string(),
  status: z.enum(DISPATCH_STATUSES),
  dispatchedAt: isoDateTime.nullable(),
  deliveredAt: isoDateTime.nullable(),
  packedBy: z.string().nullable(),
  vehicleNotes: z.string().nullable(),
  createdAt: isoDateTime,
  serialUnitIds: z.array(z.string()).optional()
});
export type DispatchResult = z.infer<typeof dispatchResultSchema>;

export const installationResultSchema = z.object({
  id: z.string(),
  orderId: z.string(),
  leadTechnicianId: z.string().nullable(),
  startedAt: isoDateTime.nullable(),
  finishedAt: isoDateTime.nullable(),
  systemKwConfirmed: z.number().nullable(),
  generationTestOk: z.boolean().nullable(),
  customerSignedAt: isoDateTime.nullable(),
  status: z.enum(INSTALLATION_STATUSES),
  notes: z.string().nullable(),
  createdAt: isoDateTime
});
export type InstallationResult = z.infer<typeof installationResultSchema>;

export const serviceTicketResultSchema = z.object({
  id: z.string(),
  customerId: z.string(),
  orderId: z.string().nullable(),
  serialUnitId: z.string().nullable(),
  openedBy: z.string().nullable(),
  assignedTo: z.string().nullable(),
  faultCode: z.string().nullable(),
  description: z.string(),
  underWarranty: z.boolean().nullable(),
  billableInr: z.number(),
  status: z.enum(SERVICE_TICKET_STATUSES),
  resolvedAt: isoDateTime.nullable(),
  customerConfirmedAt: isoDateTime.nullable(),
  createdAt: isoDateTime,
  updatedAt: isoDateTime
});
export type ServiceTicketResult = z.infer<typeof serviceTicketResultSchema>;

export const warrantyPolicyResultSchema = z.object({
  id: z.string(),
  productId: z.string().nullable(),
  category: z.string().nullable(),
  name: z.string(),
  durationMonths: z.number().int(),
  coversParts: z.boolean(),
  coversLabour: z.boolean(),
  isActive: z.boolean()
});
export type WarrantyPolicyResult = z.infer<typeof warrantyPolicyResultSchema>;

export const warrantyResultSchema = z.object({
  id: z.string(),
  serialUnitId: z.string(),
  policyId: z.string(),
  orderId: z.string(),
  startsAt: isoDateTime,
  endsAt: isoDateTime,
  status: z.enum(WARRANTY_STATUSES)
});
export type WarrantyResult = z.infer<typeof warrantyResultSchema>;

export const evidenceResultSchema = z.object({
  id: z.string(),
  orderId: z.string().nullable(),
  installationId: z.string().nullable(),
  ticketId: z.string().nullable(),
  kind: z.enum(EVIDENCE_KINDS),
  storageUrl: z.string(),
  uploadedBy: z.string().nullable(),
  capturedAt: isoDateTime
});
export type EvidenceResult = z.infer<typeof evidenceResultSchema>;

export const invoiceResultSchema = z.object({
  id: z.string(),
  orderId: z.string().nullable(),
  ticketId: z.string().nullable(),
  invoiceNo: z.string(),
  kind: z.enum(INVOICE_KINDS),
  amountInr: z.number(),
  issuedAt: isoDateTime,
  status: z.enum(INVOICE_STATUSES)
});
export type InvoiceResult = z.infer<typeof invoiceResultSchema>;

export const stockMovementResultSchema = z.object({
  id: z.string(),
  productId: z.string(),
  serialUnitId: z.string().nullable(),
  deltaQty: z.number(),
  reason: z.enum(STOCK_MOVEMENT_REASONS),
  orderId: z.string().nullable(),
  createdBy: z.string().nullable(),
  createdAt: isoDateTime
});
export type StockMovementResult = z.infer<typeof stockMovementResultSchema>;

export const subsidyClaimResultSchema = z.object({
  id: z.string(),
  orderId: z.string(),
  schemeName: z.string().nullable(),
  amountInr: z.number().nullable(),
  status: z.enum(SUBSIDY_CLAIM_STATUSES),
  submittedAt: isoDateTime.nullable(),
  notes: z.string().nullable()
});
export type SubsidyClaimResult = z.infer<typeof subsidyClaimResultSchema>;

export const technicianAssignmentResultSchema = z.object({
  id: z.string(),
  installationId: z.string(),
  technicianId: z.string(),
  roleOnJob: z.enum(TECHNICIAN_JOB_ROLES).nullable(),
  hoursWorked: z.number().nullable()
});
export type TechnicianAssignmentResult = z.infer<typeof technicianAssignmentResultSchema>;

/** Director dashboard aggregate (computed, not a table). */
export const jobMarginResultSchema = z.object({
  orderId: z.string(),
  customerName: z.string(),
  revenueInr: z.number(),
  cogsEstimateInr: z.number(),
  grossMarginInr: z.number(),
  status: z.enum(ORDER_STATUSES),
  /** Installation finish time, or order updatedAt when status is completed. */
  completedAt: isoDateTime.nullable()
});
export type JobMarginResult = z.infer<typeof jobMarginResultSchema>;

/** Standard success envelope. */
export const apiSuccessSchema = <T extends z.ZodType>(data: T) =>
  z.object({
    success: z.literal(true),
    data,
    message: z.string().optional()
  });

export const apiErrorSchema = z.object({
  success: z.literal(false),
  message: z.string()
});
