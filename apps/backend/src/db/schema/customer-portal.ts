import { integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { customers } from "./customers.js";

export const customerAccounts = pgTable("customer_accounts", {
  id: text("id").primaryKey(),
  customerId: text("customer_id")
    .notNull()
    .unique()
    .references(() => customers.id),
  phone: text("phone").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
});

export const customerOtps = pgTable("customer_otps", {
  id: text("id").primaryKey(),
  phone: text("phone").notNull(),
  codeHash: text("code_hash").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  attempts: integer("attempts").notNull().default(0),
  consumedAt: timestamp("consumed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
});
