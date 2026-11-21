import { sql } from "drizzle-orm";
import { boolean, check, numeric, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { orders } from "./orders.js";
import { users } from "./users.js";

export const INSTALLATION_STATUSES = ["scheduled", "in_progress", "completed", "blocked"] as const;
export type InstallationStatus = (typeof INSTALLATION_STATUSES)[number];

export const installations = pgTable(
  "installations",
  {
    id: text("id").primaryKey(),
    orderId: text("order_id")
      .notNull()
      .references(() => orders.id),
    leadTechnicianId: text("lead_technician_id").references(() => users.id),
    startedAt: timestamp("started_at", { withTimezone: true }),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    systemKwConfirmed: numeric("system_kw_confirmed", { precision: 4, scale: 1, mode: "number" }),
    generationTestOk: boolean("generation_test_ok"),
    customerSignedAt: timestamp("customer_signed_at", { withTimezone: true }),
    status: text("status").notNull(),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    check(
      "installations_status_check",
      sql`${table.status} in ('scheduled', 'in_progress', 'completed', 'blocked')`
    )
  ]
);
