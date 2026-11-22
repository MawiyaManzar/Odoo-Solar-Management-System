import { sql } from "drizzle-orm";
import { bigint, boolean, check, pgTable, text, timestamp } from "drizzle-orm/pg-core";

/** Staff roles for SunPower (see docs/db-schema.md). */
export const USER_ROLES = ["admin", "sales", "warehouse", "technician", "support"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const users = pgTable(
  "users",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull().unique(),
    passwordHash: text("password_hash").notNull(),
    name: text("name").notNull(),
    /** Retained for auth signup UI; SunPower is single-company in v1. */
    companyName: text("company_name").notNull().default(""),
    role: text("role").notNull(),
    phone: bigint("phone", { mode: "number" }),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    check(
      "users_role_check",
      sql`${table.role} in ('admin', 'sales', 'warehouse', 'technician', 'support')`
    )
  ]
);
