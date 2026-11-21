import type { FastifyInstance } from "fastify";
import { ServiceError } from "../../lib/service-error.js";
import { parseOrReply } from "../../lib/validate.js";
import { requireAuth, requireRole } from "../../plugins/auth.js";
import { idParamSchema, quoteCreateSchema, quoteListQuerySchema, quotePatchSchema } from "./schema.js";
import { acceptQuote, createQuote, getQuote, listQuotes, rejectQuote, sendQuote, updateQuote } from "./service.js";

function sendKnownError(error: unknown, reply: { status: (code: number) => { send: (body: unknown) => unknown } }): boolean {
  if (error instanceof ServiceError) {
    reply.status(error.statusCode).send({ success: false, message: error.message });
    return true;
  }
  return false;
}

export async function quoteRoutes(app: FastifyInstance): Promise<void> {
  const sales = requireRole("sales", "admin");

  app.get("/api/quotes", { preHandler: requireAuth }, async (request, reply) => {
    const query = parseOrReply(quoteListQuerySchema, request.query, reply);
    if (!query) return;
    return { success: true, data: await listQuotes(query) };
  });

  app.get("/api/quotes/:id", { preHandler: requireAuth }, async (request, reply) => {
    const params = parseOrReply(idParamSchema, request.params, reply);
    if (!params) return;
    try {
      return { success: true, data: await getQuote(params.id) };
    } catch (error) {
      if (sendKnownError(error, reply)) return;
      throw error;
    }
  });

  app.post("/api/quotes", { preHandler: sales }, async (request, reply) => {
    const body = parseOrReply(quoteCreateSchema, request.body, reply);
    if (!body) return;
    try {
      const quote = await createQuote(body, { id: request.user.sub, role: request.user.role ?? "" });
      return reply.status(201).send({ success: true, data: quote, message: "Quote created." });
    } catch (error) {
      if (sendKnownError(error, reply)) return;
      throw error;
    }
  });

  app.patch("/api/quotes/:id", { preHandler: sales }, async (request, reply) => {
    const params = parseOrReply(idParamSchema, request.params, reply);
    if (!params) return;
    const body = parseOrReply(quotePatchSchema, request.body, reply);
    if (!body) return;
    try {
      return { success: true, data: await updateQuote(params.id, body), message: "Quote updated." };
    } catch (error) {
      if (sendKnownError(error, reply)) return;
      throw error;
    }
  });

  app.post("/api/quotes/:id/send", { preHandler: sales }, async (request, reply) => {
    const params = parseOrReply(idParamSchema, request.params, reply);
    if (!params) return;
    try {
      const quote = await sendQuote(params.id);
      return {
        success: true,
        data: { ...quote, customerPath: `/my/quotes/${quote.id}` },
        message: "Quote sent."
      };
    } catch (error) {
      if (sendKnownError(error, reply)) return;
      throw error;
    }
  });

  app.post("/api/quotes/:id/accept", { preHandler: sales }, async (request, reply) => {
    const params = parseOrReply(idParamSchema, request.params, reply);
    if (!params) return;
    try {
      return { success: true, data: await acceptQuote(params.id), message: "Quote accepted." };
    } catch (error) {
      if (sendKnownError(error, reply)) return;
      throw error;
    }
  });

  app.post("/api/quotes/:id/reject", { preHandler: sales }, async (request, reply) => {
    const params = parseOrReply(idParamSchema, request.params, reply);
    if (!params) return;
    try {
      return { success: true, data: await rejectQuote(params.id), message: "Quote rejected." };
    } catch (error) {
      if (sendKnownError(error, reply)) return;
      throw error;
    }
  });
}
