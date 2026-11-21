import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import type { OrderResult, PaymentResult } from "../../contracts/results.js";
import { ID_PREFIXES } from "../../contracts/id-prefixes.js";
import { db } from "../../db/client.js";
import { packages } from "../../db/schema/catalog.js";
import { customers } from "../../db/schema/customers.js";
import { enquiries } from "../../db/schema/enquiries.js";
import { dispatches } from "../../db/schema/inventory.js";
import { installations } from "../../db/schema/installations.js";
import { orders, payments, type OrderStatus } from "../../db/schema/orders.js";
import { quotes } from "../../db/schema/quotes.js";
import { users } from "../../db/schema/users.js";
import { isBeforeTodayInIndia } from "../../lib/dates.js";
import { newId } from "../../lib/ids.js";
import { ServiceError } from "../../lib/service-error.js";
import type { OrderCreate, OrderPatch, PaymentInput, ScheduleInput } from "./schema.js";

const LOCKED_CANCEL = new Set<OrderStatus>(["packing", "dispatched", "installing", "completed"]);
const SCHEDULE_BLOCKED = new Set<OrderStatus>(["awaiting_payment", "cancelled"]);

export interface OrderListItem extends OrderResult {
  customerName: string;
  paidInr: number;
  balanceInr: number;
}

export interface OrderDetail extends OrderListItem {
  payments: PaymentResult[];
  dispatchIds: string[];
  installationId: string | null;
  leadTechnicianId: string | null;
}

function money(value: number): number {
  return Math.round(value * 100) / 100;
}

export function meetsAdvanceGate(paidInr: number, totalInr: number): boolean {
  const paid = Math.round(paidInr * 100);
  const total = Math.round(totalInr * 100);
  if (total <= 0) return paid >= 0;
  return paid * 10 >= total * 3;
}

/** Smallest rupee amount that satisfies the 30% packing gate for `totalInr`. */
export function minAdvanceInr(totalInr: number): number {
  const total = Math.round(totalInr * 100);
  if (total <= 0) return 0;
  return Math.ceil((total * 3) / 10) / 100;
}

function toPayment(row: typeof payments.$inferSelect): PaymentResult {
  return {
    id: row.id,
    orderId: row.orderId,
    amountInr: row.amountInr,
    kind: row.kind as PaymentResult["kind"],
    method: (row.method as PaymentResult["method"]) ?? null,
    paidAt: row.paidAt.toISOString(),
    reference: row.reference,
    recordedBy: row.recordedBy
  };
}

function toOrder(row: typeof orders.$inferSelect, customerName: string, paidInr: number): OrderListItem {
  return {
    id: row.id,
    quoteId: row.quoteId,
    customerId: row.customerId,
    enquiryId: row.enquiryId,
    status: row.status as OrderResult["status"],
    systemKw: row.systemKw,
    systemKind: row.systemKind as OrderResult["systemKind"],
    siteAddress: row.siteAddress,
    scheduledInstallAt: row.scheduledInstallAt ? row.scheduledInstallAt.toISOString() : null,
    totalInr: row.totalInr,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    customerName,
    paidInr: money(paidInr),
    balanceInr: money(Math.max(0, row.totalInr - paidInr))
  };
}

async function paidByOrder(orderIds: string[]): Promise<Map<string, number>> {
  const totals = new Map<string, number>();
  if (orderIds.length === 0) return totals;
  const rows = await db.select().from(payments).where(inArray(payments.orderId, orderIds));
  for (const row of rows) {
    totals.set(row.orderId, (totals.get(row.orderId) ?? 0) + row.amountInr);
  }
  return totals;
}

export async function listOrders(status?: OrderStatus): Promise<OrderListItem[]> {
  const rows = await db
    .select({ order: orders, customerName: customers.name })
    .from(orders)
    .innerJoin(customers, eq(customers.id, orders.customerId))
    .where(status ? eq(orders.status, status) : undefined)
    .orderBy(desc(orders.updatedAt), asc(orders.id));
  const paid = await paidByOrder(rows.map((row) => row.order.id));
  return rows.map((row) => toOrder(row.order, row.customerName, paid.get(row.order.id) ?? 0));
}

async function loadOrder(id: string): Promise<{ order: typeof orders.$inferSelect; customerName: string }> {
  const [row] = await db
    .select({ order: orders, customerName: customers.name })
    .from(orders)
    .innerJoin(customers, eq(customers.id, orders.customerId))
    .where(eq(orders.id, id))
    .limit(1);
  if (!row) throw new ServiceError(404, "Order not found.");
  return row;
}

export async function getOrder(id: string): Promise<OrderDetail> {
  const { order, customerName } = await loadOrder(id);
  const paymentRows = await db.select().from(payments).where(eq(payments.orderId, id)).orderBy(asc(payments.paidAt));
  const paidInr = paymentRows.reduce((sum, row) => sum + row.amountInr, 0);
  const dispatchRows = await db.select({ id: dispatches.id }).from(dispatches).where(eq(dispatches.orderId, id));
  const [installation] = await db
    .select()
    .from(installations)
    .where(eq(installations.orderId, id))
    .orderBy(desc(installations.createdAt))
    .limit(1);
  return {
    ...toOrder(order, customerName, paidInr),
    payments: paymentRows.map(toPayment),
    dispatchIds: dispatchRows.map((row) => row.id),
    installationId: installation?.id ?? null,
    leadTechnicianId: installation?.leadTechnicianId ?? null
  };
}

export async function listPayments(orderId: string): Promise<PaymentResult[]> {
  await loadOrder(orderId);
  const rows = await db.select().from(payments).where(eq(payments.orderId, orderId)).orderBy(asc(payments.paidAt));
  return rows.map(toPayment);
}

export async function createOrderFromQuote(input: OrderCreate): Promise<OrderDetail> {
  const [quote] = await db.select().from(quotes).where(eq(quotes.id, input.quoteId)).limit(1);
  if (!quote) throw new ServiceError(404, "Quote not found.");
  if (quote.status !== "accepted") throw new ServiceError(422, "Only an accepted quote can become an order.");
  const [existing] = await db.select({ id: orders.id }).from(orders).where(eq(orders.quoteId, quote.id)).limit(1);
  if (existing) throw new ServiceError(409, "This quote already has an order.");
  const [enquiry] = await db.select().from(enquiries).where(eq(enquiries.id, quote.enquiryId)).limit(1);
  if (!enquiry) throw new ServiceError(404, "Enquiry not found.");
  const [customer] = await db.select().from(customers).where(eq(customers.id, quote.customerId)).limit(1);
  if (!customer) throw new ServiceError(404, "Customer not found.");
  const [pkg] = quote.packageId
    ? await db.select().from(packages).where(eq(packages.id, quote.packageId)).limit(1)
    : [undefined];
  const systemKind =
    enquiry.systemKind ?? (pkg?.systemKind === "off_grid" ? "off_grid" : pkg?.systemKind === "on_grid" ? "on_grid" : null);
  if (!systemKind) throw new ServiceError(422, "Set on-grid or off-grid on the enquiry before creating the order.");
  const siteAddress = [customer.addressLine, customer.city, customer.pincode].filter(Boolean).join(", ");
  const id = newId(ID_PREFIXES.order);
  await db.insert(orders).values({
    id,
    quoteId: quote.id,
    customerId: quote.customerId,
    enquiryId: quote.enquiryId,
    status: "awaiting_payment",
    systemKw: pkg?.capacityKw ?? enquiry.requestedKw,
    systemKind,
    siteAddress,
    totalInr: quote.totalInr
  });
  return getOrder(id);
}

export async function updateOrder(id: string, input: OrderPatch): Promise<OrderDetail> {
  const { order } = await loadOrder(id);
  if (input.status && input.status !== "cancelled") {
    throw new ServiceError(422, "Only cancellation is allowed from this action.");
  }
  if (input.status === "cancelled") {
    if (order.status === "cancelled") throw new ServiceError(409, "This order is already cancelled.");
    if (LOCKED_CANCEL.has(order.status as OrderStatus)) {
      throw new ServiceError(422, "Cancel is blocked once packing has started.");
    }
  }
  if (input.scheduledInstallAt !== undefined && input.scheduledInstallAt !== null) {
    if (SCHEDULE_BLOCKED.has(order.status as OrderStatus)) {
      throw new ServiceError(422, "Record at least 30% before scheduling installation.");
    }
    if (isBeforeTodayInIndia(input.scheduledInstallAt)) {
      throw new ServiceError(400, "Installation can only be scheduled from today onwards.");
    }
  }
  await db
    .update(orders)
    .set({
      siteAddress: input.siteAddress ?? order.siteAddress,
      scheduledInstallAt:
        input.scheduledInstallAt === undefined
          ? order.scheduledInstallAt
          : input.scheduledInstallAt
            ? new Date(input.scheduledInstallAt)
            : null,
      status: input.status === "cancelled" ? "cancelled" : order.status,
      updatedAt: new Date()
    })
    .where(eq(orders.id, id));
  return getOrder(id);
}

export async function scheduleOrder(id: string, input: ScheduleInput): Promise<OrderDetail> {
  const { order } = await loadOrder(id);
  if (order.status === "cancelled") {
    throw new ServiceError(422, "Cancelled orders cannot be scheduled.");
  }
  if (order.status === "awaiting_payment") {
    throw new ServiceError(422, "Record at least 30% before scheduling installation.");
  }
  if (isBeforeTodayInIndia(input.scheduledInstallAt)) {
    throw new ServiceError(400, "Installation can only be scheduled from today onwards.");
  }
  const [tech] = await db.select().from(users).where(eq(users.id, input.leadTechnicianId)).limit(1);
  if (!tech || tech.role !== "technician" || !tech.isActive) {
    throw new ServiceError(422, "Choose an active technician.");
  }
  const when = new Date(input.scheduledInstallAt);
  await db.transaction(async (tx) => {
    await tx
      .update(orders)
      .set({ scheduledInstallAt: when, updatedAt: new Date() })
      .where(eq(orders.id, id));
    const [existing] = await tx.select().from(installations).where(eq(installations.orderId, id)).limit(1);
    if (!existing) {
      await tx.insert(installations).values({
        id: newId(ID_PREFIXES.installation),
        orderId: id,
        leadTechnicianId: tech.id,
        status: "scheduled"
      });
      return;
    }
    await tx
      .update(installations)
      .set({
        leadTechnicianId: tech.id,
        status: existing.status === "completed" ? existing.status : "scheduled"
      })
      .where(eq(installations.id, existing.id));
  });
  return getOrder(id);
}

export async function recordPayment(
  orderId: string,
  input: PaymentInput,
  recordedBy: string | null,
  options?: { capToBalance?: boolean }
): Promise<PaymentResult> {
  const amountInr = money(input.amountInr);
  const reference = input.reference?.trim() || null;
  const paymentId = newId(ID_PREFIXES.payment);
  let created: typeof payments.$inferSelect | undefined;
  await db.transaction(async (tx) => {
    await tx.execute(sql`select id from orders where id = ${orderId} for update`);
    const [order] = await tx.select().from(orders).where(eq(orders.id, orderId)).limit(1);
    if (!order) throw new ServiceError(404, "Order not found.");
    if (order.status === "cancelled") throw new ServiceError(422, "Cancelled orders cannot take payments.");
    // Balance after dispatch/install/complete is allowed; only cancelled is blocked.
    const existing = await tx.select().from(payments).where(eq(payments.orderId, orderId));
    if (reference) {
      const duplicate = existing.some((row) => row.reference === reference);
      if (duplicate) throw new ServiceError(409, "This UTR is already recorded on this order.");
    }
    const paidSoFar = existing.reduce((sum, row) => sum + row.amountInr, 0);
    const balance = money(Math.max(0, order.totalInr - paidSoFar));
    if (options?.capToBalance && amountInr > balance) {
      throw new ServiceError(422, "Amount cannot be more than the balance.");
    }
    const [row] = await tx
      .insert(payments)
      .values({
        id: paymentId,
        orderId,
        amountInr,
        kind: input.kind,
        method: input.method ?? null,
        reference,
        recordedBy
      })
      .returning();
    created = row;
    const paid = paidSoFar + amountInr;
    if (order.status === "awaiting_payment" && meetsAdvanceGate(paid, order.totalInr)) {
      await tx.update(orders).set({ status: "paid", updatedAt: new Date() }).where(eq(orders.id, orderId));
    }
  });
  if (!created) throw new ServiceError(500, "Payment was not recorded.");
  return toPayment(created);
}
