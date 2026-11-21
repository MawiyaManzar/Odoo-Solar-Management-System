import type { FastifyInstance } from "fastify";
import { parseOrReply } from "../../lib/validate.js";
import { requireAuth } from "../../plugins/auth.js";
import { serviceTicketListQuerySchema } from "./schema.js";
import { listServiceTickets } from "./service.js";

export async function serviceTicketsRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/service-tickets", { preHandler: requireAuth }, async (request, reply) => {
    const query = parseOrReply(serviceTicketListQuerySchema, request.query, reply);
    if (!query) return;
    return { success: true, data: await listServiceTickets(query) };
  });
}
