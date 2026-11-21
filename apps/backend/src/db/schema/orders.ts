import { sql } from "drizzle-orm";
import { check, numeric, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { customers } from "./customers.js";
import { enquiries } from "./enquiries.js";
import { quotes } from "./quotes.js";
import { users } from "./users.js";

export const ORDER_STATUSES = [
  "awaiting_payment",
  "paid",
  "packing",
  "dispatched",
  "installing",
  "completed",
  "cancelled"
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_SYSTEM_KINDS = ["on_grid", "off_grid"] as const;
export type OrderSystemKind = (typeof ORDER_SYSTEM_KINDS)[number];

export const PAYMENT_KINDS = ["advance", "balance", "full", "service"] as const;
export type PaymentKind = (typeof PAYMENT_KINDS)[number];

export const PAYMENT_METHODS = ["upi", "neft", "cash", "cheque"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const orders = pgTable(
  "orders",
  {
    id: text("id").primaryKey(),
    quoteId: text("quote_id")
      .notNull()
      .unique()
      .references(() => quotes.id),
    customerId: text("customer_id")
      .notNull()
      .references(() => customers.id),
    enquiryId: text("enquiry_id")
      .notNull()
      .references(() => enquiries.id),
    status: text("status").notNull(),
    systemKw: numeric("system_kw", { precision: 4, scale: 1, mode: "number" }).notNull(),
    systemKind: text("system_kind").notNull(),
    siteAddress: text("site_address").notNull(),
    scheduledInstallAt: timestamp("scheduled_install_at", { withTimezone: true }),
    totalInr: numeric("total_inr", { precision: 14, scale: 2, mode: "number" }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    check(
      "orders_status_check",
      sql`${table.status} in ('awaiting_payment', 'paid', 'packing', 'dispatched', 'installing', 'completed', 'cancelled')`
    ),
    check("orders_system_kind_check", sql`${table.systemKind} in ('on_grid', 'off_grid')`)
  ]
);

export const payments = pgTable(
  "payments",
  {
    id: text("id").primaryKey(),
    orderId: text("order_id")
      .notNull()
      .references(() => orders.id),
    amountInr: numeric("amount_inr", { precision: 14, scale: 2, mode: "number" }).notNull(),
    kind: text("kind").notNull(),
    method: text("method"),
    paidAt: timestamp("paid_at", { withTimezone: true }).notNull().defaultNow(),
    reference: text("reference"),
    recordedBy: text("recorded_by").references(() => users.id)
  },
  (table) => [
    check("payments_kind_check", sql`${table.kind} in ('advance', 'balance', 'full', 'service')`),
    check(
      "payments_method_check",
      sql`${table.method} is null or ${table.method} in ('upi', 'neft', 'cash', 'cheque')`
    )
  ]
);
