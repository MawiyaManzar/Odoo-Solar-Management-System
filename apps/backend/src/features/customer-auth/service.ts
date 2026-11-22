import { createHash, randomInt, timingSafeEqual } from "node:crypto";
import { and, asc, desc, eq, inArray, isNull } from "drizzle-orm";
import { ID_PREFIXES } from "../../contracts/id-prefixes.js";
import { db } from "../../db/client.js";
import { customerAccounts, customerOtps } from "../../db/schema/customer-portal.js";
import { products } from "../../db/schema/catalog.js";
import { customers } from "../../db/schema/customers.js";
import { dispatches, serialUnits } from "../../db/schema/inventory.js";
import { orders, payments } from "../../db/schema/orders.js";
import { quotes } from "../../db/schema/quotes.js";
import type { PaymentResult } from "../../contracts/results.js";
import { newId } from "../../lib/ids.js";
import { ServiceError } from "../../lib/service-error.js";
import { frontendBaseUrl, getStripe } from "../../lib/stripe.js";
import { recordPayment } from "../orders/service.js";
import { acceptQuote, getQuote, listQuotes, rejectQuote, type QuoteView } from "../quotes/service.js";

const OTP_MINUTES = 10;
const MAX_ATTEMPTS = 5;
const VIEWABLE = new Set(["sent", "accepted", "rejected", "expired"]);
const LIST_VIEWABLE = VIEWABLE;

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
  if (orderRows.length === 0) return [];
  const orderIds = orderRows.map((row) => row.id);
  const [paymentRows, dispatchRows, serialRows] = await Promise.all([
    db.select().from(payments).where(inArray(payments.orderId, orderIds)).orderBy(asc(payments.paidAt)),
    db.select().from(dispatches).where(inArray(dispatches.orderId, orderIds)),
    db
      .select({ serial: serialUnits, productName: products.name, warrantyMonths: products.defaultWarrantyMonths })
      .from(serialUnits)
      .innerJoin(products, eq(products.id, serialUnits.productId))
      .where(inArray(serialUnits.orderId, orderIds))
  ]);
  const paymentsByOrder = new Map<string, typeof paymentRows>();
  for (const row of paymentRows) {
    const list = paymentsByOrder.get(row.orderId) ?? [];
    list.push(row);
    paymentsByOrder.set(row.orderId, list);
  }
  const dispatchesByOrder = new Map<string, typeof dispatchRows>();
  for (const row of dispatchRows) {
    const list = dispatchesByOrder.get(row.orderId) ?? [];
    list.push(row);
    dispatchesByOrder.set(row.orderId, list);
  }
  const serialsByOrder = new Map<string, typeof serialRows>();
  for (const row of serialRows) {
    if (!row.serial.orderId) continue;
    const list = serialsByOrder.get(row.serial.orderId) ?? [];
    list.push(row);
    serialsByOrder.set(row.serial.orderId, list);
  }
  return orderRows.map((order) => {
    const orderPayments = paymentsByOrder.get(order.id) ?? [];
    const orderDispatches = dispatchesByOrder.get(order.id) ?? [];
    const orderSerials = serialsByOrder.get(order.id) ?? [];
    const paidInr = orderPayments.reduce((sum, row) => sum + row.amountInr, 0);
    return {
      id: order.id,
      status: order.status,
      systemKw: order.systemKw,
      systemKind: order.systemKind,
      siteAddress: order.siteAddress,
      totalInr: order.totalInr,
      paidInr,
      balanceInr: Math.max(order.totalInr - paidInr, 0),
      payments: orderPayments.map((row) => ({
        id: row.id,
        amountInr: row.amountInr,
        kind: row.kind,
        method: row.method,
        paidAt: row.paidAt.toISOString(),
        reference: row.reference
      })),
      dispatches: orderDispatches.map((row) => ({
        id: row.id,
        status: row.status,
        dispatchedAt: row.dispatchedAt ? row.dispatchedAt.toISOString() : null,
        deliveredAt: row.deliveredAt ? row.deliveredAt.toISOString() : null,
        vehicleNotes: row.vehicleNotes
      })),
      serials: orderSerials.map((row) => {
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
    };
  });
}

export async function getOwnedQuote(quoteId: string, customerId: string): Promise<QuoteView> {
  const quote = await getQuote(quoteId);
  if (quote.customerId !== customerId) throw new ServiceError(403, "This quote is not yours.");
  if (!VIEWABLE.has(quote.status)) throw new ServiceError(400, "This quote is not ready to view.");
  return quote;
}

function paymentKindForAmount(
  amountInr: number,
  paidInr: number,
  balanceInr: number
): "advance" | "balance" | "full" {
  if (amountInr >= balanceInr) return "full";
  if (paidInr > 0) return "balance";
  return "advance";
}

export async function createCustomerCheckout(
  customerId: string,
  orderId: string,
  amountInr: number
): Promise<{ sessionId: string; url: string }> {
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!order || order.customerId !== customerId) throw new ServiceError(404, "Order not found.");
  if (order.status === "cancelled") throw new ServiceError(422, "Cancelled orders cannot take payments.");

  const paidRows = await db.select().from(payments).where(eq(payments.orderId, orderId));
  const paidInr = paidRows.reduce((sum, row) => sum + row.amountInr, 0);
  const balanceInr = Math.round(Math.max(0, order.totalInr - paidInr) * 100) / 100;
  const amount = Math.round(amountInr * 100) / 100;
  if (amount <= 0) throw new ServiceError(400, "Amount must be greater than zero.");
  if (amount > balanceInr) throw new ServiceError(422, "Amount cannot be more than the balance.");

  const kind = paymentKindForAmount(amount, paidInr, balanceInr);
  const stripe = getStripe();
  const base = frontendBaseUrl();
  let session;
  try {
    session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "inr",
            unit_amount: Math.round(amount * 100),
            product_data: {
              name: `SunPower order ${orderId}`,
              description: `${kind} payment · ${order.systemKw} kW ${order.systemKind.replace("_", "-")}`
            }
          }
        }
      ],
      success_url: `${base}/my/jobs?paid=1&order_id=${encodeURIComponent(orderId)}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/my/jobs?cancelled=1&order_id=${encodeURIComponent(orderId)}`,
      metadata: {
        orderId,
        customerId,
        kind,
        amountInr: String(amount)
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Stripe checkout failed.";
    throw new ServiceError(502, message);
  }

  if (!session.url) throw new ServiceError(502, "Stripe did not return a checkout URL.");
  return { sessionId: session.id, url: session.url };
}

export async function confirmCustomerCheckout(
  customerId: string,
  orderId: string,
  sessionId: string
): Promise<PaymentResult> {
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!order || order.customerId !== customerId) throw new ServiceError(404, "Order not found.");

  const existing = await db.select().from(payments).where(eq(payments.orderId, orderId));
  const already = existing.find((row) => row.reference === sessionId);
  if (already) {
    return {
      id: already.id,
      orderId: already.orderId,
      amountInr: already.amountInr,
      kind: already.kind as PaymentResult["kind"],
      method: (already.method as PaymentResult["method"]) ?? null,
      paidAt: already.paidAt.toISOString(),
      reference: already.reference,
      recordedBy: already.recordedBy
    };
  }

  const stripe = getStripe();
  const session = await stripe.checkout.sessions.retrieve(sessionId);
  if (session.metadata?.orderId !== orderId || session.metadata?.customerId !== customerId) {
    throw new ServiceError(400, "This Stripe session does not match this order.");
  }
  if (session.payment_status !== "paid") {
    throw new ServiceError(402, "Payment is not complete yet. Finish checkout, then return here.");
  }

  const amountInr = Number(
    session.metadata.amountInr ?? (session.amount_total != null ? session.amount_total / 100 : NaN)
  );
  if (!Number.isFinite(amountInr) || amountInr <= 0) {
    throw new ServiceError(502, "Stripe session is missing a valid amount.");
  }
  const kind = (session.metadata.kind as "advance" | "balance" | "full" | undefined) ?? "advance";

  try {
    return await recordPayment(
      orderId,
      { amountInr, kind, method: "stripe", reference: sessionId },
      null,
      { capToBalance: true }
    );
  } catch (error) {
    if (error instanceof ServiceError && error.statusCode === 409) {
      const rows = await db.select().from(payments).where(eq(payments.orderId, orderId));
      const row = rows.find((item) => item.reference === sessionId);
      if (row) {
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
    }
    throw error;
  }
}

export async function customerDecide(quoteId: string, customerId: string, decision: "accept" | "reject"): Promise<QuoteView> {
  const quote = await getOwnedQuote(quoteId, customerId);
  if (quote.status !== "sent") throw new ServiceError(400, "This quote is already decided.");
  return decision === "accept" ? acceptQuote(quoteId) : rejectQuote(quoteId);
}

export async function listCustomerQuotes(customerId: string): Promise<QuoteView[]> {
  const rows = await listQuotes({ customerId });
  return rows.filter((row) => LIST_VIEWABLE.has(row.status));
}

export async function askCustomerSupport(
  customerId: string,
  question: string
): Promise<{ answer: string; topic: string }> {
  const q = question.toLowerCase();
  const [orderList, quoteList] = await Promise.all([listCustomerOrders(customerId), listCustomerQuotes(customerId)]);
  const latest = orderList[0];
  const openQuote = quoteList.find((row) => row.status === "sent");

  if (/\b(pay|payment|upi|balance|advance|utr|money|card|stripe)\b/.test(q)) {
    if (!latest) {
      return {
        topic: "payment",
        answer:
          "You do not have an order yet. Accept a sent quote first. After that you can pay by card on My Job (30% unlocks packing)."
      };
    }
    return {
      topic: "payment",
      answer: `Order ${latest.id} total is ₹${latest.totalInr.toLocaleString("en-IN")}, paid ₹${latest.paidInr.toLocaleString("en-IN")}, balance ₹${latest.balanceInr.toLocaleString("en-IN")}. Status: ${latest.status.replace(/_/g, " ")}. On My Job, choose 30% or 50%, then Pay with Card to open Stripe Checkout.`
    };
  }

  if (/\b(dispatch|deliver|truck|pack|warehouse|ship)\b/.test(q)) {
    if (!latest) {
      return { topic: "dispatch", answer: "No order yet, so there is no dispatch. Accept a quote and complete the advance payment first." };
    }
    const d = latest.dispatches[0];
    return {
      topic: "dispatch",
      answer: d
        ? `Your latest dispatch is ${d.status.replace(/_/g, " ")}${d.vehicleNotes ? ` (${d.vehicleNotes})` : ""}. Delivered kits start the warranty clock.`
        : `Order ${latest.id} is ${latest.status.replace(/_/g, " ")}. Warehouse can pack after at least 30% is paid.`
    };
  }

  if (/\b(warrant|serial|inverter|panel|guarantee)\b/.test(q)) {
    if (!latest || latest.serials.length === 0) {
      return {
        topic: "warranty",
        answer: "Warranty starts when serials are delivered to your site. After delivery, open My Job → Serials & Warranty for end dates."
      };
    }
    const lines = latest.serials
      .map((s) => {
        const until = s.warrantyEndsAt ? new Date(s.warrantyEndsAt).toLocaleDateString("en-IN") : "not started";
        const cover = s.underWarranty === true ? "under warranty" : s.underWarranty === false ? "out of warranty" : "pending delivery";
        return `${s.productName} (${s.serialNumber}): ${cover}, until ${until}`;
      })
      .join("; ");
    return { topic: "warranty", answer: lines };
  }

  if (/\b(quote|quotation|accept|reject|price)\b/.test(q)) {
    if (openQuote) {
      return {
        topic: "quote",
        answer: `You have a sent quote ${openQuote.id} for ₹${openQuote.totalInr.toLocaleString("en-IN")}. Open My Quotes to accept or reject it.`
      };
    }
    if (quoteList[0]) {
      return {
        topic: "quote",
        answer: `Your latest quote ${quoteList[0].id} is ${quoteList[0].status}. Open My Quotes for totals and history.`
      };
    }
    return { topic: "quote", answer: "No quotes yet. Sales will send a link after your site survey is approved." };
  }

  if (/\b(install|technician|schedule|fit)\b/.test(q)) {
    if (!latest) {
      return { topic: "installation", answer: "Installation is scheduled after payment and dispatch. You do not have an order yet." };
    }
    return {
      topic: "installation",
      answer: `Order ${latest.id} is currently ${latest.status.replace(/_/g, " ")}. Our team schedules the crew after the kit is dispatched to your site.`
    };
  }

  if (/\b(service|ticket|repair|fault|breakdown)\b/.test(q)) {
    return {
      topic: "service",
      answer:
        "For a delivered serial, open Service Requests and describe the fault. Under-warranty repairs are free when the serial matches your order."
    };
  }

  return {
    topic: "general",
    answer: latest
      ? `Your latest order ${latest.id} is ${latest.status.replace(/_/g, " ")} with balance ₹${latest.balanceInr.toLocaleString("en-IN")}. Ask about payment, dispatch, warranty, quote, installation, or service for a specific answer.`
      : "Ask about payment, quotes, dispatch, warranty, installation, or service. Or submit an inquiry if you are new to SunPower."
  };
}
