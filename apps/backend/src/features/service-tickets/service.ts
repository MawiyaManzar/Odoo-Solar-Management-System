import { and, asc, desc, eq } from "drizzle-orm";
import type { ServiceTicketResult } from "../../contracts/results.js";
import { db } from "../../db/client.js";
import { serviceTickets, type ServiceTicketStatus } from "../../db/schema/service-tickets.js";

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
