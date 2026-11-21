import { and, desc, eq } from "drizzle-orm";
import type { QuoteLineResult, QuoteResult } from "../../contracts/results.js";
import { ID_PREFIXES } from "../../contracts/id-prefixes.js";
import { db } from "../../db/client.js";
import { packageItems, packages, products } from "../../db/schema/catalog.js";
import { customers } from "../../db/schema/customers.js";
import { enquiries } from "../../db/schema/enquiries.js";
import { orders } from "../../db/schema/orders.js";
import { quoteLines, quotes, type QuoteStatus } from "../../db/schema/quotes.js";
import { enquiryHasApprovedSurvey, getEnquiry } from "../enquiries/service.js";
import { newId } from "../../lib/ids.js";
import { ServiceError } from "../../lib/service-error.js";
import type { QuoteCreate, QuotePatch } from "./schema.js";

export interface QuoteView extends QuoteResult {
  customerName: string;
  packageCode: string | null;
}

function toLine(row: typeof quoteLines.$inferSelect): QuoteLineResult {
  return {
    id: row.id,
    quoteId: row.quoteId,
    productId: row.productId,
    description: row.description,
    qty: row.qty,
    unitPriceInr: row.unitPriceInr,
    lineTotalInr: row.lineTotalInr
  };
}

function toQuote(row: typeof quotes.$inferSelect, extra: { customerName: string; packageCode: string | null }, lines?: QuoteLineResult[]): QuoteView {
  return {
    id: row.id,
    enquiryId: row.enquiryId,
    customerId: row.customerId,
    packageId: row.packageId,
    status: row.status as QuoteResult["status"],
    subtotalInr: row.subtotalInr,
    discountInr: row.discountInr,
    totalInr: row.totalInr,
    validUntil: row.validUntil,
    createdBy: row.createdBy,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    customerName: extra.customerName,
    packageCode: extra.packageCode,
    ...(lines ? { lines } : {})
  };
}

async function extras(row: typeof quotes.$inferSelect): Promise<{ customerName: string; packageCode: string | null }> {
  const [customer] = await db.select().from(customers).where(eq(customers.id, row.customerId)).limit(1);
  const [pkg] = row.packageId ? await db.select().from(packages).where(eq(packages.id, row.packageId)).limit(1) : [undefined];
  return { customerName: customer?.name ?? "Customer", packageCode: pkg?.code ?? null };
}

async function linesFor(quoteId: string): Promise<QuoteLineResult[]> {
  const rows = await db.select().from(quoteLines).where(eq(quoteLines.quoteId, quoteId));
  return rows.map(toLine);
}

function totals(subtotal: number, discount: number): { subtotalInr: number; discountInr: number; totalInr: number } {
  const discountInr = Math.min(discount, subtotal);
  return { subtotalInr: subtotal, discountInr, totalInr: subtotal - discountInr };
}

export async function listQuotes(query: { status?: QuoteStatus; customerId?: string }): Promise<QuoteView[]> {
  const filters = [];
  if (query.status) filters.push(eq(quotes.status, query.status));
  if (query.customerId) filters.push(eq(quotes.customerId, query.customerId));
  const rows = await db
    .select()
    .from(quotes)
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(desc(quotes.createdAt));
  const views: QuoteView[] = [];
  for (const row of rows) {
    views.push(toQuote(row, await extras(row)));
  }
  return views;
}

export async function getQuote(id: string): Promise<QuoteView> {
  const [row] = await db.select().from(quotes).where(eq(quotes.id, id)).limit(1);
  if (!row) throw new ServiceError(404, "Quote not found.");
  return toQuote(row, await extras(row), await linesFor(id));
}

export async function createQuote(input: QuoteCreate, actor: { id: string; role: string }): Promise<QuoteView> {
  const enquiry = await getEnquiry(input.enquiryId);
  if (enquiry.status === "won" || enquiry.status === "lost") {
    throw new ServiceError(400, "This enquiry is already closed.");
  }
  if (actor.role !== "admin" && !(await enquiryHasApprovedSurvey(enquiry.id))) {
    throw new ServiceError(400, "A survey must be approved before a quote.");
  }
  const [pkg] = await db.select().from(packages).where(eq(packages.id, input.packageId)).limit(1);
  if (!pkg || !pkg.isActive) throw new ServiceError(404, "Package not found.");
  const items = await db.select().from(packageItems).where(eq(packageItems.packageId, pkg.id));
  if (items.length === 0) throw new ServiceError(400, "This package has no parts.");

  const quoteId = newId(ID_PREFIXES.quote);
  const lineValues: {
    id: string;
    quoteId: string;
    productId: string;
    description: string;
    qty: number;
    unitPriceInr: number;
    lineTotalInr: number;
  }[] = [];
  let subtotal = 0;
  for (const item of items) {
    const [product] = await db.select().from(products).where(eq(products.id, item.productId)).limit(1);
    if (!product) throw new ServiceError(400, "Package references a missing product.");
    const lineTotal = item.qty * product.unitPriceInr;
    subtotal += lineTotal;
    lineValues.push({
      id: newId(ID_PREFIXES.quoteLine),
      quoteId,
      productId: product.id,
      description: product.name,
      qty: item.qty,
      unitPriceInr: product.unitPriceInr,
      lineTotalInr: lineTotal
    });
  }
  const money = totals(subtotal, input.discountInr ?? 0);
  await db.transaction(async (tx) => {
    await tx.insert(quotes).values({
      id: quoteId,
      enquiryId: enquiry.id,
      customerId: enquiry.customerId,
      packageId: pkg.id,
      status: "draft",
      ...money,
      validUntil: input.validUntil ?? null,
      createdBy: actor.id
    });
    await tx.insert(quoteLines).values(lineValues);
    await tx.update(enquiries).set({ status: "quoted", updatedAt: new Date() }).where(eq(enquiries.id, enquiry.id));
  });
  return getQuote(quoteId);
}

export async function updateQuote(id: string, input: QuotePatch): Promise<QuoteView> {
  const current = await getQuote(id);
  if (current.status !== "draft") throw new ServiceError(400, "Only a draft quote can be edited.");
  let nextLines = current.lines ?? [];
  if (input.lines) {
    const known = new Map(nextLines.map((line) => [line.id, line]));
    nextLines = input.lines.map((line) => {
      const existing = known.get(line.id);
      if (!existing) throw new ServiceError(400, "Unknown quote line.");
      return { ...existing, qty: line.qty, unitPriceInr: line.unitPriceInr, lineTotalInr: line.qty * line.unitPriceInr };
    });
    await db.transaction(async (tx) => {
      for (const line of nextLines) {
        await tx
          .update(quoteLines)
          .set({ qty: line.qty, unitPriceInr: line.unitPriceInr, lineTotalInr: line.lineTotalInr })
          .where(eq(quoteLines.id, line.id));
      }
    });
  }
  const subtotal = nextLines.reduce((sum, line) => sum + line.lineTotalInr, 0);
  const money = totals(subtotal, input.discountInr ?? current.discountInr);
  await db
    .update(quotes)
    .set({
      ...money,
      validUntil: input.validUntil === undefined ? current.validUntil : input.validUntil,
      updatedAt: new Date()
    })
    .where(eq(quotes.id, id));
  return getQuote(id);
}

export async function sendQuote(id: string): Promise<QuoteView> {
  const current = await getQuote(id);
  if (current.status !== "draft") throw new ServiceError(400, "Only a draft quote can be sent.");
  if (!current.lines || current.lines.length === 0) throw new ServiceError(400, "Add at least one line before sending.");
  await db.update(quotes).set({ status: "sent", updatedAt: new Date() }).where(eq(quotes.id, id));
  return getQuote(id);
}

export async function acceptQuote(id: string): Promise<QuoteView> {
  const current = await getQuote(id);
  if (current.status !== "sent") throw new ServiceError(400, "Send the quote before recording acceptance.");
  const enquiry = await getEnquiry(current.enquiryId);
  const [pkg] = current.packageId ? await db.select().from(packages).where(eq(packages.id, current.packageId)).limit(1) : [undefined];
  const [customer] = await db.select().from(customers).where(eq(customers.id, current.customerId)).limit(1);
  if (!customer) throw new ServiceError(404, "Customer not found.");
  const systemKind = enquiry.systemKind ?? (pkg?.systemKind === "off_grid" ? "off_grid" : pkg?.systemKind === "on_grid" ? "on_grid" : null);
  if (!systemKind) throw new ServiceError(400, "Set on-grid or off-grid on the enquiry before accepting.");
  const systemKw = pkg?.capacityKw ?? enquiry.requestedKw;
  const siteAddress = [customer.addressLine, customer.city, customer.pincode].filter(Boolean).join(", ");
  await db.transaction(async (tx) => {
    await tx.update(quotes).set({ status: "accepted", updatedAt: new Date() }).where(eq(quotes.id, id));
    await tx.insert(orders).values({
      id: newId(ID_PREFIXES.order),
      quoteId: id,
      customerId: current.customerId,
      enquiryId: current.enquiryId,
      status: "awaiting_payment",
      systemKw,
      systemKind,
      siteAddress,
      totalInr: current.totalInr
    });
    await tx.update(enquiries).set({ status: "won", updatedAt: new Date() }).where(eq(enquiries.id, current.enquiryId));
  });
  return getQuote(id);
}

export async function rejectQuote(id: string): Promise<QuoteView> {
  const current = await getQuote(id);
  if (current.status !== "draft" && current.status !== "sent") {
    throw new ServiceError(400, "Only a draft or sent quote can be rejected.");
  }
  await db.transaction(async (tx) => {
    await tx.update(quotes).set({ status: "rejected", updatedAt: new Date() }).where(eq(quotes.id, id));
    await tx.update(enquiries).set({ status: "lost", updatedAt: new Date() }).where(eq(enquiries.id, current.enquiryId));
  });
  return getQuote(id);
}
