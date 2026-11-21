import { sql } from "drizzle-orm";
import { check, numeric, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { products } from "./catalog.js";
import { orders } from "./orders.js";
import { users } from "./users.js";

export const DISPATCH_STATUSES = ["packing", "in_transit", "delivered", "cancelled"] as const;
export type DispatchStatus = (typeof DISPATCH_STATUSES)[number];

export const SERIAL_UNIT_STATUSES = [
  "in_stock",
  "reserved",
  "dispatched",
  "installed",
  "returned",
  "scrapped"
] as const;
export type SerialUnitStatus = (typeof SERIAL_UNIT_STATUSES)[number];

export const stockLevels = pgTable("stock_levels", {
  id: text("id").primaryKey(),
  productId: text("product_id")
    .notNull()
    .unique()
    .references(() => products.id),
  qtyOnHand: numeric("qty_on_hand", { precision: 12, scale: 2, mode: "number" }).notNull().default(0),
  qtyReserved: numeric("qty_reserved", { precision: 12, scale: 2, mode: "number" }).notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
});

/** Created before serial_units so serial_units.dispatch_id can FK here (no cycle). */
export const dispatches = pgTable(
  "dispatches",
  {
    id: text("id").primaryKey(),
    orderId: text("order_id")
      .notNull()
      .references(() => orders.id),
    status: text("status").notNull(),
    dispatchedAt: timestamp("dispatched_at", { withTimezone: true }),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),
    packedBy: text("packed_by").references(() => users.id),
    vehicleNotes: text("vehicle_notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    check(
      "dispatches_status_check",
      sql`${table.status} in ('packing', 'in_transit', 'delivered', 'cancelled')`
    )
  ]
);

export const serialUnits = pgTable(
  "serial_units",
  {
    id: text("id").primaryKey(),
    productId: text("product_id")
      .notNull()
      .references(() => products.id),
    serialNumber: text("serial_number").notNull().unique(),
    status: text("status").notNull(),
    orderId: text("order_id").references(() => orders.id),
    dispatchId: text("dispatch_id").references(() => dispatches.id),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    check(
      "serial_units_status_check",
      sql`${table.status} in ('in_stock', 'reserved', 'dispatched', 'installed', 'returned', 'scrapped')`
    )
  ]
);
