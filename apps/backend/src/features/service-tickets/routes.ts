import type { FastifyInstance } from "fastify";
import { ServiceError } from "../../lib/service-error.js";
import { parseOrReply } from "../../lib/validate.js";
import { requireAuth, requireCustomer } from "../../plugins/auth.js";
import { customerTicketCreateSchema, serviceTicketListQuerySchema } from "./schema.js";
import { createCustomerTicket, listCustomerTickets, listServiceTickets } from "./service.js";

function sendKnownError(error: unknown, reply: { status: (code: number) => { send: (body: unknown) => unknown } }): boolean {
  if (error instanceof ServiceError) {
    reply.status(error.statusCode).send({ success: false, message: error.message });
    return true;
  }
  return false;
}

export async function serviceTicketsRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/service-tickets", { preHandler: requireAuth }, async (request, reply) => {
    const query = parseOrReply(serviceTicketListQuerySchema, request.query, reply);
    if (!query) return;
    return { success: true, data: await listServiceTickets(query) };
  });

  app.get("/api/customer/service-tickets", { preHandler: requireCustomer }, async (request) => {
    return { success: true, data: await listCustomerTickets(request.user.customerId ?? "") };
  });

  app.post("/api/customer/service-tickets", { preHandler: requireCustomer }, async (request, reply) => {
    const body = parseOrReply(customerTicketCreateSchema, request.body, reply);
    if (!body) return;
    try {
      const ticket = await createCustomerTicket(request.user.customerId ?? "", body);
      return reply.status(201).send({ success: true, data: ticket, message: "Service request opened." });
    } catch (error) {
      if (sendKnownError(error, reply)) return;
      throw error;
    }
  });
}
