import { createHash, randomInt, timingSafeEqual } from "node:crypto";
import { and, desc, eq, isNull } from "drizzle-orm";
import { ID_PREFIXES } from "../../contracts/id-prefixes.js";
import { db } from "../../db/client.js";
import { customerAccounts, customerOtps } from "../../db/schema/customer-portal.js";
import { customers } from "../../db/schema/customers.js";
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

export async function requestOtp(phone: string, quoteId: string): Promise<{ devCode?: string }> {
  await quoteForPhone(quoteId, phone);
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

export async function verifyOtp(phone: string, quoteId: string, code: string): Promise<{ accountId: string; customerId: string }> {
  const linked = await quoteForPhone(quoteId, phone);
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

  const [existing] = await db.select().from(customerAccounts).where(eq(customerAccounts.customerId, linked.customer.id)).limit(1);
  if (existing) return { accountId: existing.id, customerId: existing.customerId };

  const [created] = await db
    .insert(customerAccounts)
    .values({
      id: newId(ID_PREFIXES.customerAccount),
      customerId: linked.customer.id,
      phone
    })
    .returning();
  return { accountId: created.id, customerId: created.customerId };
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
