import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import type { DispatchResult, SerialUnitResult, StockLevelResult } from "../../contracts/results.js";
import { ID_PREFIXES } from "../../contracts/id-prefixes.js";
import { db } from "../../db/client.js";
import { products } from "../../db/schema/catalog.js";
import { customers } from "../../db/schema/customers.js";
import { dispatches, serialUnits, stockLevels, type DispatchStatus } from "../../db/schema/inventory.js";
import { orders } from "../../db/schema/orders.js";
import { newId } from "../../lib/ids.js";
import { ServiceError } from "../../lib/service-error.js";
import { isUniqueViolation } from "../../lib/validate.js";
import type { DispatchCreate, ScanOut, SerialCreate, StockPatch } from "./schema.js";

const DISPATCHABLE = new Set(["paid", "packing"]);

export interface StockView extends StockLevelResult {
  productSku: string;
  productName: string;
  available: number;
}

export interface SerialView extends SerialUnitResult {
  productName: string;
  productSku: string;
}

export interface DispatchView extends DispatchResult {
  customerName: string;
}

function toStock(row: typeof stockLevels.$inferSelect, product: { sku: string; name: string }): StockView {
  return {
    id: row.id,
    productId: row.productId,
    qtyOnHand: row.qtyOnHand,
    qtyReserved: row.qtyReserved,
    updatedAt: row.updatedAt.toISOString(),
    productSku: product.sku,
    productName: product.name,
    available: row.qtyOnHand - row.qtyReserved
  };
}

function toSerial(row: typeof serialUnits.$inferSelect, product: { sku: string; name: string }): SerialView {
  return {
    id: row.id,
    productId: row.productId,
    serialNumber: row.serialNumber,
    status: row.status as SerialUnitResult["status"],
    orderId: row.orderId,
    dispatchId: row.dispatchId,
    deliveredAt: row.deliveredAt ? row.deliveredAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
    productName: product.name,
    productSku: product.sku
  };
}

function toDispatch(
  row: typeof dispatches.$inferSelect,
  customerName: string,
  serialUnitIds?: string[]
): DispatchView {
  return {
    id: row.id,
    orderId: row.orderId,
    status: row.status as DispatchResult["status"],
    dispatchedAt: row.dispatchedAt ? row.dispatchedAt.toISOString() : null,
    deliveredAt: row.deliveredAt ? row.deliveredAt.toISOString() : null,
    packedBy: row.packedBy,
    vehicleNotes: row.vehicleNotes,
    createdAt: row.createdAt.toISOString(),
    serialUnitIds,
    customerName
  };
}

export async function listStock(): Promise<StockView[]> {
  const rows = await db
    .select({ stock: stockLevels, sku: products.sku, name: products.name })
    .from(stockLevels)
    .innerJoin(products, eq(products.id, stockLevels.productId))
    .orderBy(asc(products.sku));
  return rows.map((row) => toStock(row.stock, { sku: row.sku, name: row.name }));
}

export async function updateStock(productId: string, input: StockPatch): Promise<StockView> {
  const [product] = await db.select().from(products).where(eq(products.id, productId)).limit(1);
  if (!product) throw new ServiceError(404, "Product not found.");
  const [current] = await db.select().from(stockLevels).where(eq(stockLevels.productId, productId)).limit(1);
  const nextOnHand = input.qtyOnHand ?? (current ? current.qtyOnHand : 0) + (input.deltaOnHand ?? 0);
  const nextReserved = input.qtyReserved ?? current?.qtyReserved ?? 0;
  if (nextOnHand < 0) throw new ServiceError(422, "On hand cannot be negative.");
  const values = {
    qtyOnHand: nextOnHand,
    qtyReserved: nextReserved,
    updatedAt: new Date()
  };
  const [row] = current
    ? await db.update(stockLevels).set(values).where(eq(stockLevels.id, current.id)).returning()
    : await db
        .insert(stockLevels)
        .values({ id: newId(ID_PREFIXES.stockLevel), productId, ...values })
        .returning();
  return toStock(row, product);
}

export async function listSerials(query: {
  serialNumber?: string;
  orderId?: string;
  dispatchId?: string;
  status?: string;
  productId?: string;
}): Promise<SerialView[]> {
  const filters = [];
  if (query.serialNumber) filters.push(eq(serialUnits.serialNumber, query.serialNumber));
  if (query.orderId) filters.push(eq(serialUnits.orderId, query.orderId));
  if (query.dispatchId) filters.push(eq(serialUnits.dispatchId, query.dispatchId));
  if (query.status) filters.push(eq(serialUnits.status, query.status));
  if (query.productId) filters.push(eq(serialUnits.productId, query.productId));
  const rows = await db
    .select({ serial: serialUnits, sku: products.sku, name: products.name })
    .from(serialUnits)
    .innerJoin(products, eq(products.id, serialUnits.productId))
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(desc(serialUnits.createdAt));
  return rows.map((row) => toSerial(row.serial, { sku: row.sku, name: row.name }));
}

type DbTx = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function bumpStock(tx: DbTx, productId: string, deltaOnHand: number): Promise<void> {
  const [current] = await tx.select().from(stockLevels).where(eq(stockLevels.productId, productId)).limit(1);
  const nextOnHand = (current?.qtyOnHand ?? 0) + deltaOnHand;
  if (nextOnHand < 0) throw new ServiceError(422, "On hand cannot be negative.");
  const values = { qtyOnHand: nextOnHand, qtyReserved: current?.qtyReserved ?? 0, updatedAt: new Date() };
  if (current) {
    await tx.update(stockLevels).set(values).where(eq(stockLevels.id, current.id));
    return;
  }
  await tx.insert(stockLevels).values({ id: newId(ID_PREFIXES.stockLevel), productId, ...values });
}

export async function createSerial(input: SerialCreate): Promise<SerialView> {
  const [product] = await db.select().from(products).where(eq(products.id, input.productId)).limit(1);
  if (!product) throw new ServiceError(404, "Product not found.");
  if (!product.isSerialized) throw new ServiceError(422, "Only serialized products can take a serial number.");
  try {
    const row = await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(serialUnits)
        .values({
          id: newId(ID_PREFIXES.serialUnit),
          productId: product.id,
          serialNumber: input.serialNumber,
          status: "in_stock"
        })
        .returning();
      await bumpStock(tx, product.id, 1);
      return created;
    });
    return toSerial(row, product);
  } catch (error) {
    if (isUniqueViolation(error)) throw new ServiceError(409, "That serial number is already in stock.");
    throw error;
  }
}

export async function scanOut(serialId: string, input: ScanOut): Promise<SerialView> {
  const [serial] = await db.select().from(serialUnits).where(eq(serialUnits.id, serialId)).limit(1);
  if (!serial) throw new ServiceError(404, "Serial not in stock.");
  if (serial.status !== "in_stock") {
    if (serial.orderId && serial.orderId !== input.orderId) {
      throw new ServiceError(409, "Serial is already on another order.");
    }
    throw new ServiceError(404, "Serial not in stock.");
  }
  if (serial.orderId && serial.orderId !== input.orderId) {
    throw new ServiceError(409, "Serial is already on another order.");
  }
  const [dispatch] = await db.select().from(dispatches).where(eq(dispatches.id, input.dispatchId)).limit(1);
  if (!dispatch) throw new ServiceError(404, "Dispatch not found.");
  if (dispatch.orderId !== input.orderId) throw new ServiceError(422, "Dispatch does not belong to this order.");
  if (dispatch.status === "delivered" || dispatch.status === "cancelled") {
    throw new ServiceError(422, "This dispatch is closed.");
  }
  const [product] = await db.select().from(products).where(eq(products.id, serial.productId)).limit(1);
  if (!product) throw new ServiceError(404, "Product not found.");
  const row = await db.transaction(async (tx) => {
    const [updated] = await tx
      .update(serialUnits)
      .set({
        status: "dispatched",
        orderId: input.orderId,
        dispatchId: dispatch.id
      })
      .where(eq(serialUnits.id, serial.id))
      .returning();
    await bumpStock(tx, serial.productId, -1);
    return updated;
  });
  return toSerial(row, product);
}

async function dispatchCustomer(orderId: string): Promise<string> {
  const [row] = await db
    .select({ name: customers.name })
    .from(orders)
    .innerJoin(customers, eq(customers.id, orders.customerId))
    .where(eq(orders.id, orderId))
    .limit(1);
  return row?.name ?? "";
}

async function serialIdsFor(dispatchIds: string[]): Promise<Map<string, string[]>> {
  const map = new Map<string, string[]>();
  if (dispatchIds.length === 0) return map;
  const rows = await db
    .select({ id: serialUnits.id, dispatchId: serialUnits.dispatchId })
    .from(serialUnits)
    .where(inArray(serialUnits.dispatchId, dispatchIds));
  for (const row of rows) {
    if (!row.dispatchId) continue;
    const list = map.get(row.dispatchId) ?? [];
    list.push(row.id);
    map.set(row.dispatchId, list);
  }
  return map;
}

export async function listDispatches(query: { orderId?: string; status?: DispatchStatus }): Promise<DispatchView[]> {
  const filters = [];
  if (query.orderId) filters.push(eq(dispatches.orderId, query.orderId));
  if (query.status) filters.push(eq(dispatches.status, query.status));
  const rows = await db
    .select({ dispatch: dispatches, customerName: customers.name })
    .from(dispatches)
    .innerJoin(orders, eq(orders.id, dispatches.orderId))
    .innerJoin(customers, eq(customers.id, orders.customerId))
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(desc(dispatches.createdAt));
  const serials = await serialIdsFor(rows.map((row) => row.dispatch.id));
  return rows.map((row) => toDispatch(row.dispatch, row.customerName, serials.get(row.dispatch.id) ?? []));
}

export async function getDispatch(id: string): Promise<DispatchView> {
  const [row] = await db.select().from(dispatches).where(eq(dispatches.id, id)).limit(1);
  if (!row) throw new ServiceError(404, "Dispatch not found.");
  const serials = await serialIdsFor([id]);
  return toDispatch(row, await dispatchCustomer(row.orderId), serials.get(id) ?? []);
}

export async function createDispatch(input: DispatchCreate, packedBy: string): Promise<DispatchView> {
  const id = newId(ID_PREFIXES.dispatch);
  await db.transaction(async (tx) => {
    await tx.execute(sql`select id from orders where id = ${input.orderId} for update`);
    const [order] = await tx.select().from(orders).where(eq(orders.id, input.orderId)).limit(1);
    if (!order) throw new ServiceError(404, "Order not found.");
    if (!DISPATCHABLE.has(order.status)) {
      throw new ServiceError(422, "Record at least 30% before packing this order.");
    }
    const open = await tx
      .select({ id: dispatches.id })
      .from(dispatches)
      .where(and(eq(dispatches.orderId, order.id), inArray(dispatches.status, ["packing", "in_transit"])));
    if (open.length > 0) throw new ServiceError(409, "This order already has an open dispatch.");
    await tx.insert(dispatches).values({
      id,
      orderId: order.id,
      status: "packing",
      packedBy,
      vehicleNotes: input.vehicleNotes ?? null
    });
    await tx.update(orders).set({ status: "packing", updatedAt: new Date() }).where(eq(orders.id, order.id));
  });
  return getDispatch(id);
}

export async function markInTransit(id: string): Promise<DispatchView> {
  const current = await getDispatch(id);
  if (current.status !== "packing") throw new ServiceError(422, "Only a packing dispatch can leave the warehouse.");
  await db
    .update(dispatches)
    .set({ status: "in_transit", dispatchedAt: new Date() })
    .where(eq(dispatches.id, id));
  return getDispatch(id);
}

export async function deliverDispatch(id: string): Promise<DispatchView> {
  const [current] = await db.select().from(dispatches).where(eq(dispatches.id, id)).limit(1);
  if (!current) throw new ServiceError(404, "Dispatch not found.");
  if (current.status !== "packing" && current.status !== "in_transit") {
    throw new ServiceError(422, "This dispatch cannot be delivered.");
  }
  const now = new Date();
  await db.transaction(async (tx) => {
    await tx
      .update(dispatches)
      .set({
        status: "delivered",
        deliveredAt: now,
        dispatchedAt: current.dispatchedAt ?? now
      })
      .where(eq(dispatches.id, id));
    await tx.update(serialUnits).set({ deliveredAt: now }).where(eq(serialUnits.dispatchId, id));
    await tx.update(orders).set({ status: "dispatched", updatedAt: now }).where(eq(orders.id, current.orderId));
  });
  return getDispatch(id);
}
