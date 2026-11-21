import { sql } from "drizzle-orm";
import { boolean, check, numeric, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { customers } from "./customers.js";
import { serialUnits } from "./inventory.js";
import { orders } from "./orders.js";
import { users } from "./users.js";

export const SERVICE_TICKET_STATUSES = [
  "open",
  "in_progress",
  "waiting_parts",
  "resolved",
  "closed"
] as const;
export type ServiceTicketStatus = (typeof SERVICE_TICKET_STATUSES)[number];

export const serviceTickets = pgTable(
  "service_tickets",
  {
    id: text("id").primaryKey(),
    customerId: text("customer_id")
      .notNull()
      .references(() => customers.id),
    orderId: text("order_id").references(() => orders.id),
    serialUnitId: text("serial_unit_id").references(() => serialUnits.id),
    openedBy: text("opened_by").references(() => users.id),
    assignedTo: text("assigned_to").references(() => users.id),
    faultCode: text("fault_code"),
    description: text("description").notNull(),
    underWarranty: boolean("under_warranty"),
    billableInr: numeric("billable_inr", { precision: 12, scale: 2, mode: "number" }).notNull().default(0),
    status: text("status").notNull(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    customerConfirmedAt: timestamp("customer_confirmed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    check(
      "service_tickets_status_check",
      sql`${table.status} in ('open', 'in_progress', 'waiting_parts', 'resolved', 'closed')`
    )
  ]
);
