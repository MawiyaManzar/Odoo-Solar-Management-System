import { sql } from "drizzle-orm";
import { boolean, check, integer, numeric, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { products } from "./catalog.js";
import { installations } from "./installations.js";
import { serialUnits } from "./inventory.js";
import { orders } from "./orders.js";
import { serviceTickets } from "./service-tickets.js";
import { users } from "./users.js";

export const WARRANTY_STATUSES = ["active", "expired", "void", "claimed"] as const;
export type WarrantyStatus = (typeof WARRANTY_STATUSES)[number];

export const EVIDENCE_KINDS = [
  "roof_photo",
  "earthing_photo",
  "customer_signature",
  "invoice_scan",
  "other"
] as const;
export type EvidenceKind = (typeof EVIDENCE_KINDS)[number];

export const INVOICE_KINDS = ["advance", "final", "service"] as const;
export type InvoiceKind = (typeof INVOICE_KINDS)[number];

export const INVOICE_STATUSES = ["draft", "sent", "paid", "void"] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

export const STOCK_MOVEMENT_REASONS = ["purchase", "reserve", "dispatch", "return", "adjust"] as const;
export type StockMovementReason = (typeof STOCK_MOVEMENT_REASONS)[number];

export const SUBSIDY_CLAIM_STATUSES = [
  "not_started",
  "docs_pending",
  "submitted",
  "approved",
  "rejected",
  "disbursed"
] as const;
export type SubsidyClaimStatus = (typeof SUBSIDY_CLAIM_STATUSES)[number];

export const TECHNICIAN_JOB_ROLES = ["lead", "helper"] as const;
export type TechnicianJobRole = (typeof TECHNICIAN_JOB_ROLES)[number];

export const warrantyPolicies = pgTable("warranty_policies", {
  id: text("id").primaryKey(),
  productId: text("product_id").references(() => products.id),
  category: text("category"),
  name: text("name").notNull(),
  durationMonths: integer("duration_months").notNull(),
  coversParts: boolean("covers_parts").notNull().default(true),
  coversLabour: boolean("covers_labour").notNull().default(true),
  isActive: boolean("is_active").notNull().default(true)
});

export const warranties = pgTable(
  "warranties",
  {
    id: text("id").primaryKey(),
    serialUnitId: text("serial_unit_id")
      .notNull()
      .unique()
      .references(() => serialUnits.id),
    policyId: text("policy_id")
      .notNull()
      .references(() => warrantyPolicies.id),
    orderId: text("order_id")
      .notNull()
      .references(() => orders.id),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    status: text("status").notNull()
  },
  (table) => [
    check(
      "warranties_status_check",
      sql`${table.status} in ('active', 'expired', 'void', 'claimed')`
    )
  ]
);

export const evidences = pgTable(
  "evidences",
  {
    id: text("id").primaryKey(),
    orderId: text("order_id").references(() => orders.id),
    installationId: text("installation_id").references(() => installations.id),
    ticketId: text("ticket_id").references(() => serviceTickets.id),
    kind: text("kind").notNull(),
    storageUrl: text("storage_url").notNull(),
    uploadedBy: text("uploaded_by").references(() => users.id),
    capturedAt: timestamp("captured_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    check(
      "evidences_kind_check",
      sql`${table.kind} in ('roof_photo', 'earthing_photo', 'customer_signature', 'invoice_scan', 'other')`
    )
  ]
);

export const invoices = pgTable(
  "invoices",
  {
    id: text("id").primaryKey(),
    orderId: text("order_id").references(() => orders.id),
    ticketId: text("ticket_id").references(() => serviceTickets.id),
    invoiceNo: text("invoice_no").notNull().unique(),
    kind: text("kind").notNull(),
    amountInr: numeric("amount_inr", { precision: 14, scale: 2, mode: "number" }).notNull(),
    issuedAt: timestamp("issued_at", { withTimezone: true }).notNull().defaultNow(),
    status: text("status").notNull()
  },
  (table) => [
    check("invoices_kind_check", sql`${table.kind} in ('advance', 'final', 'service')`),
    check("invoices_status_check", sql`${table.status} in ('draft', 'sent', 'paid', 'void')`)
  ]
);

export const stockMovements = pgTable(
  "stock_movements",
  {
    id: text("id").primaryKey(),
    productId: text("product_id")
      .notNull()
      .references(() => products.id),
    serialUnitId: text("serial_unit_id").references(() => serialUnits.id),
    deltaQty: numeric("delta_qty", { precision: 12, scale: 2, mode: "number" }).notNull(),
    reason: text("reason").notNull(),
    orderId: text("order_id").references(() => orders.id),
    createdBy: text("created_by").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    check(
      "stock_movements_reason_check",
      sql`${table.reason} in ('purchase', 'reserve', 'dispatch', 'return', 'adjust')`
    )
  ]
);

export const subsidyClaims = pgTable(
  "subsidy_claims",
  {
    id: text("id").primaryKey(),
    orderId: text("order_id")
      .notNull()
      .references(() => orders.id),
    schemeName: text("scheme_name"),
    amountInr: numeric("amount_inr", { precision: 14, scale: 2, mode: "number" }),
    status: text("status").notNull(),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    notes: text("notes")
  },
  (table) => [
    check(
      "subsidy_claims_status_check",
      sql`${table.status} in ('not_started', 'docs_pending', 'submitted', 'approved', 'rejected', 'disbursed')`
    )
  ]
);

export const technicianAssignments = pgTable(
  "technician_assignments",
  {
    id: text("id").primaryKey(),
    installationId: text("installation_id")
      .notNull()
      .references(() => installations.id),
    technicianId: text("technician_id")
      .notNull()
      .references(() => users.id),
    roleOnJob: text("role_on_job"),
    hoursWorked: numeric("hours_worked", { precision: 6, scale: 2, mode: "number" })
  },
  (table) => [
    check(
      "technician_assignments_role_check",
      sql`${table.roleOnJob} is null or ${table.roleOnJob} in ('lead', 'helper')`
    )
  ]
);
