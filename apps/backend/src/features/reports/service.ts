import { asc, eq, inArray } from "drizzle-orm";
import type { JobMarginResult } from "../../contracts/results.js";
import { db } from "../../db/client.js";
import { products } from "../../db/schema/catalog.js";
import { customers } from "../../db/schema/customers.js";
import { installations } from "../../db/schema/installations.js";
import { orders } from "../../db/schema/orders.js";
import { quoteLines } from "../../db/schema/quotes.js";

function money(value: number): number {
  return Math.round(value * 100) / 100;
}

export async function listJobMargins(): Promise<JobMarginResult[]> {
  const orderRows = await db
    .select({
      order: orders,
      customerName: customers.name
    })
    .from(orders)
    .innerJoin(customers, eq(customers.id, orders.customerId))
    .orderBy(asc(orders.id));

  if (orderRows.length === 0) return [];

  const quoteIds = orderRows.map((row) => row.order.quoteId);
  const orderIds = orderRows.map((row) => row.order.id);

  const [lineRows, installRows] = await Promise.all([
    db
      .select({
        quoteId: quoteLines.quoteId,
        qty: quoteLines.qty,
        unitCostInr: products.unitCostInr
      })
      .from(quoteLines)
      .innerJoin(products, eq(products.id, quoteLines.productId))
      .where(inArray(quoteLines.quoteId, quoteIds)),
    db.select().from(installations).where(inArray(installations.orderId, orderIds))
  ]);

  const cogsByQuote = new Map<string, number>();
  for (const line of lineRows) {
    const next = (cogsByQuote.get(line.quoteId) ?? 0) + line.qty * line.unitCostInr;
    cogsByQuote.set(line.quoteId, next);
  }

  const finishedByOrder = new Map<string, Date>();
  for (const row of installRows) {
    if (row.finishedAt) finishedByOrder.set(row.orderId, row.finishedAt);
  }

  return orderRows.map(({ order, customerName }) => {
    const revenueInr = money(order.totalInr);
    const cogsEstimateInr = money(cogsByQuote.get(order.quoteId) ?? 0);
    const finishedAt = finishedByOrder.get(order.id);
    let completedAt: string | null = null;
    if (finishedAt) {
      completedAt = finishedAt.toISOString();
    } else if (order.status === "completed") {
      completedAt = order.updatedAt.toISOString();
    }

    return {
      orderId: order.id,
      customerName,
      revenueInr,
      cogsEstimateInr,
      grossMarginInr: money(revenueInr - cogsEstimateInr),
      status: order.status as JobMarginResult["status"],
      completedAt
    };
  });
}
