import { sql } from "drizzle-orm";
import { boolean, check, integer, numeric, pgTable, text } from "drizzle-orm/pg-core";

export const PRODUCT_CATEGORIES = [
  "panel",
  "inverter",
  "battery",
  "charge_controller",
  "mount",
  "wiring",
  "safety",
  "service"
] as const;
export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];

export const PACKAGE_SYSTEM_KINDS = ["on_grid", "off_grid", "panel_set", "installation_only"] as const;
export type PackageSystemKind = (typeof PACKAGE_SYSTEM_KINDS)[number];

export const products = pgTable(
  "products",
  {
    id: text("id").primaryKey(),
    sku: text("sku").notNull().unique(),
    name: text("name").notNull(),
    category: text("category").notNull(),
    unit: text("unit").notNull().default("pcs"),
    unitPriceInr: numeric("unit_price_inr", { precision: 12, scale: 2, mode: "number" }).notNull(),
    unitCostInr: numeric("unit_cost_inr", { precision: 12, scale: 2, mode: "number" }).notNull().default(0),
    isSerialized: boolean("is_serialized").notNull().default(false),
    defaultWarrantyMonths: integer("default_warranty_months"),
    isActive: boolean("is_active").notNull().default(true)
  },
  (table) => [
    check(
      "products_category_check",
      sql`${table.category} in ('panel', 'inverter', 'battery', 'charge_controller', 'mount', 'wiring', 'safety', 'service')`
    )
  ]
);

export const packages = pgTable(
  "packages",
  {
    id: text("id").primaryKey(),
    code: text("code").notNull().unique(),
    name: text("name").notNull(),
    systemKind: text("system_kind").notNull(),
    capacityKw: numeric("capacity_kw", { precision: 4, scale: 1, mode: "number" }),
    basePriceInr: numeric("base_price_inr", { precision: 12, scale: 2, mode: "number" }).notNull(),
    isActive: boolean("is_active").notNull().default(true)
  },
  (table) => [
    check(
      "packages_system_kind_check",
      sql`${table.systemKind} in ('on_grid', 'off_grid', 'panel_set', 'installation_only')`
    )
  ]
);

export const packageItems = pgTable("package_items", {
  id: text("id").primaryKey(),
  packageId: text("package_id")
    .notNull()
    .references(() => packages.id),
  productId: text("product_id")
    .notNull()
    .references(() => products.id),
  qty: numeric("qty", { precision: 10, scale: 2, mode: "number" }).notNull()
});
