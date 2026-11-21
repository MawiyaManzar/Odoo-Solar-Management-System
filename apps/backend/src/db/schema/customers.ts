import { sql } from "drizzle-orm";
import { check, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const CUSTOMER_TYPES = ["residential", "commercial"] as const;
export type CustomerType = (typeof CUSTOMER_TYPES)[number];

export const customers = pgTable(
  "customers",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    phone: text("phone").notNull().unique(),
    email: text("email"),
    addressLine: text("address_line").notNull(),
    city: text("city").notNull(),
    pincode: text("pincode"),
    customerType: text("customer_type").notNull().default("residential"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    check("customers_type_check", sql`${table.customerType} in ('residential', 'commercial')`)
  ]
);
