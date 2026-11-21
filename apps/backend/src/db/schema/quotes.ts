import { sql } from "drizzle-orm";
import { check, date, numeric, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { packages, products } from "./catalog.js";
import { customers } from "./customers.js";
import { enquiries } from "./enquiries.js";
import { users } from "./users.js";

export const QUOTE_STATUSES = ["draft", "sent", "accepted", "rejected", "expired"] as const;
export type QuoteStatus = (typeof QUOTE_STATUSES)[number];

export const quotes = pgTable(
  "quotes",
  {
    id: text("id").primaryKey(),
    enquiryId: text("enquiry_id")
      .notNull()
      .references(() => enquiries.id),
    customerId: text("customer_id")
      .notNull()
      .references(() => customers.id),
    packageId: text("package_id").references(() => packages.id),
    status: text("status").notNull(),
    subtotalInr: numeric("subtotal_inr", { precision: 14, scale: 2, mode: "number" }).notNull().default(0),
    discountInr: numeric("discount_inr", { precision: 14, scale: 2, mode: "number" }).notNull().default(0),
    totalInr: numeric("total_inr", { precision: 14, scale: 2, mode: "number" }).notNull().default(0),
    validUntil: date("valid_until"),
    createdBy: text("created_by").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    check(
      "quotes_status_check",
      sql`${table.status} in ('draft', 'sent', 'accepted', 'rejected', 'expired')`
    )
  ]
);

export const quoteLines = pgTable("quote_lines", {
  id: text("id").primaryKey(),
  quoteId: text("quote_id")
    .notNull()
    .references(() => quotes.id),
  productId: text("product_id")
    .notNull()
    .references(() => products.id),
  description: text("description"),
  qty: numeric("qty", { precision: 10, scale: 2, mode: "number" }).notNull(),
  unitPriceInr: numeric("unit_price_inr", { precision: 12, scale: 2, mode: "number" }).notNull(),
  lineTotalInr: numeric("line_total_inr", { precision: 14, scale: 2, mode: "number" }).notNull()
});
