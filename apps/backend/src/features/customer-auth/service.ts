import { createHash, randomInt, timingSafeEqual } from "node:crypto";
import { and, asc, desc, eq, isNull } from "drizzle-orm";
import { ID_PREFIXES } from "../../contracts/id-prefixes.js";
import { db } from "../../db/client.js";
import { customerAccounts, customerOtps } from "../../db/schema/customer-portal.js";
import { products } from "../../db/schema/catalog.js";
import { customers } from "../../db/schema/customers.js";
import { dispatches, serialUnits } from "../../db/schema/inventory.js";
import { orders, payments } from "../../db/schema/orders.js";
import { quotes } from "../../db/schema/quotes.js";
import { newId } from "../../lib/ids.js";
import { ServiceError } from "../../lib/service-error.js";
import { acceptQuote, getQuote, rejectQuote, type QuoteView } from "../quotes/service.js";

const OTP_MINUTES = 10;
const MAX_ATTEMPTS = 5;
const VIEWABLE = new Set(["sent", "accepted", "rejected"]);

function hashCode(code: string): string {
  const secret = process.env.JWT_SECRET ?? "";
  return createHash("sha256").update(`${secret}:${code}`).digest("hex");
}

function hashesMatch(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function devCodeAllowed(): boolean {
  return process.env.NODE_ENV !== "production";
}

async function quoteForPhone(quoteId: string, phone: string) {
  const [row] = await db
    .select({ quote: quotes, customer: customers })
    .from(quotes)
    .innerJoin(customers, eq(customers.id, quotes.customerId))
    .where(eq(quotes.id, quoteId))
    .limit(1);
  if (!row) throw new ServiceError(404, "Quote not found.");
  if (row.customer.phone !== phone) {
    throw new ServiceError(400, "Use the mobile number from your inquiry.");
  }
  if (!VIEWABLE.has(row.quote.status)) {
    throw new ServiceError(400, "This quote is not ready to view.");
  }
  return row;
}

async function issueCode(phone: string): Promise<{ devCode?: string }> {
  const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
  const now = new Date();
  await db
    .update(customerOtps)
    .set({ consumedAt: now })
    .where(and(eq(customerOtps.phone, phone), isNull(customerOtps.consumedAt)));
  await db.insert(customerOtps).values({
    id: newId(ID_PREFIXES.customerOtp),
    phone,
    codeHash: hashCode(code),
    expiresAt: new Date(now.getTime() + OTP_MINUTES * 60_000),
    attempts: 0
  });
  if (devCodeAllowed()) {
    console.info(`[customer-otp] ${phone} ${code}`);
    return { devCode: code };
  }
  return {};
}

async function customerByPhone(phone: string) {
  const [customer] = await db.select().from(customers).where(eq(customers.phone, phone)).limit(1);
  return customer ?? null;
}

async function consumeCode(phone: string, code: string): Promise<void> {
  const [otp] = await db
    .select()
    .from(customerOtps)
    .where(and(eq(customerOtps.phone, phone), isNull(customerOtps.consumedAt)))
    .orderBy(desc(customerOtps.createdAt))
    .limit(1);
  if (!otp || otp.expiresAt.getTime() < Date.now()) {
    throw new ServiceError(400, "That code has expired. Request a new one.");
  }
  if (otp.attempts >= MAX_ATTEMPTS) {
    throw new ServiceError(400, "Too many attempts. Request a new code.");
  }
  if (!hashesMatch(otp.codeHash, hashCode(code))) {
    const attempts = otp.attempts + 1;
    await db
      .update(customerOtps)
      .set({ attempts, consumedAt: attempts >= MAX_ATTEMPTS ? new Date() : null })
      .where(eq(customerOtps.id, otp.id));
    throw new ServiceError(400, "That code is not correct.");
  }
  await db.update(customerOtps).set({ consumedAt: new Date() }).where(eq(customerOtps.id, otp.id));
}

async function ensureAccount(customerId: string, phone: string): Promise<{ accountId: string; customerId: string }> {
  const [existing] = await db.select().from(customerAccounts).where(eq(customerAccounts.customerId, customerId)).limit(1);
  if (existing) return { accountId: existing.id, customerId: existing.customerId };
  const [created] = await db
    .insert(customerAccounts)
    .values({ id: newId(ID_PREFIXES.customerAccount), customerId, phone })
    .returning();
  return { accountId: created.id, customerId: created.customerId };
}

export async function requestOtp(phone: string, quoteId: string): Promise<{ devCode?: string }> {
  await quoteForPhone(quoteId, phone);
  return issueCode(phone);
}

export async function requestSignInOtp(phone: string): Promise<{ devCode?: string }> {
  const customer = await customerByPhone(phone);
  if (!customer) throw new ServiceError(400, "Submit an inquiry before signing in.");
  return issueCode(phone);
}

export async function verifyOtp(phone: string, quoteId: string, code: string): Promise<{ accountId: string; customerId: string }> {
  const linked = await quoteForPhone(quoteId, phone);
  await consumeCode(phone, code);
  return ensureAccount(linked.customer.id, phone);
}

export async function verifySignInOtp(phone: string, code: string): Promise<{ accountId: string; customerId: string }> {
  const customer = await customerByPhone(phone);
  if (!customer) throw new ServiceError(400, "Submit an inquiry before signing in.");
  await consumeCode(phone, code);
  return ensureAccount(customer.id, phone);
}

function addMonths(date: Date, months: number): Date {
  const next = new Date(date.getTime());
  next.setUTCMonth(next.getUTCMonth() + months);
  return next;
}

export interface CustomerOrderView {
  id: string;
  status: string;
  systemKw: number;
  systemKind: string;
  siteAddress: string;
  totalInr: number;
  paidInr: number;
  balanceInr: number;
  payments: { id: string; amountInr: number; kind: string; method: string | null; paidAt: string; reference: string | null }[];
  dispatches: { id: string; status: string; dispatchedAt: string | null; deliveredAt: string | null; vehicleNotes: string | null }[];
  serials: {
    id: string;
    serialNumber: string;
    productName: string;
    status: string;
    deliveredAt: string | null;
    warrantyEndsAt: string | null;
    underWarranty: boolean | null;
  }[];
}

export async function listCustomerOrders(customerId: string): Promise<CustomerOrderView[]> {
  const orderRows = await db.select().from(orders).where(eq(orders.customerId, customerId)).orderBy(desc(orders.createdAt));
  const views: CustomerOrderView[] = [];
  for (const order of orderRows) {
    const paymentRows = await db.select().from(payments).where(eq(payments.orderId, order.id)).orderBy(asc(payments.paidAt));
    const dispatchRows = await db.select().from(dispatches).where(eq(dispatches.orderId, order.id));
    const serialRows = await db
      .select({ serial: serialUnits, productName: products.name, warrantyMonths: products.defaultWarrantyMonths })
      .from(serialUnits)
      .innerJoin(products, eq(products.id, serialUnits.productId))
      .where(eq(serialUnits.orderId, order.id));
    const paidInr = paymentRows.reduce((sum, row) => sum + row.amountInr, 0);
    views.push({
      id: order.id,
      status: order.status,
      systemKw: order.systemKw,
      systemKind: order.systemKind,
      siteAddress: order.siteAddress,
      totalInr: order.totalInr,
      paidInr,
      balanceInr: Math.max(order.totalInr - paidInr, 0),
      payments: paymentRows.map((row) => ({
        id: row.id,
        amountInr: row.amountInr,
        kind: row.kind,
        method: row.method,
        paidAt: row.paidAt.toISOString(),
        reference: row.reference
      })),
      dispatches: dispatchRows.map((row) => ({
        id: row.id,
        status: row.status,
        dispatchedAt: row.dispatchedAt ? row.dispatchedAt.toISOString() : null,
        deliveredAt: row.deliveredAt ? row.deliveredAt.toISOString() : null,
        vehicleNotes: row.vehicleNotes
      })),
      serials: serialRows.map((row) => {
        const deliveredAt = row.serial.deliveredAt;
        const ends = deliveredAt && row.warrantyMonths != null ? addMonths(deliveredAt, row.warrantyMonths) : null;
        return {
          id: row.serial.id,
          serialNumber: row.serial.serialNumber,
          productName: row.productName,
          status: row.serial.status,
          deliveredAt: deliveredAt ? deliveredAt.toISOString() : null,
          warrantyEndsAt: ends ? ends.toISOString() : null,
          underWarranty: ends ? Date.now() <= ends.getTime() : null
        };
      })
    });
  }
  return views;
}

export async function getOwnedQuote(quoteId: string, customerId: string): Promise<QuoteView> {
  const quote = await getQuote(quoteId);
  if (quote.customerId !== customerId) throw new ServiceError(403, "This quote is not yours.");
  if (!VIEWABLE.has(quote.status)) throw new ServiceError(400, "This quote is not ready to view.");
  return quote;
}

export async function customerDecide(quoteId: string, customerId: string, decision: "accept" | "reject"): Promise<QuoteView> {
  const quote = await getOwnedQuote(quoteId, customerId);
  if (quote.status !== "sent") throw new ServiceError(400, "This quote is already decided.");
  return decision === "accept" ? acceptQuote(quoteId) : rejectQuote(quoteId);
}
