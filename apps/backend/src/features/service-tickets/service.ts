import { and, asc, desc, eq } from "drizzle-orm";
import type { ServiceTicketResult } from "../../contracts/results.js";
import { ID_PREFIXES } from "../../contracts/id-prefixes.js";
import { db } from "../../db/client.js";
import { products } from "../../db/schema/catalog.js";
import { serialUnits } from "../../db/schema/inventory.js";
import { orders } from "../../db/schema/orders.js";
import { serviceTickets, type ServiceTicketStatus } from "../../db/schema/service-tickets.js";
import { newId } from "../../lib/ids.js";
import { ServiceError } from "../../lib/service-error.js";

function toTicket(row: typeof serviceTickets.$inferSelect): ServiceTicketResult {
  return {
    id: row.id,
    customerId: row.customerId,
    orderId: row.orderId,
    serialUnitId: row.serialUnitId,
    openedBy: row.openedBy,
    assignedTo: row.assignedTo,
    faultCode: row.faultCode,
    description: row.description,
    underWarranty: row.underWarranty,
    billableInr: row.billableInr,
    status: row.status as ServiceTicketResult["status"],
    resolvedAt: row.resolvedAt ? row.resolvedAt.toISOString() : null,
    customerConfirmedAt: row.customerConfirmedAt ? row.customerConfirmedAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString()
  };
}

function addMonths(date: Date, months: number): Date {
  const next = new Date(date.getTime());
  next.setUTCMonth(next.getUTCMonth() + months);
  return next;
}

export interface CustomerTicketView extends ServiceTicketResult {
  serialNumber: string | null;
  productName: string | null;
}

export async function listServiceTickets(filters?: {
  status?: ServiceTicketStatus;
  customerId?: string;
}): Promise<ServiceTicketResult[]> {
  const clauses = [];
  if (filters?.status) clauses.push(eq(serviceTickets.status, filters.status));
  if (filters?.customerId) clauses.push(eq(serviceTickets.customerId, filters.customerId));

  const rows = await db
    .select()
    .from(serviceTickets)
    .where(clauses.length ? and(...clauses) : undefined)
    .orderBy(desc(serviceTickets.createdAt), asc(serviceTickets.id));

  return rows.map(toTicket);
}

export async function listCustomerTickets(customerId: string): Promise<CustomerTicketView[]> {
  const rows = await db
    .select({
      ticket: serviceTickets,
      serialNumber: serialUnits.serialNumber,
      productName: products.name
    })
    .from(serviceTickets)
    .leftJoin(serialUnits, eq(serialUnits.id, serviceTickets.serialUnitId))
    .leftJoin(products, eq(products.id, serialUnits.productId))
    .where(eq(serviceTickets.customerId, customerId))
    .orderBy(desc(serviceTickets.createdAt));

  return rows.map((row) => ({
    ...toTicket(row.ticket),
    serialNumber: row.serialNumber ?? null,
    productName: row.productName ?? null
  }));
}

export async function createCustomerTicket(
  customerId: string,
  input: { serialUnitId: string; faultCode?: string; description: string; billableInr?: number }
): Promise<CustomerTicketView> {
  const [serial] = await db
    .select({
      unit: serialUnits,
      productName: products.name,
      warrantyMonths: products.defaultWarrantyMonths
    })
    .from(serialUnits)
    .innerJoin(products, eq(products.id, serialUnits.productId))
    .where(eq(serialUnits.id, input.serialUnitId))
    .limit(1);

  if (!serial || !serial.unit.orderId) throw new ServiceError(404, "Serial not found on your orders.");
  if (!serial.unit.deliveredAt) throw new ServiceError(422, "Service requests open after the kit is delivered.");

  const [order] = await db.select().from(orders).where(eq(orders.id, serial.unit.orderId)).limit(1);
  if (!order || order.customerId !== customerId) throw new ServiceError(404, "Serial not found on your orders.");

  const ends =
    serial.warrantyMonths != null ? addMonths(serial.unit.deliveredAt, serial.warrantyMonths) : null;
  const underWarranty = ends ? Date.now() <= ends.getTime() : false;
  if (!underWarranty && (input.billableInr == null || input.billableInr < 0)) {
    throw new ServiceError(400, "Enter a billable amount for out-of-warranty service.");
  }

  const id = newId(ID_PREFIXES.serviceTicket);
  const [row] = await db
    .insert(serviceTickets)
    .values({
      id,
      customerId,
      orderId: serial.unit.orderId,
      serialUnitId: serial.unit.id,
      faultCode: input.faultCode ?? null,
      description: input.description,
      underWarranty,
      billableInr: underWarranty ? 0 : (input.billableInr ?? 0),
      status: "open"
    })
    .returning();

  return {
    ...toTicket(row),
    serialNumber: serial.unit.serialNumber,
    productName: serial.productName
  };
}
